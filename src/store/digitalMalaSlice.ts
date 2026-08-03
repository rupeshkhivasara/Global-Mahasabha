import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// TEMPORARY: /api/digital_mala.php is not deployed (confirmed 404 from the
// live backend), so this slice is the interim source of truth for Digital
// Mala counters — see src/api/endpoints/digitalMala.ts and
// docs/DIGITAL_MALA_API.md for the real contract this will be replaced by.
// When the backend ships, swap DigitalMalaScreen/MainDashboardScreen back to
// those API calls and delete this slice's counting logic (the UI shape —
// todayCount/sessionCount/lifetimeCount/globalCount/completedMalas — was
// kept identical to MalaSummary specifically so that swap is mechanical).

export const MALA_SIZE = 108;
export const DEFAULT_ACCURACY_THRESHOLD = 70;

// Default daily mala target shown on the "आज का लक्ष्य" card. No settings UI
// exists yet to let a user change this, so it's a fixed constant for now —
// kept in Redux state (not a hardcoded render value) so wiring a real
// settings screen to it later doesn't require touching the counting logic.
export const DEFAULT_GOAL_MALA = 5;

export interface DigitalMalaState {
  todayCount: number;
  /** ISO date (YYYY-MM-DD) todayCount was last accumulated for — rolls over on a new day. */
  todayDate: string;
  sessionCount: number;
  lifetimeCount: number;
  /** Real cross-user total requires a backend; null renders as "unavailable" rather than a fabricated number. */
  globalCount: number | null;
  completedMalas: number;
  accuracyThreshold: number;
  goalMala: number;
  /** Consecutive calendar days with at least one accepted chant. Real tracking, not a display placeholder. */
  streak: number;
  /** ISO date (YYYY-MM-DD) of the most recent day streak already counted for — prevents double-incrementing within the same day. */
  lastActiveDate: string | null;
  isSessionActive: boolean;
  lastAccuracy: number | null;
  hydrated: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isConsecutiveDay(previousIso: string, currentIso: string): boolean {
  const previous = new Date(`${previousIso}T00:00:00Z`);
  const current = new Date(`${currentIso}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((current.getTime() - previous.getTime()) / dayMs) === 1;
}

const initialState: DigitalMalaState = {
  todayCount: 0,
  todayDate: todayIso(),
  sessionCount: 0,
  lifetimeCount: 0,
  globalCount: null,
  completedMalas: 0,
  accuracyThreshold: DEFAULT_ACCURACY_THRESHOLD,
  goalMala: DEFAULT_GOAL_MALA,
  streak: 0,
  lastActiveDate: null,
  isSessionActive: false,
  lastAccuracy: null,
  hydrated: false,
};

function rolloverDayIfNeeded(state: DigitalMalaState) {
  const today = todayIso();
  if (state.todayDate !== today) {
    state.todayDate = today;
    state.todayCount = 0;
  }
}

export type PersistedDigitalMala = Pick<
  DigitalMalaState,
  | 'todayCount' | 'todayDate' | 'lifetimeCount' | 'globalCount' | 'completedMalas'
  | 'accuracyThreshold' | 'goalMala' | 'streak' | 'lastActiveDate'
>;

const digitalMalaSlice = createSlice({
  name: 'digitalMala',
  initialState,
  reducers: {
    hydrated(state, action: PayloadAction<Partial<PersistedDigitalMala>>) {
      Object.assign(state, action.payload);
      state.hydrated = true;
      rolloverDayIfNeeded(state);
    },
    sessionStarted(state) {
      rolloverDayIfNeeded(state);
      state.isSessionActive = true;
      state.sessionCount = 0;
      state.lastAccuracy = null;
    },
    chantAccepted(state, action: PayloadAction<{ accuracy: number }>) {
      rolloverDayIfNeeded(state);
      state.sessionCount += 1;
      state.todayCount += 1;
      state.lifetimeCount += 1;
      state.lastAccuracy = action.payload.accuracy;
      if (state.sessionCount > 0 && state.sessionCount % MALA_SIZE === 0) {
        state.completedMalas += 1;
      }
      // Streak: this is the first accepted chant of the day the first time
      // todayDate no longer matches lastActiveDate — count it once per day.
      if (state.lastActiveDate !== state.todayDate) {
        state.streak = state.lastActiveDate && isConsecutiveDay(state.lastActiveDate, state.todayDate)
          ? state.streak + 1
          : 1;
        state.lastActiveDate = state.todayDate;
      }
    },
    chantRejected(state, action: PayloadAction<{ accuracy: number }>) {
      state.lastAccuracy = action.payload.accuracy;
    },
    sessionEnded(state) {
      state.isSessionActive = false;
      state.sessionCount = 0;
    },
  },
});

export const {
  hydrated, sessionStarted, chantAccepted, chantRejected, sessionEnded,
} = digitalMalaSlice.actions;

export default digitalMalaSlice.reducer;
