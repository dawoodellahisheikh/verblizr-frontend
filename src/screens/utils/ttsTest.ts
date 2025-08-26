/**
 * ttsTest.ts
 * ----------------------------------------------------------------------------
 * TTS Testing Utilities
 * 
 * Functions to test both React Native TTS and Google Cloud TTS functionality
 */

import { getGoogleTTSService } from '../services/googleCloudTTS';
import { getAudioPlayer } from '../services/audioPlayer';
import { DEFAULT_TTS_SERVICE_CONFIG } from '../config/ttsConfig';

// Test React Native TTS
let RNTts: any = null;
try {
  const mod = require('react-native-tts');
  RNTts = mod?.default ?? mod;
} catch {
  console.warn('[TTSTest] react-native-tts not available');
}

export interface TTSTestResult {
  service: 'react-native-tts' | 'google-cloud-tts' | 'audio-player';
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Test React Native TTS functionality
 */
export async function testReactNativeTTS(): Promise<TTSTestResult> {
  const startTime = Date.now();
  
  try {
    if (!RNTts) {
      return {
        service: 'react-native-tts',
        success: false,
        error: 'React Native TTS not available'
      };
    }

    console.log('[TTSTest] Testing React Native TTS...');
    
    // Set language
    await RNTts.setDefaultLanguage('en-US');
    
    // Test speech
    return new Promise((resolve) => {
      const finishListener = RNTts.addEventListener?.('tts-finish', () => {
        finishListener?.remove?.();
        resolve({
          service: 'react-native-tts',
          success: true,
          duration: Date.now() - startTime
        });
      });
      
      const errorListener = RNTts.addEventListener?.('tts-error', (error: any) => {
        finishListener?.remove?.();
        errorListener?.remove?.();
        resolve({
          service: 'react-native-tts',
          success: false,
          error: error?.message || 'TTS error',
          duration: Date.now() - startTime
        });
      });
      
      RNTts.speak('Testing React Native Text to Speech').catch((error: any) => {
        finishListener?.remove?.();
        errorListener?.remove?.();
        resolve({
          service: 'react-native-tts',
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      });
    });
    
  } catch (error) {
    return {
      service: 'react-native-tts',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test Google Cloud TTS functionality
 */
export async function testGoogleCloudTTS(apiKey?: string): Promise<TTSTestResult> {
  const startTime = Date.now();
  
  try {
    const testApiKey = apiKey || 
      process.env.GOOGLE_CLOUD_TTS_API_KEY || 
      DEFAULT_TTS_SERVICE_CONFIG.googleCloudTTS.apiKey;
    
    if (!testApiKey || testApiKey === 'YOUR_GOOGLE_CLOUD_TTS_API_KEY_HERE') {
      return {
        service: 'google-cloud-tts',
        success: false,
        error: 'Google Cloud TTS API key not configured'
      };
    }

    console.log('[TTSTest] Testing Google Cloud TTS...');
    
    const googleTTS = getGoogleTTSService({
      apiKey: testApiKey,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
    
    if (!googleTTS.isConfigured()) {
      return {
        service: 'google-cloud-tts',
        success: false,
        error: 'Google Cloud TTS service not properly configured',
        duration: Date.now() - startTime
      };
    }
    
    // Test synthesis
    const response = await googleTTS.synthesizeSpeech({
      text: 'Testing Google Cloud Text to Speech',
      languageCode: 'en-US'
    });
    
    if (!response.success) {
      return {
        service: 'google-cloud-tts',
        success: false,
        error: response.error || 'Synthesis failed',
        duration: Date.now() - startTime
      };
    }
    
    console.log(`[TTSTest] Google TTS synthesis successful: ${response.audioContent.length} bytes`);
    
    return {
      service: 'google-cloud-tts',
      success: true,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      service: 'google-cloud-tts',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test Audio Player functionality
 */
export async function testAudioPlayer(): Promise<TTSTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('[TTSTest] Testing Audio Player...');
    
    const audioPlayer = getAudioPlayer();
    
    if (!audioPlayer.isAvailable()) {
      return {
        service: 'audio-player',
        success: false,
        error: 'Audio player not available (react-native-sound not installed)',
        duration: Date.now() - startTime
      };
    }
    
    return {
      service: 'audio-player',
      success: true,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      service: 'audio-player',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run all TTS tests
 */
export async function runAllTTSTests(apiKey?: string): Promise<TTSTestResult[]> {
  console.log('[TTSTest] Running comprehensive TTS tests...');
  
  const results: TTSTestResult[] = [];
  
  // Test React Native TTS
  results.push(await testReactNativeTTS());
  
  // Test Google Cloud TTS
  results.push(await testGoogleCloudTTS(apiKey));
  
  // Test Audio Player
  results.push(await testAudioPlayer());
  
  // Log results
  console.log('[TTSTest] Test Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    const error = result.error ? ` - ${result.error}` : '';
    console.log(`${status} ${result.service} ${duration}${error}`);
  });
  
  return results;
}

export default {
  testReactNativeTTS,
  testGoogleCloudTTS,
  testAudioPlayer,
  runAllTTSTests
};