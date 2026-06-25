import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// ── Quick-link / tile icons (accent-colored stroke, viewBox 0 0 24 24) ────────

export const IconRoute = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 19l4-1 6-12 4 1-6 12-4 1-2-2z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Circle cx={6} cy={18} r={2} stroke={color} strokeWidth={1.7} />
  </Svg>
);

export const IconHeart = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 20s-7-4.3-7-9.5A4 4 0 0112 7a4 4 0 017 3.5C19 15.7 12 20 12 20z"
      stroke={color} strokeWidth={1.7} strokeLinejoin="round"
    />
  </Svg>
);

export const IconMap = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M9 4v14M15 6v14" stroke={color} strokeWidth={1.7} />
  </Svg>
);

export const IconUsers = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={8} r={3} stroke={color} strokeWidth={1.7} />
    <Circle cx={17} cy={9} r={2.3} stroke={color} strokeWidth={1.7} />
    <Path
      d="M3 20a6 6 0 0112 0M15 20a5 5 0 016-4.6"
      stroke={color} strokeWidth={1.7} strokeLinecap="round"
    />
  </Svg>
);

export const IconBookmark = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 3h10a1 1 0 011 1v17l-6-3.2L6 21V4a1 1 0 011-1z"
      stroke={color} strokeWidth={1.7} strokeLinejoin="round"
    />
  </Svg>
);

export const IconLandmark = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 21h16M5 9h14M6 21V9m4 12V9m4 12V9m4 12V9M12 3l8 4H4l8-4z"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

export const IconDonors = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
    <Path
      d="M14.5 8.5h-5m5 3h-5m0 0l3.5 4M9.5 8.5h5"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

export const IconMedical = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={6} width={16} height={13} rx={2.5} stroke={color} strokeWidth={1.7} />
    <Path
      d="M12 10v5m-2.5-2.5h5M9 6V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V6"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

export const IconInfo = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
    <Path d="M12 11v5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Circle cx={12} cy={8} r={1} fill={color} />
  </Svg>
);

export const IconLock = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={10} width={16} height={11} rx={2.5} stroke={color} strokeWidth={1.7} />
    <Path d="M7.5 10V7.5a4.5 4.5 0 019 0V10" stroke={color} strokeWidth={1.7} />
    <Circle cx={12} cy={15} r={1.6} fill={color} />
  </Svg>
);

export const IconUserCircle = ({ size = 22, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
    <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.7} />
    <Path d="M6.5 19a6 6 0 0111 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const IconLogOut = ({ size = 20, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3M10 8l-4 4 4 4M6 12h12"
      stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

export const IconChevronRight = ({ size = 16, color = '#c3b9b8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Header icons (white on gradient) ──────────────────────────────────────────

export const IconBell = ({ size = 22, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path d="M13.7 21a2 2 0 01-3.4 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const IconMapPin = ({ size = 18, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z"
      stroke={color} strokeWidth={1.8} strokeLinejoin="round"
    />
    <Circle cx={12} cy={10} r={2.5} stroke={color} strokeWidth={1.8} />
  </Svg>
);

// ── Tab bar icons ─────────────────────────────────────────────────────────────

export const IconHomeActive = ({ size = 23, color = '#c2591c' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z" fill={color} />
  </Svg>
);

export const IconHomeInactive = ({ size = 23, color = '#9a9296' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z"
      stroke={color} strokeWidth={1.8} strokeLinejoin="round"
    />
  </Svg>
);

export const IconMapTab = ({ size = 26, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M9 4v14M15 6v14" stroke={color} strokeWidth={1.8} />
  </Svg>
);

export const IconHeartTab = ({ size = 23, color = '#9a9296' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 20s-7-4.3-7-9.5A4 4 0 0112 7a4 4 0 017 3.5C19 15.7 12 20 12 20z"
      stroke={color} strokeWidth={1.8} strokeLinejoin="round"
    />
  </Svg>
);

export const IconMoreTab = ({ size = 23, color = '#9a9296' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={5} cy={12} r={1.8} fill={color} />
    <Circle cx={12} cy={12} r={1.8} fill={color} />
    <Circle cx={19} cy={12} r={1.8} fill={color} />
  </Svg>
);
