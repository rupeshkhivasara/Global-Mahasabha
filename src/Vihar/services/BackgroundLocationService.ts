import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions';
import { updateGurujiLocation, getAuthUserId } from '../../api';

export type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
};

export type LocationCallback = (location: LocationData) => void;

let onLocationUpdate: LocationCallback | null = null;
let watcherId: number | null = null;

export function setLocationCallback(cb: LocationCallback) {
  onLocationUpdate = cb;
}

// ─── Permission ───────────────────────────────────────────────────────────────

export async function checkLocationPermission(): Promise<'granted' | 'background' | 'denied'> {
  if (Platform.OS === 'ios') {
    // requestAuthorization is idempotent on iOS: returns current status without
    // showing the dialog again if the user has already decided.
    // Use 'whenInUse' here so a pure check never triggers the "always" upgrade prompt.
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted' ? 'granted' : 'denied';
  }

  const fine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (!fine) return 'denied';

  if ((Platform.Version as number) >= 29) {
    const bg = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    );
    return bg ? 'background' : 'granted';
  }

  return 'granted';
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('always');
    return status === 'granted';
  }

  const apiLevel = Platform.Version as number;

  const alreadyFine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (!alreadyFine) {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs your location to track your position.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }

  if (apiLevel >= 33) {
    const notifGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (!notifGranted) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    }
  }

  if (apiLevel >= 29) {
    const alreadyBg = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    );
    if (alreadyBg) return true;

    if (apiLevel >= 30) {
      await new Promise<void>(resolve => {
        Alert.alert(
          'Background Location Required',
          'To keep tracking when the app is closed:\n\n1. Tap "Open Settings"\n2. Tap Permissions → Location\n3. Choose "Allow all the time"',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Open Settings',
              onPress: () => { Linking.openSettings(); resolve(); },
            },
          ],
        );
      });
      return PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      );
    }

    const bg = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Background Location',
        message: 'Allow location access in background so tracking continues when the app is closed.',
        buttonPositive: 'Allow all the time',
        buttonNegative: 'Deny',
      },
    );
    return bg === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

// ─── Rate-limiter state (API sender + UI callback) ───────────────────────────

const API_MIN_INTERVAL_MS = 60_000; // 1 minute
const POSITION_THRESHOLD  = 0.0005; // ~55 m in lat/lng degrees

let lastApiSentAt  = 0;
let lastApiSentLat = 0;
let lastApiSentLng = 0;

let lastCbAt  = 0;
let lastCbLat = 0;
let lastCbLng = 0;

// Fire onLocationUpdate at most once per minute, and only when position moved.
function shouldFireCallback(loc: LocationData): boolean {
  const now     = Date.now();
  const elapsed = now - lastCbAt;
  const dlat    = Math.abs(loc.latitude  - lastCbLat);
  const dlng    = Math.abs(loc.longitude - lastCbLng);
  const moved   = dlat > POSITION_THRESHOLD || dlng > POSITION_THRESHOLD;

  if (lastCbAt === 0) {
    lastCbAt = now; lastCbLat = loc.latitude; lastCbLng = loc.longitude;
    return true;
  }
  if (!moved) return false;
  if (elapsed < API_MIN_INTERVAL_MS) return false;

  lastCbAt = now; lastCbLat = loc.latitude; lastCbLng = loc.longitude;
  return true;
}

// ─── Location watcher ─────────────────────────────────────────────────────────

function startWatcher() {
  if (watcherId !== null) return;

  // Reset rate-limiter state so the very first fix always fires the callback
  // and sends to API, regardless of when tracking last ran.
  lastCbAt = 0; lastCbLat = 0; lastCbLng = 0;
  lastApiSentAt = 0; lastApiSentLat = 0; lastApiSentLng = 0;

  watcherId = Geolocation.watchPosition(
    position => {
      const loc: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      };

      if (shouldFireCallback(loc)) {
        onLocationUpdate?.(loc);
      }
      sendLocationToAPI(loc);
    },
    error => console.warn('[Location] watchPosition error:', error.message),
    {
      enableHighAccuracy: true,
      distanceFilter: 0,
      interval: 2000,
      fastestInterval: 2000,
      forceRequestLocation: true,
      showsBackgroundLocationIndicator: true,
      ...(Platform.OS === 'ios' && { allowsBackgroundLocationUpdates: true }),
    } as Parameters<typeof Geolocation.watchPosition>[2],
  );
}

function stopWatcher() {
  if (watcherId !== null) {
    Geolocation.clearWatch(watcherId);
    watcherId = null;
  }
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function sendLocationToAPI(loc: LocationData) {
  const userId = getAuthUserId();
  if (!userId) return;

  const now     = Date.now();
  const elapsed = now - lastApiSentAt;

  const dlat  = Math.abs(loc.latitude  - lastApiSentLat);
  const dlng  = Math.abs(loc.longitude - lastApiSentLng);
  const moved = dlat > POSITION_THRESHOLD || dlng > POSITION_THRESHOLD;

  // First fix: always send
  // After that: only if 1 min passed AND position changed
  if (lastApiSentAt > 0 && (elapsed < API_MIN_INTERVAL_MS || !moved)) return;

  lastApiSentAt  = now;
  lastApiSentLat = loc.latitude;
  lastApiSentLng = loc.longitude;

  try {
    await updateGurujiLocation({
      user_id:    userId,
      lat:        loc.latitude,
      lng:        loc.longitude,
      accuracy:   loc.accuracy,
      speed:      loc.speed    ?? undefined,
      heading:    loc.heading  ?? undefined,
      tracked_at: new Date(loc.timestamp).toISOString(),
    });
    console.log('[Location] Sent to API:', loc.latitude, loc.longitude);
  } catch (err) {
    console.warn('[Location] API send failed:', err);
  }
}

// ─── Android foreground service ───────────────────────────────────────────────

const keepAliveTask = async () => {
  startWatcher();
  while (BackgroundService.isRunning()) {
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
  }
  stopWatcher();
};

const backgroundOptions = {
  taskName: 'LocationTracking',
  taskTitle: 'Tracking your location',
  taskDesc: 'Location updates are active.',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#2196F3',
  foregroundServiceType: ['location'] as ['location'],
  parameters: {},
};

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startBackgroundLocation(): Promise<void> {
  if (Platform.OS === 'android') {
    if (!BackgroundService.isRunning()) {
      await BackgroundService.start(keepAliveTask, backgroundOptions);
    }
  } else {
    startWatcher();
  }
}

export async function stopBackgroundLocation(): Promise<void> {
  if (Platform.OS === 'android') {
    await BackgroundService.stop();
  } else {
    stopWatcher();
  }
}

export function isTracking(): boolean {
  if (Platform.OS === 'android') return BackgroundService.isRunning();
  return watcherId !== null;
}
