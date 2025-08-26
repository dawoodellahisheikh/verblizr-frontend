// src/screens/apis/keys.ts
// Central configuration for API endpoints, public keys, and feature flags.
// ⚠️ SECURITY: Do NOT put real API secrets in the app bundle. Keep secrets on the server.

import { Platform } from 'react-native';
// Uncomment when using react-native-config for environment variables
// import Config from 'react-native-config';

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

const isDev = __DEV__;
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// Host helpers (simulator/emulator friendly)
const DEV_HOST = Platform.select({ 
  ios: 'localhost', 
  android: '10.0.2.2' 
})!;

// =============================================================================
// API ENDPOINTS
// =============================================================================

export const ENDPOINTS = {
  // Main API endpoints
  API_BASE: isDev 
    ? `http://${DEV_HOST}:4000/api`
    : 'https://your-prod-api.example.com/api',
    
  // WebSocket for real-time audio processing
  WS_URL: isDev
    ? `ws://${DEV_HOST}:8082`
    : 'wss://your-prod-ws.example.com',
    
  // Static file server for session files
  HTTP_BASE: isDev
    ? `http://${DEV_HOST}:8083`
    : 'https://your-prod-files.example.com',
    
  // Session-specific endpoints
  session: {
    transcript: (sessionId: string) =>
      `${ENDPOINTS.HTTP_BASE}/sessions/${sessionId}/transcript.json`,
    interpretedMp3: (sessionId: string) =>
      `${ENDPOINTS.HTTP_BASE}/sessions/${sessionId}/interpreted_session.mp3`,
    ttsUtterance: (sessionId: string, utteranceId: string) =>
      `${ENDPOINTS.HTTP_BASE}/sessions/${sessionId}/u_${utteranceId}.mp3`,
    sessionZip: (sessionId: string) =>
      `${ENDPOINTS.HTTP_BASE}/sessions/${sessionId}/session.zip`,
  },
} as const;

// =============================================================================
// STRIPE CONFIGURATION
// =============================================================================

export const STRIPE_CONFIG = {
  // Use test keys in development, live keys in production
  publishableKey: isDev 
    ? 'pk_test_51RuZcMF1SXqiudm2W8Jsq2WGbCNziUiUW46Ls5rinv7Lcr2E3BjZrHJKWfTLJkfm28th7ZRDnWzUdJjL9sBtcxqE00VMMozFFQ' // Your actual test key
    : 'pk_live_51234567890abcdef', // Replace with your live key when ready
    
  merchantId: 'merchant.com.yourcompany.verblizr',
  countryCode: 'US',
  currency: 'USD',
  
  // Apple Pay configuration
  applePay: {
    merchantId: 'merchant.com.yourcompany.verblizr',
    supportedNetworks: ['visa', 'mastercard', 'amex'],
    merchantCapabilities: ['3DS', 'debit', 'credit'],
  },
  
  // Google Pay configuration
  googlePay: {
    merchantId: 'your-merchant-id',
    merchantName: 'Verblizr',
    environment: isDev ? 'TEST' : 'PRODUCTION',
    allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
  },
} as const;

// =============================================================================
// BACKEND API CONFIGURATION
// =============================================================================

// All external API integrations now go through backend
// Frontend only contains UI configuration and feature flags
export const BACKEND_SERVICES = {
  // Available services (backend handles API keys and authentication)
  openai: {
    enabled: true,
    services: ['transcription', 'translation', 'chat'],
    models: {
      asr: 'whisper-1',
      translation: 'gpt-4o-mini',
      chat: 'gpt-4o-mini',
    },
    defaultParams: {
      maxTokens: 1000,
      temperature: 0.3,
    },
  },
  
  gcp: {
    enabled: true,
    services: ['storage', 'speech-to-text', 'translation', 'text-to-speech'],
    defaultParams: {
      speechModel: 'latest_long',
      useEnhanced: true,
    },
  },
  
  tts: {
    enabled: true,
    providers: ['google-cloud-tts', 'react-native-tts'],
    fallbackEnabled: true,
  },
  
  // Supported languages for all services
  supportedLanguages: {
    en: 'English',
    ur: 'Urdu',
    ar: 'Arabic',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    hi: 'Hindi',
    tr: 'Turkish',
    pl: 'Polish',
    nl: 'Dutch',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    fi: 'Finnish',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
  },
} as const;

// =============================================================================
// GOOGLE CLOUD PLATFORM CONFIGURATION
// =============================================================================

export const GCP_CONFIG = {
  // Project configuration
  projectId: 'your-gcp-project-id',
  region: 'us-central1',
  
  // Cloud Storage
  storage: {
    bucketName: 'verblizr-sessions',
    region: 'us-central1',
  },
  
  // Speech-to-Text configuration
  speechToText: {
    languageCodes: ['en-US', 'ur-PK', 'ar-SA'],
    model: 'latest_long',
    useEnhanced: true,
  },
  
  // Text-to-Speech configuration
  textToSpeech: {
    voices: {
      en: 'en-US-Standard-A',
      ur: 'ur-IN-Standard-A',
      ar: 'ar-XA-Standard-A',
    },
    audioEncoding: 'MP3',
    speakingRate: 1.0,
    pitch: 0.0,
  },
  
  // Translation API
  translate: {
    projectId: 'your-gcp-project-id',
    location: 'global',
  },
} as const;

// =============================================================================
// PUBLIC KEYS & ANALYTICS
// =============================================================================

export const PUBLIC_KEYS: {
  SENTRY_DSN?: string;
  AMPLITUDE_API_KEY?: string;
  GOOGLE_ANALYTICS_ID?: string;
  [k: string]: string | undefined;
} = {
  // Uncomment and add your keys when ready
  // SENTRY_DSN: Config.SENTRY_DSN,
  // AMPLITUDE_API_KEY: Config.AMPLITUDE_API_KEY,
  // GOOGLE_ANALYTICS_ID: Config.GOOGLE_ANALYTICS_ID,
};

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const FEATURE_FLAGS = {
  // Audio & Translation Features
  interpretedPlayback: true,
  transcriptModal: true,
  speedTests: true,
  autoLID: true,
  sessionArchiving: true,
  
  // Payment Features
  applePay: isIOS,
  googlePay: isAndroid,
  stripePayments: true,
  
  // Cloud Features
  cloudUpload: true,
  emailDelivery: true,
  
  // Development Features
  debugMode: isDev,
  mockData: isDev,
  
  // AI Features
  openaiIntegration: true,
  gcpIntegration: false, // Enable when GCP is configured
  
  // Analytics
  analytics: !isDev,
  crashReporting: !isDev,
} as const;

// =============================================================================
// AUDIO CONFIGURATION
// =============================================================================

export const AUDIO_CONFIG = {
  // Recording settings
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  format: 'PCM',
  
  // Processing settings
  chunkSize: 4096,
  vadThreshold: 0.5,
  silenceTimeout: 2000, // ms
  maxRecordingDuration: 3600000, // 1 hour in ms
  
  // Playback settings
  playbackVolume: 1.0,
  playbackRate: 1.0,
} as const;

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

export const SESSION_CONFIG = {
  // Timeout settings
  timeoutMinutes: 30,
  maxDurationMinutes: 60,
  
  // File size limits
  maxFileSizeMB: 100,
  maxSessionSizeMB: 500,
  
  // Archive settings
  archiveFormat: 'zip',
  includeAudio: true,
  includeTranscript: true,
  includeTTS: true,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the appropriate API endpoint based on environment
 */
export const getApiEndpoint = (path: string): string => {
  return `${ENDPOINTS.API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
};

/**
 * Get the appropriate WebSocket URL based on environment
 */
export const getWebSocketUrl = (): string => {
  return ENDPOINTS.WS_URL;
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature];
};

/**
 * Get Stripe publishable key for current environment
 */
export const getStripePublishableKey = (): string => {
  return STRIPE_CONFIG.publishableKey;
};

// =============================================================================
// ENVIRONMENT VARIABLE INTEGRATION
// =============================================================================

/**
 * To use environment variables with react-native-config:
 * 
 * 1. Install: npm install react-native-config
 * 2. Create .env file in project root
 * 3. Uncomment the import at the top of this file
 * 4. Replace hardcoded values with Config.VARIABLE_NAME
 * 
 * Example:
 *   export const API_BASE_URL = Config.API_BASE_URL || ENDPOINTS.API_BASE;
 *   export const STRIPE_PUBLISHABLE_KEY = Config.STRIPE_PUBLISHABLE_KEY || STRIPE_CONFIG.publishableKey;
 * 
 * For secrets (API keys, tokens), always keep them on the backend server.
 * Never put sensitive credentials in the mobile app bundle.
 */
