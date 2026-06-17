export const BASE_URL = 'https://globalmahasabha.com';

export const API_TIMEOUT = 15000; // 15 seconds

// Two response envelopes exist in this backend:
//   Main API  → { success: boolean, message, data }
//   Vihar API → { ok: boolean,      message, data }
export const ENDPOINTS = {
  // ── Auth (Main API) ──────────────────────────────────────────────
  LOGIN:           '/api/login.php',
  REGISTER:        '/api/register.php',
  LOCATIONS:       '/api/locations.php',
  UPDATE_USER:     '/api/update_user.php',

  // ── Vihar Mobile API ─────────────────────────────────────────────
  HOME:            '/vihar/api/mobile/home.php',
  GURUJI_LIST:     '/vihar/api/mobile/guruji_list.php',
  GURUJI_DETAIL:   '/vihar/api/mobile/guruji_detail.php',
  PLACE_DETAIL:    '/vihar/api/mobile/place_detail.php',
  DIRECTORIES:     '/vihar/api/mobile/directories.php',
  ACCOUNT:         '/vihar/api/mobile/account.php',
  GURUJI_LOCATION: '/vihar/api/mobile/guruji_location.php',
  MY_PLACES:       '/vihar/api/mobile/my_places.php',

  // ── Vihar Web API ────────────────────────────────────────────────
  MAP_PLACES:      '/vihar/api/map_places.php',
  GEOCODE:         '/vihar/api/geocode.php',
  ROUTE_REPORT:    '/vihar/api/route_report.php',
} as const;
