# Location Notification Architecture

## Overview

This document explains how location-based notifications work across all three app states in the GlobalMahasabha app.

---

## App States & How Each Is Handled

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APP STATES                                   │
├──────────────┬──────────────────────┬──────────────────────────────┤
│  FOREGROUND  │     BACKGROUND        │        KILL STATE            │
│  App visible │  App in recents/home  │  User swiped app away        │
├──────────────┼──────────────────────┼──────────────────────────────┤
│  JS running  │  JS running via       │  JS is DEAD                  │
│  normally    │  Android Foreground   │  No JS execution possible    │
│              │  Service              │                              │
├──────────────┼──────────────────────┼──────────────────────────────┤
│  notifee     │  notifee via          │  Firebase FCM (server push)  │
│  local notif │  background service   │  → setBackgroundMessageHandler│
└──────────────┴──────────────────────┴──────────────────────────────┘
```

---

## Packages Used

| Package | Purpose |
|---|---|
| `react-native-geolocation-service` | GPS location (watchPosition) |
| `react-native-background-actions` | Android Foreground Service — keeps JS alive in background |
| `@notifee/react-native` | Display local notifications (foreground + background) |
| `@react-native-firebase/messaging` | Receive FCM push from server (kill state) |

---

## Foreground State

**How it works:**
- App is open and visible
- `watchPosition` fires on every location update (every 2 seconds / 0m distance)
- `notifee.displayNotification()` shows the notification directly

**Code path:**
```
watchPosition fires
  → onLocationUpdate callback
  → showLocationNotification(loc)   ← src/Vihar/services/BackgroundLocationService.ts
  → notifee.displayNotification()
  → Notification appears on screen
```

**Key config in `BackgroundLocationService.ts`:**
```ts
Geolocation.watchPosition(callback, errorCb, {
  enableHighAccuracy: true,
  distanceFilter: 0,      // fire on every update
  interval: 2000,         // every 2 seconds
  fastestInterval: 2000,
});
```

---

## Background State

**How it works:**
- User pressed Home button or switched apps
- Android would normally kill the JS process
- `react-native-background-actions` starts an Android **Foreground Service**
- The Foreground Service keeps the Hermes JS engine alive
- `watchPosition` continues firing inside the service
- `notifee` still displays notifications

**Code path:**
```
User presses Home
  → BackgroundService.start(keepAliveTask, options)   ← starts Foreground Service
  → keepAliveTask runs → startWatcher()
  → watchPosition fires every 2s
  → showLocationNotification(loc)
  → notifee.displayNotification()
  → Notification appears in status bar
```

**Why the manifest fix was critical:**
The service was declared with the wrong class name (`com.asterinet.reaction.bgactions` instead of `com.asterinet.react.bgactions`), so Android started two separate services — the correct one WITHOUT `foregroundServiceType="location"`, causing an immediate crash on Android 14+.

**Fixed entry in `AndroidManifest.xml`:**
```xml
<service
  android:name="com.asterinet.react.bgactions.RNBackgroundActionsTask"
  android:foregroundServiceType="location"
  android:exported="false"
  tools:replace="android:foregroundServiceType" />
```

**Foreground Service notification** (mandatory on Android — user sees this in status bar while tracking):
```ts
const backgroundOptions = {
  taskName: 'LocationTracking',
  taskTitle: 'Tracking your location',
  taskDesc: 'Location updates are active.',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#2196F3',
  foregroundServiceType: ['location'],
};
```

---

## Kill State

**Why JS-only solutions don't work:**
When the user swipes the app away from the recents screen, Android 11+ stops all foreground services associated with that app. The JS engine is destroyed. There is no pure React Native / JavaScript solution that can run code after a force-kill on modern Android.

**Solution — Firebase Cloud Messaging (FCM):**
FCM is a system-level push channel maintained by Google Play Services, which runs independently of your app. It can deliver messages even when your app is completely killed.

**Flow:**
```
Device sends location to backend API
  → Backend stores location in database
  → Backend sends FCM push to device:
      {
        "message": {
          "token": "DEVICE_FCM_TOKEN",
          "data": {
            "type": "location_update",
            "latitude": "23.123456",
            "longitude": "72.123456"
          }
        }
      }
  → Google Play Services delivers FCM to device (app is KILLED, no JS running)
  → React Native Firebase wakes up setBackgroundMessageHandler in index.js
  → notifee.displayNotification() shows the notification
  → User sees notification even though app is dead
```

**`index.js` kill state handler:**
```js
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage.data ?? {};
  if (data.type === 'location_update' && data.latitude && data.longitude) {
    const channelId = await notifee.createChannel({
      id: 'location-tracking',
      name: 'Location Tracking',
      importance: AndroidImportance.HIGH,
    });
    await notifee.displayNotification({
      id: 'location-tracking',
      title: 'Location Update',
      body: `Lat: ${Number(data.latitude).toFixed(6)}   Lng: ${Number(data.longitude).toFixed(6)}`,
      android: { channelId, pressAction: { id: 'default' } },
    });
  }
});
```

**Backend FCM call (Node.js example):**
```js
const admin = require('firebase-admin');

async function sendLocationNotification(fcmToken, latitude, longitude) {
  await admin.messaging().send({
    token: fcmToken,
    data: {
      type: 'location_update',
      latitude: String(latitude),
      longitude: String(longitude),
    },
    android: {
      priority: 'high',
    },
  });
}
```

> **Important:** Use `data` messages (not `notification` messages) for kill state.
> `notification` messages are shown by the OS automatically without running your handler.
> `data` messages give you full control and trigger `setBackgroundMessageHandler`.

---

## File Reference

| File | Role |
|---|---|
| `src/Vihar/services/BackgroundLocationService.ts` | Location watcher, foreground service start/stop, notification display |
| `src/Vihar/screens/LocationScreen.tsx` | UI — permission card + tracking start/stop + live coordinates |
| `src/services/notifications.ts` | Firebase foreground message handler, FCM token, permission request |
| `index.js` | Firebase kill-state message handler (setBackgroundMessageHandler) |
| `App.tsx` | Calls setupNotifications() on mount |
| `android/app/src/main/AndroidManifest.xml` | Foreground service declaration with correct class name + foregroundServiceType |
| `android/app/google-services.json` | Firebase project config (package: rksolution.mahasabha.jobs) |
| `android/app/build.gradle` | Google Services plugin, Firebase BoM, release keystore |

---

## Required Android Permissions

```xml
<!-- Location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Foreground Service -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Notifications (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## FCM Token

The device FCM token is logged on app launch:
```
FCM Token: xxxxxxxxxxxxxxxxxxxxx
```

Store this token in your backend database per user/device.
Refresh it using `messaging().onTokenRefresh()` if the token changes.

---

## Testing

### Foreground
1. Open the app
2. Tap **▶ Start**
3. Notifications appear every ~2 seconds with live coordinates

### Background
1. Tap **▶ Start** (foreground service starts — visible in status bar)
2. Press Home button
3. Notifications continue appearing in status bar

### Kill State
1. Tap **▶ Start** then **■ Stop** (or just proceed without starting)
2. Swipe the app away from recents
3. From your backend, call the FCM API with `type: "location_update"` and coordinates
4. Notification appears on the device

---

## Why This Approach (Industry Standard)

| App | Foreground/Background | Kill State |
|---|---|---|
| Uber | GPS + Foreground Service | FCM from server |
| Swiggy / Zomato | GPS + Foreground Service | FCM from server |
| Google Maps | GPS + Foreground Service | Native + FCM |
| Ola | GPS + Foreground Service | FCM from server |

Modern Android (11+) is explicitly designed to stop foreground services when the user swipes the app away. This is a privacy and battery feature. There is no reliable JS-only workaround. Server-side FCM is the correct and only reliable solution for kill state.

---

## Keystore (Release Signing)

| Property | Value |
|---|---|
| File | `android/app/new_keyStore.jks` |
| Key Alias | `key0` |
| Valid Until | July 3, 2045 |
| Package | `rksolution.mahasabha.jobs` |

Build release APK:
```bash
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```
