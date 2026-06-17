import client, { toFormData } from '../client';
import { ENDPOINTS } from '../config';
import type {
  MainResponse,
  LoginData,
  RegisterData,
  LocationsData,
} from '../types';

// ── Login ─────────────────────────────────────────────────────────────────────

export type LoginParams = {
  identity: string;   // email | 10-digit mobile | 11-digit user_code
  password: string;
  fcm_token?: string;
};

export async function login(params: LoginParams): Promise<MainResponse<LoginData>> {
  const { data } = await client.post<MainResponse<LoginData>>(
    ENDPOINTS.LOGIN,
    toFormData(params),
  );
  return data;
}

// ── Register ──────────────────────────────────────────────────────────────────

export type RegisterParams = {
  full_name: string;
  email: string;
  mobile: string;       // exactly 10 digits
  password: string;     // min 8 chars
  address: string;
  state_id: number;
  district_id: number;
  city_id: number;
  pincode?: string;     // 6 digits
  fcm_token?: string;
};

export async function register(params: RegisterParams): Promise<MainResponse<RegisterData>> {
  const { data } = await client.post<MainResponse<RegisterData>>(
    ENDPOINTS.REGISTER,
    toFormData(params as unknown as Record<string, unknown>),
  );
  return data;
}

// ── Locations (States / Districts / Cities) ───────────────────────────────────

export async function getStates(): Promise<MainResponse<LocationsData>> {
  const { data } = await client.get<MainResponse<LocationsData>>(
    `${ENDPOINTS.LOCATIONS}?type=states`,
  );
  return data;
}

export async function getDistricts(state_id: number): Promise<MainResponse<LocationsData>> {
  const { data } = await client.get<MainResponse<LocationsData>>(
    `${ENDPOINTS.LOCATIONS}?type=districts&state_id=${state_id}`,
  );
  return data;
}

export async function getCities(
  state_id: number,
  district_id: number,
): Promise<MainResponse<LocationsData>> {
  const { data } = await client.get<MainResponse<LocationsData>>(
    `${ENDPOINTS.LOCATIONS}?type=cities&state_id=${state_id}&district_id=${district_id}`,
  );
  return data;
}

// ── Update User ───────────────────────────────────────────────────────────────

export type UpdateUserParams = {
  user_id: number;
  full_name?: string;
  email?: string;
  mobile?: string;
  address?: string;
  state_name?: string;
  district_name?: string;
  city_name?: string;
  pincode?: string;
  fcm_token?: string;
  password?: string;
};

export async function updateUser(
  params: UpdateUserParams,
): Promise<MainResponse<{ user_id: number; affected_rows: number }>> {
  const { data } = await client.post(
    ENDPOINTS.UPDATE_USER,
    toFormData(params as unknown as Record<string, unknown>),
  );
  return data;
}
