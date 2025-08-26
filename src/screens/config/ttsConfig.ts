/**
 * ttsConfig.ts
 * ----------------------------------------------------------------------------
 * DES Added: Configuration for Text-to-Speech services
 * 
 * Features:
 * - Google Cloud TTS API configuration
 * - Environment-based API key management
 * - Language and voice mappings
 * - Fallback configuration
 */

// =============================================================================
// TTS SERVICE CONFIGURATION
// =============================================================================

export interface TTSServiceConfig {
  // Google Cloud TTS
  googleCloudTTS: {
    apiKey?: string;
    projectId?: string;
    enabled: boolean;
  };
  
  // React Native TTS (fallback)
  nativeTTS: {
    enabled: boolean;
    defaultRate: number;
    defaultPitch: number;
  };
  
  // General settings
  general: {
    defaultLanguage: string;
    maxRetries: number;
    timeoutMs: number;
  };
}

// DES Added: Default TTS configuration
// TODO: Replace with your actual Google Cloud TTS API key
export const DEFAULT_TTS_SERVICE_CONFIG: TTSServiceConfig = {
  googleCloudTTS: {
    // DES Added: Set your Google Cloud TTS API key here
    // Get it from: https://console.cloud.google.com/apis/credentials
    apiKey: process.env.GOOGLE_CLOUD_TTS_API_KEY || 'YOUR_GOOGLE_CLOUD_TTS_API_KEY_HERE',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id',
    enabled: true,
  },
  
  nativeTTS: {
    enabled: true,
    defaultRate: 0.5,  // Valid range: 0.01 - 0.99 for react-native-tts
    defaultPitch: 1.0, // Valid range: 0.5 - 2.0 for react-native-tts
  },
  
  general: {
    defaultLanguage: 'en',
    maxRetries: 2,
    timeoutMs: 5000,
  },
};

// =============================================================================
// LANGUAGE SUPPORT MAPPING
// =============================================================================

// DES Added: Comprehensive language support mapping
export const SUPPORTED_LANGUAGES = {
  // Major languages with full Google Cloud support
  'en': { 
    name: 'English', 
    googleVoice: 'en-US-Neural2-A', 
    nativeCode: 'en-US',
    priority: 'high' 
  },
  'es': { 
    name: 'Spanish', 
    googleVoice: 'es-ES-Neural2-A', 
    nativeCode: 'es-ES',
    priority: 'high' 
  },
  'fr': { 
    name: 'French', 
    googleVoice: 'fr-FR-Neural2-A', 
    nativeCode: 'fr-FR',
    priority: 'high' 
  },
  'de': { 
    name: 'German', 
    googleVoice: 'de-DE-Neural2-A', 
    nativeCode: 'de-DE',
    priority: 'high' 
  },
  'it': { 
    name: 'Italian', 
    googleVoice: 'it-IT-Neural2-A', 
    nativeCode: 'it-IT',
    priority: 'high' 
  },
  'pt': { 
    name: 'Portuguese', 
    googleVoice: 'pt-BR-Neural2-A', 
    nativeCode: 'pt-BR',
    priority: 'high' 
  },
  'ru': { 
    name: 'Russian', 
    googleVoice: 'ru-RU-Standard-A', 
    nativeCode: 'ru-RU',
    priority: 'medium' 
  },
  'ja': { 
    name: 'Japanese', 
    googleVoice: 'ja-JP-Neural2-B', 
    nativeCode: 'ja-JP',
    priority: 'medium' 
  },
  'ko': { 
    name: 'Korean', 
    googleVoice: 'ko-KR-Neural2-A', 
    nativeCode: 'ko-KR',
    priority: 'medium' 
  },
  'zh': { 
    name: 'Chinese (Mandarin)', 
    googleVoice: 'cmn-CN-Standard-A', 
    nativeCode: 'zh-CN',
    priority: 'medium' 
  },
  'hi': { 
    name: 'Hindi', 
    googleVoice: 'hi-IN-Neural2-A', 
    nativeCode: 'hi-IN',
    priority: 'medium' 
  },
  'ar': { 
    name: 'Arabic', 
    googleVoice: 'ar-XA-Standard-A', 
    nativeCode: 'ar-SA',
    priority: 'medium' 
  },
  'ur': { 
    name: 'Urdu', 
    googleVoice: 'ur-IN-Standard-A', 
    nativeCode: 'ur-PK',
    priority: 'medium' 
  },
  'tr': { 
    name: 'Turkish', 
    googleVoice: 'tr-TR-Standard-A', 
    nativeCode: 'tr-TR',
    priority: 'medium' 
  },
  'pl': { 
    name: 'Polish', 
    googleVoice: 'pl-PL-Standard-A', 
    nativeCode: 'pl-PL',
    priority: 'low' 
  },
  'nl': { 
    name: 'Dutch', 
    googleVoice: 'nl-NL-Standard-A', 
    nativeCode: 'nl-NL',
    priority: 'low' 
  },
  'sv': { 
    name: 'Swedish', 
    googleVoice: 'sv-SE-Standard-A', 
    nativeCode: 'sv-SE',
    priority: 'low' 
  },
  'da': { 
    name: 'Danish', 
    googleVoice: 'da-DK-Standard-A', 
    nativeCode: 'da-DK',
    priority: 'low' 
  },
  'no': { 
    name: 'Norwegian', 
    googleVoice: 'nb-NO-Standard-A', 
    nativeCode: 'nb-NO',
    priority: 'low' 
  },
  'fi': { 
    name: 'Finnish', 
    googleVoice: 'fi-FI-Standard-A', 
    nativeCode: 'fi-FI',
    priority: 'low' 
  },
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * DES Added: Get language configuration
 */
export function getLanguageConfig(languageCode: string) {
  return SUPPORTED_LANGUAGES[languageCode as keyof typeof SUPPORTED_LANGUAGES];
}

/**
 * DES Added: Check if Google Cloud TTS is properly configured
 */
export function isGoogleTTSConfigured(config: TTSServiceConfig): boolean {
  return !!(
    config.googleCloudTTS.enabled &&
    config.googleCloudTTS.apiKey &&
    config.googleCloudTTS.apiKey !== 'YOUR_GOOGLE_CLOUD_TTS_API_KEY_HERE'
  );
}

/**
 * DES Added: Get all supported language codes
 */
export function getSupportedLanguageCodes(): string[] {
  return Object.keys(SUPPORTED_LANGUAGES);
}

/**
 * DES Added: Get languages by priority
 */
export function getLanguagesByPriority(priority: 'high' | 'medium' | 'low'): string[] {
  return Object.entries(SUPPORTED_LANGUAGES)
    .filter(([_, config]) => config.priority === priority)
    .map(([code, _]) => code);
}

export default DEFAULT_TTS_SERVICE_CONFIG;