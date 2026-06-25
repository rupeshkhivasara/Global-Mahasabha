/**
 * Typography constants — Saffron Path design spec.
 *
 * ── One-time font setup (bare RN / CLI) ──────────────────────────────────────
 *  1. Download TTFs from Google Fonts, rename to match PostScript names:
 *       assets/fonts/Poppins-Regular.ttf
 *       assets/fonts/Poppins-Medium.ttf
 *       assets/fonts/Poppins-SemiBold.ttf
 *       assets/fonts/Poppins-Bold.ttf
 *       assets/fonts/Poppins-ExtraBold.ttf
 *       assets/fonts/NotoSansDevanagari-Medium.ttf
 *       assets/fonts/NotoSansDevanagari-SemiBold.ttf
 *       assets/fonts/NotoSansDevanagari-Bold.ttf
 *  2. react-native.config.js at project root sets assets: ['./assets/fonts']
 *  3. Run:  npx react-native-asset && cd ios && pod install && cd ..
 *  4. Full rebuild required — fonts do NOT hot-reload.
 *
 * ── Android note ─────────────────────────────────────────────────────────────
 *  Android ignores numeric fontWeight for loaded custom fonts — the weight-
 *  specific fontFamily name (e.g. 'Poppins-Bold') is the only reliable way.
 *  fontWeight values below serve as system-font fallbacks until Poppins loads.
 */

import { StyleSheet } from 'react-native';

// ── Font PostScript names ─────────────────────────────────────────────────────

export const font = {
  regular:   'Poppins-Regular',              // 400
  medium:    'Poppins-Medium',               // 500
  semibold:  'Poppins-SemiBold',             // 600
  bold:      'Poppins-Bold',                 // 700
  extrabold: 'Poppins-ExtraBold',            // 800

  // Devanagari (bilingual labels) — all three weights now available
  hindiMedium:   'NotoSansDevanagari-Medium',    // 500
  hindiSemibold: 'NotoSansDevanagari-SemiBold',  // 600
  hindiBold:     'NotoSansDevanagari-Bold',      // 700
  hindi:         'NotoSansDevanagari-SemiBold',  // alias → semibold (back-compat)
} as const;

// ── Bilingual helpers ─────────────────────────────────────────────────────────

/** True if the string contains any Devanagari characters. */
export const isDevanagari = (s: string) => /[\u0900-\u097F]/.test(s);

/** Pick the matching Devanagari family for a given Latin weight. */
export const hindiFor = (weight: 'medium' | 'semibold' | 'bold' = 'semibold') =>
  ({ medium: font.hindiMedium, semibold: font.hindiSemibold, bold: font.hindiBold }[weight]);

/**
 * Returns the right fontFamily for a label based on its script.
 *   familyFor('Donate')        → 'Poppins-SemiBold'
 *   familyFor('दान करें')      → 'NotoSansDevanagari-SemiBold'
 */
export const familyFor = (
  text: string,
  weight: 'medium' | 'semibold' | 'bold' = 'semibold',
) => (isDevanagari(text) ? hindiFor(weight) : font[weight]);

// ── Semantic type scale ───────────────────────────────────────────────────────
//
// Usage:  <Text style={typeScale.sectionHead}>Quick Links</Text>
// Override only what differs per screen, e.g.:
//   Login H1  → [typeScale.display, { fontSize: 30 }]

export const typeScale = StyleSheet.create({

  // ── Headings ───────────────────────────────────────────────────────────────

  /** Screen H1 — 28 / ExtraBold / ink #2b2424.  Login uses fontSize: 30. */
  display: {
    fontFamily:    font.extrabold,
    fontWeight:    '800',
    fontSize:      31,
    color:         '#2b2424',
    letterSpacing: -0.5,
    lineHeight:    34,
  },

  /** Form / section H1 — 23 / ExtraBold / ink.  ForgotPassword uses 28, OTP uses 24. */
  title: {
    fontFamily:    font.extrabold,
    fontWeight:    '800',
    fontSize:      25,
    color:         '#2b2424',
    letterSpacing: -0.2,
  },

  /** Section heading inside a screen — 15 / ExtraBold / ink. */
  sectionHead: {
    fontFamily: font.extrabold,
    fontWeight: '800',
    fontSize:   16,
    color:      '#2b2424',
  },

  /** Card / list item title — 14 / Bold / ink. */
  cardTitle: {
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize:   15,
    color:      '#2b2424',
    lineHeight: 20,
  },

  // ── Body ───────────────────────────────────────────────────────────────────

  /** Form label — 14 / SemiBold / label-ink #3a3232. */
  label: {
    fontFamily: font.semibold,
    fontWeight: '600',
    fontSize:   15,
    color:      '#3a3232',
  },

  /** Body / input text — 14 / Medium / body-grey #6b6363. */
  body: {
    fontFamily: font.medium,
    fontWeight: '500',
    fontSize:   15,
    color:      '#6b6363',
    lineHeight: 23,
  },

  /** Helper / caption — 13 / Medium / muted #8a7f7f. */
  subtle: {
    fontFamily: font.medium,
    fontWeight: '500',
    fontSize:   14,
    color:      '#8a7f7f',
    lineHeight: 21,
  },

  // ── Small / decorative ─────────────────────────────────────────────────────

  /** Eyebrow / overline — 11 / SemiBold / muted.  e.g. "YOUR LOCATION". */
  overline: {
    fontFamily:    font.semibold,
    fontWeight:    '600',
    fontSize:      12,
    color:         '#8a7f7f',
    letterSpacing: 0.8,
  },

  /** Hero banner overline — 12 / Bold / white-70%.  e.g. "FEATURED". */
  bannerOverline: {
    fontFamily:    font.bold,
    fontWeight:    '700',
    fontSize:      13,
    color:         'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },

  /** Tile labels in quick-links 5-col grid — 12 / SemiBold / tile-ink #4a4242. */
  tileLabel: {
    fontFamily: font.semibold,
    fontWeight: '600',
    fontSize:   13,
    color:      '#4a4242',
    textAlign:  'center',
    lineHeight: 16,
  },

  /** Tile labels in More 4-col grid — 12 / SemiBold / tile-ink #4a4242. */
  tileLabelSm: {
    fontFamily: font.semibold,
    fontWeight: '600',
    fontSize:   13,
    color:      '#4a4242',
    textAlign:  'center',
    lineHeight: 16,
  },

  // ── Navigation ─────────────────────────────────────────────────────────────

  /** Bottom-tab label (inactive) — 11 / SemiBold / muted #9a9296. */
  tabLabel: {
    fontFamily: font.semibold,
    fontWeight: '600',
    fontSize:   12,
    color:      '#9a9296',
  },

  /** Bottom-tab label (active) — 11 / Bold / accent #c2591c. */
  tabActive: {
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize:   12,
    color:      '#c2591c',
  },

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Primary button text — 17 / Bold / white.  e.g. Login, Send OTP. */
  button: {
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize:   19,
    color:      '#ffffff',
  },

  /** Secondary button text — 16 / Bold / white.  e.g. Submit Registration, Reset Password. */
  buttonSm: {
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize:   18,
    color:      '#ffffff',
  },

  /** Inline link / accent text — 14 / Bold / accent #c2591c. */
  link: {
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize:   15,
    color:      '#c2591c',
  },

  /** Small inline link — 12 / Bold / accent.  e.g. "View Map", "View All", "Change". */
  linkSm: {
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize:   13,
    color:      '#c2591c',
  },

  // ── Error / status ─────────────────────────────────────────────────────────

  /** Inline validation error — 13 / Medium / error-red. */
  error: {
    fontFamily: font.medium,
    fontWeight: '500',
    fontSize:   14,
    color:      '#c2261c',
    lineHeight: 21,
  },
});

// ── Screen-specific overrides ─────────────────────────────────────────────────
// Spread alongside a typeScale role, e.g.:
//   { ...screenType.heroTitle }
//   { ...typeScale.display, fontSize: 30 }

export const screenType = {
  /** Login H1 — 30px (spec §3.1) */
  loginTitle: { fontSize: 33 } as const,

  /** Register H1 — 23px (spec §3.2) */
  registerTitle: { fontSize: 25 } as const,

  /** Forgot Password H1 — 28px (spec §3.3) */
  forgotTitle: { fontSize: 31 } as const,

  /** Verify OTP H1 — 24px (spec §3.4) */
  otpTitle: { fontSize: 26 } as const,

  /** Hero card title — 19 / ExtraBold / white (spec §3.5) */
  heroTitle: {
    fontFamily: font.extrabold,
    fontWeight: '800' as const,
    fontSize:   21,
    color:      '#ffffff',
    lineHeight: 26,
  },

  /** Hero card subtitle — 12 / Medium / white-80% */
  heroSub: {
    fontFamily: font.medium,
    fontWeight: '500' as const,
    fontSize:   13,
    color:      'rgba(255,255,255,0.8)',
  },

  /** Header greeting line — 12 / Medium / white-85% */
  greetSub: {
    fontFamily: font.medium,
    fontWeight: '500' as const,
    fontSize:   13,
    color:      'rgba(255,255,255,0.85)',
  },

  /** Header brand name — 17 / ExtraBold / white */
  greetMain: {
    fontFamily: font.extrabold,
    fontWeight: '800' as const,
    fontSize:   19,
    color:      '#ffffff',
  },

  /** Location chip value — 13 / Bold / ink (spec §3.5) */
  locationValue: {
    fontFamily: font.bold,
    fontWeight: '700' as const,
    fontSize:   14,
    color:      '#2b2424',
  },

  /** Vihar banner caption — 12 / Medium / white-90% */
  viharCaption: {
    fontFamily: font.medium,
    fontWeight: '500' as const,
    fontSize:   13,
    color:      'rgba(255,255,255,0.9)',
  },

  /** Vihar stat number — 22 / ExtraBold / white */
  viharCount: {
    fontFamily:    font.extrabold,
    fontWeight:    '800' as const,
    fontSize:      24,
    color:         '#ffffff',
    letterSpacing: -0.3,
  },

  /** Gurudev card name — 14 / Bold / ink */
  guruName: {
    fontFamily: font.bold,
    fontWeight: '700' as const,
    fontSize:   15,
    color:      '#2b2424',
    lineHeight: 20,
  },

  /** Gurudev card role — 12 / Medium / muted */
  guruRole: {
    fontFamily: font.medium,
    fontWeight: '500' as const,
    fontSize:   13,
    color:      '#8a7f7f',
  },

  /** Gurudev distance number — 13 / ExtraBold / accent (spec §3.5) */
  guruDistNum: {
    fontFamily: font.extrabold,
    fontWeight: '800' as const,
    fontSize:   14,
    color:      '#c2591c',
  },

  /** Menu screen header — 22 / ExtraBold / white */
  menuHeader: {
    fontFamily:    font.extrabold,
    fontWeight:    '800' as const,
    fontSize:      24,
    color:         '#ffffff',
    letterSpacing: -0.3,
  },

  /** Menu screen subtitle — 13 / Medium / white-88% */
  menuSub: {
    fontFamily: font.medium,
    fontWeight: '500' as const,
    fontSize:   14,
    color:      'rgba(255,255,255,0.88)',
  },
};