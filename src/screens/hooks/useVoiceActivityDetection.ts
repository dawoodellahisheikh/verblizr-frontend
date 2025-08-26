/**
 * useVoiceActivityDetection.ts
 * ----------------------------------------------------------------------------
 * Voice Activity Detection (VAD) hook for automatic conversation mode.
 * 
 * Features:
 * - Real-time audio level monitoring
 * - Speech/silence detection with configurable thresholds
 * - Turn completion detection based on silence duration
 * - Noise filtering and adaptive thresholds
 * - Performance optimized for continuous operation
 * 
 * Usage:
 * const vad = useVoiceActivityDetection({
 *   silenceThreshold: 0.01,
 *   silenceDuration: 2000,
 *   onSpeechStart: () => console.log('Speech started'),
 *   onSpeechEnd: () => console.log('Speech ended'),
 * });
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface VADConfig {
  /** Audio level below which is considered silence (0-1) */
  silenceThreshold: number;
  /** How long silence before ending turn (milliseconds) */
  silenceDuration: number;
  /** Minimum speech length to process (milliseconds) */
  minSpeechDuration: number;
  /** Maximum turn duration (milliseconds) */
  maxTurnDuration: number;
  /** Sensitivity adjustment (0.1-2.0, 1.0 = normal) */
  sensitivity: number;
  /** Enable adaptive threshold adjustment */
  adaptiveThreshold: boolean;
}

export interface VADCallbacks {
  /** Called when speech activity starts */
  onSpeechStart?: () => void;
  /** Called when speech activity ends */
  onSpeechEnd?: () => void;
  /** Called when a complete turn is detected */
  onTurnComplete?: (duration: number) => void;
  /** Called with current audio level (0-1) */
  onAudioLevel?: (level: number) => void;
  /** Called when VAD state changes */
  onStateChange?: (state: VADState) => void;
}

export type VADState = 
  | 'idle'           // Not monitoring
  | 'listening'      // Monitoring for speech
  | 'speech'         // Speech detected
  | 'silence'        // Silence after speech
  | 'turn_complete'  // Turn completed
  | 'error';         // Error state

export interface VADResult {
  /** Current VAD state */
  state: VADState;
  /** Current audio level (0-1) */
  audioLevel: number;
  /** Whether speech is currently detected */
  isSpeaking: boolean;
  /** Duration of current speech/silence (ms) */
  currentDuration: number;
  /** Start VAD monitoring */
  start: () => void;
  /** Stop VAD monitoring */
  stop: () => void;
  /** Reset VAD state */
  reset: () => void;
  /** Update VAD configuration */
  updateConfig: (config: Partial<VADConfig>) => void;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_VAD_CONFIG: VADConfig = {
  silenceThreshold: 0.01,      // 1% audio level
  silenceDuration: 2000,       // 2 seconds of silence
  minSpeechDuration: 500,      // 0.5 seconds minimum speech
  maxTurnDuration: 30000,      // 30 seconds maximum turn
  sensitivity: 1.0,            // Normal sensitivity
  adaptiveThreshold: true,     // Enable adaptive adjustment
};

// =============================================================================
// AUDIO LEVEL CALCULATION UTILITIES
// =============================================================================

/**
 * Calculate RMS (Root Mean Square) audio level from audio buffer
 * @param buffer - Audio data buffer
 * @returns Normalized audio level (0-1)
 */
export function calculateAudioLevel(buffer: Float32Array): number {
  if (!buffer || buffer.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  
  const rms = Math.sqrt(sum / buffer.length);
  return Math.min(1, rms * 10); // Scale and clamp to 0-1
}

/**
 * Apply smoothing filter to audio level to reduce noise
 * @param currentLevel - Current audio level
 * @param previousLevel - Previous smoothed level
 * @param smoothingFactor - Smoothing factor (0-1)
 * @returns Smoothed audio level
 */
function smoothAudioLevel(
  currentLevel: number, 
  previousLevel: number, 
  smoothingFactor: number = 0.3
): number {
  return previousLevel * (1 - smoothingFactor) + currentLevel * smoothingFactor;
}

/**
 * Adaptive threshold adjustment based on background noise
 * @param currentThreshold - Current silence threshold
 * @param backgroundLevel - Average background noise level
 * @param adaptationRate - How quickly to adapt (0-1)
 * @returns Adjusted threshold
 */
function adaptThreshold(
  currentThreshold: number,
  backgroundLevel: number,
  adaptationRate: number = 0.1
): number {
  const targetThreshold = Math.max(0.005, backgroundLevel * 2); // At least 0.5% above background
  return currentThreshold * (1 - adaptationRate) + targetThreshold * adaptationRate;
}

// =============================================================================
// MAIN VAD HOOK
// =============================================================================

export function useVoiceActivityDetection(
  callbacks: VADCallbacks = {},
  initialConfig: Partial<VADConfig> = {}
): VADResult {
  // Configuration state
  const [config, setConfig] = useState<VADConfig>({
    ...DEFAULT_VAD_CONFIG,
    ...initialConfig,
  });

  // VAD state
  const [state, setState] = useState<VADState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);

  // Internal state refs
  const stateRef = useRef<VADState>('idle');
  const audioLevelRef = useRef(0);
  const smoothedLevelRef = useRef(0);
  const silenceThresholdRef = useRef(config.silenceThreshold);
  const backgroundLevelRef = useRef(0);
  
  // Timing refs
  const speechStartTimeRef = useRef<number | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);
  const turnStartTimeRef = useRef<number | null>(null);
  
  // Monitoring refs
  const isMonitoringRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const backgroundSamplesRef = useRef<number[]>([]);

  // Update refs when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    silenceThresholdRef.current = config.silenceThreshold;
  }, [config.silenceThreshold]);

  // Background noise calculation
  const updateBackgroundLevel = useCallback((level: number) => {
    const samples = backgroundSamplesRef.current;
    samples.push(level);
    
    // Keep only last 100 samples (about 3-5 seconds at 30fps)
    if (samples.length > 100) {
      samples.shift();
    }
    
    // Calculate average background level
    const avgBackground = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    backgroundLevelRef.current = avgBackground;
    
    // Adaptive threshold adjustment
    if (config.adaptiveThreshold && samples.length > 20) {
      const newThreshold = adaptThreshold(
        silenceThresholdRef.current,
        avgBackground,
        0.05 // Slow adaptation
      );
      silenceThresholdRef.current = newThreshold;
    }
  }, [config.adaptiveThreshold]);

  // Process audio level and detect speech/silence
  const processAudioLevel = useCallback((rawLevel: number) => {
    const now = Date.now();
    
    // Apply sensitivity adjustment
    const adjustedLevel = rawLevel * config.sensitivity;
    
    // Smooth the audio level
    const smoothedLevel = smoothAudioLevel(adjustedLevel, smoothedLevelRef.current);
    smoothedLevelRef.current = smoothedLevel;
    
    // Update state
    setAudioLevel(smoothedLevel);
    callbacks.onAudioLevel?.(smoothedLevel);
    
    // Update background level when not speaking
    if (!isSpeaking && stateRef.current === 'listening') {
      updateBackgroundLevel(smoothedLevel);
    }
    
    const currentThreshold = silenceThresholdRef.current;
    const isCurrentlySpeaking = smoothedLevel > currentThreshold;
    
    // State machine logic
    switch (stateRef.current) {
      case 'listening':
        if (isCurrentlySpeaking) {
          // Speech detected
          speechStartTimeRef.current = now;
          turnStartTimeRef.current = turnStartTimeRef.current || now;
          silenceStartTimeRef.current = null;
          
          setState('speech');
          setIsSpeaking(true);
          callbacks.onSpeechStart?.();
          callbacks.onStateChange?.('speech');
        }
        break;
        
      case 'speech':
        if (!isCurrentlySpeaking) {
          // Silence detected after speech
          silenceStartTimeRef.current = now;
          setState('silence');
          setIsSpeaking(false);
          callbacks.onStateChange?.('silence');
        } else {
          // Continue speech - check for max duration
          const speechDuration = now - (speechStartTimeRef.current || now);
          if (speechDuration > config.maxTurnDuration) {
            // Force turn completion due to max duration
            const totalDuration = now - (turnStartTimeRef.current || now);
            setState('turn_complete');
            callbacks.onTurnComplete?.(totalDuration);
            callbacks.onStateChange?.('turn_complete');
          }
        }
        break;
        
      case 'silence':
        if (isCurrentlySpeaking) {
          // Speech resumed
          speechStartTimeRef.current = now;
          silenceStartTimeRef.current = null;
          setState('speech');
          setIsSpeaking(true);
          callbacks.onStateChange?.('speech');
        } else {
          // Check if silence duration exceeded
          const silenceDuration = now - (silenceStartTimeRef.current || now);
          if (silenceDuration > config.silenceDuration) {
            // Check minimum speech duration
            const totalSpeechTime = (silenceStartTimeRef.current || now) - (speechStartTimeRef.current || now);
            if (totalSpeechTime >= config.minSpeechDuration) {
              // Valid turn completed
              const totalDuration = now - (turnStartTimeRef.current || now);
              setState('turn_complete');
              callbacks.onTurnComplete?.(totalDuration);
              callbacks.onSpeechEnd?.();
              callbacks.onStateChange?.('turn_complete');
            } else {
              // Too short, return to listening
              setState('listening');
              setIsSpeaking(false);
              callbacks.onStateChange?.('listening');
            }
          }
        }
        break;
        
      case 'turn_complete':
        // Reset to listening for next turn
        speechStartTimeRef.current = null;
        silenceStartTimeRef.current = null;
        turnStartTimeRef.current = null;
        setState('listening');
        setIsSpeaking(false);
        callbacks.onStateChange?.('listening');
        break;
    }
    
    // Update current duration
    if (speechStartTimeRef.current) {
      setCurrentDuration(now - speechStartTimeRef.current);
    } else if (silenceStartTimeRef.current) {
      setCurrentDuration(now - silenceStartTimeRef.current);
    } else {
      setCurrentDuration(0);
    }
  }, [config, isSpeaking, callbacks, updateBackgroundLevel]);

  // Mock audio processing (in real implementation, this would connect to audio input)
  const processAudioFrame = useCallback(() => {
    if (!isMonitoringRef.current) return;
    
    // TODO: Replace with real audio input
    // For now, generate mock audio levels for testing
    const mockLevel = Math.random() * 0.1 + (Math.random() > 0.8 ? 0.3 : 0);
    processAudioLevel(mockLevel);
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, [processAudioLevel]);

  // Start VAD monitoring
  const start = useCallback(() => {
    if (isMonitoringRef.current) return;
    
    isMonitoringRef.current = true;
    setState('listening');
    setIsSpeaking(false);
    setCurrentDuration(0);
    
    // Reset timing
    speechStartTimeRef.current = null;
    silenceStartTimeRef.current = null;
    turnStartTimeRef.current = null;
    
    // Reset background samples
    backgroundSamplesRef.current = [];
    
    // Start audio processing
    processAudioFrame();
    
    callbacks.onStateChange?.('listening');
  }, [processAudioFrame, callbacks]);

  // Stop VAD monitoring
  const stop = useCallback(() => {
    if (!isMonitoringRef.current) return;
    
    isMonitoringRef.current = false;
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setState('idle');
    setIsSpeaking(false);
    setAudioLevel(0);
    setCurrentDuration(0);
    
    callbacks.onStateChange?.('idle');
  }, [callbacks]);

  // Reset VAD state
  const reset = useCallback(() => {
    speechStartTimeRef.current = null;
    silenceStartTimeRef.current = null;
    turnStartTimeRef.current = null;
    backgroundSamplesRef.current = [];
    
    if (isMonitoringRef.current) {
      setState('listening');
      callbacks.onStateChange?.('listening');
    } else {
      setState('idle');
      callbacks.onStateChange?.('idle');
    }
    
    setIsSpeaking(false);
    setAudioLevel(0);
    setCurrentDuration(0);
  }, [callbacks]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<VADConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    state,
    audioLevel,
    isSpeaking,
    currentDuration,
    start,
    stop,
    reset,
    updateConfig,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get recommended VAD configuration for different use cases
 */
export const VADPresets = {
  /** Sensitive detection for quiet environments */
  sensitive: {
    silenceThreshold: 0.005,
    silenceDuration: 1500,
    minSpeechDuration: 300,
    sensitivity: 1.5,
  },
  
  /** Balanced detection for normal environments */
  balanced: {
    silenceThreshold: 0.01,
    silenceDuration: 2000,
    minSpeechDuration: 500,
    sensitivity: 1.0,
  },
  
  /** Conservative detection for noisy environments */
  conservative: {
    silenceThreshold: 0.02,
    silenceDuration: 2500,
    minSpeechDuration: 800,
    sensitivity: 0.7,
  },
} as const;

/**
 * Format VAD state for display
 */
export function formatVADState(state: VADState): string {
  switch (state) {
    case 'idle': return 'Not monitoring';
    case 'listening': return 'Listening for speech';
    case 'speech': return 'Speech detected';
    case 'silence': return 'Silence detected';
    case 'turn_complete': return 'Turn completed';
    case 'error': return 'Error occurred';
    default: return 'Unknown state';
  }
}

export default useVoiceActivityDetection;