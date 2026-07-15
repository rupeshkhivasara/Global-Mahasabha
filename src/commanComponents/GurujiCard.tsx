import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ACCENT, BG_WHITE } from '../theme';

export interface GurujiCardProps {
  name: string;
  distanceKm?: number | null;
  index: number;
  width: number;
  onPress: () => void;
}

export function formatDistance(d: number | null | undefined): string {
  const v = Number(d);
  return Number.isFinite(v) ? `${v.toFixed(1)} km` : '— km';
}

const GRADIENTS: [string, string][] = [
  ['#f8ebd5', '#d7ad42'],
  ['#fff0de', '#c2591c'],
];

export default function GurujiCard({ name, distanceKm, index, width, onPress }: GurujiCardProps) {
  const grad = GRADIENTS[index % 2];

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={onPress}
      activeOpacity={0.8}>

      {/* Art area */}
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.art}>
        <View style={styles.halo}>
          <Text style={styles.emoji}>🧘</Text>
        </View>
        <View style={styles.distBadge}>
          <Text style={styles.distText}>{formatDistance(distanceKm)}</Text>
        </View>
      </LinearGradient>

      {/* Info area */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <Text style={styles.action}>View profile  →</Text>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BG_WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1e2d3',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6b2508',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 3 },
    }),
  },

  art: {
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },

  halo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },

  distBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: BG_WHITE,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  distText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
  },

  info: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b2424',
    lineHeight: 19,
  },
  action: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
  },
});
