import client, { toFormData } from '../client';
import { ENDPOINTS } from '../config';

export const NAVKAR_MANTRA = [
  'Namo Arihantanam',
  'Namo Siddhanam',
  'Namo Ayariyanam',
  'Namo Uvajjhayanam',
  'Namo Loye Savva Sahunam',
  'Eso Pancha Namokkaro',
  'Savva Pavappanasano',
  'Mangalanam Cha Savvesim',
  'Padhamam Havai Mangalam',
].join('. ');

export type MalaSummary = {
  today_count: number;
  session_count: number;
  lifetime_count: number;
  global_count: number;
  completed_malas: number;
  accuracy_threshold: number;
};

export type MalaSession = {
  session_id: string;
  accuracy_threshold: number;
  summary: MalaSummary;
};

export type MantraValidation = {
  accepted: boolean;
  accuracy: number;
  accuracy_threshold: number;
  summary: MalaSummary;
};

type MalaResponse<T> = { success: boolean; message?: string; data: T };

async function request<T>(params: Record<string, unknown>): Promise<T> {
  const { data } = await client.post<MalaResponse<T>>(ENDPOINTS.DIGITAL_MALA, toFormData(params));
  if (!data.success) throw new Error(data.message ?? 'Digital Mala service is unavailable.');
  return data.data;
}

export function getMalaSummary(userId: number) {
  return request<MalaSummary>({ action: 'summary', user_id: userId });
}

export function startMalaSession(userId: number) {
  return request<MalaSession>({ action: 'start_session', user_id: userId, mantra: 'navkar' });
}

/**
 * Server-side recognition/validation is authoritative. Transcript is supplied
 * by the device recognizer; deployments that stream audio can additionally pass
 * an `audio_reference` without changing this client contract.
 */
export function validateNavkarRecitation(params: {
  userId: number;
  sessionId: string;
  transcript: string;
}) {
  return request<MantraValidation>({
    action: 'validate_recitation',
    user_id: params.userId,
    session_id: params.sessionId,
    mantra: 'navkar',
    transcript: params.transcript,
  });
}

export function stopMalaSession(params: {
  userId: number;
  sessionId: string;
  acceptedCount: number;
}) {
  return request<{ average_accuracy: number; summary: MalaSummary }>({
    action: 'stop_session',
    user_id: params.userId,
    session_id: params.sessionId,
    accepted_count: params.acceptedCount,
  });
}
