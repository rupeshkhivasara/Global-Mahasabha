// ── Brand gradient (G2 "Gold Glow" — Saffron Path palette) ───────────────────
export const GRADIENT_START = '#d7ad42';   // bright gold    (was #ec5f69)
export const GRADIENT_MID   = '#e0a23a';   // amber          (new 3-stop middle)
export const GRADIENT_END   = '#c2591c';   // burnt saffron  (was #eaa466)
export const GRADIENT: [string, string, string] = [GRADIENT_START, GRADIENT_MID, GRADIENT_END];
export const GRADIENT_LOCATIONS: [number, number, number] = [0, 0.5, 1];
export const GRADIENT_DIR = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

// ── Brand colors ──────────────────────────────────────────────────────────────
export const ACCENT      = '#c2591c';   // solid text/icon accent  (was #ec5f69)
export const ACCENT_DARK = '#8a3417';   // darker shade (logo title)
export const ACCENT_DEEP = '#6b2508';   // deepest shade (shadows)

// ── Text colors ───────────────────────────────────────────────────────────────
export const TEXT_PRIMARY  = '#2b2424';   // headings / main text
export const TEXT_LABEL    = '#3a3232';   // form labels
export const TEXT_MUTED    = '#8a7f7f';   // secondary text / hints
export const TEXT_PALE     = '#b7b3b3';   // placeholders
export const TEXT_DISABLED = '#6b6363';   // disabled state

// ── Background colors ─────────────────────────────────────────────────────────
export const BG_PAGE  = '#fffdf6';   // screen background (was #fdf6e8)
export const BG_FIELD = '#f6f5f5';   // input field fill
export const BG_SOFT  = '#f8ebd5';   // chip / icon tile tint          (was #fbe1e1)
export const BG_WHITE = '#ffffff';

// ── Border / divider ──────────────────────────────────────────────────────────
export const BORDER_DEFAULT = '#ececec';
export const BORDER_LIGHT   = '#f0eeee';

// ── Status bar ────────────────────────────────────────────────────────────────
export const STATUS_BAR_BG = GRADIENT_START;

// ── Radius ───────────────────────────────────────────────────────────────────
export const RADIUS_SM  = 10;
export const RADIUS_MD  = 13;
export const RADIUS_LG  = 16;
export const RADIUS_XL  = 20;
export const RADIUS_BTN = 16;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const SPACING_XS = 8;
export const SPACING_SM = 12;
export const SPACING_MD = 16;
export const SPACING_LG = 24;
export const SPACING_XL = 32;

// ── Typography ────────────────────────────────────────────────────────────────
// Legacy size constants kept for backward compatibility.
export const FONT_XS  = 11;
export const FONT_SM  = 13;
export const FONT_MD  = 15;
export const FONT_LG  = 18;
export const FONT_XL  = 22;
export const FONT_2XL = 28;
export const FONT_3XL = 32;

// Full type scale and font family map — prefer importing directly from typography.ts.
export { font, typeScale, screenType } from './typography';

// ── Shadow (brand-tinted) ─────────────────────────────────────────────────────
export const SHADOW_BRAND = {
  shadowColor:   ACCENT_DEEP,
  shadowOpacity: 0.22,
  shadowRadius:  12,
  shadowOffset:  { width: 0, height: 8 },
  elevation:     6,
};

export const SHADOW_BTN = {
  shadowColor:   ACCENT_DEEP,
  shadowOpacity: 0.5,
  shadowRadius:  14,
  shadowOffset:  { width: 0, height: 8 },
  elevation:     6,
};
