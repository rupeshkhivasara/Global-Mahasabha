# Font Sizes — GlobalMahasabha App

Range: **11 – 30px** across 13 distinct sizes.
Base: **14px** (body / label / cardTitle) · Floor: **11px** (tabs + overlines) · Ceiling: **30px** (Login H1)

---

## Size Reference

| Size | Token | Used for |
|------|-------|----------|
| 11 | `tabLabel` | Bottom tab inactive labels |
| 11 | `tabActive` | Bottom tab active labels |
| 11 | `overline` | "YOUR LOCATION", eyebrow labels |
| 12 | `tileLabel` | Quick Links 5-col tile labels |
| 12 | `tileLabelSm` | More screen 4-col grid labels |
| 12 | `bannerOverline` | "FEATURED" badge text |
| 12 | `linkSm` | "View Map", "Change", "See All" |
| 12 | `greetSub` | "Jai Jinendra" header greeting |
| 12 | `heroSub` / `viharCaption` | Banner / vihar subtitles |
| 12 | `guruRole` | "Maharaj" role text in Gurudev card |
| 13 | `subtle` | Helper / caption text |
| 13 | `error` | Inline validation errors |
| 13 | `locationValue` | Location chip value |
| 13 | `guruDistNum` | Distance number in Gurudev card |
| 13 | `menuSub` | More menu screen subtitle |
| 14 | `label` | Form labels |
| 14 | `body` | Body / input text |
| 14 | `cardTitle` | Card / list item titles |
| 14 | `link` | Inline accent links |
| 14 | `guruName` | Gurudev card name |
| 15 | `sectionHead` | "Quick Links", "Nearby Gurudev" headings |
| 16 | `buttonSm` | Register / Reset Password buttons |
| 17 | `button` | Login, Send OTP primary buttons |
| 17 | `greetMain` | "Global Mahasabha" brand name |
| 19 | `heroTitle` | Banner card overlay title |
| 22 | `viharCount` | Vihar stat number |
| 22 | `menuHeader` | More menu screen title |
| 23 | `title` | Register H1 |
| 24 | `otpTitle` | Verify OTP H1 |
| 28 | `display` | Default screen H1 / Forgot Password |
| 30 | `loginTitle` | Login H1 (largest) |

---

## Scale by Category

### Floor
`11` — tabs, overlines (paired with icon; label is secondary to the icon)

### Caption group (12)
tile labels, small links, header greeting, banner subtitles, role text

### Small group (13)
subtle, error, captions, location value, distance, menu subtitle

### Base (14)
body, label, cardTitle, link, card names

### Headings
`15` section · `17` button / brand name · `19` hero banner

### Stats / screen headers
`22` — vihar count, More menu header

### Screen H1 titles
`23` Register · `24` Verify OTP · `28` Forgot Password · `30` Login

---

## Source
All tokens in `src/typography.ts` — `typeScale` (shared) and `screenType` (screen-specific).
Sizes referenced by token name — never hard-coded in screens.
