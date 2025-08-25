/**
 * RecentSessions.tsx
 * ----------------------------------------------------------------------------
 * Dashboard-friendly recent list:
 *  - Shows only the latest `maxVisible` items inline (default 5)
 *  - If there are more, renders a "Show all (N)" button
 *  - Full list opens in a modal with internal scrolling (no dashboard scroll bloat)
 *  - NEW: Export button per row (driven by parent via onExport / exportingId / exportedIds)
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { colors, spacing } from '../../theme';

// Optional audio module (guarded)
let Sound: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sound = require('react-native-sound');
} catch {}

export type RecentSessionItem = {
  id: string;
  startedAt?: string;
  pair?: { from: string; to: string };
  durationSec?: number;
};

export type RecentSessionsProps = {
  data: RecentSessionItem[];
  httpBase: string;
  onOpenTranscript: (sessionId: string) => void;
  maxVisible?: number;
  onSeeAll?: () => void;

  // NEW (export)
  onExport?: (sessionId: string) => void | Promise<boolean>;
  exportingId?: string | null;
  exportedIds?: Record<string, true>;
};

/* ----------------------------- Inline Icons -------------------------------- */

function PlayIcon({
  size = 12,
  color = '#fff',
}: {
  size?: number;
  color?: string;
}) {
  const half = size / 2;
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: half,
        borderBottomWidth: half,
        borderLeftWidth: size,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
      }}
    />
  );
}

function DocIcon({
  size = 14,
  color = colors.textPrimary,
}: {
  size?: number;
  color?: string;
}) {
  const stroke = 2;
  return (
    <View
      style={{
        width: size * 0.9,
        height: size * 1.15,
        borderWidth: stroke,
        borderColor: color,
        borderRadius: 3,
        justifyContent: 'center',
        paddingHorizontal: 3,
      }}
    >
      <View
        style={{
          height: stroke,
          backgroundColor: color,
          opacity: 0.9,
          marginBottom: 4,
        }}
      />
      <View
        style={{
          height: stroke,
          backgroundColor: color,
          width: '70%',
          opacity: 0.9,
        }}
      />
    </View>
  );
}

// NEW: simple export icon (tray + up arrow), matches your light-outline style
// Replace old ExportIcon with an email/envelope outline
function ExportIcon({
  size = 18,
  color = colors.textPrimary,
}: {
  size?: number;
  color?: string;
}) {
  const stroke = 2;
  const w = size;
  const h = Math.round(size * 0.75);

  return (
    <View
      style={{
        width: w,
        height: h,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Envelope body (outline) */}
      <View
        style={{
          position: 'absolute',
          width: w,
          height: h,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: 4,
          backgroundColor: 'transparent',
        }}
      />

      {/* Flap (two diagonal strokes forming a “V”) */}
      <View
        style={{
          position: 'absolute',
          top: h * 0.22,
          left: w * 0.12,
          width: w * 0.38,
          borderTopWidth: stroke,
          borderTopColor: color,
          transform: [{ rotate: '32deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: h * 0.22,
          right: w * 0.12,
          width: w * 0.38,
          borderTopWidth: stroke,
          borderTopColor: color,
          transform: [{ rotate: '-32deg' }],
        }}
      />
    </View>
  );
}

/* --------------------------------- Row ------------------------------------- */

function Row({
  item,
  onPlay,
  onView,
  onExport,
  loading,
  exporting,
  exported,
}: {
  item: RecentSessionItem;
  onPlay: (id: string) => void;
  onView: (id: string) => void;
  onExport?: (id: string) => void;
  loading?: boolean;
  exporting?: boolean;
  exported?: boolean;
}) {
  const when = item.startedAt ? new Date(item.startedAt).toLocaleString() : '';
  const meta = [
    when,
    typeof item.durationSec === 'number' ? `${item.durationSec}s` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const exportDisabled = !!exporting || !!exported || !onExport;

  return (
    <View style={{ paddingVertical: spacing.md }}>
      {/* Top row: title + meta only (full width so it won’t squeeze) */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            style={{
              fontWeight: '700',
              color: colors.textPrimary,
              fontSize: 16,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.pair?.from && item.pair?.to
              ? `${item.pair.from} → ${item.pair.to}`
              : 'Session'}
          </Text>
          {!!meta && (
            <Text
              style={{ color: colors.textSecondary, marginTop: 2 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {meta}
            </Text>
          )}
        </View>
      </View>

      {/* Second row: actions (can wrap on small screens) */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: 10,
        }}
      >
        {/* Play (dark pill) */}
        <TouchableOpacity
          onPress={() => onPlay(item.id)}
          disabled={!!loading}
          accessibilityRole="button"
          accessibilityLabel="Play interpreted audio"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.black,
            borderRadius: 999,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginRight: 8,
            marginBottom: 8,
            minWidth: 100,
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <PlayIcon size={12} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>
                Play
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* View (light pill) */}
        <TouchableOpacity
          onPress={() => onView(item.id)}
          disabled={!!loading}
          accessibilityRole="button"
          accessibilityLabel="View transcript"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.white,
            borderRadius: 999,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            justifyContent: 'center',
            marginRight: 8,
            marginBottom: 8,
          }}
        >
          <DocIcon size={14} color={colors.textPrimary} />
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '700',
              marginLeft: 8,
            }}
          >
            View
          </Text>
        </TouchableOpacity>

        {/* Export (light pill) */}
        {onExport ? (
          <TouchableOpacity
            onPress={() => onExport(item.id)}
            disabled={exportDisabled}
            accessibilityRole="button"
            accessibilityLabel="Export transcript as PDF"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.white,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: exportDisabled ? '#EEE' : '#E5E7EB',
              opacity: exportDisabled ? 0.6 : 1,
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            {exporting ? (
              <ActivityIndicator />
            ) : (
              <>
                <ExportIcon color={colors.textPrimary} />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: '700',
                    marginLeft: 6,
                  }}
                >
                  {exported ? 'Exported' : 'Export'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------- List -------------------------------------- */

function RecentSessions({
  data,
  httpBase,
  onOpenTranscript,
  maxVisible = 5,
  onSeeAll,
  onExport,
  exportingId,
  exportedIds,
}: RecentSessionsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handlePlay = useCallback(
    async (id: string) => {
      if (!Sound) {
        Alert.alert(
          'Audio playback not available',
          'To enable in-app playback, install:\n\nnpm i react-native-sound\ncd ios && npx pod-install\n\nThen rebuild the app.',
        );
        return;
      }
      try {
        setLoadingId(id);
        const url = `${httpBase}/sessions/${id}/interpreted_session.mp3`;
        await new Promise<void>((resolve, reject) => {
          const s = new Sound(url, undefined, (e: any) => {
            if (e) return reject(e);
            s.play((ok: boolean) => {
              s.release();
              ok ? resolve() : reject(new Error('Playback failed'));
            });
          });
        });
      } catch (e: any) {
        Alert.alert('Playback error', e?.message || String(e));
      } finally {
        setLoadingId(null);
      }
    },
    [httpBase],
  );

  const visible = useMemo(
    () => (Array.isArray(data) ? data.slice(0, maxVisible) : []),
    [data, maxVisible],
  );
  const extraCount = Math.max(0, (data?.length || 0) - visible.length);

  const renderRow = (item: RecentSessionItem) => (
    <Row
      item={item}
      loading={loadingId === item.id}
      onPlay={handlePlay}
      onView={onOpenTranscript}
      onExport={onExport ? id => onExport(id) as any : undefined}
      exporting={exportingId === item.id}
      exported={!!exportedIds?.[item.id]}
    />
  );

  return (
    <>
      {/* Inline, trimmed list */}
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: 16,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <FlatList
          scrollEnabled={false}
          data={visible}
          keyExtractor={s => s.id}
          renderItem={({ item }) => renderRow(item)}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#EEE' }} />
          )}
          ListEmptyComponent={
            <View style={{ paddingVertical: spacing.lg }}>
              <Text style={{ color: colors.textSecondary }}>
                No sessions yet.
              </Text>
            </View>
          }
          ListFooterComponent={
            extraCount > 0 ? (
              <TouchableOpacity
                onPress={() => (onSeeAll ? onSeeAll() : setShowAll(true))}
                style={{
                  alignSelf: 'center',
                  marginTop: 6,
                  marginBottom: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: '#F3F4F6',
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  Show all ({extraCount})
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      </View>

      {/* Full list modal (only if onSeeAll not provided) */}
      <Modal
        visible={showAll}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAll(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <View
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: colors.white,
              maxHeight: '75%',
              paddingBottom: spacing.lg,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: '#EEE',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.textPrimary,
                }}
              >
                All sessions
              </Text>
              <TouchableOpacity onPress={() => setShowAll(false)}>
                <Text style={{ fontSize: 22, color: colors.textPrimary }}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {/* Full list */}
            <FlatList
              data={data}
              keyExtractor={s => s.id}
              renderItem={({ item }) => (
                <View style={{ paddingHorizontal: spacing.lg }}>
                  <Row
                    item={item}
                    loading={loadingId === item.id}
                    onPlay={handlePlay}
                    onView={id => {
                      setShowAll(false);
                      onOpenTranscript(id);
                    }}
                    onExport={onExport ? id => onExport(id) as any : undefined}
                    exporting={exportingId === item.id}
                    exported={!!exportedIds?.[item.id]}
                  />
                </View>
              )}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: 1,
                    backgroundColor: '#EEE',
                    marginHorizontal: spacing.lg,
                  }}
                />
              )}
              ListFooterComponent={<View style={{ height: spacing.md }} />}
              contentContainerStyle={{ paddingVertical: spacing.sm }}
              scrollEnabled
              nestedScrollEnabled
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default memo(RecentSessions);
