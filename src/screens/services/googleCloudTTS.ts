/**
 * googleCloudTTS.ts
 * ----------------------------------------------------------------------------
 * Google Cloud Text-to-Speech service implementation
 * 
 * Features:
 * - High-quality neural voices
 * - Multiple language support
 * - Audio format optimization for mobile
 * - Error handling and fallback support
 */

// Note: @google-cloud/text-to-speech is not compatible with React Native
// Using REST API instead for React Native compatibility
import { SUPPORTED_LANGUAGES } from '../config/ttsConfig';

// Types
export interface GoogleTTSConfig {
  apiKey: string;
  projectId?: string;
}

export interface GoogleTTSRequest {
  text: string;
  languageCode: string;
  voiceName?: string;
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  speakingRate?: number;
  pitch?: number;
}

export interface GoogleTTSResponse {
  audioContent: string; // Base64 encoded audio
  audioFormat: string;
  success: boolean;
  error?: string;
}

// Google Cloud TTS Service Class (React Native Compatible)
export class GoogleCloudTTSService {
  private config: GoogleTTSConfig;
  private baseUrl = 'https://texttospeech.googleapis.com/v1';

  constructor(config: GoogleTTSConfig) {
    this.config = config;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.config.apiKey !== undefined && 
           this.config.apiKey !== 'YOUR_GOOGLE_CLOUD_TTS_API_KEY_HERE' &&
           this.config.apiKey.length > 0;
  }

  /**
   * Get the best voice for a given language
   */
  private getVoiceForLanguage(languageCode: string): string {
    const langConfig = SUPPORTED_LANGUAGES[languageCode as keyof typeof SUPPORTED_LANGUAGES];
    return langConfig?.googleVoice || 'en-US-Neural2-A';
  }

  /**
   * Synthesize speech using Google Cloud TTS REST API
   */
  async synthesizeSpeech(request: GoogleTTSRequest): Promise<GoogleTTSResponse> {
    if (!this.isConfigured()) {
      return {
        audioContent: '',
        audioFormat: '',
        success: false,
        error: 'Google Cloud TTS not configured'
      };
    }

    try {
      const voiceName = request.voiceName || this.getVoiceForLanguage(request.languageCode);
      
      // Prepare the synthesis request
      const synthesisRequest = {
        input: { text: request.text },
        voice: {
          languageCode: request.languageCode,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: request.audioEncoding || 'MP3',
          speakingRate: request.speakingRate || 1.0,
          pitch: request.pitch || 0.0,
          sampleRateHertz: 22050, // Optimized for mobile
        },
      };

      console.log(`[GoogleCloudTTS] Synthesizing: "${request.text}" (${request.languageCode})`);
      
      // Call Google Cloud TTS REST API
      const response = await fetch(`${this.baseUrl}/text:synthesize?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(synthesisRequest),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error('No audio content received from Google Cloud TTS');
      }
      
      console.log(`[GoogleCloudTTS] Successfully synthesized ${data.audioContent.length} bytes of audio`);
      
      return {
        audioContent: data.audioContent, // Already base64 encoded
        audioFormat: request.audioEncoding || 'MP3',
        success: true,
      };
      
    } catch (error) {
      console.error('[GoogleCloudTTS] Synthesis failed:', error);
      
      return {
        audioContent: '',
        audioFormat: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown synthesis error'
      };
    }
  }

  /**
   * Test the Google Cloud TTS service with a simple phrase
   */
  async testService(): Promise<boolean> {
    try {
      const result = await this.synthesizeSpeech({
        text: 'Hello, this is a test of Google Cloud Text-to-Speech.',
        languageCode: 'en-US',
      });
      
      return result.success;
    } catch (error) {
      console.error('[GoogleCloudTTS] Service test failed:', error);
      return false;
    }
  }

  /**
   * Get available voices for a language
   */
  async getAvailableVoices(languageCode?: string): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/voices?key=${this.config.apiKey}${languageCode ? `&languageCode=${languageCode}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('[GoogleCloudTTS] Failed to get available voices:', error);
      return [];
    }
  }
}

// Singleton instance
let googleTTSInstance: GoogleCloudTTSService | null = null;

/**
 * Get or create Google Cloud TTS service instance
 */
export function getGoogleTTSService(config: GoogleTTSConfig): GoogleCloudTTSService {
  if (!googleTTSInstance || googleTTSInstance['config'].apiKey !== config.apiKey) {
    googleTTSInstance = new GoogleCloudTTSService(config);
  }
  return googleTTSInstance;
}

/**
 * Quick helper function to synthesize speech
 */
export async function synthesizeWithGoogle(
  text: string,
  languageCode: string,
  config: GoogleTTSConfig
): Promise<GoogleTTSResponse> {
  const service = getGoogleTTSService(config);
  return service.synthesizeSpeech({ text, languageCode });
}

export default GoogleCloudTTSService;