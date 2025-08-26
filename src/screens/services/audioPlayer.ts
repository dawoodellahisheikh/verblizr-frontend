/**
 * audioPlayer.ts
 * ----------------------------------------------------------------------------
 * Audio player service for handling TTS audio playback
 * 
 * Features:
 * - Base64 audio playback from Google Cloud TTS
 * - React Native Sound integration
 * - Playback state management
 * - Error handling and cleanup
 */

// Audio player service - no React Native imports needed for this implementation

// Optional Sound library (guarded import)
let Sound: any = null;
try {
  Sound = require('react-native-sound');
  if (Sound) {
    Sound.setCategory('Playback');
  }
} catch (error) {
  console.warn('[AudioPlayer] react-native-sound not available, using fallback');
}

export interface AudioPlayerConfig {
  volume?: number;
  enableInSilenceMode?: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  duration: number;
  currentTime: number;
}

export class AudioPlayer {
  private sound: any = null;
  private config: AudioPlayerConfig;
  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    duration: 0,
    currentTime: 0,
  };

  constructor(config: AudioPlayerConfig = {}) {
    this.config = {
      volume: 1.0,
      enableInSilenceMode: true,
      ...config,
    };
  }

  /**
   * Play audio from base64 data
   */
  async playBase64Audio(
    base64Audio: string,
    audioFormat: string = 'mp3'
  ): Promise<boolean> {
    try {
      // Clean up any existing sound
      await this.stop();

      if (!Sound) {
        console.warn('[AudioPlayer] Sound library not available');
        return false;
      }

      // Create data URI for the audio
      const audioUri = `data:audio/${audioFormat.toLowerCase()};base64,${base64Audio}`;
      
      console.log(`[AudioPlayer] Loading ${audioFormat} audio (${base64Audio.length} chars)`);

      return new Promise((resolve, reject) => {
        this.sound = new Sound(audioUri, '', (error: any) => {
          if (error) {
            console.error('[AudioPlayer] Failed to load audio:', error);
            reject(error);
            return;
          }

          // Set volume
          this.sound.setVolume(this.config.volume || 1.0);

          // Update state
          this.playbackState = {
            isPlaying: true,
            isPaused: false,
            duration: this.sound.getDuration(),
            currentTime: 0,
          };

          console.log(`[AudioPlayer] Playing audio (${this.playbackState.duration}s)`);

          // Play the sound
          this.sound.play((success: boolean) => {
            this.playbackState.isPlaying = false;
            
            if (success) {
              console.log('[AudioPlayer] Playback completed successfully');
              resolve(true);
            } else {
              console.error('[AudioPlayer] Playback failed');
              reject(new Error('Playback failed'));
            }
            
            // Clean up
            this.cleanup();
          });
        });
      });
    } catch (error) {
      console.error('[AudioPlayer] Error playing base64 audio:', error);
      return false;
    }
  }

  /**
   * Play audio from file path or URL
   */
  async playAudioFile(filePath: string): Promise<boolean> {
    try {
      await this.stop();

      if (!Sound) {
        console.warn('[AudioPlayer] Sound library not available');
        return false;
      }

      return new Promise((resolve, reject) => {
        this.sound = new Sound(filePath, Sound.MAIN_BUNDLE, (error: any) => {
          if (error) {
            console.error('[AudioPlayer] Failed to load audio file:', error);
            reject(error);
            return;
          }

          this.sound.setVolume(this.config.volume || 1.0);
          
          this.playbackState = {
            isPlaying: true,
            isPaused: false,
            duration: this.sound.getDuration(),
            currentTime: 0,
          };

          this.sound.play((success: boolean) => {
            this.playbackState.isPlaying = false;
            
            if (success) {
              resolve(true);
            } else {
              reject(new Error('Playback failed'));
            }
            
            this.cleanup();
          });
        });
      });
    } catch (error) {
      console.error('[AudioPlayer] Error playing audio file:', error);
      return false;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (this.sound && this.playbackState.isPlaying) {
      this.sound.pause();
      this.playbackState.isPlaying = false;
      this.playbackState.isPaused = true;
      console.log('[AudioPlayer] Playback paused');
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.sound && this.playbackState.isPaused) {
      this.sound.play();
      this.playbackState.isPlaying = true;
      this.playbackState.isPaused = false;
      console.log('[AudioPlayer] Playback resumed');
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (this.sound) {
      this.sound.stop();
      this.cleanup();
      console.log('[AudioPlayer] Playback stopped');
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.sound) {
      this.sound.setVolume(this.config.volume);
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    if (this.sound && this.playbackState.isPlaying) {
      this.playbackState.currentTime = this.sound.getCurrentTime();
    }
    return { ...this.playbackState };
  }

  /**
   * Check if audio player is available
   */
  isAvailable(): boolean {
    return Sound !== null;
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.sound) {
      this.sound.release();
      this.sound = null;
    }
    
    this.playbackState = {
      isPlaying: false,
      isPaused: false,
      duration: 0,
      currentTime: 0,
    };
  }

  /**
   * Destroy the player and clean up all resources
   */
  destroy(): void {
    this.stop();
    this.cleanup();
  }
}

// Singleton instance
let audioPlayerInstance: AudioPlayer | null = null;

/**
 * Get or create audio player instance
 */
export function getAudioPlayer(config?: AudioPlayerConfig): AudioPlayer {
  if (!audioPlayerInstance) {
    audioPlayerInstance = new AudioPlayer(config);
  }
  return audioPlayerInstance;
}

/**
 * Quick helper to play base64 audio
 */
export async function playBase64Audio(
  base64Audio: string,
  audioFormat: string = 'mp3'
): Promise<boolean> {
  const player = getAudioPlayer();
  return player.playBase64Audio(base64Audio, audioFormat);
}

export default AudioPlayer;