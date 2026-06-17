import client, { toFormData } from '../client';
import { ENDPOINTS } from '../config';
import type { ViharResponse, AccountData } from '../types';

// ── Get Account ───────────────────────────────────────────────────────────────

export async function getAccount(user_id: number): Promise<ViharResponse<AccountData>> {
  const { data } = await client.get<ViharResponse<AccountData>>(ENDPOINTS.ACCOUNT, {
    params: { user_id },
  });
  return data;
}

// ── Set Vihar Role ────────────────────────────────────────────────────────────

export type ViharRoleType = 'user' | 'guruji' | 'both';

export async function setRole(
  user_id: number,
  vihar_role_type: ViharRoleType,
): Promise<ViharResponse<unknown>> {
  const { data } = await client.post<ViharResponse<unknown>>(
    ENDPOINTS.ACCOUNT,
    toFormData({ user_id, action: 'set_role', vihar_role_type }),
  );
  return data;
}

// ── Toggle Favourite Guruji ───────────────────────────────────────────────────

export async function toggleFavourite(
  user_id: number,
  guruji_id: number,
): Promise<ViharResponse<unknown>> {
  const { data } = await client.post<ViharResponse<unknown>>(
    ENDPOINTS.ACCOUNT,
    toFormData({ user_id, action: 'toggle_favourite', guruji_id }),
  );
  return data;
}

// ── Update User Location (via account.php) ────────────────────────────────────

export async function updateAccountLocation(
  user_id: number,
  lat: number,
  lng: number,
): Promise<ViharResponse<unknown>> {
  const { data } = await client.post<ViharResponse<unknown>>(
    ENDPOINTS.ACCOUNT,
    toFormData({ user_id, action: 'update_location', lat, lng }),
  );
  return data;
}
