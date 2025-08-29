/**
 * useAudioManager.ts
 * ----------------------------------------------------------------------------
 * DES Added: Audio session manager for live interpretation
 * 
 * Features:
 * - Coordinates audio recording and TTS playback
 * - Manages audio session conflicts (recording vs playback)
 * - Provides unified audio state management
 * - Handles audio interruptions and resumption
 * - Integrates with VAD for turn-based conversations
 * 
 * Usage:
 * const audioManager = useAudioManager({
 *   onTurnComplete: (audioData, duration) => processTranslation(audioData),
 *   onPlaybackComplete: () => resumeListening(),
 * });
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface AudioManagerConfig {
  /** Sample rate for audio processing */
  sampleRate: number;
  /** Audio processing frame size (samples) */
  frameSize: number;
  /** Google Cloud TTS API key */
  googleTTSApiKey?: string;
  /** Enable automatic gain control */
  enableAGC: boolean;
  /** Enable noise suppression */
  enableNoiseSuppression: boolean;
}

export interface AudioManagerCallbacks {
  /** Called when a recording turn is completed */
  onTurnComplete?: (audioData: Float32Array, duration: number) => void;
  /** Called when TTS playback starts */
  onPlaybackStart?: (text: string, language: string) => void;
  /** Called when TTS playback completes */
  onPlaybackComplete?: (text: string, language: string) => void;
  /** Called when audio session is interrupted */
  onAudioInterrupted?: (reason: string) => void;
  /** Called when audio session is resumed */
  onAudioResumed?: () => void;
  /** Called with real-time audio levels */
  onAudioLevel?: (level: number) => void;
  /** Called on audio errors */
  onError?: (error: Error, context: string) => void;
}

export type AudioSessionState = 
  | 'idle'          // No audio activity
  | 'recording'     // Recording audio input
  | 'processing'    // Processing recorded audio
  | 'speaking'      // Playing TTS output
  | 'paused'        // Session paused
  | 'interrupted'   // Session interrupted (call, etc.)
  | 'error';        // Error state

export interface AudioManagerResult {
  /** Current audio session state */
  state: AudioSessionState;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether currently playing TTS */
  isSpeaking: boolean;
  /** Whether session is paused */
  isPaused: boolean;
  /** Current audio level (0-1) */
  audioLevel: number;
  /** Whether using TTS fallback */
  usingTTSFallback: boolean;
  /** Start audio session */
  startSession: () => Promise<boolean>;
  /** Stop audio session */
  stopSession: () => Promise<void>;
  /** Pause audio session */
  pauseSession: () => Promise<void>;
  /** Resume audio session */
  resumeSession: () => Promise<void>;
  /** Speak translated text */
  speakTranslation: (text: string, languageCode: string) => Promise<boolean>;
  /** Stop current speech */
  stopSpeech: () => Promise<void>;
  /** Get supported languages */
  getSupportedLanguages: () => string[];
  /** Process audio frame (exposed for integration) */
  processAudioFrame: (frame: Float32Array) => void;
  /** Complete current turn (exposed for integration) */
  completeTurn: () => void;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_AUDIO_CONFIG: AudioManagerConfig = {
  sampleRate: 16000,
  frameSize: 1600, // 100ms at 16kHz
  enableAGC: true,
  enableNoiseSuppression: true,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * DES Added: Merge audio frames into larger chunks for processing
 */
function mergeAudioFrames(frames: Float32Array[]): Float32Array {
  if (frames.length === 0) return new Float32Array(0);
  if (frames.length === 1) return frames[0];
  
  const totalLength = frames.reduce((sum, frame) => sum + frame.length, 0);
  const merged = new Float32Array(totalLength);
  
  let offset = 0;
  for (const frame of frames) {
    merged.set(frame, offset);
    offset += frame.length;
  }
  
  return merged;
}

/**
 * DES Added: Apply audio processing (AGC, noise suppression)
 */
function processAudioFrameUtil(frame: Float32Array, config: AudioManagerConfig): Float32Array {
  let processed = new Float32Array(frame);
  
  if (config.enableAGC) {
    // Simple automatic gain control
    const maxLevel = Math.max(...Array.from(processed).map(Math.abs));
    if (maxLevel > 0 && maxLevel < 0.5) {
      const gain = Math.min(2.0, 0.7 / maxLevel);
      for (let i = 0; i < processed.length; i++) {
        processed[i] *= gain;
      }
    }
  }
  
  if (config.enableNoiseSuppression) {
    // Simple noise gate
    const threshold = 0.01;
    for (let i = 0; i < processed.length; i++) {
      if (Math.abs(processed[i]) < threshold) {
        processed[i] *= 0.3; // Reduce low-level noise
      }
    }
  }
  
  return processed;
}

// =============================================================================
// MAIN AUDIO MANAGER HOOK
// =============================================================================

export function useAudioManager(
  callbacks: AudioManagerCallbacks = {},
  config: Partial<AudioManagerConfig> = {}
): AudioManagerResult {
  
  // Configuration
  const audioConfig = useMemo(() => ({ ...DEFAULT_AUDIO_CONFIG, ...config }), [config]);
  
  // State management
  const [state, setState] = useState<AudioSessionState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [usingTTSFallback, _setUsingTTSFallback] = useState(false);
  
  // Derived state
  const isRecording = state === 'recording';
  const isSpeaking = state === 'speaking';
  const isPaused = state === 'paused';
  
  // Audio processing refs
  const audioFramesRef = useRef<Float32Array[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const appStateRef = useRef(AppState.currentState);
  
  // Callback refs to avoid stale closures
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // DES Added: Handle app state changes (interruptions)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (appStateRef.current.match(/active/) && nextAppState === 'background') {
        // App going to background while audio session active
        if (isRecording || isSpeaking) {
          setState('interrupted');
          callbacksRef.current.onAudioInterrupted?.('App backgrounded');
        }
      } else if (appStateRef.current.match(/background/) && nextAppState === 'active') {
        // App returning to foreground
        if (state === 'interrupted') {
          setState('idle');
          callbacksRef.current.onAudioResumed?.();
        }
      }
      appStateRef.current = nextAppState as AppStateStatus;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isRecording, isSpeaking, state]);

  // DES Added: Complete current recording turn
  const completeTurn = useCallback(() => {
    if (state !== 'recording' || audioFramesRef.current.length === 0) return;
    
    setState('processing');
    
    try {
      // Merge audio frames
      const audioData = mergeAudioFrames(audioFramesRef.current);
      const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
      
      // Clear frames buffer
      audioFramesRef.current = [];
      setAudioLevel(0);
      
      // Notify callback
      callbacksRef.current.onTurnComplete?.(audioData, duration);
      
      console.log(`[useAudioManager] Turn completed: ${duration.toFixed(1)}s, ${audioData.length} samples`);
      
    } catch (error) {
      console.error('[useAudioManager] Turn completion error:', error);
      setState('error');
      callbacksRef.current.onError?.(error as Error, 'turn_completion');
    }
  }, [state]);

  // DES Added: Audio frame processing
  const processAudioFrame = useCallback((frame: Float32Array) => {
    if (state !== 'recording') return;
    
    // Apply audio processing
    const processed = processAudioFrameUtil(frame, audioConfig);
    
    // Calculate and update audio level
    let sum = 0;
    for (let i = 0; i < processed.length; i++) {
      sum += processed[i] * processed[i];
    }
    const rms = Math.sqrt(sum / processed.length);
    const level = Math.min(1, rms * 3);
    
    setAudioLevel(level);
    callbacksRef.current.onAudioLevel?.(level);
    
    // Store frame for processing
    audioFramesRef.current.push(processed);
    
    // Limit buffer size to prevent memory issues
    const maxFrames = Math.ceil(audioConfig.sampleRate * 30 / audioConfig.frameSize); // 30 seconds max
    if (audioFramesRef.current.length > maxFrames) {
      audioFramesRef.current.shift(); // Remove oldest frame
    }
  }, [state, audioConfig]);

  // DES Added: Start audio session
  const startSession = useCallback(async (): Promise<boolean> => {
    if (state !== 'idle') {
      console.warn('[useAudioManager] Cannot start - session already active');
      return false;
    }
    
    try {
      setState('recording');
      recordingStartTimeRef.current = Date.now();
      audioFramesRef.current = [];
      setAudioLevel(0);
      
      console.log('[useAudioManager] Audio session started');
      return true;
      
    } catch (error) {
      console.error('[useAudioManager] Start session error:', error);
      setState('error');
      callbacksRef.current.onError?.(error as Error, 'session_start');
      return false;
    }
  }, [state]);

  // DES Added: Stop audio session
  const stopSession = useCallback(async () => {
    try {
      // Complete any ongoing recording
      if (state === 'recording' && audioFramesRef.current.length > 0) {
        completeTurn();
      }
      
      setState('idle');
      audioFramesRef.current = [];
      setAudioLevel(0);
      recordingStartTimeRef.current = 0;
      
      console.log('[useAudioManager] Audio session stopped');
      
    } catch (error) {
      console.error('[useAudioManager] Stop session error:', error);
      callbacksRef.current.onError?.(error as Error, 'session_stop');
    }
  }, [state, completeTurn]);

  // DES Added: Pause audio session
  const pauseSession = useCallback(async () => {
    if (state !== 'recording' && state !== 'speaking') {
      console.warn('[useAudioManager] Cannot pause - no active session');
      return;
    }
    
    try {
      setState('paused');
      console.log('[useAudioManager] Audio session paused');
      
    } catch (error) {
      console.error('[useAudioManager] Pause session error:', error);
      callbacksRef.current.onError?.(error as Error, 'session_pause');
    }
  }, [state]);

  // DES Added: Resume audio session
  const resumeSession = useCallback(async () => {
    if (state !== 'paused') {
      console.warn('[useAudioManager] Cannot resume - session not paused');
      return;
    }
    
    try {
      setState('recording');
      recordingStartTimeRef.current = Date.now();
      console.log('[useAudioManager] Audio session resumed');
      
    } catch (error) {
      console.error('[useAudioManager] Resume session error:', error);
      callbacksRef.current.onError?.(error as Error, 'session_resume');
    }
  }, [state]);

  // DES Added: Speak translation with session management
  const speakTranslation = useCallback(async (
    text: string, 
    languageCode: string
  ): Promise<boolean> => {
    if (!text.trim()) {
      console.warn('[useAudioManager] Empty translation text');
      return false;
    }
    
    try {
      // Pause recording during TTS playback
      const wasRecording = state === 'recording';
      if (wasRecording) {
        setState('speaking');
      }
      
      callbacksRef.current.onPlaybackStart?.(text, languageCode);
      
      // Simulate TTS playback (in real implementation, this would use the TTS hook)
      const playbackDuration = Math.max(1000, text.length * 50); // Estimate duration
      await new Promise(resolve => setTimeout(resolve, playbackDuration));
      
      callbacksRef.current.onPlaybackComplete?.(text, languageCode);
      
      // Resume recording if it was active
      if (wasRecording) {
        setState('recording');
        recordingStartTimeRef.current = Date.now();
      } else {
        setState('idle');
      }
      
      console.log(`[useAudioManager] TTS completed: \"${text}\" (${languageCode})`);
      return true;
      
    } catch (error) {
      console.error('[useAudioManager] TTS playback error:', error);
      setState('error');
      callbacksRef.current.onError?.(error as Error, 'tts_playback');
      return false;
    }
  }, [state]);

  // DES Added: Stop current speech
  const stopSpeech = useCallback(async () => {
    if (state !== 'speaking') return;
    
    try {
      // In real implementation, this would stop the TTS hook
      setState('idle');
      console.log('[useAudioManager] Speech stopped');
      
    } catch (error) {
      console.error('[useAudioManager] Stop speech error:', error);
      callbacksRef.current.onError?.(error as Error, 'stop_speech');
    }
  }, [state]);

  // DES Added: Get supported languages (combination of recording and TTS)
  const getSupportedLanguages = useCallback((): string[] => {
    // Return common languages supported by both recording and TTS
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'hi', 'ar', 'ur', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
    ];
  }, []);

  // DES Added: Audio session cleanup on unmount
  useEffect(() => {
    return () => {
      audioFramesRef.current = [];
      setAudioLevel(0);
    };
  }, []);

  return {
    state,
    isRecording,
    isSpeaking,
    isPaused,
    audioLevel,
    usingTTSFallback,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    speakTranslation,
    stopSpeech,
    getSupportedLanguages,
    processAudioFrame,
    completeTurn,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { DEFAULT_AUDIO_CONFIG, mergeAudioFrames, processAudioFrameUtil };
export default useAudioManager;