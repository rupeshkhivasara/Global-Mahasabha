import client, { toFormData } from '../client';
import { ENDPOINTS } from '../config';
import type { ViharResponse, GurujiLocationData } from '../types';

// ── Post Guruji Location (continuous GPS) ─────────────────────────────────────

export type UpdateLocationParams = {
  user_id: number;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  tracked_at?: string; // ISO string
};

export async function updateGurujiLocation(
  params: UpdateLocationParams,
): Promise<ViharResponse<GurujiLocationData>> {
  const { data } = await client.post<ViharResponse<GurujiLocationData>>(
    ENDPOINTS.GURUJI_LOCATION,
    toFormData(params as unknown as Record<string, unknown>),
  );
  return data;
}

// ── Get Guruji Location ───────────────────────────────────────────────────────

export async function getGurujiLocation(
  user_id: number,
): Promise<ViharResponse<GurujiLocationData>> {
  const { data } = await client.get<ViharResponse<GurujiLocationData>>(
    ENDPOINTS.GURUJI_LOCATION,
    { params: { user_id } },
  );
  return data;
}
