/**
 * OpenAI API - Backend Integration
 * ----------------------------------------------------------------------------
 * All OpenAI operations should go through the backend for:
 * - API key security (keys stay on server)
 * - Rate limiting and usage tracking
 * - Centralized error handling
 * - Cost management and monitoring
 * - Model version management
 */

import { API } from '../../lib/api';

// Types
export interface TranscriptionRequest {
  audioData: string; // Base64 encoded audio
  audioFormat: 'mp3' | 'wav' | 'm4a' | 'webm';
  language?: string;
  model?: 'whisper-1';
}

export interface TranscriptionResponse {
  text: string;
  success: boolean;
  error?: string;
  language?: string;
  duration?: number;
  confidence?: number;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string; // Additional context for better translation
  model?: 'gpt-4o-mini' | 'gpt-4';
}

export interface TranslationResponse {
  translatedText: string;
  success: boolean;
  error?: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence?: number;
  tokensUsed?: number;
}

export interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: 'gpt-4o-mini' | 'gpt-4';
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
  tokensUsed?: number;
  finishReason?: string;
}

/**
 * Transcribe audio using OpenAI Whisper via backend
 */
export async function transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
  try {
    const { data } = await API.post<TranscriptionResponse>('/openai/transcribe', request);
    return data;
  } catch (error: any) {
    console.error('[OpenAI API] Transcription failed:', error);
    return {
      text: '',
      success: false,
      error: error?.response?.data?.error || error?.message || 'Transcription failed'
    };
  }
}

/**
 * Translate text using OpenAI GPT via backend
 */
export async function translateText(request: TranslationRequest): Promise<TranslationResponse> {
  try {
    const { data } = await API.post<TranslationResponse>('/openai/translate', request);
    return data;
  } catch (error: any) {
    console.error('[OpenAI API] Translation failed:', error);
    return {
      translatedText: '',
      success: false,
      error: error?.response?.data?.error || error?.message || 'Translation failed',
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage
    };
  }
}

/**
 * Chat with OpenAI GPT via backend
 */
export async function chatCompletion(request: ChatRequest): Promise<ChatResponse> {
  try {
    const { data } = await API.post<ChatResponse>('/openai/chat', request);
    return data;
  } catch (error: any) {
    console.error('[OpenAI API] Chat completion failed:', error);
    return {
      message: '',
      success: false,
      error: error?.response?.data?.error || error?.message || 'Chat completion failed'
    };
  }
}

/**
 * Get OpenAI usage statistics (if implemented on backend)
 */
export async function getOpenAIUsage(): Promise<{
  success: boolean;
  usage?: {
    tokensUsed: number;
    requestsCount: number;
    costEstimate: number;
    period: string;
    breakdown: {
      transcription: number;
      translation: number;
      chat: number;
    };
  };
  error?: string;
}> {
  try {
    const { data } = await API.get('/openai/usage');
    return data;
  } catch (error: any) {
    console.error('[OpenAI API] Failed to get usage:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Failed to get OpenAI usage'
    };
  }
}

/**
 * Test OpenAI service connectivity
 */
export async function testOpenAIService(): Promise<{
  success: boolean;
  error?: string;
  models: string[];
  status: {
    whisper: boolean;
    gpt: boolean;
  };
}> {
  try {
    const { data } = await API.get('/openai/test');
    return data;
  } catch (error: any) {
    console.error('[OpenAI API] Service test failed:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'OpenAI service test failed',
      models: [],
      status: {
        whisper: false,
        gpt: false
      }
    };
  }
}