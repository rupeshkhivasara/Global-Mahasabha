import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { setupNotifications, onForegroundMessage } from './src/services/notifications';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/screens/RootNavigator';
export type { AuthStackParamList } from './src/screens/RootNavigator';

// ── FCM background / kill-state handler ───────────────────────────────────────

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage.data ?? {};
  if (data.type === 'location_update' && data.latitude && data.longitude) {
    const channelId = await notifee.createChannel({
      id: 'location-bg',
      name: 'Location Updates',
      importance: AndroidImportance.HIGH,
    });
    await notifee.displayNotification({
      title: 'Location Update',
      body: `Lat: ${data.latitude}   Lng: ${data.longitude}`,
      android: { channelId, pressAction: { id: 'default' } },
    });
  }
});

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  useEffect(() => {
    setupNotifications();
    const unsubscribe = onForegroundMessage(remoteMessage => {
      console.log('[FCM] Foreground message:', remoteMessage);
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
