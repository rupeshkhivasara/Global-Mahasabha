import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Image,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  addEventListener as addSpeechListener,
  destroy as destroySpeechRecognition,
  isRecognitionAvailable,
  setRecognitionLanguage,
  speechRecogntionEvents,
  startListening,
  stopListening,
} from 'react-native-speech-recognition-kit';
import Tts from 'react-native-tts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../Vihar/screens/RootNavigator';
import { NAVKAR_MANTRA } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { MALA_SIZE, chantAccepted, chantRejected, sessionEnded, sessionStarted } from '../../store/digitalMalaSlice';
import { computeMantraAccuracy } from '../../utils/textSimilarity';

type NavProp = NativeStackNavigationProp<AppStackParamList, 'DigitalMala'>;

// Spec requires an automatic session timeout as one of the only three valid
// stop conditions. No server-side value exists for this yet (unlike
// accuracy_threshold), so this is a client-side default until the backend
// exposes one.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
// The spec asks for an optional bell sound on acceptance. There's no bell
// audio asset or sound-playback library in this project, and adding one
// would mean a new native module with the same iOS pod-linking gap
// @react-native-voice/voice and react-native-tts already have — so this
// reuses the already-linked TTS engine as a lightweight stand-in chime
// rather than a real bell tone.
const ACCEPT_CHIME_TEXT = 'Ding';

// react-native-tts is a legacy bridge-only native module with no New
// Architecture (TurboModule) support. With this project's newArchEnabled=true,
// its underlying native module resolves to null/undefined at runtime, so any
// direct method call on it can throw synchronously — including inside promise
// chains, before `.catch()` ever attaches. react-native-speech-recognition-kit
// is a real TurboModule (verified against its native source), so it shouldn't
// hit this failure mode — but it's also a young, single-maintainer library we
// can't fully verify on this emulator, so these guards stay on its call sites
// too as cheap insurance.
function safeCall(fn: () => void): void {
  try {
    fn();
  } catch {
    // native module unavailable
  }
}

function safeAsync(fn: () => unknown): Promise<void> {
  try {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).then(() => undefined, () => undefined);
    }
  } catch {
    // native module unavailable
  }
  return Promise.resolve();
}

function safeSubscribe(fn: () => { remove: () => void }): { remove: () => void } | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

// ── Design tokens (design_handoff_digital_mala/DigitalMalaImplemnetation.md) ──

const JM_GRADIENT: [string, string, string] = ['#d7ad42', '#e0a23a', '#c2591c'];
const JM_GRADIENT_LOCATIONS: [number, number, number] = [0, 0.5, 1];
// CSS `120deg` approximated as an upper-left → lower-right diagonal.
const JM_GRADIENT_DIR = { start: { x: 0, y: 0 }, end: { x: 1, y: 0.6 } };
const JM_ACCENT = '#c2591c';
// Compressed from the design project's background photo (1.28MB PNG, 640×1380
// → 78KB JPEG at quality 80, same resolution) — a lossless PNG is unnecessary
// for a soft photographic background sitting behind translucent cards.
const BACKGROUND_IMAGE = require('../assets/mala-bg.jpg');
const TEXT_DARK = '#3f2a12';
const TEXT_MUTED = '#8a6a45';
const NAV_INACTIVE = '#a5988a';
const SUCCESS_GREEN = '#2f8a5a';
// Use a single opaque warm surface for the cards. Android composites nested
// transparent views separately over Image backgrounds, which created a pale
// rectangle behind the progress copy even though the declared colours matched.
const CARD_GLASS = '#f7ead6';
const CARD_SURFACE = '#faefdf';
const SERIF_FONT = Platform.select({ ios: 'Georgia', default: 'serif' });
// "7 करोड़ मंत्र जाप अभियान" — the campaign's fixed goal per its name, not
// user-derived data. Current progress uses the real (backend-authoritative,
// currently null-until-deployed) globalCount rather than fabricating a number.
const CAMPAIGN_TARGET = 70_000_000;

// ── Necklace bead geometry ──────────────────────────────────────────────────
// Reproduces support.js's malaPathPoints()/buildMalaRing(): 108 points sampled
// at equal arc-length around a rounded-rect path (RN has no SVG
// getPointAtLength(), so this walks the same path analytically instead — the
// implementation doc explicitly allows any equivalent algorithm). The doc's
// 300×496 loop is specified at a 340px reference frame width; the whole
// geometry is scaled uniformly off the device's actual width (never
// distorting the path itself) per the doc's own guidance to "scale
// proportionally for other device widths... do not stretch the mala bead math".

const DESIGN_REFERENCE_WIDTH = 340;
const BASE_LOOP_WIDTH = 300;
const BASE_LOOP_HEIGHT = 496;
const BASE_BEAD_RADIUS = 6.5;
const BASE_BOUNDS = { x0: 15, y0: 40, x1: 285, y1: 476, r: 40 };
const BASE_INNER = { left: 41, top: 56, width: 218, height: 384 };
const BASE_CAP_SIZE = 11;
const BASE_TASSEL = { width: 16, height: 26, radius: 8 };

type ArcSegment =
  | { type: 'line'; x0: number; y0: number; x1: number; y1: number; len: number }
  | { type: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number; len: number };

function buildNecklaceSegments(bounds: typeof BASE_BOUNDS): ArcSegment[] {
  const { x0, y0, x1, y1, r } = bounds;
  const cx = (x0 + x1) / 2;
  const HALF_PI = Math.PI / 2;
  const line = (lx0: number, ly0: number, lx1: number, ly1: number): ArcSegment =>
    ({ type: 'line', x0: lx0, y0: ly0, x1: lx1, y1: ly1, len: Math.hypot(lx1 - lx0, ly1 - ly0) });
  const arc = (acx: number, acy: number, a0: number, a1: number): ArcSegment =>
    ({ type: 'arc', cx: acx, cy: acy, r, a0, a1, len: r * Math.abs(a1 - a0) });
  return [
    line(cx, y0, x1 - r, y0),
    arc(x1 - r, y0 + r, -HALF_PI, 0),
    line(x1, y0 + r, x1, y1 - r),
    arc(x1 - r, y1 - r, 0, HALF_PI),
    line(x1 - r, y1, x0 + r, y1),
    arc(x0 + r, y1 - r, HALF_PI, Math.PI),
    line(x0, y1 - r, x0, y0 + r),
    arc(x0 + r, y0 + r, Math.PI, 1.5 * Math.PI),
    line(x0 + r, y0, cx, y0),
  ];
}

function pointAtArcLength(segments: ArcSegment[], s: number): { x: number; y: number } {
  let remaining = s;
  for (const seg of segments) {
    if (remaining <= seg.len) {
      const t = seg.len === 0 ? 0 : remaining / seg.len;
      if (seg.type === 'line') {
        return { x: seg.x0 + (seg.x1 - seg.x0) * t, y: seg.y0 + (seg.y1 - seg.y0) * t };
      }
      const angle = seg.a0 + (seg.a1 - seg.a0) * t;
      return { x: seg.cx + seg.r * Math.cos(angle), y: seg.cy + seg.r * Math.sin(angle) };
    }
    remaining -= seg.len;
  }
  const last = segments[segments.length - 1];
  return last.type === 'line'
    ? { x: last.x1, y: last.y1 }
    : { x: last.cx + last.r * Math.cos(last.a1), y: last.cy + last.r * Math.sin(last.a1) };
}

type NecklaceGeometry = {
  scale: number;
  loopWidth: number;
  loopHeight: number;
  beadRadius: number;
  capSize: number;
  tassel: { width: number; height: number; radius: number };
  inner: { left: number; top: number; width: number; height: number };
  points: { x: number; y: number }[];
};

// Never shrinks below the design's own 300px loop, and caps growth at 25%
// so the necklace doesn't balloon on tablets — same reference-width scaling
// approach already used for the background image via useWindowDimensions.
function useNecklaceGeometry(screenWidth: number): NecklaceGeometry {
  const scale = Math.min(1.25, Math.max(1, screenWidth / DESIGN_REFERENCE_WIDTH));
  return useMemo(() => {
    const bounds = {
      x0: BASE_BOUNDS.x0 * scale, y0: BASE_BOUNDS.y0 * scale,
      x1: BASE_BOUNDS.x1 * scale, y1: BASE_BOUNDS.y1 * scale, r: BASE_BOUNDS.r * scale,
    };
    const segments = buildNecklaceSegments(bounds);
    const length = segments.reduce((sum, seg) => sum + seg.len, 0);
    const points = Array.from({ length: MALA_SIZE }, (_, i) =>
      pointAtArcLength(segments, (i / MALA_SIZE) * length));
    return {
      scale,
      loopWidth: BASE_LOOP_WIDTH * scale,
      loopHeight: BASE_LOOP_HEIGHT * scale,
      beadRadius: BASE_BEAD_RADIUS * scale,
      capSize: BASE_CAP_SIZE * scale,
      tassel: {
        width: BASE_TASSEL.width * scale,
        height: BASE_TASSEL.height * scale,
        radius: BASE_TASSEL.radius * scale,
      },
      inner: {
        left: BASE_INNER.left * scale,
        top: BASE_INNER.top * scale,
        width: BASE_INNER.width * scale,
        height: BASE_INNER.height * scale,
      },
      points,
    };
  }, [scale]);
}

const WAVE_BARS = Array.from({ length: 26 }, (_, i) => ({
  h: 4 + ((i * 37) % 11),
  op: (0.5 + ((i * 17) % 50) / 100),
}));

// ── Icons (hand-drawn inline SVG per the design handoff's Icon Library) ──────

function LotusIcon({ size, height, color }: { size: number; height?: number; color: string }) {
  const h = height ?? size * (20 / 24);
  return (
    <Svg width={size} height={h} viewBox="0 0 24 20" fill="none">
      <Path d="M12 2c1 3 3 4 5 4-2 2-2 5-5 6-3-1-3-4-5-6 2 0 4-1 5-4z" fill={color} />
      <Path d="M2 11c3-1 5 0 6 2M22 11c-3-1-5 0-6 2" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

function TargetIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={12 * scale} height={12 * scale} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={TEXT_MUTED} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={4.3} stroke={TEXT_MUTED} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={1.2} fill={TEXT_MUTED} />
    </Svg>
  );
}

function SpeakerIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={22 * scale} height={22 * scale} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9v6h4l5 4V5L8 9H4z" fill="#7a5a30" />
      <Path d="M16 9a4 4 0 010 6" stroke="#7a5a30" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function HelpIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={22 * scale} height={22 * scale} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#7a5a30" strokeWidth={1.8} />
      <Path d="M9.5 9.2a2.5 2.5 0 014.9.8c0 1.6-2.4 1.8-2.4 3.4" stroke="#7a5a30" strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx={12} cy={16.6} r={0.9} fill="#7a5a30" />
    </Svg>
  );
}

function MicIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={29 * scale} height={29 * scale} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z" stroke="#fff" strokeWidth={1.9} />
      <Path d="M6 11a6 6 0 0012 0M12 17v3" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

function MalaPendantIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={12 * scale} height={12 * scale} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={14.5} r={6} stroke={TEXT_MUTED} strokeWidth={1.6} />
      <Path d="M12 8.5V4.5" stroke={TEXT_MUTED} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={12} cy={3.4} r={1.3} fill={TEXT_MUTED} />
    </Svg>
  );
}

function CalendarIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={12 * scale} height={12 * scale} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={15} rx={2} stroke={TEXT_MUTED} strokeWidth={1.6} />
      <Path d="M4 9.5h16" stroke={TEXT_MUTED} strokeWidth={1.6} />
      <Path d="M8 3v4M16 3v4" stroke={TEXT_MUTED} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function BarChartIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={12 * scale} height={12 * scale} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={14} width={3.4} height={6} rx={0.8} fill={TEXT_MUTED} />
      <Rect x={10.3} y={9} width={3.4} height={11} rx={0.8} fill={TEXT_MUTED} />
      <Rect x={16.6} y={4} width={3.4} height={16} rx={0.8} fill={TEXT_MUTED} />
    </Svg>
  );
}

function NavHomeIcon({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <Svg width={21 * scale} height={21 * scale} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-9z" fill={color} />
    </Svg>
  );
}

function PeopleIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={17 * scale} height={17 * scale} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={9} r={3} stroke="#fff" strokeWidth={1.6} />
      <Circle cx={16} cy={9} r={3} stroke="#fff" strokeWidth={1.6} />
      <Path d="M2 19c0-3 2.5-5 6-5s6 2 6 5M10 19c0-3 2.5-5 6-5s6 2 6 5" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRightIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={9 * scale} height={9 * scale} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={TEXT_MUTED} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NavRecordIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={21 * scale} height={21 * scale} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19V10M12 19V5M19 19v-6" stroke={NAV_INACTIVE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function NavGlobeIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={21 * scale} height={21 * scale} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={NAV_INACTIVE} strokeWidth={1.8} />
      <Path d="M4 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" stroke={NAV_INACTIVE} strokeWidth={1.5} />
    </Svg>
  );
}

function NavProfileIcon({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={21 * scale} height={21 * scale} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={NAV_INACTIVE} strokeWidth={1.8} />
      <Path d="M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" stroke={NAV_INACTIVE} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ── Necklace loop ────────────────────────────────────────────────────────────

function NecklaceLoop({ litCount, geometry }: { litCount: number; geometry: NecklaceGeometry }) {
  const { loopWidth, loopHeight, beadRadius, capSize, tassel, points } = geometry;
  const [shimmerProgress, setShimmerProgress] = useState(0);

  // A continuous diagonal sweep across the whole necklace. The clip path
  // ensures the sheen appears only on the beads, not on the content inside
  // the mala loop.
  useEffect(() => {
    const timer = setInterval(() => {
      setShimmerProgress(current => (current >= 1 ? 0 : current + 0.025));
    }, 50);
    return () => clearInterval(timer);
  }, []);
  // Anchor the tassel/cap off the first bead's actual y (not a fixed
  // above-the-container offset) so they sit right against the loop with a
  // slight overlap, instead of floating in the loop's ~40-unit top margin.
  const firstBeadY = points[0]?.y ?? 0;
  const tasselTop = firstBeadY - tassel.height + beadRadius * 0.5;
  const capTop = tasselTop - capSize + capSize * 0.3;
  // The shimmer travels along a 30° downward vector: Δy / Δx = tan(30°).
  const shimmerX = -loopWidth * 0.8 + shimmerProgress * loopWidth * 2;
  const shimmerY = -loopHeight * 0.35 + shimmerProgress * loopHeight * 0.7;
  const shimmerWidth = beadRadius * 6;
  return (
    <View style={[NECKLACE_STYLES.loop, { width: loopWidth, height: loopHeight }]}>
      <View
        style={[
          NECKLACE_STYLES.capBead,
          { left: loopWidth / 2 - capSize / 2, top: capTop, width: capSize, height: capSize, borderRadius: capSize / 2 },
        ]}
      />
      <LinearGradient
        colors={['#8a6534', '#d8b478', '#f2dba6', '#d8b478', '#a3803f', '#7a5a2c']}
        locations={[0, 0.18, 0.38, 0.55, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          NECKLACE_STYLES.tassel,
          {
            left: loopWidth / 2 - tassel.width / 2, top: tasselTop, width: tassel.width, height: tassel.height,
            borderTopLeftRadius: tassel.radius, borderTopRightRadius: tassel.radius,
            borderBottomLeftRadius: tassel.radius, borderBottomRightRadius: tassel.radius,
          },
        ]}
      />
      {/* Glossy-sphere look (design note: RN has no inset box-shadow, so a
          drop shadow + radial-gradient body + specular highlight per bead is
          the closest equivalent — see DigitalMalaImplemnetation.md §3.2). */}
      <Svg width={loopWidth} height={loopHeight} viewBox={`0 0 ${loopWidth} ${loopHeight}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="pearlBead" cx="30%" cy="24%" r="76%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="0.22" stopColor="#f7ecd8" />
            <Stop offset="0.55" stopColor="#e6d3ae" />
            <Stop offset="0.82" stopColor="#c9ad7e" />
            <Stop offset="1" stopColor="#a88a5c" />
          </RadialGradient>
          <RadialGradient id="goldBead" cx="30%" cy="24%" r="76%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor="#fff6d8" />
            <Stop offset="0.3" stopColor="#f7dfa0" />
            <Stop offset="0.62" stopColor="#d9a838" />
            <Stop offset="0.88" stopColor="#b9822a" />
            <Stop offset="1" stopColor="#8f6318" />
          </RadialGradient>
          <SvgLinearGradient id="malaSweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor="#fffdf4" stopOpacity={0} />
            <Stop offset="0.42" stopColor="#fffdf4" stopOpacity={0.12} />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.92} />
            <Stop offset="0.58" stopColor="#fffdf4" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#fffdf4" stopOpacity={0} />
          </SvgLinearGradient>
          <ClipPath id="malaBeadClip">
            {points.map((p, i) => <Circle key={`clip-${i}`} cx={p.x} cy={p.y} r={beadRadius * 0.92} />)}
          </ClipPath>
        </Defs>
        {points.map((p, i) => {
          const lit = i < litCount;
          return (
            <React.Fragment key={i}>
              <Circle
                cx={p.x + beadRadius * 0.16}
                cy={p.y + beadRadius * 0.22}
                r={beadRadius}
                fill={lit ? 'rgba(110,66,10,0.4)' : 'rgba(60,35,10,0.3)'}
              />
              <Circle
                cx={p.x}
                cy={p.y}
                r={beadRadius}
                fill={lit ? 'url(#goldBead)' : 'url(#pearlBead)'}
                stroke={lit ? 'rgba(255,214,120,0.8)' : 'rgba(255,255,255,0.9)'}
                strokeWidth={1}
              />
              <Ellipse
                cx={p.x - beadRadius * 0.32}
                cy={p.y - beadRadius * 0.38}
                rx={beadRadius * 0.38}
                ry={beadRadius * 0.26}
                fill="#ffffff"
                opacity={lit ? 0.5 : 0.65}
              />
            </React.Fragment>
          );
        })}
        <G clipPath="url(#malaBeadClip)">
          <Rect
            x={shimmerX}
            y={shimmerY - loopHeight * 0.45}
            width={shimmerWidth}
            height={loopHeight * 1.9}
            fill="url(#malaSweep)"
            transform={`rotate(30 ${shimmerX + shimmerWidth / 2} ${shimmerY})`}
          />
        </G>
      </Svg>
    </View>
  );
}

export default function DigitalMalaScreen() {
  const navigation = useNavigation<NavProp>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const necklace = useNecklaceGeometry(screenWidth);
  // The handoff's measurements are based on a 340pt frame.  The old 1.15–1.5
  // multiplier enlarged every glyph and control *again* after sizing the
  // necklace, making the layout look materially heavier than the reference on
  // normal Android phones. Keep the reference scale at 1x and only allow a
  // modest increase on wider handsets.
  const scale = Math.min(1.12, necklace.scale);
  const styles = useMemo(() => makeStyles(scale), [scale]);
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const todayCount = useAppSelector(state => state.digitalMala.todayCount);
  const sessionCount = useAppSelector(state => state.digitalMala.sessionCount);
  const lifetimeCount = useAppSelector(state => state.digitalMala.lifetimeCount);
  const malaCompleted = useAppSelector(state => state.digitalMala.completedMalas);
  const accuracyThreshold = useAppSelector(state => state.digitalMala.accuracyThreshold);
  const goalMala = useAppSelector(state => state.digitalMala.goalMala);
  const streak = useAppSelector(state => state.digitalMala.streak);
  const globalCount = useAppSelector(state => state.digitalMala.globalCount);
  const isSessionActive = useAppSelector(state => state.digitalMala.isSessionActive);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isGuidePlaying, setIsGuidePlaying] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('माइक के पास स्पष्ट उच्चारण करें');
  const shouldListenRef = useRef(false);
  const recognizerRunningRef = useRef(false);
  const processingRef = useRef(false);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Running average for the session-summary alert — the real backend would
  // compute this server-side; tracked locally while the API is bypassed.
  const sessionAccuracyTotalRef = useRef(0);
  const sessionAcceptedRef = useRef(0);

  const clearSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  }, []);

  const playAcceptChime = useCallback(() => {
    void safeAsync(() => Tts.setDefaultRate(0.75, true));
    void safeAsync(() => Tts.setDefaultPitch(1.7));
    void safeAsync(() => Tts.speak(ACCEPT_CHIME_TEXT));
  }, []);

  const startRecognition = useCallback(async () => {
    if (!shouldListenRef.current || processingRef.current || recognizerRunningRef.current) return;
    try {
      const available = await isRecognitionAvailable();
      if (!available) throw new Error('Speech recognition is not available on this device.');
      recognizerRunningRef.current = true;
      await setRecognitionLanguage('en-IN');
      await startListening();
      setIsListening(true);
      setVoiceMessage('नवकार मंत्र सुन रहे हैं…');
    } catch {
      // Errors here are almost always the native speech module being
      // unavailable — that's an internal detail, never show it to the user.
      recognizerRunningRef.current = false;
      setIsListening(false);
      setVoiceMessage('अभी माइक उपलब्ध नहीं है। कृपया बाद में प्रयास करें।');
    }
  }, []);

  const processTranscript = useCallback((transcript: string) => {
    if (!user || !isSessionActive || processingRef.current || !transcript.trim()) return;
    processingRef.current = true;
    recognizerRunningRef.current = false;
    setIsListening(false);
    setVoiceMessage('उच्चारण जाँचा जा रहा है…');
    try {
      // TEMPORARY: no backend AI validation yet (digital_mala.php is 404) —
      // score against the canonical mantra locally. See src/utils/textSimilarity.ts.
      const accuracy = computeMantraAccuracy(transcript, NAVKAR_MANTRA);
      setLastAccuracy(accuracy);
      const accepted = accuracy >= accuracyThreshold;
      if (accepted) {
        const completedMala = sessionCount > 0 && (sessionCount + 1) % MALA_SIZE === 0;
        sessionAccuracyTotalRef.current += accuracy;
        sessionAcceptedRef.current += 1;
        dispatch(chantAccepted({ accuracy }));
        Vibration.vibrate(18);
        playAcceptChime();
        setVoiceMessage(completedMala ? 'माला पूर्ण हुई 🙏' : 'माइक के पास स्पष्ट उच्चारण करें');
      } else {
        dispatch(chantRejected({ accuracy }));
        setVoiceMessage('माइक के पास स्पष्ट उच्चारण करें');
      }
    } finally {
      processingRef.current = false;
      if (shouldListenRef.current) setTimeout(() => { void startRecognition(); }, 350);
    }
  }, [accuracyThreshold, dispatch, isSessionActive, playAcceptChime, sessionCount, startRecognition, user]);

  // Keep latest callbacks in refs so the native speech-recognition engine is
  // wired up once on mount, not torn down and rebuilt whenever
  // `processTranscript` picks up a new `user` reference (e.g. an auth context
  // refresh) mid-session — that previously killed an active listening session
  // with no user-visible feedback, silently breaking continuous listening.
  const processTranscriptRef = useRef(processTranscript);
  const startRecognitionRef = useRef(startRecognition);
  useEffect(() => { processTranscriptRef.current = processTranscript; }, [processTranscript]);
  useEffect(() => { startRecognitionRef.current = startRecognition; }, [startRecognition]);

  useEffect(() => {
    const resultsSub = safeSubscribe(() => addSpeechListener(speechRecogntionEvents.RESULTS, event => {
      void processTranscriptRef.current(event?.value ?? '');
    }));
    const endSub = safeSubscribe(() => addSpeechListener(speechRecogntionEvents.END, () => {
      recognizerRunningRef.current = false;
      if (shouldListenRef.current && !processingRef.current) setTimeout(() => { void startRecognitionRef.current(); }, 250);
    }));
    const errorSub = safeSubscribe(() => addSpeechListener(speechRecogntionEvents.ERROR, () => {
      recognizerRunningRef.current = false;
      if (shouldListenRef.current && !processingRef.current) setTimeout(() => { void startRecognitionRef.current(); }, 350);
    }));
    return () => {
      shouldListenRef.current = false;
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      resultsSub?.remove();
      endSub?.remove();
      errorSub?.remove();
      void safeAsync(() => destroySpeechRecognition());
      void safeAsync(() => Tts.stop());
    };
  }, []);

  const playGuide = useCallback(() => new Promise<void>(resolve => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      safeCall(() => Tts.removeEventListener('tts-finish', finish));
      safeCall(() => Tts.removeEventListener('tts-error', finish));
      resolve();
    };
    safeCall(() => Tts.addEventListener('tts-finish', finish));
    safeCall(() => Tts.addEventListener('tts-error', finish));
    void safeAsync(() => Tts.setDefaultLanguage('en-IN'));
    void safeAsync(() => Tts.setDefaultRate(0.37, true));
    void safeAsync(() => Tts.speak(NAVKAR_MANTRA));
    setTimeout(finish, 30000);
  }), []);

  // "सुनें" (Listen) — an on-demand preview of the mantra guide, independent
  // of session state. Doesn't touch shouldListenRef/session lifecycle.
  const playListenPreview = useCallback(() => {
    void safeAsync(() => Tts.setDefaultLanguage('en-IN'));
    void safeAsync(() => Tts.setDefaultRate(0.4, true));
    void safeAsync(() => Tts.speak(NAVKAR_MANTRA));
  }, []);

  const showHelp = useCallback(() => {
    Alert.alert(
      'Digital Mala कैसे काम करता है',
      'माइक बटन दबाएँ, गाइड ऑडियो सुनें, फिर नवकार मंत्र बोलें। हर सही उच्चारण अपने आप गिना जाता है और माला में एक मोती जुड़ता है।',
      [{ text: 'ठीक है' }],
    );
  }, []);

  const requestMicrophoneConsent = useCallback(() => new Promise<boolean>(resolve => {
    Alert.alert(
      'Enable mantra listening?',
      'Digital Mala needs microphone access while your session is active to recognize the Navkar Mantra. Your count increases only after validation.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      // Require an explicit choice. On some Android versions `onDismiss` also
      // fires while a button handler is resolving, which can swallow Continue.
      { cancelable: false },
    );
  }), []);

  const startJapa = async () => {
    if (!user || isSessionActive || isGuidePlaying) return;
    const consented = await requestMicrophoneConsent();
    if (!consented) return;
    if (Platform.OS === 'android') {
      setVoiceMessage('माइक अनुमति माँगी जा रही है…');
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setVoiceMessage('गिनती के लिए माइक अनुमति आवश्यक है।');
        if (permission === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Microphone permission is blocked',
            'Enable Microphone for GlobalMahasabha in Android Settings, then return here to begin your japa.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
            ],
          );
        }
        return;
      }
    }
    try {
      dispatch(sessionStarted());
      sessionAccuracyTotalRef.current = 0;
      sessionAcceptedRef.current = 0;
      clearSessionTimeout();
      sessionTimeoutRef.current = setTimeout(() => { endSession('timeout'); }, SESSION_TIMEOUT_MS);
      shouldListenRef.current = true;
      setIsGuidePlaying(true);
      setVoiceMessage('गाइड ऑडियो चल रहा है…');
      await playGuide();
      setIsGuidePlaying(false);
      if (shouldListenRef.current) await startRecognition();
    } catch (error) {
      shouldListenRef.current = false;
      setIsGuidePlaying(false);
      setVoiceMessage(error instanceof Error ? error.message : 'सत्र शुरू नहीं हो सका।');
    }
  };

  const pauseOrResume = async () => {
    if (isGuidePlaying) return;
    if (isListening) {
      shouldListenRef.current = false;
      recognizerRunningRef.current = false;
      await safeAsync(() => stopListening());
      setIsListening(false);
      setVoiceMessage('जाप रोका गया');
      return;
    }
    shouldListenRef.current = true;
    await startRecognition();
  };

  const onMicPress = () => {
    if (!isSessionActive) { void startJapa(); return; }
    void pauseOrResume();
  };

  const endSession = useCallback((reason: 'manual' | 'timeout' | 'background') => {
    if (!isSessionActive) return;
    clearSessionTimeout();
    shouldListenRef.current = false;
    recognizerRunningRef.current = false;
    setIsListening(false);
    setIsGuidePlaying(false);
    void safeAsync(() => stopListening());
    void safeAsync(() => Tts.stop());
    const finalAcceptedCount = sessionCount;
    const finalMalaCompleted = malaCompleted;
    const averageAccuracy = sessionAcceptedRef.current > 0
      ? sessionAccuracyTotalRef.current / sessionAcceptedRef.current
      : 0;
    dispatch(sessionEnded());
    if (reason === 'background') return;
    const body = `Accepted chants: ${finalAcceptedCount}\nAverage accuracy: ${Math.round(averageAccuracy)}%\nMalas completed: ${finalMalaCompleted}`;
    const title = reason === 'timeout' ? 'Session time limit reached' : 'Session complete';
    const message = reason === 'timeout'
      ? `Your japa was saved automatically after ${SESSION_TIMEOUT_MS / 60000} minutes.\n\n${body}`
      : body;
    Alert.alert(title, message, [{ text: 'Peace' }]);
    setVoiceMessage('माइक के पास स्पष्ट उच्चारण करें');
  }, [clearSessionTimeout, dispatch, isSessionActive, malaCompleted, sessionCount]);

  const stopJapa = () => endSession('manual');

  // Spec requires listening to continue until Stop, timeout, or the app
  // closing — persist and end the session when the app leaves the
  // foreground so an active japa is never silently lost.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') endSession('background');
    });
    return () => sub.remove();
  }, [endSession]);

  const activeBead = sessionCount % MALA_SIZE;
  const todayMala = Math.floor(todayCount / MALA_SIZE);
  const goalPct = Math.min(100, Math.round((todayMala / goalMala) * 100));
  const accepted = lastAccuracy !== null && lastAccuracy >= accuracyThreshold;
  const campaignPct = globalCount !== null ? Math.min(100, Math.round((globalCount / CAMPAIGN_TARGET) * 100)) : 0;

  return (
    <View style={styles.root}>
      <Image
        source={BACKGROUND_IMAGE}
        style={[styles.background, { width: screenWidth, height: screenHeight }]}
        resizeMode="cover"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top,
            // Reserve the fixed navigation bar plus its raised centre action.
            // This keeps the campaign footer reachable instead of hidden
            // behind the bar on gesture-navigation devices.
            paddingBottom: 92 + Math.max(insets.bottom, 12),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoBlock}>
          <LotusIcon size={38 * scale} height={30 * scale} color={JM_ACCENT} />
          <Text style={styles.wordmark}>JapMala</Text>
          <Text style={styles.tagline}>मंत्र जाप  •  शुद्ध उच्चारण  •  सच्ची साधना</Text>
        </View>

        <View style={[styles.loopWrap, { width: necklace.loopWidth, height: necklace.loopHeight }]}>
          <NecklaceLoop litCount={activeBead} geometry={necklace} />

          <View style={[styles.innerContent, necklace.inner]}>
            <View style={styles.card}>
              <LinearGradient colors={JM_GRADIENT} locations={JM_GRADIENT_LOCATIONS} start={JM_GRADIENT_DIR.start} end={JM_GRADIENT_DIR.end} style={styles.jmIconCircle}>
                <LotusIcon size={21 * scale} color="#fff" />
              </LinearGradient>
              <View style={styles.progressCopy}>
                <Text style={styles.cardLabel}>आज की प्रगति</Text>
                <Text style={styles.cardValue}>{todayMala} माला</Text>
              </View>
            </View>

            <View style={[styles.card, styles.goalCard]}>
              <View style={styles.goalTopRow}>
                <View style={styles.goalLabelRow}>
                  <TargetIcon scale={scale} />
                  <Text style={styles.goalLabel}>आज का लक्ष्य</Text>
                </View>
                <Text style={styles.goalValue}>{goalMala} माला</Text>
              </View>
              <View style={styles.goalBarRow}>
                <View style={styles.track}>
                  <LinearGradient colors={JM_GRADIENT} locations={JM_GRADIENT_LOCATIONS} start={JM_GRADIENT_DIR.start} end={JM_GRADIENT_DIR.end} style={[styles.trackFill, { width: `${goalPct}%` }]} />
                </View>
                <Text style={styles.goalFraction}>{todayMala} / {goalMala}</Text>
              </View>
            </View>

            <View style={styles.mantraBlock}>
              <LotusIcon size={26 * scale} color={JM_ACCENT} />
              <Text style={styles.mantraCaption}>•  मंत्र जाप करें  •</Text>
              <Text style={styles.mantraText}>णमो अरिहंताणं</Text>
              <View style={styles.waveRow}>
                {WAVE_BARS.map((w, i) => (
                  <View key={i} style={[styles.waveBar, { height: w.h, opacity: w.op }]} />
                ))}
              </View>
              <Text style={styles.helperLine}>{voiceMessage}</Text>
            </View>

            <View style={styles.controlsRow}>
              <View style={styles.sideControl}>
                <TouchableOpacity onPress={playListenPreview} activeOpacity={0.85} style={styles.sideCircle}>
                  <SpeakerIcon scale={scale} />
                </TouchableOpacity>
                <Text style={styles.sideLabel}>सुनें</Text>
              </View>

              <TouchableOpacity onPress={onMicPress} activeOpacity={0.85} style={styles.micButton}>
                <LinearGradient colors={JM_GRADIENT} locations={JM_GRADIENT_LOCATIONS} start={JM_GRADIENT_DIR.start} end={JM_GRADIENT_DIR.end} style={styles.micGradient}>
                  <MicIcon scale={scale} />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.sideControl}>
                <TouchableOpacity onPress={showHelp} activeOpacity={0.85} style={styles.sideCircle}>
                  <HelpIcon scale={scale} />
                </TouchableOpacity>
                <Text style={styles.sideLabel}>सहायता</Text>
              </View>
            </View>

            {lastAccuracy !== null && (
              <Text style={[styles.accuracyLine, { color: accepted ? SUCCESS_GREEN : '#a5824f' }]}>
                {accepted ? 'उच्चारण सही है ✓' : `दोबारा प्रयास करें · ${Math.round(lastAccuracy)}%`}
              </Text>
            )}

            {isSessionActive && (
              <TouchableOpacity onPress={stopJapa} hitSlop={8}>
                <Text style={styles.stopLink}>जाप सत्र समाप्त करें</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}><MalaPendantIcon scale={scale} /><Text style={styles.statLabel}>कुल जाप</Text></View>
            <Text style={styles.statValue}>{malaCompleted.toLocaleString('en-IN')}</Text>
            <Text style={styles.statUnit}>माला</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}><CalendarIcon scale={scale} /><Text style={styles.statLabel}>लगातार</Text></View>
            <Text style={styles.statValue}>{streak.toLocaleString('en-IN')}</Text>
            <Text style={styles.statUnit}>दिन</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}><BarChartIcon scale={scale} /><Text style={styles.statLabel}>कुल मंत्र</Text></View>
            <Text style={styles.statValue}>{lifetimeCount.toLocaleString('en-IN')}</Text>
            <Text style={styles.statUnit}>मंत्र</Text>
          </View>
        </View>

        <View style={styles.campaignCard}>
          <View style={styles.campaignTopRow}>
            <LinearGradient colors={JM_GRADIENT} locations={JM_GRADIENT_LOCATIONS} start={JM_GRADIENT_DIR.start} end={JM_GRADIENT_DIR.end} style={styles.campaignIconCircle}>
              <PeopleIcon scale={scale} />
            </LinearGradient>
            <Text style={styles.campaignLabel}>चल रहा अभियान</Text>
            <View style={styles.campaignChevron}>
              <ChevronRightIcon scale={scale} />
            </View>
          </View>
          <Text style={styles.campaignTitle}>7 करोड़ मंत्र जाप अभियान</Text>
          <View style={styles.campaignTrack}>
            <LinearGradient colors={JM_GRADIENT} locations={JM_GRADIENT_LOCATIONS} start={JM_GRADIENT_DIR.start} end={JM_GRADIENT_DIR.end} style={[styles.trackFill, { width: `${campaignPct}%` }]} />
          </View>
          <View style={styles.campaignFooterRow}>
            <Text style={styles.campaignFooterText}>
              {globalCount !== null ? globalCount.toLocaleString('en-IN') : 'उपलब्ध नहीं'} / {CAMPAIGN_TARGET.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.campaignFooterText}>भारत</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[
        styles.navBar,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          // 64pt visible bar (10% taller than the previous 58pt version),
          // plus only the device's bottom safe area.
          height: 52 + Math.max(insets.bottom, 12),
          minHeight: 0,
        },
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navItem}>
          <NavHomeIcon color={JM_ACCENT} scale={1.2} />
          <Text style={[styles.navLabel, { color: JM_ACCENT }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>होम</Text>
        </TouchableOpacity>
        <View style={styles.navItem}>
          <NavRecordIcon scale={1.2} />
          <Text style={[styles.navLabel, { color: NAV_INACTIVE }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>जाप रिकॉर्ड</Text>
        </View>
        <View style={styles.navCenterItem}>
          <LinearGradient colors={JM_GRADIENT} locations={JM_GRADIENT_LOCATIONS} start={JM_GRADIENT_DIR.start} end={JM_GRADIENT_DIR.end} style={styles.navCenterCircle}>
            <LotusIcon size={28} color="#fff" />
            <Text style={styles.navCenterLabel}>जाप करें</Text>
          </LinearGradient>
        </View>
        <View style={styles.navItem}>
          <NavGlobeIcon scale={1.2} />
          <Text style={[styles.navLabel, { color: NAV_INACTIVE }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>अभियान</Text>
        </View>
        <View style={styles.navItem}>
          <NavProfileIcon scale={1.2} />
          <Text style={[styles.navLabel, { color: NAV_INACTIVE }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>प्रोफ़ाइल</Text>
        </View>
      </View>
    </View>
  );
}

// Tight, crisp shadow per the spec's "near" layer (0 3px 6px rgba(107,64,20,0.16)).
// A larger shadowRadius here reads as a rectangular halo behind the rounded
// card corners on iOS — a semi-transparent backgroundColor prevents iOS from
// deriving a rounded shadow mask, so it falls back to the full rectangular
// layer bounds for the shadow shape. Keeping the blur tight keeps that
// bounding-box bleed imperceptible.
const CARD_SHADOW = {
  shadowColor: 'rgba(107,64,20,1)',
  shadowOpacity: 0.16,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
};

// loop/capBead/tassel carry no scale-sensitive numeric values (their sizing
// is applied inline from NecklaceGeometry — see NecklaceLoop), so they can
// stay a plain static sheet shared by every render.
const NECKLACE_STYLES = StyleSheet.create({
  loop: { position: 'absolute', left: 0, top: 0 },
  capBead: {
    position: 'absolute', backgroundColor: '#d9a838', borderWidth: 1, borderColor: 'rgba(255,214,120,0.8)',
  },
  tassel: { position: 'absolute' },
});

// Everything else — every font size, icon-container circle, and internal
// card padding/gap — scales with the same device-width-derived factor as the
// necklace geometry, so text and icons grow along with the wider cards on
// larger screens instead of staying pinned to the 340px mock's pixel values.
// Screen-edge margins (marginHorizontal: 22, the design's fixed
// `spacing.screenPad` token) are deliberately left unscaled.
function makeStyles(scale: number) {
  const rs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f7ecd8' },
    background: { position: 'absolute', top: 0, left: 0 },
    scroll: { flex: 1 },
    content: { paddingBottom: rs(24) },

    logoBlock: { alignItems: 'center', paddingTop: rs(8), paddingHorizontal: 22 },
    wordmark: { marginTop: rs(2), fontFamily: SERIF_FONT, fontSize: rs(26), fontWeight: '700', color: '#4a2f14', letterSpacing: 0.2 },
    tagline: { marginTop: rs(2), fontSize: rs(10), fontWeight: '600', color: TEXT_MUTED },

    loopWrap: { marginTop: rs(14), alignSelf: 'center', position: 'relative' },

    innerContent: {
      position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: rs(10),
    },
    card: {
      width: '100%', backgroundColor: CARD_GLASS, borderRadius: rs(16),
      paddingVertical: rs(11), paddingHorizontal: rs(14),
      flexDirection: 'row', alignItems: 'center', gap: rs(10), ...CARD_SHADOW,
    },
    goalCard: { flexDirection: 'column', alignItems: 'stretch' },
    jmIconCircle: {
      width: rs(42), height: rs(42), borderRadius: rs(42) / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    // Match the parent exactly instead of asking Android to composite a
    // transparent child over an image-backed card.
    progressCopy: { flex: 1, backgroundColor: CARD_GLASS },
    cardLabel: { backgroundColor: CARD_GLASS, fontSize: rs(13), fontWeight: '600', color: TEXT_MUTED },
    cardValue: { backgroundColor: CARD_GLASS, fontSize: rs(17), fontWeight: '800', color: TEXT_DARK, marginTop: rs(1) },

    goalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    goalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: rs(5) },
    goalLabel: { fontSize: rs(13.6), fontWeight: '600', color: TEXT_MUTED },
    goalValue: { fontSize: rs(14), fontWeight: '800', color: TEXT_DARK },
    goalBarRow: { marginTop: rs(8), flexDirection: 'row', alignItems: 'center', gap: rs(8) },
    track: { flex: 1, height: rs(6), borderRadius: rs(4), backgroundColor: '#e7d9bf', overflow: 'hidden' },
    trackFill: { height: '100%', borderRadius: rs(4) },
    goalFraction: { fontSize: rs(10), fontWeight: '700', color: TEXT_MUTED },

    mantraBlock: { marginTop: rs(4), alignItems: 'center' },
    mantraCaption: { marginTop: rs(4), fontSize: rs(10), fontWeight: '700', color: '#a5824f', letterSpacing: 0.6 },
    mantraText: { marginTop: rs(5), fontFamily: SERIF_FONT, fontSize: rs(23), fontWeight: '700', color: TEXT_DARK },
    waveRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1.5, height: rs(14), marginTop: rs(8) },
    waveBar: { width: rs(2.5), borderRadius: 1, backgroundColor: JM_ACCENT },
    helperLine: { marginTop: rs(7), fontSize: rs(9.5), fontWeight: '600', color: TEXT_MUTED, textAlign: 'center' },

    controlsRow: { marginTop: rs(6), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(20) },
    sideControl: { alignItems: 'center', gap: rs(4) },
    sideCircle: {
      width: rs(48), height: rs(48), borderRadius: rs(48) / 2, backgroundColor: 'rgba(255,250,241,0.88)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: 'rgba(107,64,20,1)', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
    },
    sideLabel: { fontSize: rs(8.5), fontWeight: '700', color: TEXT_MUTED },
    micButton: { borderRadius: rs(66) / 2 },
    micGradient: {
      width: rs(66), height: rs(66), borderRadius: rs(66) / 2, alignItems: 'center', justifyContent: 'center',
      shadowColor: 'rgba(194,89,28,1)', shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8,
    },

    accuracyLine: { marginTop: rs(2), fontSize: rs(11), fontWeight: '700' },
    stopLink: { marginTop: rs(6), fontSize: rs(10.5), fontWeight: '700', color: '#a5432a', textDecorationLine: 'underline' },

    statsRow: { marginTop: rs(8), marginHorizontal: 22, flexDirection: 'row', gap: rs(8) },
    statCard: { flex: 1, backgroundColor: CARD_SURFACE, borderRadius: rs(14), padding: rs(10), alignItems: 'center', ...CARD_SHADOW },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: rs(4) },
    statLabel: { fontSize: rs(11.8), fontWeight: '700', color: TEXT_MUTED },
    statValue: { marginTop: rs(4), fontSize: rs(15), fontWeight: '800', color: TEXT_DARK },
    statUnit: { fontSize: rs(8.5), fontWeight: '600', color: TEXT_MUTED },

    campaignCard: {
      marginTop: rs(10), marginHorizontal: 22, marginBottom: rs(4),
      backgroundColor: CARD_SURFACE, borderRadius: rs(16), padding: rs(12), paddingHorizontal: rs(14), ...CARD_SHADOW,
    },
    campaignTopRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
    campaignIconCircle: {
      width: rs(36), height: rs(36), borderRadius: rs(36) / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    campaignLabel: { fontSize: rs(14), fontWeight: '700', color: TEXT_MUTED },
    campaignChevron: { marginLeft: 'auto' },
    campaignTitle: { marginTop: rs(5), fontSize: rs(17.2), fontWeight: '800', color: TEXT_DARK },
    campaignTrack: { marginTop: rs(8), height: rs(6), borderRadius: rs(4), backgroundColor: '#e7d9bf', overflow: 'hidden' },
    campaignFooterRow: { marginTop: rs(6), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    campaignFooterText: { fontSize: rs(9.5), fontWeight: '600', color: TEXT_MUTED },

    navBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10,
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
      paddingHorizontal: 6, paddingTop: 1, paddingBottom: 12, minHeight: 48,
      overflow: 'visible',
      backgroundColor: 'rgba(255,251,242,0.92)', borderTopWidth: 1, borderTopColor: 'rgba(194,89,28,0.12)',
    },
    navItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', gap: 1 },
    navLabel: {
      width: '100%', fontSize: 10.8, lineHeight: 11, fontWeight: '700',
      textAlign: 'center', includeFontPadding: false,
    },
    navCenterItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', transform: [{ translateY: -20 }] },
    navCenterCircle: {
      width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', gap: 2,
      borderWidth: 3, borderColor: 'rgba(255,251,242,0.92)',
      shadowColor: 'rgba(194,89,28,1)', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 10 }, elevation: 8,
    },
    navCenterLabel: {
      fontSize: 10,fontWeight: '700', color: '#fff',
      textAlign: 'center', includeFontPadding: false,
    },
  });
}
