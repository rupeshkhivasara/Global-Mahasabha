import client from '../client';
import { ENDPOINTS } from '../config';
import type {
  ViharResponse,
  HomeData,
  GurujiListData,
  GurujiDetailData,
  PlaceDetailData,
} from '../types';

// ── Home ──────────────────────────────────────────────────────────────────────

export type HomeParams = {
  lat?: number;
  lng?: number;
  guruji_limit?: number; // default 4, max 8
};

export async function getHome(params?: HomeParams): Promise<ViharResponse<HomeData>> {
  const { data } = await client.get<ViharResponse<HomeData>>(ENDPOINTS.HOME, {
    params,
  });
  return data;
}

// ── Guruji List ───────────────────────────────────────────────────────────────

export type GurujiListParams = {
  q?: string;   // search by name / mobile / about
  lat?: number;
  lng?: number;
};

export async function getGurujiList(
  params?: GurujiListParams,
): Promise<ViharResponse<GurujiListData>> {
  const { data } = await client.get<ViharResponse<GurujiListData>>(
    ENDPOINTS.GURUJI_LIST,
    { params },
  );
  return data;
}

// ── Guruji Detail ─────────────────────────────────────────────────────────────

export type GurujiDetailParams =
  | { id: number; token?: never; user_id?: number }
  | { token: string; id?: never; user_id?: number };

export async function getGurujiDetail(
  params: GurujiDetailParams,
): Promise<ViharResponse<GurujiDetailData>> {
  const { data } = await client.get<ViharResponse<GurujiDetailData>>(
    ENDPOINTS.GURUJI_DETAIL,
    { params },
  );
  return data;
}

// ── Place Detail ──────────────────────────────────────────────────────────────

export type PlaceDetailParams =
  | { id: number; token?: never }
  | { token: string; id?: never };

export async function getPlaceDetail(
  params: PlaceDetailParams,
): Promise<ViharResponse<PlaceDetailData>> {
  const { data } = await client.get<ViharResponse<PlaceDetailData>>(
    ENDPOINTS.PLACE_DETAIL,
    { params },
  );
  return data;
}

// ── Directories ───────────────────────────────────────────────────────────────

export type DirectoryType =
  | 'members'
  | 'donors'
  | 'pillars'
  | 'medical'
  | 'human_resources'
  | 'about';

export async function getDirectory(
  type: DirectoryType,
  limit?: number,
): Promise<ViharResponse<unknown>> {
  const { data } = await client.get<ViharResponse<unknown>>(ENDPOINTS.DIRECTORIES, {
    params: { type, ...(limit !== undefined && { limit }) },
  });
  return data;
}
