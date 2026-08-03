import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedDigitalMala } from './digitalMalaSlice';

const STORAGE_KEY = '@digital_mala_state';

export async function loadPersistedMala(): Promise<Partial<PersistedDigitalMala> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function savePersistedMala(state: PersistedDigitalMala): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort — a failed write just means counters replay from the last
    // successful save next launch, never a crash
  }
}
