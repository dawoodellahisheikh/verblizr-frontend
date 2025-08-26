/**
 * TTS API - Backend Integration
 * ----------------------------------------------------------------------------
 * All TTS operations should go through the backend for:
 * - API key security (keys stay on server)
 * - Rate limiting and usage tracking
 * - Centralized error handling
 * - Caching and optimization
 * - Cost management
 */

import { API } from '../../lib/api';

// Types
export interface TTSRequest {
  text: string;
  languageCode: string;
  voiceName?: string;
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  speakingRate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSResponse {
  audioContent: string; // Base64 encoded audio
  audioFormat: string;
  success: boolean;
  error?: string;
  provider: 'google-cloud-tts' | 'react-native-tts';
  duration?: number;
  cached?: boolean;
}

export interface TTSVoice {
  name: string;
  languageCode: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

export interface TTSVoicesResponse {
  voices: TTSVoice[];
  success: boolean;
  error?: string;
}

/**
 * Synthesize speech using backend TTS service
 * Backend will handle Google Cloud TTS with fallback to other providers
 */
export async function synthesizeSpeech(request: TTSRequest): Promise<TTSResponse> {
  try {
    const { data } = await API.post<TTSResponse>('/tts/synthesize', request);
    return data;
  } catch (error: any) {
    console.error('[TTS API] Synthesis failed:', error);
    return {
      audioContent: '',
      audioFormat: '',
      success: false,
      error: error?.response?.data?.error || error?.message || 'TTS synthesis failed',
      provider: 'react-native-tts' // Will fallback to local TTS
    };
  }
}

/**
 * Get available voices for a language
 * Backend will cache and optimize voice listings
 */
export async function getAvailableVoices(languageCode?: string): Promise<TTSVoicesResponse> {
  try {
    const params = languageCode ? { languageCode } : {};
    const { data } = await API.get<TTSVoicesResponse>('/tts/voices', { params });
    return data;
  } catch (error: any) {
    console.error('[TTS API] Failed to get voices:', error);
    return {
      voices: [],
      success: false,
      error: error?.response?.data?.error || error?.message || 'Failed to get voices'
    };
  }
}

/**
 * Test TTS service connectivity
 * Useful for health checks and diagnostics
 */
export async function testTTSService(): Promise<{ success: boolean; error?: string; providers: string[] }> {
  try {
    const { data } = await API.get('/tts/test');
    return data;
  } catch (error: any) {
    console.error('[TTS API] Service test failed:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'TTS service test failed',
      providers: []
    };
  }
}

/**
 * Get TTS usage statistics (if implemented on backend)
 */
export async function getTTSUsage(): Promise<{
  success: boolean;
  usage?: {
    charactersUsed: number;
    requestsCount: number;
    costEstimate: number;
    period: string;
  };
  error?: string;
}> {
  try {
    const { data } = await API.get('/tts/usage');
    return data;
  } catch (error: any) {
    console.error('[TTS API] Failed to get usage:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Failed to get TTS usage'
    };
  }
}