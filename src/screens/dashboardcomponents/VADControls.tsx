/**
 * VADControls.tsx
 * ----------------------------------------------------------------------------
 * Voice Activity Detection controls component for automatic conversation mode.
 * 
 * Features:
 * - VAD sensitivity slider
 * - Real-time audio level visualization
 * - VAD state indicators
 * - Preset configuration buttons
 * - Turn switching controls
 * 
 * Props:
 * - vadResult: VAD hook result object
 * - onSensitivityChange: Callback for sensitivity changes
 * - onPresetSelect: Callback for preset selection
 * - disabled: Whether controls are disabled
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../theme';
import { VADResult, VADPresets, formatVADState } from '../hooks/useVoiceActivityDetection';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface VADControlsProps {
  /** VAD hook result object */
  vadResult: VADResult;
  /** Current sensitivity value (0.1-2.0) */
  sensitivity: number;
  /** Callback when sensitivity changes */
  onSensitivityChange: (sensitivity: number) => void;
  /** Callback when preset is selected */
  onPresetSelect: (preset: keyof typeof VADPresets) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Whether to show advanced controls */
  showAdvanced?: boolean;
}

// =============================================================================
// SENSITIVITY SLIDER COMPONENT
// =============================================================================

interface SensitivitySliderProps {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
}

const SensitivitySlider: React.FC<SensitivitySliderProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const sliderWidth = 200;
  const thumbSize = 20;
  
  // Convert value (0.1-2.0) to position (0-1)
  const normalizedValue = (value - 0.1) / (2.0 - 0.1);
  const thumbPosition = normalizedValue * (sliderWidth - thumbSize);
  
  const handlePress = (event: any) => {
    if (disabled) return;
    
    const { locationX } = event.nativeEvent;
    const newNormalizedValue = Math.max(0, Math.min(1, locationX / sliderWidth));
    const newValue = 0.1 + newNormalizedValue * (2.0 - 0.1);
    onValueChange(Number(newValue.toFixed(1)));
  };
  
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
      }}>
        <Text style={{
          fontSize: 12,
          color: colors.textSecondary,
          marginRight: spacing.sm,
        }}>
          Low
        </Text>
        <TouchableOpacity
          onPress={handlePress}
          disabled={disabled}
          style={{
            width: sliderWidth,
            height: 30,
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {/* Track */}
          <View style={{
            height: 4,
            backgroundColor: '#E5E7EB',
            borderRadius: 2,
            position: 'relative',
          }}>
            {/* Active track */}
            <View style={{
              height: 4,
              width: thumbPosition + thumbSize / 2,
              backgroundColor: colors.brand,
              borderRadius: 2,
            }} />
            
            {/* Thumb */}
            <View style={{
              position: 'absolute',
              left: thumbPosition,
              top: -8,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: colors.brand,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }} />
          </View>
        </TouchableOpacity>
        <Text style={{
          fontSize: 12,
          color: colors.textSecondary,
          marginLeft: spacing.sm,
        }}>
          High
        </Text>
      </View>
      <Text style={{
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        Sensitivity: {value}x
      </Text>
    </View>
  );
};

// =============================================================================
// AUDIO LEVEL METER COMPONENT
// =============================================================================

interface AudioLevelMeterProps {
  level: number;
  isSpeaking: boolean;
  width?: number;
  height?: number;
}

const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({
  level,
  isSpeaking,
  width = 150,
  height = 8,
}) => {
  const meterColor = isSpeaking ? colors.brand : '#10B981';
  const levelWidth = Math.max(2, level * width);
  
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width,
        height,
        backgroundColor: '#F3F4F6',
        borderRadius: height / 2,
        overflow: 'hidden',
        marginBottom: 4,
      }}>
        <View style={{
          width: levelWidth,
          height: '100%',
          backgroundColor: meterColor,
          borderRadius: height / 2,
        }} />
      </View>
      <Text style={{
        fontSize: 10,
        color: colors.textSecondary,
      }}>
        {Math.round(level * 100)}%
      </Text>
    </View>
  );
};

// =============================================================================
// VAD STATE INDICATOR COMPONENT
// =============================================================================

interface VADStateIndicatorProps {
  state: VADResult['state'];
  _isSpeaking: boolean;
  currentDuration: number;
}

const VADStateIndicator: React.FC<VADStateIndicatorProps> = ({
  state,
  _isSpeaking,
  currentDuration,
}) => {
  const getStateColor = () => {
    switch (state) {
      case 'listening': return '#6B7280';
      case 'speech': return '#EF4444';
      case 'silence': return '#F59E0B';
      case 'turn_complete': return '#10B981';
      case 'error': return '#EF4444';
      default: return '#6B7280';
    }
  };
  
  const stateColor = getStateColor();
  const formattedDuration = currentDuration > 0 ? `${(currentDuration / 1000).toFixed(1)}s` : '';
  
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: stateColor + '20',
      borderColor: stateColor,
      borderWidth: 1,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
    }}>
      <View style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: stateColor,
        marginRight: 6,
      }} />
      <Text style={{
        fontSize: 11,
        fontWeight: '600',
        color: stateColor,
      }}>
        {formatVADState(state)}
      </Text>
      {formattedDuration && (
        <Text style={{
          fontSize: 10,
          color: stateColor,
          marginLeft: 4,
        }}>
          ({formattedDuration})
        </Text>
      )}
    </View>
  );
};

// =============================================================================
// PRESET BUTTONS COMPONENT
// =============================================================================

interface PresetButtonsProps {
  onPresetSelect: (preset: keyof typeof VADPresets) => void;
  disabled?: boolean;
}

const PresetButtons: React.FC<PresetButtonsProps> = ({
  onPresetSelect,
  disabled = false,
}) => {
  const presets: { key: keyof typeof VADPresets; label: string; description: string }[] = [
    { key: 'sensitive', label: 'Sensitive', description: 'Quiet rooms' },
    { key: 'balanced', label: 'Balanced', description: 'Normal use' },
    { key: 'conservative', label: 'Conservative', description: 'Noisy rooms' },
  ];
  
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    }}>
      {presets.map((preset) => (
        <TouchableOpacity
          key={preset.key}
          onPress={() => onPresetSelect(preset.key)}
          disabled={disabled}
          style={{
            flex: 1,
            backgroundColor: '#F9FAFB',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 4,
            marginHorizontal: 2,
            alignItems: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: colors.textPrimary,
            textAlign: 'center',
          }}>
            {preset.label}
          </Text>
          <Text style={{
            fontSize: 10,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 2,
          }}>
            {preset.description}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// =============================================================================
// MAIN VAD CONTROLS COMPONENT
// =============================================================================

const VADControls: React.FC<VADControlsProps> = ({
  vadResult,
  sensitivity,
  onSensitivityChange,
  onPresetSelect,
  disabled = false,
  showAdvanced = false,
}) => {
  const { state, audioLevel, isSpeaking, currentDuration } = vadResult;
  
  // Determine if VAD is active
  const isActive = state !== 'idle';
  
  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: spacing.md,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '700',
          color: colors.textPrimary,
        }}>
          Voice Detection
        </Text>
        <VADStateIndicator
          state={state}
          _isSpeaking={isSpeaking}
          currentDuration={currentDuration}
        />
      </View>
      
      {/* Audio Level Meter */}
      <View style={{
        alignItems: 'center',
        marginBottom: spacing.md,
      }}>
        <Text style={{
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        }}>
          Audio Level
        </Text>
        <AudioLevelMeter
          level={audioLevel}
          isSpeaking={isSpeaking}
          width={200}
          height={8}
        />
      </View>
      
      {/* Sensitivity Slider */}
      <View style={{
        alignItems: 'center',
        marginBottom: spacing.md,
      }}>
        <Text style={{
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        }}>
          Detection Sensitivity
        </Text>
        <SensitivitySlider
          value={sensitivity}
          onValueChange={onSensitivityChange}
          disabled={disabled || !isActive}
        />
      </View>
      
      {/* Preset Buttons */}
      {showAdvanced && (
        <View>
          <Text style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginBottom: spacing.xs,
            textAlign: 'center',
          }}>
            Quick Presets
          </Text>
          <PresetButtons
            onPresetSelect={onPresetSelect}
            disabled={disabled}
          />
        </View>
      )}
      
      {/* Status Information */}
      {isActive && (
        <View style={{
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: '#F1F2F4',
        }}>
          <Text style={{
            fontSize: 11,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 16,
          }}>
            {state === 'listening' && 'Waiting for speech to begin...'}
            {state === 'speech' && 'Recording speech - keep talking'}
            {state === 'silence' && 'Silence detected - processing soon'}
            {state === 'turn_complete' && 'Turn completed - ready for next speaker'}
            {state === 'error' && 'Error occurred - please restart'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default React.memo(VADControls);