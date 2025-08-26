/**
 * Google Cloud Platform API - Backend Integration
 * ----------------------------------------------------------------------------
 * All GCP operations should go through the backend for:
 * - Service account key security
 * - Centralized authentication
 * - Resource management
 * - Cost optimization
 * - Unified logging and monitoring
 */

import { API } from '../../lib/api';

// Types
export interface GCPStorageUploadRequest {
  fileName: string;
  fileData: string; // Base64 encoded file
  contentType: string;
  folder?: string;
  metadata?: Record<string, string>;
}

export interface GCPStorageUploadResponse {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

export interface GCPStorageDownloadRequest {
  fileName: string;
  folder?: string;
}

export interface GCPStorageDownloadResponse {
  success: boolean;
  fileData?: string; // Base64 encoded
  contentType?: string;
  size?: number;
  error?: string;
}

export interface GCPSpeechToTextRequest {
  audioData: string; // Base64 encoded audio
  audioFormat: 'mp3' | 'wav' | 'flac' | 'webm';
  languageCode: string;
  model?: 'latest_long' | 'latest_short';
  useEnhanced?: boolean;
}

export interface GCPSpeechToTextResponse {
  transcript: string;
  success: boolean;
  error?: string;
  confidence?: number;
  languageCode?: string;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

export interface GCPTranslateRequest {
  text: string;
  sourceLanguage?: string; // Auto-detect if not provided
  targetLanguage: string;
  format?: 'text' | 'html';
}

export interface GCPTranslateResponse {
  translatedText: string;
  success: boolean;
  error?: string;
  detectedLanguage?: string;
  confidence?: number;
}

/**
 * Upload file to Google Cloud Storage via backend
 */
export async function uploadToStorage(request: GCPStorageUploadRequest): Promise<GCPStorageUploadResponse> {
  try {
    const { data } = await API.post<GCPStorageUploadResponse>('/gcp/storage/upload', request);
    return data;
  } catch (error: any) {
    console.error('[GCP API] Storage upload failed:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Storage upload failed'
    };
  }
}

/**
 * Download file from Google Cloud Storage via backend
 */
export async function downloadFromStorage(request: GCPStorageDownloadRequest): Promise<GCPStorageDownloadResponse> {
  try {
    const { data } = await API.post<GCPStorageDownloadResponse>('/gcp/storage/download', request);
    return data;
  } catch (error: any) {
    console.error('[GCP API] Storage download failed:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Storage download failed'
    };
  }
}

/**
 * Delete file from Google Cloud Storage via backend
 */
export async function deleteFromStorage(fileName: string, folder?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data } = await API.delete('/gcp/storage/delete', {
      data: { fileName, folder }
    });
    return data;
  } catch (error: any) {
    console.error('[GCP API] Storage delete failed:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Storage delete failed'
    };
  }
}

/**
 * List files in Google Cloud Storage via backend
 */
export async function listStorageFiles(folder?: string): Promise<{
  success: boolean;
  files?: Array<{
    name: string;
    size: number;
    contentType: string;
    timeCreated: string;
    updated: string;
  }>;
  error?: string;
}> {
  try {
    const params = folder ? { folder } : {};
    const { data } = await API.get('/gcp/storage/list', { params });
    return data;
  } catch (error: any) {
    console.error('[GCP API] Storage list failed:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Storage list failed'
    };
  }
}

/**
 * Convert speech to text using Google Cloud Speech-to-Text via backend
 */
export async function speechToText(request: GCPSpeechToTextRequest): Promise<GCPSpeechToTextResponse> {
  try {
    const { data } = await API.post<GCPSpeechToTextResponse>('/gcp/speech-to-text', request);
    return data;
  } catch (error: any) {
    console.error('[GCP API] Speech-to-text failed:', error);
    return {
      transcript: '',
      success: false,
      error: error?.response?.data?.error || error?.message || 'Speech-to-text failed'
    };
  }
}

/**
 * Translate text using Google Cloud Translation via backend
 */
export async function translateWithGCP(request: GCPTranslateRequest): Promise<GCPTranslateResponse> {
  try {
    const { data } = await API.post<GCPTranslateResponse>('/gcp/translate', request);
    return data;
  } catch (error: any) {
    console.error('[GCP API] Translation failed:', error);
    return {
      translatedText: '',
      success: false,
      error: error?.response?.data?.error || error?.message || 'Translation failed'
    };
  }
}

/**
 * Get GCP usage statistics via backend
 */
export async function getGCPUsage(): Promise<{
  success: boolean;
  usage?: {
    storage: {
      bytesStored: number;
      requestsCount: number;
      costEstimate: number;
    };
    speechToText: {
      minutesProcessed: number;
      requestsCount: number;
      costEstimate: number;
    };
    translation: {
      charactersTranslated: number;
      requestsCount: number;
      costEstimate: number;
    };
    textToSpeech: {
      charactersProcessed: number;
      requestsCount: number;
      costEstimate: number;
    };
    totalCost: number;
    period: string;
  };
  error?: string;
}> {
  try {
    const { data } = await API.get('/gcp/usage');
    return data;
  } catch (error: any) {
    console.error('[GCP API] Failed to get usage:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Failed to get GCP usage'
    };
  }
}

/**
 * Test GCP services connectivity via backend
 */
export async function testGCPServices(): Promise<{
  success: boolean;
  error?: string;
  services: {
    storage: boolean;
    speechToText: boolean;
    translation: boolean;
    textToSpeech: boolean;
  };
  projectId?: string;
}> {
  try {
    const { data } = await API.get('/gcp/test');
    return data;
  } catch (error: any) {
    console.error('[GCP API] Service test failed:', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'GCP service test failed',
      services: {
        storage: false,
        speechToText: false,
        translation: false,
        textToSpeech: false
      }
    };
  }
}