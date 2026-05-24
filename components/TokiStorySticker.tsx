import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { formatLocationDisplay, formatTimeDisplay, getActivityEmoji, getActivityLabel } from '@/utils/tokiUtils';
import { formatDistanceDisplay } from '@/utils/distance';

export interface StickerToki {
  id: string;
  title: string;
  image?: string;
  location?: string;
  scheduledTime?: string;
  timeSlot?: string;
  category?: string;
  distance?: string | { km: number; miles: number };
}

interface Props {
  toki: StickerToki;
}

const TokiStorySticker = forwardRef<View, Props>(({ toki }, ref) => {
  const distanceLabel = toki.distance ? formatDistanceDisplay(toki.distance) : '';

  const timeLabel = toki.scheduledTime
    ? formatTimeDisplay(toki.scheduledTime)
    : toki.timeSlot || '';

  const categoryLabel = toki.category ? getActivityLabel(toki.category) : '';
  const categoryEmoji = toki.category ? getActivityEmoji(toki.category) : '';

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      {toki.image ? (
        <Image source={{ uri: toki.image }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Text style={styles.coverEmoji}>{categoryEmoji || '🎉'}</Text>
        </View>
      )}

      <View style={styles.body}>
        {categoryLabel ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>
              {categoryEmoji} {categoryLabel}
            </Text>
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>
          {toki.title}
        </Text>

        {toki.location ? (
          <View style={styles.row}>
            <MapPin size={22} color="#B49AFF" />
            <Text style={styles.rowText} numberOfLines={1}>
              {formatLocationDisplay(toki.location)}
            </Text>
          </View>
        ) : null}

        {timeLabel ? (
          <View style={styles.row}>
            <Clock size={22} color="#B49AFF" />
            <Text style={styles.rowText} numberOfLines={1}>
              {timeLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          {distanceLabel ? (
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>{distanceLabel}</Text>
            </View>
          ) : <View />}
          <Text style={styles.wordmark}>TOKI</Text>
        </View>
      </View>
    </View>
  );
});

TokiStorySticker.displayName = 'TokiStorySticker';

export const STICKER_WIDTH = 640;
export const STICKER_HEIGHT = 820;

const styles = StyleSheet.create({
  card: {
    width: STICKER_WIDTH,
    height: STICKER_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  cover: {
    width: '100%',
    height: 380,
  },
  coverFallback: {
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 120,
  },
  body: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 28,
    justifyContent: 'flex-start',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  categoryText: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 42,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rowText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distancePill: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  wordmark: {
    color: '#8B5CF6',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
});

export default TokiStorySticker;
