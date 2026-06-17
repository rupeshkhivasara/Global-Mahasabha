import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, AppState,
} from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useAuth } from '../../context/AuthContext';
import {
  requestLocationPermission,
  checkLocationPermission,
  startBackgroundLocation,
  stopBackgroundLocation,
  isTracking,
  setLocationCallback,
  type LocationData,
} from '../services/BackgroundLocationService';

async function showLocationNotification(loc: LocationData) {
  const channelId = await notifee.createChannel({
    id: 'location-test',
    name: 'Location Test',
    importance: AndroidImportance.HIGH,
  });
  await notifee.displayNotification({
    id: 'location-test',
    title: 'Location Update',
    body: `Lat: ${loc.latitude.toFixed(6)}   Lng: ${loc.longitude.toFixed(6)}\nAccuracy: ${loc.accuracy.toFixed(1)} m`,
    android: { channelId, pressAction: { id: 'default' } },
  });
}

export default function LocationScreen() {
  const { user } = useAuth();

  const [permissionStatus, setPermissionStatus] = useState<
    'unknown' | 'granted' | 'background' | 'denied'
  >('unknown');
  const [tracking, setTracking] = useState(false);
  const [lastLoc, setLastLoc] = useState<LocationData | null>(null);
  const [apiStatus, setApiStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [apiMsg, setApiMsg] = useState('');

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setTracking(isTracking());

    checkLocationPermission().then(status => {
      if (isMounted.current) setPermissionStatus(status);
    });

    const sub = AppState.addEventListener('change', next => {
      if (!isMounted.current) return;
      if (next === 'active') {
        checkLocationPermission().then(s => {
          if (isMounted.current) setPermissionStatus(s);
        });
        if (isMounted.current) setTracking(isTracking());
      }
    });

    return () => {
      isMounted.current = false;
      sub.remove();
    };
  }, []);

  const handlePermission = useCallback(async () => {
    const granted = await requestLocationPermission();
    setPermissionStatus(granted ? 'background' : 'denied');
  }, []);

  const startTest = useCallback(async () => {
    setApiStatus('idle');
    setApiMsg('');
    setLocationCallback(loc => {
      if (isMounted.current) {
        setLastLoc(loc);
        setApiStatus('sending');
      }
      showLocationNotification(loc);  // TEST: notification on every GPS fix
    });
    await startBackgroundLocation();
    if (isMounted.current) setTracking(true);
  }, []);

  const stopTest = useCallback(async () => {
    setLocationCallback(() => {});
    await stopBackgroundLocation();
    notifee.cancelNotification('location-test');
    if (isMounted.current) {
      setTracking(false);
      setLastLoc(null);
      setApiStatus('idle');
      setApiMsg('');
    }
  }, []);

  // Reflect API result from BackgroundLocationService console logs
  // (BackgroundLocationService calls sendLocationToAPI internally)
  useEffect(() => {
    if (apiStatus === 'sending' && lastLoc) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setApiStatus(user ? 'ok' : 'error');
          setApiMsg(user ? 'Location sent to API' : 'Not logged in — skipped');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [lastLoc, apiStatus, user]);

  return (
    <View style={styles.root}>

      {/* ── Permission card ── */}
      <View style={[
        styles.card,
        permissionStatus === 'background' && styles.cardBorderGreen,
        permissionStatus === 'granted'    && styles.cardBorderOrange,
        permissionStatus === 'denied'     && styles.cardBorderRed,
      ]}>
        <Text style={styles.cardLabel}>LOCATION PERMISSION</Text>
        <Text style={styles.cardValue}>
          {permissionStatus === 'unknown'     ? 'Checking…'
          : permissionStatus === 'background' ? '✓ Always / Background granted'
          : permissionStatus === 'granted'    ? '⚠ Foreground only'
          : '✗ Denied'}
        </Text>
        <Text style={styles.cardSub}>
          {permissionStatus === 'background'
            ? 'Location will be sent to API on every update'
            : permissionStatus === 'granted'
              ? 'Settings → Permissions → Location → Allow all the time'
              : permissionStatus === 'denied'
                ? 'Tap below to open permission dialog'
                : ''}
        </Text>
        {permissionStatus !== 'background' && (
          <TouchableOpacity style={styles.btn} onPress={handlePermission}>
            <Text style={styles.btnText}>
              {permissionStatus === 'granted' ? 'Open Settings' : 'Request Permission'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Background tracking test card ── */}
      <View style={[styles.card, styles.mt, tracking && styles.cardBorderGreen]}>
        <Text style={styles.cardLabel}>BACKGROUND TRACKING TEST</Text>
        <Text style={styles.cardSub}>
          {tracking
            ? `Tracking active — GPS → API (${user ? 'logged in' : 'NOT logged in, API skipped'})`
            : user
              ? 'Tap Start to begin sending location to guruji_location.php'
              : '⚠ Not logged in — API calls will be skipped until you sign in'}
        </Text>

        {/* API call status */}
        {apiStatus !== 'idle' && (
          <View style={[
            styles.statusBox,
            apiStatus === 'ok'      && styles.statusOk,
            apiStatus === 'error'   && styles.statusError,
            apiStatus === 'sending' && styles.statusSending,
          ]}>
            <Text style={styles.statusText}>
              {apiStatus === 'sending' ? '⏳ Sending to API…'
              : apiStatus === 'ok'     ? `✓ ${apiMsg}`
              :                          `✗ ${apiMsg}`}
            </Text>
          </View>
        )}

        {lastLoc && (
          <View style={styles.locBox}>
            <Text style={styles.locText}>Lat  {lastLoc.latitude.toFixed(6)}</Text>
            <Text style={styles.locText}>Lng  {lastLoc.longitude.toFixed(6)}</Text>
            <Text style={styles.locText}>Acc  {lastLoc.accuracy.toFixed(1)} m</Text>
          </View>
        )}

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGreen, tracking && styles.btnDisabled]}
            onPress={startTest}
            disabled={tracking}>
            <Text style={styles.btnTextGreen}>▶ Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnRed, !tracking && styles.btnDisabled]}
            onPress={stopTest}
            disabled={!tracking}>
            <Text style={styles.btnTextRed}>■ Stop</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F4F7', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mt: { marginTop: 16 },
  cardBorderGreen:  { borderLeftWidth: 4, borderLeftColor: '#10B981' },
  cardBorderOrange: { borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  cardBorderRed:    { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  cardLabel: {
    fontSize: 10, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  cardValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  cardSub:   { fontSize: 12, color: '#6B7280', marginTop: 4 },
  btn: {
    marginTop: 12, borderWidth: 1.5, borderColor: '#2563EB',
    borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  btnText:      { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  row:          { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnGreen:     { flex: 1, borderColor: '#10B981', marginTop: 12 },
  btnRed:       { flex: 1, borderColor: '#EF4444', marginTop: 12 },
  btnDisabled:  { opacity: 0.35 },
  btnTextGreen: { color: '#10B981', fontWeight: '600', fontSize: 14 },
  btnTextRed:   { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  statusBox:     { marginTop: 10, borderRadius: 8, padding: 8 },
  statusOk:      { backgroundColor: '#D1FAE5' },
  statusError:   { backgroundColor: '#FEE2E2' },
  statusSending: { backgroundColor: '#FEF3C7' },
  statusText:    { fontSize: 12, fontWeight: '500', color: '#374151' },
  locBox: {
    marginTop: 10, backgroundColor: '#F9FAFB',
    borderRadius: 8, padding: 10, gap: 2,
  },
  locText: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
});
