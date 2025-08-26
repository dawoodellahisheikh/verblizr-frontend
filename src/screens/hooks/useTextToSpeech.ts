/**
 * useTextToSpeech.ts
 * ----------------------------------------------------------------------------
 * DES Added: Hybrid Text-to-Speech hook for live interpretation
 * 
 * Features:
 * - Primary: Google Cloud Text-to-Speech API for high quality
 * - Fallback: React Native TTS for offline/error scenarios
 * - Automatic fallback detection and switching
 * - Language-specific voice selection
 * - TTS queue management for conversation flow
 * - Real-time streaming support
 * 
 * Usage:
 * const tts = useTextToSpeech({
 *   apiKey: 'your-google-cloud-api-key',
 *   onSpeechStart: () => console.log('TTS started'),
 *   onSpeechEnd: () => console.log('TTS finished'),
 * });
 * 
 * await tts.speak('Hello world', 'en');
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { synthesizeSpeech, TTSResponse } from '../../features/tts/api';
import { getAudioPlayer } from '../services/audioPlayer';

// Dev-only logging helpers to cut noise in release
const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devWarn = (...args: any[]) => { if (__DEV__) console.warn(...args); };

// Optional TTS libraries (guarded imports)
let RNTts: any = null;
try {
  const mod = require('react-native-tts');
  RNTts = mod?.default ?? mod;
} catch {
  devWarn('[useTextToSpeech] react-native-tts not available');
}

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface TTSConfig {
  /** Google Cloud TTS API key */
  apiKey?: string;
  /** Default speech rate (0.25-4.0) */
  speechRate: number;
  /** Default pitch (-20.0 to 20.0) */
  pitch: number;
  /** Default volume (0.0-1.0) */
  volume: number;
  /** Enable Google Cloud TTS */
  useGoogleTTS: boolean;
  /** Connection timeout for API calls */
  timeoutMs: number;
}

export interface TTSCallbacks {
  /** Called when TTS starts speaking */
  onSpeechStart?: (text: string, language: string) => void;
  /** Called when TTS finishes speaking */
  onSpeechEnd?: (text: string, language: string) => void;
  /** Called when TTS is interrupted */
  onSpeechInterrupted?: () => void;
  /** Called on TTS errors */
  onError?: (error: Error, fallbackUsed: boolean) => void;
  /** Called when fallback TTS is used */
  onFallbackUsed?: (reason: string) => void;
}

export type TTSState = 
  | 'idle'        // Not speaking
  | 'preparing'   // Preparing audio
  | 'speaking'    // Currently speaking
  | 'paused'      // Speech paused
  | 'error';      // Error state

export interface TTSQueueItem {
  id: string;
  text: string;
  languageCode: string;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

export interface TTSResult {
  /** Current TTS state */
  state: TTSState;
  /** Whether currently speaking */
  isSpeaking: boolean;
  /** Current queue length */
  queueLength: number;
  /** Whether using fallback TTS */
  usingFallback: boolean;
  /** Speak text in specified language */
  speak: (text: string, languageCode: string, priority?: 'high' | 'normal' | 'low') => Promise<boolean>;
  /** Stop current speech */
  stop: () => Promise<void>;
  /** Pause current speech */
  pause: () => Promise<void>;
  /** Resume paused speech */
  resume: () => Promise<void>;
  /** Clear speech queue */
  clearQueue: () => void;
  /** Check if language is supported */
  isLanguageSupported: (languageCode: string) => boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_TTS_CONFIG: TTSConfig = {
  speechRate: 0.5, // Valid range: 0.01 - 0.99 for react-native-tts
  pitch: 1.0,      // Valid range: 0.5 - 2.0 for react-native-tts
  volume: 1.0,
  useGoogleTTS: true,
  timeoutMs: 5000,
};

// DES Added: React Native TTS language codes mapping
const RN_TTS_LANGUAGE_MAP: Record<string, string> = {
  'en': 'en-US',
  'es': 'es-ES', 
  'fr': 'fr-FR',
  'de': 'de-DE',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'zh': 'zh-CN',
  'hi': 'hi-IN',
  'ar': 'ar-SA',
  'ur': 'ur-PK',
  'tr': 'tr-TR',
  'pl': 'pl-PL',
  'nl': 'nl-NL',
  'sv': 'sv-SE',
  'da': 'da-DK',
  'no': 'nb-NO',
  'fi': 'fi-FI',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * DES Added: Use Backend TTS API (Google Cloud TTS via backend)
 */
async function speakWithBackendTTS(
  text: string,
  languageCode: string,
  config: TTSConfig
): Promise<void> {
  try {
    devLog(`[BackendTTS] Synthesizing: "${text}" (${languageCode})`);
    
    // Call backend TTS API (backend handles Google Cloud TTS with API keys)
    const response: TTSResponse = await synthesizeSpeech({
      text,
      languageCode,
      speakingRate: config.speechRate,
      pitch: config.pitch,
      volume: config.volume,
    });

    if (!response.success) {
      throw new Error(response.error || 'Backend TTS synthesis failed');
    }

    // Play the synthesized audio
    const audioPlayer = getAudioPlayer({ volume: config.volume });
    
    if (!audioPlayer.isAvailable()) {
      throw new Error('Audio player not available');
    }

    const playbackSuccess = await audioPlayer.playBase64Audio(
      response.audioContent,
      response.audioFormat
    );

    if (!playbackSuccess) {
      throw new Error('Failed to play synthesized audio');
    }

    devLog(`[BackendTTS] Successfully played synthesized audio via ${response.provider}`);
    
  } catch (error) {
    devWarn('[BackendTTS] Synthesis failed:', error);
    throw error;
  }
}

/**
 * DES Added: Use React Native TTS as fallback
 */
async function speakWithNativeTTS(
  text: string, 
  languageCode: string, 
  config: TTSConfig
): Promise<void> {
  if (!RNTts) {
    throw new Error('React Native TTS not available');
  }
  
  try {
    // Map language code to RN TTS format
    const rnLanguage = RN_TTS_LANGUAGE_MAP[languageCode] || 'en-US';
    
    // Configure TTS settings with safe error handling
    try {
      const validRate = Math.max(0.01, Math.min(0.99, config.speechRate));
      const validPitch = Math.max(0.5, Math.min(2.0, config.pitch));
      devLog(`[TTS] Attempting to set rate: ${validRate}, pitch: ${validPitch}`);
      await RNTts.setDefaultLanguage(rnLanguage);

      // Skip rate/pitch due to API incompatibility across builds
      devLog('[TTS] Skipping rate/pitch configuration due to library incompatibility');
      // await RNTts.setDefaultRate(validRate);
      // await RNTts.setDefaultPitch(validPitch);
    } catch (configError) {
      devWarn('[TTS] Configuration failed, using defaults:', configError);
    }
    
    // Speak the text
    return new Promise<void>((resolve, reject) => {
      const finishListener = RNTts.addEventListener?.('tts-finish', () => {
        finishListener?.remove?.();
        resolve();
      });
      const errorListener = RNTts.addEventListener?.('tts-error', (error: any) => {
        finishListener?.remove?.();
        errorListener?.remove?.();
        reject(new Error(`Native TTS error: ${error?.message || 'Unknown error'}`));
      });
      RNTts.speak(text).catch((error: any) => {
        finishListener?.remove?.();
        errorListener?.remove?.();
        reject(error);
      });
    });
  } catch (error) {
    console.error('[useTextToSpeech] Native TTS error:', error);
    throw error;
  }
}

/**
 * DES: stop() signature differs across RN-TTS builds (no-arg vs BOOL).
 * Try zero-arg first; fall back to BOOL=true; swallow if both fail.
 */
async function safeNativeStop() {
  if (!RNTts) return;
  try {
    await RNTts.stop();           // preferred on your current build
    return;
  } catch (e1) {
    try {
      await RNTts.stop(true);     // fallback for BOOL builds
      return;
    } catch (e2) {
      devWarn('[TTS] Both stop() signatures failed', e1, e2);
    }
  }
}

// =============================================================================
// MAIN TTS HOOK
// =============================================================================

export function useTextToSpeech(
  callbacks: TTSCallbacks = {},
  config: Partial<TTSConfig> = {}
): TTSResult {
  
  // Configuration
  const ttsConfig = useMemo(() => ({ ...DEFAULT_TTS_CONFIG, ...config }), [config]);
  
  // State management
  const [state, setState] = useState<TTSState>('idle');
  const [usingFallback, setUsingFallback] = useState(false);
  const [speechQueue, setSpeechQueue] = useState<TTSQueueItem[]>([]);
  
  // Derived state
  const isSpeaking = state === 'speaking';
  const queueLength = speechQueue.length;
  
  // Processing refs
  const processingRef = useRef(false);
  const currentItemRef = useRef<TTSQueueItem | null>(null);
  
  // Callback refs to avoid stale closures
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Initialize React Native TTS (run once to avoid duplicate subscriptions)
  useEffect(() => {
    if (!RNTts) return;

    (async () => {
      try {
        await RNTts.setDefaultLanguage('en-US');
      } catch (langError) {
        devWarn('[TTS] Failed to set default language:', langError);
      }
      devLog('[TTS] Using default rate/pitch settings due to library API incompatibility');
    })();
    
    const startListener = RNTts.addEventListener?.('tts-start', () => {
      devLog('[useTextToSpeech] Native TTS started');
    });
    const finishListener = RNTts.addEventListener?.('tts-finish', () => {
      devLog('[useTextToSpeech] Native TTS finished');
    });
    const cancelListener = RNTts.addEventListener?.('tts-cancel', () => {
      devLog('[useTextToSpeech] Native TTS cancelled');
    });
    
    return () => {
      startListener?.remove?.();
      finishListener?.remove?.();
      cancelListener?.remove?.();
      // extra cleanup for older RN-TTS versions
      try { RNTts.removeAllListeners?.('tts-start'); } catch {}
      try { RNTts.removeAllListeners?.('tts-finish'); } catch {}
      try { RNTts.removeAllListeners?.('tts-cancel'); } catch {}
    };
  }, []); // 👈 run once

  // DES Added: Process speech queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || speechQueue.length === 0 || state !== 'idle') {
      return;
    }
    
    processingRef.current = true;
    
    try {
      // Get next item from queue (highest priority first)
      const sortedQueue = [...speechQueue].sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      const nextItem = sortedQueue[0];
      if (!nextItem) {
        processingRef.current = false;
        return;
      }
      
      // Remove item from queue
      setSpeechQueue(prev => prev.filter(item => item.id !== nextItem.id));
      currentItemRef.current = nextItem;
      
      setState('preparing');
      callbacksRef.current.onSpeechStart?.(nextItem.text, nextItem.languageCode);
      
      // Try Google Cloud TTS first, fallback to React Native TTS
      let usedFallback = false;
      
      try {
        setState('speaking');
        
        if (ttsConfig.useGoogleTTS) {
          // Try Backend TTS first (Google Cloud TTS via backend)
          try {
            await speakWithBackendTTS(nextItem.text, nextItem.languageCode, ttsConfig);
            devLog('[useTextToSpeech] Backend TTS synthesis completed');
            setUsingFallback(false);
          } catch (backendError) {
            devWarn('[useTextToSpeech] Backend TTS failed, falling back to native:', backendError);
            callbacksRef.current.onFallbackUsed?.('Backend TTS failed');
            
            // Fallback to React Native TTS
            await speakWithNativeTTS(nextItem.text, nextItem.languageCode, ttsConfig);
            usedFallback = true;
            setUsingFallback(true);
          }
        } else {
          // Use React Native TTS directly
          devLog('[useTextToSpeech] Using React Native TTS (Backend TTS disabled)');
          await speakWithNativeTTS(nextItem.text, nextItem.languageCode, ttsConfig);
          usedFallback = true;
          setUsingFallback(true);
        }
        
      } catch (finalError) {
        console.error('[useTextToSpeech] All TTS methods failed:', finalError);
        setState('error');
        callbacksRef.current.onError?.(finalError as Error, usedFallback);
        
        // Clear current item and continue with queue
        currentItemRef.current = null;
        processingRef.current = false;
        
        // Try next item in queue after a brief delay
        setTimeout(() => {
          setState('idle');
          processQueue();
        }, 1000);
        return;
      }
      
      // Speech completed successfully
      setState('idle');
      callbacksRef.current.onSpeechEnd?.(nextItem.text, nextItem.languageCode);
      currentItemRef.current = null;
      
    } catch (error) {
      console.error('[useTextToSpeech] Queue processing error:', error);
      setState('error');
      callbacksRef.current.onError?.(error as Error, usingFallback);
    } finally {
      processingRef.current = false;
      
      // Continue processing queue if there are more items
      if (speechQueue.length > 1) {
        setTimeout(() => {
          setState('idle');
          processQueue();
        }, 300);
      }
    }
  }, [speechQueue, state, ttsConfig, usingFallback]);

  // DES Added: Auto-process queue when items are added
  useEffect(() => {
    if (speechQueue.length > 0 && state === 'idle') {
      processQueue();
    }
  }, [speechQueue, state, processQueue]);

  // DES Added: Speak function (adds to queue)
  const speak = useCallback(async (
    text: string, 
    languageCode: string, 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<boolean> => {
    if (!text.trim()) {
      devWarn('[useTextToSpeech] Empty text provided');
      return false;
    }
    
    try {
      const newItem: TTSQueueItem = {
        id: `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: text.trim(),
        languageCode,
        priority,
        timestamp: Date.now(),
      };
      
      // Add to queue
      setSpeechQueue(prev => [...prev, newItem]);
      devLog(`[useTextToSpeech] Added to queue: "${text}" (${languageCode})`);
      
      return true;
    } catch (error) {
      console.error('[useTextToSpeech] Speak error:', error);
      callbacksRef.current.onError?.(error as Error, false);
      return false;
    }
  }, []);

  // DES Added: Stop current speech and clear queue
  const stop = useCallback(async () => {
    try {
      if (RNTts) {
        await safeNativeStop();
      }
      
      // Clear queue and reset state
      setSpeechQueue([]);
      setState('idle');
      currentItemRef.current = null;
      processingRef.current = false;
      
      callbacksRef.current.onSpeechInterrupted?.();
      devLog('[useTextToSpeech] Speech stopped and queue cleared');
      
    } catch (error) {
      console.error('[useTextToSpeech] Stop error:', error);
      // Don't call onError for stop failures, just log them
    }
  }, []);

  // DES Added: Pause current speech
  const pause = useCallback(async () => {
    if (state !== 'speaking') return;
    
    try {
      // React Native TTS doesn't support pause, so we'll stop instead
      if (RNTts) {
        await safeNativeStop();
      }
      
      setState('paused');
      devLog('[useTextToSpeech] Speech paused');
      
    } catch (error) {
      console.error('[useTextToSpeech] Pause error:', error);
      // Don't propagate pause errors
    }
  }, [state]);

  // DES Added: Resume paused speech
  const resume = useCallback(async () => {
    if (state !== 'paused') return;
    
    try {
      // Restart current item
      if (currentItemRef.current) {
        const currentItem = currentItemRef.current;
        setSpeechQueue(prev => [currentItem, ...prev]);
      }
      
      setState('idle');
      devLog('[useTextToSpeech] Speech resumed');
      
    } catch (error) {
      console.error('[useTextToSpeech] Resume error:', error);
      // Don't propagate resume errors
    }
  }, [state]);

  // DES Added: Clear speech queue
  const clearQueue = useCallback(() => {
    setSpeechQueue([]);
    devLog('[useTextToSpeech] Queue cleared');
  }, []);

  // DES Added: Check if language is supported
  const isLanguageSupported = useCallback((languageCode: string): boolean => {
    // Check React Native TTS support
    if (RN_TTS_LANGUAGE_MAP[languageCode]) {
      return true;
    }
    
    // Check for language variants
    const baseLanguage = languageCode.split('-')[0];
    return !!RN_TTS_LANGUAGE_MAP[baseLanguage];
  }, []);

  // DES Added: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (RNTts) {
        safeNativeStop().catch(() => {});
      }
      setSpeechQueue([]);
      processingRef.current = false;
    };
  }, []);

  return {
    state,
    isSpeaking,
    queueLength,
    usingFallback,
    speak,
    stop,
    pause,
    resume,
    clearQueue,
    isLanguageSupported,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { DEFAULT_TTS_CONFIG, RN_TTS_LANGUAGE_MAP };
export default useTextToSpeech;
