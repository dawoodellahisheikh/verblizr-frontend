# Backend API Specification

## Overview

This document outlines the required backend API endpoints for the Verblizr mobile application. All external service integrations (OpenAI, Google Cloud, etc.) should be handled by the backend to ensure:

- **Security**: API keys and credentials stay on the server
- **Rate Limiting**: Centralized control over API usage
- **Cost Management**: Monitor and control external API costs
- **Caching**: Optimize performance and reduce costs
- **Error Handling**: Consistent error responses
- **Logging**: Centralized monitoring and debugging

## Base Configuration

- **Base URL**: `http://localhost:4000/api` (development)
- **Production URL**: `https://your-prod-api.example.com/api`
- **Authentication**: Bearer token (JWT)
- **Content-Type**: `application/json`

## API Endpoints

### 1. Text-to-Speech (TTS) Service

#### POST `/tts/synthesize`
Synthesize speech from text using Google Cloud TTS with React Native TTS fallback.

**Request:**
```json
{
  "text": "Hello, how are you today?",
  "languageCode": "en-US",
  "voiceName": "en-US-Neural2-A", // optional
  "audioEncoding": "MP3", // optional: MP3, LINEAR16, OGG_OPUS
  "speakingRate": 1.0, // optional: 0.25-4.0
  "pitch": 0.0, // optional: -20.0 to 20.0
  "volume": 1.0 // optional: 0.0-1.0
}
```

**Response:**
```json
{
  "audioContent": "base64-encoded-audio-data",
  "audioFormat": "MP3",
  "success": true,
  "provider": "google-cloud-tts",
  "duration": 1250,
  "cached": false
}
```

#### GET `/tts/voices`
Get available voices for TTS.

**Query Parameters:**
- `languageCode` (optional): Filter by language

**Response:**
```json
{
  "voices": [
    {
      "name": "en-US-Neural2-A",
      "languageCode": "en-US",
      "ssmlGender": "FEMALE",
      "naturalSampleRateHertz": 24000
    }
  ],
  "success": true
}
```

#### GET `/tts/test`
Test TTS service connectivity.

**Response:**
```json
{
  "success": true,
  "providers": ["google-cloud-tts", "react-native-tts"],
  "status": {
    "googleCloudTTS": true,
    "reactNativeTTS": true
  }
}
```

#### GET `/tts/usage`
Get TTS usage statistics.

**Response:**
```json
{
  "success": true,
  "usage": {
    "charactersUsed": 15420,
    "requestsCount": 89,
    "costEstimate": 0.31,
    "period": "2024-01"
  }
}
```

### 2. OpenAI Services

#### POST `/openai/transcribe`
Transcribe audio using OpenAI Whisper.

**Request:**
```json
{
  "audioData": "base64-encoded-audio",
  "audioFormat": "mp3",
  "language": "en", // optional
  "model": "whisper-1" // optional
}
```

**Response:**
```json
{
  "text": "Hello, this is the transcribed text.",
  "success": true,
  "language": "en",
  "duration": 2340,
  "confidence": 0.95
}
```

#### POST `/openai/translate`
Translate text using OpenAI GPT.

**Request:**
```json
{
  "text": "Hello, how are you?",
  "sourceLanguage": "en",
  "targetLanguage": "ur",
  "context": "Casual conversation", // optional
  "model": "gpt-4o-mini" // optional
}
```

**Response:**
```json
{
  "translatedText": "سلام، آپ کیسے ہیں؟",
  "success": true,
  "sourceLanguage": "en",
  "targetLanguage": "ur",
  "confidence": 0.92,
  "tokensUsed": 15
}
```

#### POST `/openai/chat`
Chat completion using OpenAI GPT.

**Request:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is the weather like?"}
  ],
  "model": "gpt-4o-mini", // optional
  "maxTokens": 150, // optional
  "temperature": 0.7 // optional
}
```

**Response:**
```json
{
  "message": "I don't have access to real-time weather data...",
  "success": true,
  "tokensUsed": 45,
  "finishReason": "stop"
}
```

#### GET `/openai/test`
Test OpenAI service connectivity.

**Response:**
```json
{
  "success": true,
  "models": ["whisper-1", "gpt-4o-mini", "gpt-4"],
  "status": {
    "whisper": true,
    "gpt": true
  }
}
```

#### GET `/openai/usage`
Get OpenAI usage statistics.

**Response:**
```json
{
  "success": true,
  "usage": {
    "tokensUsed": 125430,
    "requestsCount": 234,
    "costEstimate": 2.45,
    "period": "2024-01",
    "breakdown": {
      "transcription": 0.85,
      "translation": 1.20,
      "chat": 0.40
    }
  }
}
```

### 3. Google Cloud Platform Services

#### POST `/gcp/storage/upload`
Upload file to Google Cloud Storage.

**Request:**
```json
{
  "fileName": "session_audio_123.mp3",
  "fileData": "base64-encoded-file-data",
  "contentType": "audio/mpeg",
  "folder": "sessions/2024-01", // optional
  "metadata": { // optional
    "sessionId": "sess_123",
    "userId": "user_456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "fileUrl": "https://storage.googleapis.com/bucket/sessions/2024-01/session_audio_123.mp3",
  "fileName": "session_audio_123.mp3",
  "size": 245760
}
```

#### POST `/gcp/storage/download`
Download file from Google Cloud Storage.

**Request:**
```json
{
  "fileName": "session_audio_123.mp3",
  "folder": "sessions/2024-01" // optional
}
```

**Response:**
```json
{
  "success": true,
  "fileData": "base64-encoded-file-data",
  "contentType": "audio/mpeg",
  "size": 245760
}
```

#### DELETE `/gcp/storage/delete`
Delete file from Google Cloud Storage.

**Request:**
```json
{
  "fileName": "session_audio_123.mp3",
  "folder": "sessions/2024-01" // optional
}
```

**Response:**
```json
{
  "success": true
}
```

#### GET `/gcp/storage/list`
List files in Google Cloud Storage.

**Query Parameters:**
- `folder` (optional): Filter by folder

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "name": "session_audio_123.mp3",
      "size": 245760,
      "contentType": "audio/mpeg",
      "timeCreated": "2024-01-15T10:30:00Z",
      "updated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST `/gcp/speech-to-text`
Convert speech to text using Google Cloud Speech-to-Text.

**Request:**
```json
{
  "audioData": "base64-encoded-audio",
  "audioFormat": "mp3",
  "languageCode": "en-US",
  "model": "latest_long", // optional
  "useEnhanced": true // optional
}
```

**Response:**
```json
{
  "transcript": "Hello, this is the transcribed text.",
  "success": true,
  "confidence": 0.95,
  "languageCode": "en-US",
  "alternatives": [
    {
      "transcript": "Hello, this is a transcribed text.",
      "confidence": 0.87
    }
  ]
}
```

#### POST `/gcp/translate`
Translate text using Google Cloud Translation.

**Request:**
```json
{
  "text": "Hello, how are you?",
  "sourceLanguage": "en", // optional (auto-detect)
  "targetLanguage": "ur",
  "format": "text" // optional: text, html
}
```

**Response:**
```json
{
  "translatedText": "سلام، آپ کیسے ہیں؟",
  "success": true,
  "detectedLanguage": "en",
  "confidence": 0.98
}
```

#### GET `/gcp/test`
Test GCP services connectivity.

**Response:**
```json
{
  "success": true,
  "services": {
    "storage": true,
    "speechToText": true,
    "translation": true,
    "textToSpeech": true
  },
  "projectId": "verblizr-prod"
}
```

#### GET `/gcp/usage`
Get GCP usage statistics.

**Response:**
```json
{
  "success": true,
  "usage": {
    "storage": {
      "bytesStored": 1073741824,
      "requestsCount": 450,
      "costEstimate": 0.023
    },
    "speechToText": {
      "minutesProcessed": 125.5,
      "requestsCount": 89,
      "costEstimate": 1.88
    },
    "translation": {
      "charactersTranslated": 45230,
      "requestsCount": 156,
      "costEstimate": 0.90
    },
    "textToSpeech": {
      "charactersProcessed": 23450,
      "requestsCount": 78,
      "costEstimate": 0.47
    },
    "totalCost": 3.28,
    "period": "2024-01"
  }
}
```

## Error Handling

All endpoints should return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes
- `INVALID_REQUEST`: Malformed request data
- `AUTHENTICATION_FAILED`: Invalid or missing auth token
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: External service is down
- `QUOTA_EXCEEDED`: API quota limits reached
- `INVALID_AUDIO_FORMAT`: Unsupported audio format
- `FILE_TOO_LARGE`: File exceeds size limits
- `LANGUAGE_NOT_SUPPORTED`: Unsupported language code

## Authentication

All API endpoints require authentication using JWT Bearer tokens:

```
Authorization: Bearer <jwt-token>
```

## Rate Limiting

Implement rate limiting to prevent abuse:
- **General**: 100 requests per minute per user
- **TTS**: 50 requests per minute per user
- **File Upload**: 10 requests per minute per user
- **Transcription**: 20 requests per minute per user

## Environment Variables (Backend)

The backend should use these environment variables:

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...
OPENAI_PROJECT_ID=proj_...

# Google Cloud Platform
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=verblizr-sessions

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Server
PORT=4000
NODE_ENV=production
```

## Security Considerations

1. **API Keys**: Never expose API keys to the frontend
2. **Rate Limiting**: Implement proper rate limiting
3. **Input Validation**: Validate all input data
4. **File Size Limits**: Limit file upload sizes
5. **CORS**: Configure CORS properly for production
6. **HTTPS**: Use HTTPS in production
7. **Logging**: Log all API calls for monitoring
8. **Error Messages**: Don't expose sensitive information in errors

## Implementation Priority

1. **Phase 1**: TTS endpoints (critical for app functionality)
2. **Phase 2**: OpenAI transcription and translation
3. **Phase 3**: GCP storage and additional services
4. **Phase 4**: Usage tracking and analytics
5. **Phase 5**: Advanced features and optimizations