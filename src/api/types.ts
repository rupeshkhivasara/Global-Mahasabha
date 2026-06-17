// ── Response envelopes ────────────────────────────────────────────────────────

export type MainResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T;
};

export type ViharResponse<T = unknown> = {
  ok: boolean;
  message: string;
  data: T;
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  user_code: string;
  full_name: string;
  email: string;
  mobile: string;
  approval_status: string;
  vihar_role_type?: string;
};

export type LoginData = { user: User };

export type RegisterData = { user_id: number; user_code: string };

export type LocationState = { id: number; state_name: string; state_code: string };
export type LocationDistrict = { id: number; district_name: string };
export type LocationCity = { id: number; city_name: string };

export type LocationsData =
  | { states: LocationState[] }
  | { districts: LocationDistrict[] }
  | { cities: LocationCity[] };

// ── Vihar ─────────────────────────────────────────────────────────────────────

export type Banner = { id: number; image_url: string; title: string };

export type NearbyGuruji = {
  id: number;
  name: string;
  distance_km: number;
  guruji_token: string;
  profile_url: string;
};

export type QuickLink = { title: string; icon_class: string; link_url: string };

export type HomeData = {
  banners: Banner[];
  nearby_guruji: NearbyGuruji[];
  quick_links: QuickLink[];
  more_links: QuickLink[];
};

export type Guruji = {
  id: number;
  name: string;
  distance_km?: number;
  guruji_token: string;
  about_info?: string;
  lat?: string;
  lng?: string;
};

export type GurujiListData = { guruji: Guruji[]; count: number };

export type Attachment = { id: number; url: string };

export type GurujiDetailData = {
  guruji: Guruji;
  attachments: { images: Attachment[]; videos: Attachment[]; files: Attachment[] };
  questions: unknown[];
  is_favourite: boolean;
};

export type Place = {
  id: number;
  place_name: string;
  lat: string;
  long_: string;
  place_token: string;
  cover_url?: string;
};

export type PlaceDetailData = {
  place: Place;
  cover_url: string;
  files: Attachment[];
  questions: unknown[];
};

export type AccountData = {
  user: User;
  profile: unknown | null;
  guruji_id: number | null;
  can_user_menu: boolean;
  can_guruji_menu: boolean;
};

export type GurujiLocationData = {
  guruji_id: number;
  lat: number;
  lng: number;
  updated_at: string;
  accuracy?: number;
  name?: string;
};

export type MyPlacesData = { places: Place[] };

export type CreatePlaceData = { place_id: number; place_token: string };

export type MapPlace = Place & {
  detail_url: string;
  directions_url: string;
};

export type GeocodeResult = { id: string; label: string; lat: number; lng: number };

export type RouteReport = {
  share_token?: string;
  days: unknown[];
  polylines: unknown[];
};
