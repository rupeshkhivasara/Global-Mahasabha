import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import digitalMalaReducer, { hydrated, type PersistedDigitalMala } from './digitalMalaSlice';
import { loadPersistedMala, savePersistedMala } from './malaPersistence';

export const store = configureStore({
  reducer: {
    digitalMala: digitalMalaReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/** Loads persisted counters once at app boot; the store is usable before this resolves (starts at zero). */
export async function hydrateStore(): Promise<void> {
  const persisted = await loadPersistedMala();
  if (persisted) store.dispatch(hydrated(persisted));
}

// Persist the durable subset of digitalMala state after it changes.
// Debounced so a rapid string of accepted chants writes once, not per-chant.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSnapshot = '';
store.subscribe(() => {
  const {
    todayCount, todayDate, lifetimeCount, globalCount, completedMalas,
    accuracyThreshold, goalMala, streak, lastActiveDate,
  } = store.getState().digitalMala;
  const persisted: PersistedDigitalMala = {
    todayCount, todayDate, lifetimeCount, globalCount, completedMalas,
    accuracyThreshold, goalMala, streak, lastActiveDate,
  };
  const snapshot = JSON.stringify(persisted);
  if (snapshot === lastSnapshot) return;
  lastSnapshot = snapshot;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void savePersistedMala(persisted); }, 500);
});
