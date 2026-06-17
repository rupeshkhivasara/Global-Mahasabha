import client, { toFormData } from '../client';
import { ENDPOINTS } from '../config';
import type {
  ViharResponse,
  MyPlacesData,
  CreatePlaceData,
  MapPlace,
  GeocodeResult,
  RouteReport,
} from '../types';

// ── My Places — List ──────────────────────────────────────────────────────────

export async function getMyPlaces(user_id: number): Promise<ViharResponse<MyPlacesData>> {
  const { data } = await client.get<ViharResponse<MyPlacesData>>(ENDPOINTS.MY_PLACES, {
    params: { user_id },
  });
  return data;
}

// ── My Places — Create ────────────────────────────────────────────────────────

export type CreatePlaceParams = {
  user_id: number;
  place_name: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  area?: string;
  pincode?: string;
  place_type_id?: number;
  building_age?: string;
  water_source?: string;
  water_cooler?: string;
  water_cooler_count?: number;
  food_arrangement?: string;
  milk_arrangement?: string;
  parking_available?: string;
  parking_type?: string;
  mandir_distance_km?: number;
  petrol_pump_distance_km?: number;
  digambar_jain_population?: number;
  owner_name?: string;
  owner_mobile?: string;
  owner_whatsapp?: string;
  remarks?: string;
};

export async function createPlace(
  params: CreatePlaceParams,
): Promise<ViharResponse<CreatePlaceData>> {
  const { data } = await client.post<ViharResponse<CreatePlaceData>>(
    ENDPOINTS.MY_PLACES,
    toFormData(params as unknown as Record<string, unknown>),
  );
  return data;
}

// ── My Places — Update ────────────────────────────────────────────────────────

export type UpdatePlaceParams = Partial<CreatePlaceParams> & {
  user_id: number;
  place_id: number;
};

export async function updatePlace(
  params: UpdatePlaceParams,
): Promise<ViharResponse<unknown>> {
  const { data } = await client.post<ViharResponse<unknown>>(
    ENDPOINTS.MY_PLACES,
    toFormData(params as unknown as Record<string, unknown>),
  );
  return data;
}

// ── My Places — Delete ────────────────────────────────────────────────────────

export async function deletePlace(
  user_id: number,
  place_id: number,
): Promise<ViharResponse<unknown>> {
  const { data } = await client.post<ViharResponse<unknown>>(
    ENDPOINTS.MY_PLACES,
    toFormData({ user_id, place_id, action: 'delete' }),
  );
  return data;
}

// ── Map Places ────────────────────────────────────────────────────────────────

export async function getMapPlaces(
  all?: boolean,
): Promise<{ ok: boolean; places: MapPlace[] }> {
  const { data } = await client.get<{ ok: boolean; places: MapPlace[] }>(
    ENDPOINTS.MAP_PLACES,
    { params: all ? { all: 1 } : undefined },
  );
  return data;
}

// ── Geocode Autocomplete ──────────────────────────────────────────────────────

export async function geocode(q: string): Promise<GeocodeResult[]> {
  const { data } = await client.get<GeocodeResult[]>(ENDPOINTS.GEOCODE, {
    params: { q },
  });
  return data;
}

// ── Route Report ──────────────────────────────────────────────────────────────

export type GenerateRouteParams = {
  start_lat: number;
  start_lng: number;
  dest_lat: number;
  dest_lng: number;
  start_label?: string;
  dest_label?: string;
  morning_km?: number;
  evening_km?: number;
};

export async function generateRoute(
  params: GenerateRouteParams,
): Promise<{ ok: boolean; data: RouteReport }> {
  const { data } = await client.post<{ ok: boolean; data: RouteReport }>(
    ENDPOINTS.ROUTE_REPORT,
    toFormData({ action: 'generate', ...params as unknown as Record<string, unknown> }),
  );
  return data;
}

export async function loadRoute(
  token: string,
): Promise<{ ok: boolean; data: RouteReport }> {
  const { data } = await client.get<{ ok: boolean; data: RouteReport }>(
    `${ENDPOINTS.ROUTE_REPORT}?token=${token}`,
  );
  return data;
}

export async function saveRoute(
  title: string,
  report_json: string,
): Promise<{ ok: boolean; data: { share_token: string } }> {
  const { data } = await client.post<{ ok: boolean; data: { share_token: string } }>(
    ENDPOINTS.ROUTE_REPORT,
    toFormData({ action: 'save', title, report_json }),
  );
  return data;
}
