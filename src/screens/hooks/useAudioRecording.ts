/**
 * useAudioRecording.ts
 * ----------------------------------------------------------------------------
 * DES Added: Simplified audio recording hook for live interpretation
 * 
 * Features:
 * - Mock audio recording for demo purposes
 * - Real audio level simulation
 * - Proper state management
 * - Error handling and permission management
 * 
 * Note: This is a simplified version that works without external audio libraries.
 * For production, replace with real audio capture implementation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface AudioRecordingConfig {
  /** Sample rate for audio capture (Hz) */
  sampleRate: number;
  /** Audio channel configuration */
  channels: number;
  /** Audio quality setting */
  bitRate: number;
  /** Audio format */
  audioFormat: 'mp4' | 'wav';
  /** Audio encoder */
  audioEncoder: 'aac' | 'wav';
}

export interface AudioRecordingCallbacks {
  /** Called with PCM audio data for processing */
  onAudioFrame?: (pcmData: Float32Array) => void;
  /** Called with current audio level (0-1) */
  onAudioLevel?: (level: number) => void;
  /** Called when recording starts */
  onRecordingStart?: () => void;
  /** Called when recording stops */
  onRecordingStop?: () => void;
  /** Called when recording is paused */
  onRecordingPause?: () => void;
  /** Called when recording is resumed */
  onRecordingResume?: () => void;
  /** Called on recording errors */
  onError?: (error: Error) => void;
}

export type RecordingState = 
  | 'idle'        // Not recording
  | 'starting'    // Initializing recording
  | 'recording'   // Actively recording
  | 'paused'      // Recording paused
  | 'stopping'    // Stopping recording
  | 'error';      // Error state

export interface AudioRecordingResult {
  /** Current recording state */
  state: RecordingState;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether recording is paused */
  isPaused: boolean;
  /** Current audio level (0-1) */
  audioLevel: number;
  /** Recording duration in seconds */
  duration: number;
  /** Start audio recording */
  startRecording: () => Promise<boolean>;
  /** Stop audio recording */
  stopRecording: () => Promise<void>;
  /** Pause audio recording */
  pauseRecording: () => Promise<void>;
  /** Resume audio recording */
  resumeRecording: () => Promise<void>;
  /** Check microphone permissions */
  checkPermissions: () => Promise<boolean>;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_RECORDING_CONFIG: AudioRecordingConfig = {
  sampleRate: 16000,     // 16kHz for speech processing
  channels: 1,           // Mono audio
  bitRate: 128000,       // 128kbps
  audioFormat: 'wav',    // WAV for better PCM processing
  audioEncoder: 'wav',   // WAV encoder
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * DES Added: Calculate RMS audio level from PCM data
 */
function calculateAudioLevel(pcmData: Float32Array): number {
  if (!pcmData || pcmData.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < pcmData.length; i++) {
    sum += pcmData[i] * pcmData[i];
  }
  
  const rms = Math.sqrt(sum / pcmData.length);
  return Math.min(1, rms * 3); // Scale and clamp to 0-1
}

/**
 * DES Added: Check microphone permissions for both platforms
 */
async function checkMicrophonePermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      
      if (!granted) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Verblizr needs access to your microphone for live interpretation.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }
    
    // iOS permissions are handled automatically
    return true;
  } catch (error) {
    console.error('[useAudioRecording] Permission check failed:', error);
    return false;
  }
}

/**
 * DES Added: Generate mock PCM data for demo purposes
 */
function generateMockPCMData(sampleRate: number, durationMs: number = 100): Float32Array {
  const samples = Math.floor((sampleRate * durationMs) / 1000);
  const pcmData = new Float32Array(samples);
  
  // Generate realistic speech-like audio data
  for (let i = 0; i < samples; i++) {
    // Mix of frequencies to simulate speech
    const t = i / sampleRate;
    const speech = Math.sin(2 * Math.PI * 200 * t) * 0.3 + 
                  Math.sin(2 * Math.PI * 400 * t) * 0.2 +
                  (Math.random() - 0.5) * 0.1; // Some noise
    pcmData[i] = speech;
  }
  
  return pcmData;
}

// =============================================================================
// MAIN AUDIO RECORDING HOOK
// =============================================================================

export function useAudioRecording(
  callbacks: AudioRecordingCallbacks = {},
  config: Partial<AudioRecordingConfig> = {}
): AudioRecordingResult {
  
  // Configuration
  const recordingConfig = { ...DEFAULT_RECORDING_CONFIG, ...config };
  
  // State management
  const [state, setState] = useState<RecordingState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Derived state
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  
  // Refs for timing and processing
  const startTimeRef = useRef<number>(0);
  const audioProcessingRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Callback refs to avoid stale closures
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // DES Added: Mock audio processing for demo
  const processAudioData = useCallback(() => {
    if (state !== 'recording') return;
    
    try {
      // Generate mock PCM data
      const mockPCMData = generateMockPCMData(recordingConfig.sampleRate);
      
      // Calculate audio level with some variation
      const baseLevel = 0.1 + Math.random() * 0.4; // 0.1 to 0.5 range
      const level = Math.min(1, baseLevel);
      
      setAudioLevel(level);
      callbacksRef.current.onAudioLevel?.(level);
      
      // Send PCM data to callback
      callbacksRef.current.onAudioFrame?.(mockPCMData);
      
    } catch (error) {
      console.error('[useAudioRecording] Audio processing error:', error);
      callbacksRef.current.onError?.(error as Error);
    }
  }, [state, recordingConfig.sampleRate]);

  // DES Added: Start audio processing loop
  useEffect(() => {
    if (isRecording && !isPaused) {
      // Process audio every 100ms for real-time responsiveness
      audioProcessingRef.current = setInterval(processAudioData, 100);
    } else {
      if (audioProcessingRef.current) {
        clearInterval(audioProcessingRef.current);
        audioProcessingRef.current = null;
      }
    }
    
    return () => {
      if (audioProcessingRef.current) {
        clearInterval(audioProcessingRef.current);
        audioProcessingRef.current = null;
      }
    };
  }, [isRecording, isPaused, processAudioData]);

  // DES Added: Duration tracking
  useEffect(() => {
    if (isRecording && !isPaused) {
      durationTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 100);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  // DES Added: Check microphone permissions
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      return await checkMicrophonePermissions();
    } catch (error) {
      console.error('[useAudioRecording] Permission error:', error);
      callbacksRef.current.onError?.(error as Error);
      return false;
    }
  }, []);

  // DES Added: Start recording function
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (state !== 'idle') {
      console.warn('[useAudioRecording] Cannot start - not in idle state');
      return false;
    }
    
    setState('starting');
    
    try {
      // Check permissions first
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Microphone Permission Required',
          'Please grant microphone access to use live interpretation.',
          [{ text: 'OK' }]
        );
        setState('error');
        return false;
      }
      
      // Start recording (mock implementation)
      setState('recording');
      startTimeRef.current = Date.now();
      setDuration(0);
      setAudioLevel(0);
      
      callbacksRef.current.onRecordingStart?.();
      console.log('[useAudioRecording] Mock recording started successfully');
      
      return true;
      
    } catch (error) {
      console.error('[useAudioRecording] Start recording error:', error);
      setState('error');
      callbacksRef.current.onError?.(error as Error);
      
      Alert.alert(
        'Recording Error', 
        'Failed to start audio recording. This is a demo mode.'
      );
      return false;
    }
  }, [state, checkPermissions]);

  // DES Added: Stop recording function
  const stopRecording = useCallback(async () => {
    if (state !== 'recording' && state !== 'paused') {
      console.warn('[useAudioRecording] Cannot stop - not recording');
      return;
    }
    
    setState('stopping');
    
    try {
      setState('idle');
      setAudioLevel(0);
      setDuration(0);
      startTimeRef.current = 0;
      
      callbacksRef.current.onRecordingStop?.();
      console.log('[useAudioRecording] Recording stopped');
      
    } catch (error) {
      console.error('[useAudioRecording] Stop recording error:', error);
      setState('error');
      callbacksRef.current.onError?.(error as Error);
    }
  }, [state]);

  // DES Added: Pause recording function
  const pauseRecording = useCallback(async () => {
    if (state !== 'recording') {
      console.warn('[useAudioRecording] Cannot pause - not recording');
      return;
    }
    
    try {
      setState('paused');
      callbacksRef.current.onRecordingPause?.();
      console.log('[useAudioRecording] Recording paused');
      
    } catch (error) {
      console.error('[useAudioRecording] Pause recording error:', error);
      callbacksRef.current.onError?.(error as Error);
    }
  }, [state]);

  // DES Added: Resume recording function
  const resumeRecording = useCallback(async () => {
    if (state !== 'paused') {
      console.warn('[useAudioRecording] Cannot resume - not paused');
      return;
    }
    
    try {
      setState('recording');
      startTimeRef.current = Date.now() - (duration * 1000); // Adjust for elapsed time
      
      callbacksRef.current.onRecordingResume?.();
      console.log('[useAudioRecording] Recording resumed');
      
    } catch (error) {
      console.error('[useAudioRecording] Resume recording error:', error);
      callbacksRef.current.onError?.(error as Error);
    }
  }, [state, duration]);

  // DES Added: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioProcessingRef.current) {
        clearInterval(audioProcessingRef.current);
        audioProcessingRef.current = null;
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, []);

  return {
    state,
    isRecording,
    isPaused,
    audioLevel,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    checkPermissions,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { calculateAudioLevel, DEFAULT_RECORDING_CONFIG };
export default useAudioRecording;