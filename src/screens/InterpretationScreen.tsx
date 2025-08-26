// src/screens/InterpretationScreen.tsx
// ----------------------------------------------------------------------------
// Dedicated screen for automatic conversation interpretation mode.
// Features automatic language detection, hands-free operation, and turn-based conversation flow.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { g } from '../styles/global';
import { colors, spacing } from '../theme';

// DES Added: Import centralized background component and Footer
import { AppBackground, Footer } from '../components';

import {
  RecordingControls,
  DurationCard,
  ConfirmStopSheet,
  TranscriptModal,
  RecentSessions,
} from './dashboardcomponents';


import { useTurnInterpreter } from './hooks/useTurnInterpreter';
import { useVoiceActivityDetection, VADPresets } from './hooks/useVoiceActivityDetection';
// DES Added: Import new audio hooks for live recording functionality
import useAudioRecording from './hooks/useAudioRecording';
import useTextToSpeech from './hooks/useTextToSpeech';
import useAudioManager from './hooks/useAudioManager';
import { DEFAULT_TTS_SERVICE_CONFIG, isGoogleTTSConfigured } from './config/ttsConfig';
import VADControls from './dashboardcomponents/VADControls';

// Storage for persistent sessions
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const STORAGE_KEY = 'interpretation_sessions';
const MAX_STORED_SESSIONS = 50;

import type {
  TranscriptUtterance as Utterance,
} from './dashboardcomponents';

// Optional export libs (guarded)
let RNHTML2PDF: any = null;
let RNShareLib: any = null;
try {
  const mod = require('react-native-html-to-pdf');
  RNHTML2PDF = mod?.default ?? mod;
} catch {}
try {
  const mod = require('react-native-share');
  RNShareLib = mod?.default ?? mod;
} catch {}

// =============================================================================
// UTILITY FUNCTIONS FOR EXPORT
// =============================================================================

/**
 * Convert conversation turns to transcript format
 */
function conversationToTranscript(turns: ConversationTurn[]): Utterance[] {
  return turns.map((turn, index) => ({
    id: turn.id || `turn_${index}`,
    asr: turn.originalText,
    mt: turn.translatedText,
    lid: turn.detectedLanguage.code,
  }));
}

/**
 * Generate HTML transcript for PDF export
 */
function transcriptToHTML(
  utterances: Utterance[],
  languages: { speakerA?: DetectedLanguage; speakerB?: DetectedLanguage },
) {
  const rows = utterances
    .map(
      (u, i) => `
        <div style="margin:8px 0;">
          <div style="font-weight:600;color:#111;">Speaker ${i % 2 === 0 ? 'A' : 'B'} (${i % 2 === 0 ? languages.speakerA?.name || 'Unknown' : languages.speakerB?.name || 'Unknown'})</div>
          <div style="color:#111;">${(u.asr || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')}</div>
          ${
            u.mt
              ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">→ ${u.mt
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')}</div>`
              : ''
          }
        </div>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"/>
    <style>body{font-family:-apple-system,Inter,system-ui; padding:20px; color:#111}</style>
    </head><body><h1 style="font-size:18px;margin:0 0 12px;">Verblizr Live Interpretation</h1>
    <div style="color:#6b7280;font-size:12px;margin-bottom:12px;">Automatic Conversation Mode</div>
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;">${rows}</div>
  </body></html>`;
}

/**
 * Fallback mail function for export
 */
async function openMailFallback(subject: string, body: string): Promise<boolean> {
  try {
    const { Linking } = require('react-native');
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // Fallback failed
  }
  return false;
}

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

type ConversationState = 
  | 'idle'                     // Not recording, waiting to start
  | 'waiting_for_speaker_a'    // Listening for Person A to start
  | 'recording_speaker_a'      // Person A is speaking
  | 'processing_a_to_b'        // Translating A's speech for B
  | 'playing_translation_b'    // Playing translation to Person B
  | 'waiting_for_speaker_b'    // Listening for Person B to start
  | 'recording_speaker_b'      // Person B is speaking
  | 'processing_b_to_a'        // Translating B's speech for A
  | 'playing_translation_a'    // Playing translation to Person A
  | 'paused'                   // Conversation paused by user
  | 'error';                   // Error state

type DetectedLanguage = {
  code: string;
  name: string;
  confidence: number;
};

type ConversationTurn = {
  id: string;
  speaker: 'A' | 'B';
  originalText: string;
  translatedText: string;
  detectedLanguage: DetectedLanguage;
  timestamp: string;
  duration: number;
};

// =============================================================================
// CONVERSATION FLOW INDICATOR COMPONENT
// =============================================================================

interface ConversationFlowProps {
  state: ConversationState;
  currentSpeaker: 'A' | 'B' | null;
  detectedLanguages: {
    speakerA?: DetectedLanguage;
    speakerB?: DetectedLanguage;
  };
  audioLevels: {
    speakerA: number;
    speakerB: number;
  };
}

const ConversationFlowIndicator: React.FC<ConversationFlowProps> = ({
  state,
  currentSpeaker,
  detectedLanguages,
  audioLevels,
}) => {
  const getStateMessage = () => {
    switch (state) {
      case 'idle':
        return 'Tap to start conversation';
      case 'waiting_for_speaker_a':
        return 'Waiting for first speaker...';
      case 'recording_speaker_a':
        return 'Person A is speaking...';
      case 'processing_a_to_b':
        return 'Translating for Person B...';
      case 'playing_translation_b':
        return 'Playing translation to Person B';
      case 'waiting_for_speaker_b':
        return 'Waiting for Person B to respond...';
      case 'recording_speaker_b':
        return 'Person B is speaking...';
      case 'processing_b_to_a':
        return 'Translating for Person A...';
      case 'playing_translation_a':
        return 'Playing translation to Person A';
      case 'paused':
        return 'Conversation paused';
      case 'error':
        return 'Error occurred';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'recording_speaker_a':
      case 'recording_speaker_b':
        return '#EF4444'; // Red for recording
      case 'processing_a_to_b':
      case 'processing_b_to_a':
        return '#3B82F6'; // Blue for processing
      case 'playing_translation_a':
      case 'playing_translation_b':
        return '#10B981'; // Green for playing
      case 'paused':
        return '#F59E0B'; // Yellow for paused
      case 'error':
        return '#EF4444'; // Red for error
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: spacing.lg,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    }}>
      {/* Status message */}
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{
          backgroundColor: getStatusColor() + '20',
          borderColor: getStatusColor(),
          borderWidth: 1,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 999,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <View style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: getStatusColor(),
            marginRight: 6,
          }} />
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: getStatusColor(),
          }}>
            {getStateMessage()}
          </Text>
        </View>
      </View>

      {/* Speaker indicators */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Person A */}
        <View style={{
          flex: 1,
          alignItems: 'center',
          opacity: currentSpeaker === 'A' ? 1 : 0.5,
        }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: currentSpeaker === 'A' ? '#EF4444' : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xs,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: currentSpeaker === 'A' ? '#FFFFFF' : colors.textSecondary,
            }}>
              A
            </Text>
          </View>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.textPrimary,
            textAlign: 'center',
          }}>
            Person A
          </Text>
          {detectedLanguages.speakerA && (
            <Text style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: 'center',
            }}>
              {detectedLanguages.speakerA.name}
            </Text>
          )}
          {/* Audio level indicator */}
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: '#F3F4F6',
            borderRadius: 2,
            marginTop: 4,
            overflow: 'hidden',
          }}>
            <View style={{
              width: `${audioLevels.speakerA * 100}%`,
              height: '100%',
              backgroundColor: '#EF4444',
            }} />
          </View>
        </View>

        {/* Flow arrow */}
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: spacing.md,
        }}>
          <Text style={{
            fontSize: 24,
            color: colors.textSecondary,
          }}>
            {currentSpeaker === 'A' ? '→' : currentSpeaker === 'B' ? '←' : '↔'}
          </Text>
        </View>

        {/* Person B */}
        <View style={{
          flex: 1,
          alignItems: 'center',
          opacity: currentSpeaker === 'B' ? 1 : 0.5,
        }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: currentSpeaker === 'B' ? '#EF4444' : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xs,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: currentSpeaker === 'B' ? '#FFFFFF' : colors.textSecondary,
            }}>
              B
            </Text>
          </View>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.textPrimary,
            textAlign: 'center',
          }}>
            Person B
          </Text>
          {detectedLanguages.speakerB && (
            <Text style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: 'center',
            }}>
              {detectedLanguages.speakerB.name}
            </Text>
          )}
          {/* Audio level indicator */}
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: '#F3F4F6',
            borderRadius: 2,
            marginTop: 4,
            overflow: 'hidden',
          }}>
            <View style={{
              width: `${audioLevels.speakerB * 100}%`,
              height: '100%',
              backgroundColor: '#EF4444',
            }} />
          </View>
        </View>
      </View>
    </View>
  );
};

// =============================================================================
// CONVERSATION HISTORY COMPONENT
// =============================================================================

interface ConversationHistoryProps {
  turns: ConversationTurn[];
  maxVisible?: number;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  turns,
  maxVisible = 5,
}) => {
  const visibleTurns = turns.slice(0, maxVisible);

  if (visibleTurns.length === 0) {
    return (
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: spacing.lg,
        marginHorizontal: spacing.xl,
        alignItems: 'center',
      }}>
        <Text style={{
          color: colors.textSecondary,
          fontSize: 14,
        }}>
          Conversation history will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: spacing.lg,
      marginHorizontal: spacing.xl,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
      }}>
        <View style={{
          width: 6,
          height: 24,
          borderRadius: 999,
          backgroundColor: colors.black,
          marginRight: 10,
        }} />
        <Text style={{
          fontSize: 18,
          fontWeight: '800',
          color: colors.textPrimary,
          flex: 1,
        }}>
          Recent Conversation
        </Text>
        <View style={{
          backgroundColor: '#F3F4F6',
          borderRadius: 999,
          paddingVertical: 4,
          paddingHorizontal: 10,
        }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {turns.length}
          </Text>
        </View>
      </View>

      {visibleTurns.map((turn, index) => (
        <View key={turn.id} style={{
          marginBottom: index < visibleTurns.length - 1 ? spacing.md : 0,
          paddingBottom: index < visibleTurns.length - 1 ? spacing.md : 0,
          borderBottomWidth: index < visibleTurns.length - 1 ? 1 : 0,
          borderBottomColor: '#F1F2F4',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: turn.speaker === 'A' ? '#EF4444' : '#3B82F6',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.sm,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#FFFFFF',
              }}>
                {turn.speaker}
              </Text>
            </View>
            <Text style={{
              fontSize: 12,
              color: colors.textSecondary,
              flex: 1,
            }}>
              {turn.detectedLanguage.name} • {new Date(turn.timestamp).toLocaleTimeString()}
            </Text>
          </View>
          <Text style={{
            fontSize: 14,
            color: colors.textPrimary,
            marginBottom: spacing.xs,
            lineHeight: 20,
          }}>
            {turn.originalText}
          </Text>
          <Text style={{
            fontSize: 13,
            color: colors.textSecondary,
            fontStyle: 'italic',
            lineHeight: 18,
          }}>
            → {turn.translatedText}
          </Text>
        </View>
      ))}
    </View>
  );
};

// =============================================================================
// MAIN INTERPRETATION SCREEN COMPONENT
// =============================================================================

export default function InterpretationScreen() {
  // State management
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [currentSpeaker, setCurrentSpeaker] = useState<'A' | 'B' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [detectedLanguages, setDetectedLanguages] = useState<{
    speakerA?: DetectedLanguage;
    speakerB?: DetectedLanguage;
  }>({});
  const [audioLevels, setAudioLevels] = useState({ speakerA: 0, speakerB: 0 });
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [vadSensitivity, setVadSensitivity] = useState(1.0);
  const [showAdvancedVAD, _setShowAdvancedVAD] = useState(false);
  
  // Transcript export state
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptUtterances, setTranscriptUtterances] = useState<Utterance[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);
  // DES Added: Export state management to track which sessions have been exported
  const [exportedIds, setExportedIds] = useState<Record<string, true>>({});
  
  // Recent sessions state (similar to DashboardScreen)
  const [recentSessions, setRecentSessions] = useState<Array<{
    id: string;
    startedAt: string;
    durationSec: number;
    turnCount: number;
    languages: {
      speakerA?: DetectedLanguage;
      speakerB?: DetectedLanguage;
    };
    status: 'completed';
  }>>([]);
  
  // Loading state for better UX
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Demo sessions for first-time users
  const createDemoSessions = useCallback(() => {
    const now = new Date();
    const demoSessions = [
      {
        id: 'demo_session_1',
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        durationSec: 45,
        turnCount: 6,
        languages: {
          speakerA: { code: 'en', name: 'English', confidence: 0.95 },
          speakerB: { code: 'ur', name: 'Urdu', confidence: 0.92 },
        },
        status: 'completed' as const,
      },
      {
        id: 'demo_session_2',
        startedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        durationSec: 78,
        turnCount: 10,
        languages: {
          speakerA: { code: 'en', name: 'English', confidence: 0.97 },
          speakerB: { code: 'es', name: 'Spanish', confidence: 0.94 },
        },
        status: 'completed' as const,
      },
      {
        id: 'demo_session_3',
        startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        durationSec: 32,
        turnCount: 4,
        languages: {
          speakerA: { code: 'fr', name: 'French', confidence: 0.89 },
          speakerB: { code: 'en', name: 'English', confidence: 0.96 },
        },
        status: 'completed' as const,
      },
    ];
    return demoSessions;
  }, []);

  // Load sessions from storage on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoading(true);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const sessions = JSON.parse(stored);
          setRecentSessions(sessions.slice(0, MAX_STORED_SESSIONS));
        } else {
          // First time user - add demo sessions
          const demoSessions = createDemoSessions();
          setRecentSessions(demoSessions);
          // Save demo sessions to storage
          try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(demoSessions));
          } catch (saveError) {
            console.warn('Failed to save demo sessions:', saveError);
          }
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessionError('Failed to load previous sessions');
        // Fallback to demo sessions on error
        const demoSessions = createDemoSessions();
        setRecentSessions(demoSessions);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
  }, [createDemoSessions]);

  // Save sessions to storage whenever they change
  useEffect(() => {
    const saveSessions = async () => {
      if (recentSessions.length === 0 || isLoading) return;
      
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentSessions));
        setSessionError(null);
      } catch (error) {
        console.error('Failed to save sessions:', error);
        setSessionError('Failed to save session');
      }
    };
    
    saveSessions();
  }, [recentSessions, isLoading]);

  // Refs for timing
  const startedAt = useRef<number | null>(null);
  const elapsedBaseSec = useRef(0);





  // Mock mode state for development when WebSocket server is unavailable
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [mockTurnInProgress, setMockTurnInProgress] = useState(false);

  // Enhanced turn interpreter hook with real audio integration
  const turn = useTurnInterpreter({
    wsUrl: Platform.select({
      ios: 'ws://localhost:8082',
      android: 'ws://10.0.2.2:8082',
    })!,
    fromLang: 'auto', // Auto-detect language
    toLang: 'auto',   // Auto-detect target language
    mode: 'alternate', // Use existing mode for now, will enhance later
    onStatus: (s) => {
      // Update conversation state based on turn status
      console.log('[InterpretationScreen] Status:', s);
    },
    onPartial: () => {},
    onFinal: (result) => {
      // Handle completed turn with real translation
      if (result.asr && result.mt) {
        const newTurn: ConversationTurn = {
          id: Date.now().toString(),
          speaker: currentSpeaker || 'A',
          originalText: result.asr,
          translatedText: result.mt,
          detectedLanguage: {
            code: result.lid || 'unknown',
            name: result.lid || 'Unknown',
            confidence: 0.9,
          },
          timestamp: new Date().toISOString(),
          duration: recordSec,
        };
        
        setConversationTurns(prev => [newTurn, ...prev]);
        
        // Update detected languages
        if (currentSpeaker === 'A') {
          setDetectedLanguages(prev => ({
            ...prev,
            speakerA: newTurn.detectedLanguage,
          }));
        } else if (currentSpeaker === 'B') {
          setDetectedLanguages(prev => ({
            ...prev,
            speakerB: newTurn.detectedLanguage,
          }));
        }
        
        // DES Added: Speak the translation using TTS
        const targetLanguage = currentSpeaker === 'A' 
          ? detectedLanguages.speakerB?.code || 'en'
          : detectedLanguages.speakerA?.code || 'en';
        
        textToSpeech.speak(result.mt, targetLanguage, 'high');
      }
    },
    onError: (e) => {
      console.warn('[InterpretationScreen] Turn engine error:', e?.message || e);
      // Switch to offline mode if WebSocket connection fails
      if (e?.message?.includes('WebSocket')) {
        console.log('[InterpretationScreen] Switching to offline demo mode');
        setIsOfflineMode(true);
        setConversationState('waiting_for_speaker_a');
      } else {
        setConversationState('error');
      }
    },
  });

  // Enhanced mock conversation data for realistic demo
  const mockConversations = useMemo(() => [
    {
      A: { original: 'Hello, how are you today?', translated: 'آج آپ کیسے ہیں؟', language: { code: 'en', name: 'English', confidence: 0.95 } },
      B: { original: 'میں ٹھیک ہوں، شکریہ', translated: 'I am fine, thank you', language: { code: 'ur', name: 'Urdu', confidence: 0.92 } },
    },
    {
      A: { original: 'What time is the meeting?', translated: 'میٹنگ کا وقت کیا ہے؟', language: { code: 'en', name: 'English', confidence: 0.97 } },
      B: { original: 'میٹنگ تین بجے ہے', translated: 'The meeting is at 3 PM', language: { code: 'ur', name: 'Urdu', confidence: 0.94 } },
    },
    {
      A: { original: 'Can you help me with this?', translated: 'کیا آپ اس میں میری مدد کر سکتے ہیں؟', language: { code: 'en', name: 'English', confidence: 0.96 } },
      B: { original: 'جی ہاں، ضرور', translated: 'Yes, of course', language: { code: 'ur', name: 'Urdu', confidence: 0.98 } },
    },
    {
      A: { original: 'Where is the nearest hospital?', translated: 'قریب ترین ہسپتال کہاں ہے؟', language: { code: 'en', name: 'English', confidence: 0.93 } },
      B: { original: 'یہ یہاں سے دو کلومیٹر دور ہے', translated: 'It is two kilometers from here', language: { code: 'ur', name: 'Urdu', confidence: 0.91 } },
    },
  ], []);

  // Mock turn processing for offline mode with variety
  const processMockTurn = useCallback((speaker: 'A' | 'B') => {
    if (mockTurnInProgress) return;
    
    setMockTurnInProgress(true);
    
    // Simulate processing delay
    setTimeout(() => {
      // Use different conversation based on turn count for variety
      const conversationIndex = conversationTurns.length % mockConversations.length;
      const mockData = mockConversations[conversationIndex][speaker];
      
      const newTurn: ConversationTurn = {
        id: Date.now().toString(),
        speaker,
        originalText: mockData.original,
        translatedText: mockData.translated,
        detectedLanguage: mockData.language,
        timestamp: new Date().toISOString(),
        duration: recordSec,
      };
      
      setConversationTurns(prev => [newTurn, ...prev]);
      
      // Update detected languages
      if (speaker === 'A') {
        setDetectedLanguages(prev => ({
          ...prev,
          speakerA: mockData.language,
        }));
      } else {
        setDetectedLanguages(prev => ({
          ...prev,
          speakerB: mockData.language,
        }));
      }
      
      setMockTurnInProgress(false);
      
      // Switch to next speaker
      const nextSpeaker = speaker === 'A' ? 'B' : 'A';
      setCurrentSpeaker(nextSpeaker);
      setConversationState(nextSpeaker === 'A' ? 'waiting_for_speaker_a' : 'waiting_for_speaker_b');
    }, 1500 + Math.random() * 1000); // Variable processing time (1.5-2.5s)
  }, [mockTurnInProgress, recordSec, conversationTurns.length, mockConversations]);

  // Enhanced VAD callbacks for offline mode
  const enhancedVADCallbacks = useMemo(() => ({
    onSpeechStart: () => {
      console.log('[InterpretationScreen] Speech started');
      if (conversationState === 'waiting_for_speaker_a') {
        setConversationState('recording_speaker_a');
      } else if (conversationState === 'waiting_for_speaker_b') {
        setConversationState('recording_speaker_b');
      }
    },
    onSpeechEnd: () => {
      console.log('[InterpretationScreen] Speech ended');
    },
    onTurnComplete: (duration: number) => {
      console.log('[InterpretationScreen] Turn completed, duration:', duration);
      
      if (isOfflineMode) {
        // Handle offline mode turn completion
        if (conversationState === 'recording_speaker_a') {
          setConversationState('processing_a_to_b');
          processMockTurn('A');
        } else if (conversationState === 'recording_speaker_b') {
          setConversationState('processing_b_to_a');
          processMockTurn('B');
        }
      } else {
        // Handle online mode turn completion
        if (conversationState === 'recording_speaker_a') {
          setConversationState('processing_a_to_b');
          setCurrentSpeaker('B');
        } else if (conversationState === 'recording_speaker_b') {
          setConversationState('processing_b_to_a');
          setCurrentSpeaker('A');
        }
      }
    },
    onAudioLevel: (_level: number) => {
      // Update audio levels for current speaker
      if (currentSpeaker === 'A') {
        setAudioLevels(prev => ({ ...prev, speakerA: _level }));
      } else if (currentSpeaker === 'B') {
        setAudioLevels(prev => ({ ...prev, speakerB: _level }));
      }
    },
    onStateChange: (vadState: any) => {
      console.log('[InterpretationScreen] VAD state changed:', vadState);
    },
  }), [conversationState, currentSpeaker, isOfflineMode, processMockTurn]);

  // VAD (Voice Activity Detection) hook for automatic conversation
  const vad = useVoiceActivityDetection(enhancedVADCallbacks, {
    sensitivity: vadSensitivity,
    silenceThreshold: 0.01,
    silenceDuration: 2000,
    minSpeechDuration: 500,
  });

  // DES Added: Audio recording hook for real microphone capture
  const audioRecording = useAudioRecording({
    onAudioFrame: (pcmData) => {
      // Send audio to turn interpreter for processing
      if (turn.isRecording && !turn.isPaused) {
        turn.pushPCM(pcmData);
      }
      // Update audio manager with real audio data
      audioManager.processAudioFrame(pcmData);
    },
    onAudioLevel: (level) => {
      // Update audio levels for VAD and UI
      if (currentSpeaker === 'A') {
        setAudioLevels(prev => ({ ...prev, speakerA: level }));
      } else if (currentSpeaker === 'B') {
        setAudioLevels(prev => ({ ...prev, speakerB: level }));
      }
    },
    onError: (error) => {
      console.error('[InterpretationScreen] Audio recording error:', error);
      setConversationState('error');
    },
  }, {
    sampleRate: 16000,
    channels: 1,
    bitRate: 128000,
    audioFormat: 'wav',
    audioEncoder: 'wav',
  });

  // DES Added: Text-to-Speech hook with Google Cloud + React Native fallback
  const textToSpeech = useTextToSpeech({
    onSpeechStart: (text, language) => {
      console.log(`[InterpretationScreen] TTS started: "${text}" (${language})`);
      // Update conversation state to show playback
      if (currentSpeaker === 'A') {
        setConversationState('playing_translation_b');
      } else if (currentSpeaker === 'B') {
        setConversationState('playing_translation_a');
      }
    },
    onSpeechEnd: (text, language) => {
      console.log(`[InterpretationScreen] TTS completed: "${text}" (${language})`);
      // Switch to next speaker after TTS completes
      const nextSpeaker = currentSpeaker === 'A' ? 'B' : 'A';
      setCurrentSpeaker(nextSpeaker);
      setConversationState(nextSpeaker === 'A' ? 'waiting_for_speaker_a' : 'waiting_for_speaker_b');
    },
    onFallbackUsed: (reason) => {
      console.warn(`[InterpretationScreen] TTS fallback used: ${reason}`);
    },
    onError: (error, fallbackUsed) => {
      console.error(`[InterpretationScreen] TTS error (fallback: ${fallbackUsed}):`, error);
      // Continue conversation even if TTS fails
      const nextSpeaker = currentSpeaker === 'A' ? 'B' : 'A';
      setCurrentSpeaker(nextSpeaker);
      setConversationState(nextSpeaker === 'A' ? 'waiting_for_speaker_a' : 'waiting_for_speaker_b');
    },
  }, {
    apiKey: DEFAULT_TTS_SERVICE_CONFIG.googleCloudTTS.apiKey,
    useGoogleTTS: isGoogleTTSConfigured(DEFAULT_TTS_SERVICE_CONFIG),
    speechRate: DEFAULT_TTS_SERVICE_CONFIG.nativeTTS.defaultRate, // Use config values
    pitch: DEFAULT_TTS_SERVICE_CONFIG.nativeTTS.defaultPitch,     // Use config values
    volume: 1.0,
    timeoutMs: DEFAULT_TTS_SERVICE_CONFIG.general.timeoutMs,
  });

  // DES Added: Audio manager for coordinating recording and playback
  const audioManager = useAudioManager({
    onTurnComplete: (audioData, duration) => {
      console.log(`[InterpretationScreen] Audio turn completed: ${duration.toFixed(1)}s`);
      // This is where we would trigger the translation process
      // The turn interpreter will handle the actual translation via WebSocket
    },
    onPlaybackStart: (text, language) => {
      console.log(`[InterpretationScreen] Playback started: "${text}" (${language})`);
    },
    onPlaybackComplete: (text, language) => {
      console.log(`[InterpretationScreen] Playback completed: "${text}" (${language})`);
    },
    onAudioLevel: (_level) => {
      // Additional audio level processing if needed
    },
    onError: (error, context) => {
      console.error(`[InterpretationScreen] Audio manager error (${context}):`, error);
      setConversationState('error');
    },
  }, {
    sampleRate: 16000,
    frameSize: 1600,
    googleTTSApiKey: DEFAULT_TTS_SERVICE_CONFIG.googleCloudTTS.apiKey,
    enableAGC: true,
    enableNoiseSuppression: true,
  });

  // Recording duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording && !isPaused && startedAt.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt.current!) / 1000);
        setRecordSec(elapsedBaseSec.current + elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // Status label for recording controls
  const statusLabel = useMemo(() => {
    switch (conversationState) {
      case 'idle':
        return 'Tap to start automatic interpretation';
      case 'waiting_for_speaker_a':
      case 'waiting_for_speaker_b':
        return 'Listening for speech...';
      case 'recording_speaker_a':
      case 'recording_speaker_b':
        return 'Recording...';
      case 'processing_a_to_b':
      case 'processing_b_to_a':
        return 'Translating...';
      case 'playing_translation_a':
      case 'playing_translation_b':
        return 'Playing translation...';
      case 'paused':
        return 'Conversation paused';
      case 'error':
        return 'Error occurred';
      default:
        return 'Ready';
    }
  }, [conversationState]);

  // Actions
  const onToggleMic = useCallback(async () => {
    if (!isRecording) {
      // Start automatic conversation mode with real audio
      try {
        // DES Added: Start audio recording first
        const audioStarted = await audioRecording.startRecording();
        if (!audioStarted) {
          console.error('[InterpretationScreen] Failed to start audio recording');
          return;
        }
        
        // Start audio manager session
        const sessionStarted = await audioManager.startSession();
        if (!sessionStarted) {
          console.error('[InterpretationScreen] Failed to start audio session');
          await audioRecording.stopRecording();
          return;
        }
        
        // Start turn interpreter
        await turn.start();
        
        // Start VAD monitoring
        vad.start();
        
        setIsRecording(true);
        setIsPaused(false);
        setRecordSec(0);
        elapsedBaseSec.current = 0;
        startedAt.current = Date.now();
        setConversationState('waiting_for_speaker_a');
        setCurrentSpeaker('A');
        
        console.log('[InterpretationScreen] Live interpretation started with real audio');
        
      } catch (error) {
        console.error('[InterpretationScreen] Failed to start live interpretation:', error);
        // Cleanup on failure
        await audioRecording.stopRecording().catch(() => {});
        await audioManager.stopSession().catch(() => {});
        setConversationState('error');
      }
    } else {
      // Show confirmation to stop
      setConfirmVisible(true);
    }
  }, [isRecording, audioRecording, audioManager, turn, vad]);

  const onConfirmStop = useCallback(async () => {
    setConfirmVisible(false);
    
    // DES Added: Stop all audio systems in proper order
    try {
      // Stop TTS first
      await textToSpeech.stop();
      
      // Stop turn interpreter
      await turn.stop();
      
      // Stop VAD monitoring
      vad.stop();
      
      // Stop audio recording
      await audioRecording.stopRecording();
      
      // Stop audio manager session
      await audioManager.stopSession();
      
      console.log('[InterpretationScreen] All audio systems stopped');
      
    } catch (error) {
      console.error('[InterpretationScreen] Error stopping audio systems:', error);
    }
    
    // Save session to recent sessions if there are conversation turns
    if (conversationTurns.length > 0) {
      const sessionId = 'interpretation_' + Date.now().toString(36);
      const newSession = {
        id: sessionId,
        startedAt: new Date().toISOString(),
        durationSec: recordSec,
        turnCount: conversationTurns.length,
        languages: detectedLanguages,
        status: 'completed' as const,
      };
      
      setRecentSessions(prev => [newSession, ...prev].slice(0, 15)); // Keep last 15 sessions
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setConversationState('idle');
    setCurrentSpeaker(null);
    startedAt.current = null;
    elapsedBaseSec.current = 0;
    setRecordSec(0);
  }, [textToSpeech, turn, vad, audioRecording, audioManager, conversationTurns, recordSec, detectedLanguages]);

  const onPause = useCallback(() => {
    if (!isRecording || isPaused) return;
    
    // DES Added: Pause all audio systems
    if (startedAt.current) {
      elapsedBaseSec.current += Math.floor((Date.now() - startedAt.current) / 1000);
    }
    startedAt.current = null;
    setIsPaused(true);
    setConversationState('paused');
    
    // Pause audio systems
    vad.stop(); // Pause VAD monitoring
    void turn.pause();
    void audioRecording.pauseRecording();
    void audioManager.pauseSession();
    void textToSpeech.pause();
    
    console.log('[InterpretationScreen] All systems paused');
  }, [isRecording, isPaused, turn, vad, audioRecording, audioManager, textToSpeech]);

  const onResume = useCallback(() => {
    if (!isRecording || !isPaused) return;
    
    // DES Added: Resume all audio systems
    startedAt.current = Date.now();
    setIsPaused(false);
    setConversationState('waiting_for_speaker_a'); // Resume listening
    
    // Resume audio systems
    vad.start(); // Resume VAD monitoring
    void turn.resume();
    void audioRecording.resumeRecording();
    void audioManager.resumeSession();
    void textToSpeech.resume();
    
    console.log('[InterpretationScreen] All systems resumed');
  }, [isRecording, isPaused, turn, vad, audioRecording, audioManager, textToSpeech]);

  // VAD control handlers
  const handleSensitivityChange = useCallback((sensitivity: number) => {
    setVadSensitivity(sensitivity);
    vad.updateConfig({ sensitivity });
  }, [vad]);

  const handlePresetSelect = useCallback((preset: keyof typeof VADPresets) => {
    const presetConfig = VADPresets[preset];
    setVadSensitivity(presetConfig.sensitivity);
    vad.updateConfig(presetConfig);
  }, [vad]);

  // Transcript and export handlers
  const onOpenTranscript = useCallback(() => {
    if (conversationTurns.length === 0) {
      // Show demo transcript if no conversation yet
      const demoUtterances: Utterance[] = [
        {
          id: 'demo-1',
          asr: 'Hello, how are you today?',
          mt: 'آج آپ کیسے ہیں؟',
          lid: 'en',
        },
        {
          id: 'demo-2',
          asr: 'میں ٹھیک ہوں، شکریہ',
          mt: 'I am fine, thank you',
          lid: 'ur',
        },
      ];
      setTranscriptUtterances(demoUtterances);
    } else {
      // Convert conversation turns to transcript format
      const utterances = conversationToTranscript(conversationTurns);
      setTranscriptUtterances(utterances);
    }
    setShowTranscript(true);
  }, [conversationTurns]);

  // DES Added: Enhanced export function for current conversation
  const onExportTranscript = useCallback(async () => {
    if (conversationTurns.length === 0) {
      Alert.alert('No Conversation', 'Please record a conversation first before exporting.');
      return;
    }

    setExportingId('current_session');
    try {
      const utterances = conversationToTranscript(conversationTurns);
      const subject = 'Verblizr Live Interpretation Transcript';

      // Preferred: generate PDF when libs are present
      if (typeof RNHTML2PDF?.convert === 'function') {
        const html = transcriptToHTML(utterances, detectedLanguages);
        const { filePath } = await RNHTML2PDF.convert({
          html,
          fileName: `Verblizr_Interpretation_${Date.now()}`,
          directory: 'Documents',
        });
        if (!filePath) throw new Error('PDF generation failed');

        const url = Platform.OS === 'android' ? `file://${filePath}` : filePath;

        if (RNShareLib?.open) {
          await RNShareLib.open({
            title: subject,
            subject,
            url,
            type: 'application/pdf',
            failOnCancel: false,
          });
        } else {
          const { Share } = require('react-native');
          await Share.share({ url, title: subject, message: subject });
        }
      } else {
        // Fallback: open mail with transcript text
        const body = utterances
          .map(u => `• ${u.asr}${u.mt ? `\n  → ${u.mt}` : ''}`)
          .join('\n\n');
        const ok = await openMailFallback(subject, body);
        if (!ok) {
          Alert.alert('Export Failed', 'Unable to export transcript. Please try again.');
        }
      }
      
      // DES Added: Mark current session as exported
      setExportedIds(prev => ({ ...prev, current_session: true }));
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error?.message || 'Unable to export transcript.');
    } finally {
      setExportingId(null);
    }
  }, [conversationTurns, detectedLanguages]);

  // DES Added: Session-specific export function for recent sessions
  const onExportSessionTranscript = useCallback(async (sessionId: string) => {
    setExportingId(sessionId);
    try {
      // Find the session to get language information
      const session = recentSessions.find(s => s.id === sessionId);
      const sessionLanguages = session?.languages || detectedLanguages;
      
      // For demo/offline mode, use mock data
      // In real implementation, you would fetch actual session data
      let utterances: Utterance[];
      if (sessionId.startsWith('demo_session')) {
        // Generate demo transcript based on session ID
        const demoUtterances: Utterance[] = [
          {
            id: `${sessionId}_1`,
            asr: 'Hello, how are you today?',
            mt: 'آج آپ کیسے ہیں؟',
            lid: 'en',
          },
          {
            id: `${sessionId}_2`,
            asr: 'میں ٹھیک ہوں، شکریہ',
            mt: 'I am fine, thank you',
            lid: 'ur',
          },
          {
            id: `${sessionId}_3`,
            asr: 'Can you help me find the hospital?',
            mt: 'کیا آپ ہسپتال تلاش کرنے میں میری مدد کر سکتے ہیں؟',
            lid: 'en',
          },
          {
            id: `${sessionId}_4`,
            asr: 'جی ہاں، یہ یہاں سے پانچ منٹ کی دوری پر ہے',
            mt: 'Yes, it is five minutes away from here',
            lid: 'ur',
          },
        ];
        utterances = demoUtterances;
      } else {
        // For real sessions, convert current conversation or use stored data
        utterances = conversationToTranscript(conversationTurns);
      }

      const subject = `Verblizr Live Interpretation (${sessionLanguages.speakerA?.name || 'Speaker A'} ↔ ${sessionLanguages.speakerB?.name || 'Speaker B'})`;

      // Preferred: generate PDF when libs are present
      if (typeof RNHTML2PDF?.convert === 'function') {
        const html = transcriptToHTML(utterances, sessionLanguages);
        const { filePath } = await RNHTML2PDF.convert({
          html,
          fileName: `Verblizr_Session_${sessionId}`,
          directory: 'Documents',
        });
        if (!filePath) throw new Error('PDF generation failed');

        const url = Platform.OS === 'android' ? `file://${filePath}` : filePath;

        if (RNShareLib?.open) {
          await RNShareLib.open({
            title: subject,
            subject,
            url,
            type: 'application/pdf',
            failOnCancel: false,
          });
        } else {
          const { Share } = require('react-native');
          await Share.share({ url, title: subject, message: subject });
        }
      } else {
        // Fallback: open mail with transcript text
        const body = utterances
          .map(u => `• ${u.asr}${u.mt ? `\n  → ${u.mt}` : ''}`)
          .join('\n\n');
        const ok = await openMailFallback(subject, body);
        if (!ok) {
          Alert.alert('Export Failed', 'Unable to export transcript. Please try again.');
          return false;
        }
      }
      
      // DES Added: Mark session as exported
      setExportedIds(prev => ({ ...prev, [sessionId]: true }));
      return true;
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error?.message || 'Unable to export transcript.');
      return false;
    } finally {
      setExportingId(null);
    }
  }, [recentSessions, detectedLanguages, conversationTurns]);

  // Session handlers for recent sessions
  const onOpenSessionTranscript = useCallback((_sessionId: string) => {
    // For now, show the current conversation turns as demo
    // In a real implementation, you'd fetch the specific session data
    if (conversationTurns.length > 0) {
      const utterances = conversationToTranscript(conversationTurns);
      setTranscriptUtterances(utterances);
      setShowTranscript(true);
    } else {
      // Show demo if no current conversation
      onOpenTranscript();
    }
  }, [conversationTurns, onOpenTranscript]);

  // Clear all sessions
  const onClearAllSessions = useCallback(() => {
    Alert.alert(
      'Clear All Sessions',
      'Are you sure you want to delete all interpretation sessions? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setRecentSessions([]);
              setSessionError(null);
            } catch (error) {
              console.error('Failed to clear sessions:', error);
              setSessionError('Failed to clear sessions');
            }
          },
        },
      ]
    );
  }, []);



  return (
    <AppBackground>
      <SafeAreaView style={[g.screen]} edges={['bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={[g.title, { marginBottom: spacing.xs }]}>
                  Live Interpretation
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  Automatic conversation mode with language detection.
                </Text>
              </View>
              {isOfflineMode && (
                <View style={{
                  backgroundColor: '#FEF3C7',
                  borderColor: '#F59E0B',
                  borderWidth: 1,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#92400E',
                  }}>
                    DEMO MODE
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Conversation Flow Indicator */}
          <ConversationFlowIndicator
            state={conversationState}
            currentSpeaker={currentSpeaker}
            detectedLanguages={detectedLanguages}
            audioLevels={audioLevels}
          />

          {/* Recording Controls */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: spacing.lg,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.lg,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}>
            <RecordingControls
              isRecording={isRecording}
              isPaused={isPaused}
              statusLabel={statusLabel}
              onToggleMic={onToggleMic}
              onPause={onPause}
              onResume={onResume}
              recordingDuration={recordSec}
              maxDuration={3600} // 1 hour session limit
            />
          </View>

          {/* VAD Controls */}
          <VADControls
            vadResult={vad}
            sensitivity={vadSensitivity}
            onSensitivityChange={handleSensitivityChange}
            onPresetSelect={handlePresetSelect}
            disabled={!isRecording}
            showAdvanced={showAdvancedVAD}
          />

          {/* Duration Card */}
          <View style={{ marginHorizontal: spacing.xl }}>
            <DurationCard seconds={recordSec} />
          </View>

          {/* Current Conversation History */}
          {conversationTurns.length > 0 && (
            <>
              <View style={{
                paddingHorizontal: spacing.xl,
                marginBottom: spacing.sm,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}>
                  Current Conversation
                </Text>
              </View>
              <ConversationHistory
                turns={conversationTurns}
                maxVisible={5}
              />
            </>
          )}

          {/* User Guidance */}
          {!isRecording && conversationTurns.length === 0 && recentSessions.length === 0 && !isLoading && (
            <View style={{
              backgroundColor: '#F0F9FF',
              borderColor: '#0EA5E9',
              borderWidth: 1,
              borderRadius: 16,
              padding: spacing.lg,
              marginHorizontal: spacing.xl,
              marginTop: spacing.md,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#0369A1',
                marginBottom: spacing.sm,
                textAlign: 'center',
              }}>
                🎙️ Welcome to Live Interpretation
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#0369A1',
                textAlign: 'center',
                lineHeight: 20,
              }}>
                Tap the microphone to start an automatic conversation.{isOfflineMode ? ' Currently in demo mode - perfect for testing!' : ''}
              </Text>
              <View style={{
                marginTop: spacing.sm,
                paddingTop: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: '#BAE6FD',
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#0369A1',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  💡 Tip: Adjust VAD sensitivity above for better speech detection
                </Text>
              </View>
            </View>
          )}

          {/* Error Display */}
          {sessionError && (
            <View style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#F87171',
              borderWidth: 1,
              borderRadius: 12,
              padding: spacing.md,
              marginHorizontal: spacing.xl,
              marginTop: spacing.sm,
            }}>
              <Text style={{
                fontSize: 14,
                color: '#DC2626',
                textAlign: 'center',
              }}>
                ⚠️ {sessionError}
              </Text>
            </View>
          )}

          {/* Recent Sessions */}
          <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.xl }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 6,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: colors.black,
                  marginRight: 10,
                }} />
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: colors.textPrimary,
                }}>
                  Recent sessions
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {recentSessions.length > 0 && (
                  <TouchableOpacity
                    onPress={onClearAllSessions}
                    style={{
                      backgroundColor: '#FEF2F2',
                      borderColor: '#F87171',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      marginRight: spacing.sm,
                    }}
                  >
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: '#DC2626',
                    }}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 999,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {isLoading ? '...' : recentSessions.length}
                  </Text>
                </View>
              </View>
            </View>

            {isLoading ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: spacing.xl,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                }}>
                  Loading previous sessions...
                </Text>
              </View>
            ) : recentSessions.length > 0 ? (
              <RecentSessions
              data={recentSessions.map(session => ({
              id: session.id,
              startedAt: session.startedAt,
              durationSec: session.durationSec,
              pair: {
              from: session.languages.speakerA?.name || 'Speaker A',
              to: session.languages.speakerB?.name || 'Speaker B',
              },
              status: session.status,
              }))}
              httpBase="" // Not needed for interpretation sessions
              onOpenTranscript={onOpenSessionTranscript}
              maxVisible={5}
                // DES Added: Export functionality props to match DashboardScreen
              onExport={onExportSessionTranscript}
              exportingId={exportingId}
              exportedIds={exportedIds}
            />
            ) : (
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: spacing.xl,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: 'center',
                }}>
                  No previous interpretations yet.{"\n"}Start your first conversation above!
                </Text>
              </View>
            )}
          </View>

          {/* Export Actions */}
          {conversationTurns.length > 0 && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: spacing.lg,
              marginHorizontal: spacing.xl,
              marginTop: spacing.md,
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: spacing.md,
              }}>
                Export Conversation
              </Text>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}>
                <TouchableOpacity
                  onPress={onOpenTranscript}
                  style={{
                    flex: 1,
                    backgroundColor: '#F9FAFB',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    marginRight: spacing.sm,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.textPrimary,
                  }}>
                    View Transcript
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={onExportTranscript}
                  disabled={exportingId !== null}
                  style={{
                    flex: 1,
                    backgroundColor: exportingId === 'current_session' ? '#F3F4F6' : 
                                   exportedIds.current_session ? '#ECFDF5' : colors.brand,
                    borderColor: exportedIds.current_session ? '#A7F3D0' : 'transparent',
                    borderWidth: exportedIds.current_session ? 1 : 0,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    marginLeft: spacing.sm,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: exportingId === 'current_session' ? colors.textSecondary : 
                           exportedIds.current_session ? '#065F46' : '#FFFFFF',
                  }}>
                    {exportingId === 'current_session' ? 'Exporting...' : 
                     exportedIds.current_session ? 'Exported' : 'Export PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <Footer />

        {/* Confirm Stop Sheet */}
        <ConfirmStopSheet
          visible={confirmVisible}
          onConfirm={onConfirmStop}
          onCancel={() => setConfirmVisible(false)}
        />

        {/* Transcript Modal */}
        <TranscriptModal
          visible={showTranscript}
          onClose={() => setShowTranscript(false)}
          utterances={transcriptUtterances}
          fromLabel={detectedLanguages.speakerA?.name || 'Speaker A'}
          toLabel={detectedLanguages.speakerB?.name || 'Speaker B'}
        />
      </SafeAreaView>
    </AppBackground>
  );
}