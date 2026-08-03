import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, AccessibilityInfo, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import { IconMalaBeadRing, IconChevronRight } from './Icons';
import { font } from '../typography';
import { SHADOW_BRAND } from '../theme';
import type { ModuleConfig } from '../config/modules';

// Deeper ember/maroon gradient family — distinct from the app's saffron brand
// gradient, used only for this card (see Main_Dashboard_Implementation.md §9).
const MALA_GRADIENT: [string, string, string] = ['#f0a13c', '#d2601f', '#7a1f16'];
const MALA_GRADIENT_LOCATIONS: [number, number, number] = [0, 0.45, 1];
const MALA_DIR = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const MAROON = '#7a1f16';

const WAVE_DELAYS_MS = [0, 120, 240, 360, 480, 600];
const ORB_SIZE = 63;
const ORB_GRADIENT_ID = 'malaOrbGradient';

interface Props {
  mod: ModuleConfig;
  onPress: () => void;
}

export default function MalaEntryCard({ mod, onPress }: Props) {
  const todayCount = mod.todayCount ?? 0;
  const malaSize   = mod.malaSize ?? 108;
  const progress   = Math.min(100, Math.round((todayCount / malaSize) * 100));

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { if (mounted) setReduceMotion(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const halo  = useRef(new Animated.Value(0)).current;
  const orb   = useRef(new Animated.Value(0)).current;
  const waves = useRef(WAVE_DELAYS_MS.map(() => new Animated.Value(0))).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      [halo, orb, ...waves].forEach(v => { v.stopAnimation(); v.setValue(0); });
      return;
    }

    const pulse = (value: Animated.Value, duration: number) => Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );

    const haloLoop = pulse(halo, 2250);
    const orbLoop  = pulse(orb, 3500);
    const waveLoops = waves.map((w, i) => Animated.loop(
      Animated.sequence([
        Animated.delay(WAVE_DELAYS_MS[i]),
        Animated.timing(w, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(w, { toValue: 0, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ));

    haloLoop.start();
    orbLoop.start();
    waveLoops.forEach(l => l.start());

    return () => {
      haloLoop.stop();
      orbLoop.stop();
      waveLoops.forEach(l => l.stop());
    };
  }, [reduceMotion, halo, orb, waves]);

  const haloScale      = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const haloOpacity    = halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] });
  const orbTranslateX  = orb.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const orbTranslateY  = orb.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  const orbScale       = orb.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  const onPressIn  = () => Animated.spring(pressScale, { toValue: 0.985, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient
          colors={MALA_GRADIENT}
          locations={MALA_GRADIENT_LOCATIONS}
          start={MALA_DIR.start}
          end={MALA_DIR.end}
          style={styles.card}>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.orbWrap,
              { transform: [{ translateX: orbTranslateX }, { translateY: orbTranslateY }, { scale: orbScale }] },
            ]}>
            <Svg width={ORB_SIZE} height={ORB_SIZE} viewBox={`0 0 ${ORB_SIZE} ${ORB_SIZE}`}>
              <Defs>
                {/* Highlight sits top-left (fx/fy), falling off to a dark rim bottom-right —
                    reads as a lit sphere rather than a flat tinted disc. */}
                <RadialGradient id={ORB_GRADIENT_ID} cx="50%" cy="50%" r="55%" fx="30%" fy="26%">
                  <Stop offset="0"    stopColor="#ffffff" stopOpacity={0.95} />
                  <Stop offset="0.35" stopColor="#ffe9cf" stopOpacity={0.55} />
                  <Stop offset="0.7"  stopColor="#c96a2c" stopOpacity={0.35} />
                  <Stop offset="1"    stopColor="#3a1108" stopOpacity={0.55} />
                </RadialGradient>
              </Defs>
              <SvgCircle
                cx={ORB_SIZE / 2}
                cy={ORB_SIZE / 2}
                r={ORB_SIZE / 2}
                fill={`url(#${ORB_GRADIENT_ID})`}
              />
            </Svg>
          </Animated.View>

          <View style={styles.headerRow}>
            <View style={styles.medallion}>
              <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
              <IconMalaBeadRing size={30} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{mod.label}</Text>
              <Text style={styles.subtitle}>{mod.subtitle}</Text>
            </View>
            <IconChevronRight size={20} color="#fff" />
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Today</Text>
              <Text style={styles.progressLabel}>{todayCount} / {malaSize}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={styles.statusStrip}>
            <View style={styles.waveRow}>
              {waves.map((w, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    { transform: [{ scaleY: w.interpolate({ inputRange: [0, 1], outputRange: [0.32, 1] }) }] },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.statusLabel}>Voice ready</Text>
            <View style={styles.startPill}>
              <Text style={styles.startPillText}>Start Japa</Text>
            </View>
          </View>

        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    shadowColor: MAROON,
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  orbWrap: {
    position: 'absolute',
    top: -3,
    right: 10,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
    }),
  },

  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 13 },
  headerText: { flex: 1 },
  medallion: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW_BRAND,
  },
  halo: {
    position: 'absolute', top: 5, left: 5, right: 5, bottom: 5,
    borderRadius: 12,
    backgroundColor: '#f8ebd5',
  },
  title:    { fontFamily: font.extrabold, fontWeight: '800', fontSize: 16, color: '#fff' },
  subtitle: { fontFamily: font.medium, fontWeight: '500', fontSize: 11, color: 'rgba(255,255,255,0.88)', marginTop: 2 },

  progressWrap: { marginTop: 12 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: {
    fontFamily: font.extrabold, fontWeight: '800', fontSize: 9.5, color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  track: {
    marginTop: 6, height: 6, width: '100%', borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.92)' },

  statusStrip: {
    marginTop: 11,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 11, paddingVertical: 9,
  },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 16 },
  waveBar: { width: 3, height: 16, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  statusLabel: {
    fontFamily: font.extrabold, fontWeight: '800', fontSize: 9.5, color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  startPill: {
    marginLeft: 'auto',
    borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  startPillText: {
    fontFamily: font.extrabold, fontWeight: '800', fontSize: 9.5, color: MAROON,
    textTransform: 'uppercase', letterSpacing: 1,
  },
});
