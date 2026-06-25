import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { setupNotifications, onForegroundMessage } from './src/services/notifications';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/screens/RootNavigator';
export type { AuthStackParamList } from './src/screens/RootNavigator';

// ── Global font defaults (spec §1d) ──────────────────────────────────────────
// When Poppins-Regular is installed, every <Text> and <TextInput> will use it
// without explicit fontFamily. allowFontScaling=false keeps sizes predictable.

const AnyText      = Text      as any;
const AnyTextInput = TextInput as any;

AnyText.defaultProps                  = AnyText.defaultProps ?? {};
AnyText.defaultProps.style            = { fontFamily: 'Poppins-Regular', color: '#2b2424' };
AnyText.defaultProps.allowFontScaling = false;

AnyTextInput.defaultProps                  = AnyTextInput.defaultProps ?? {};
AnyTextInput.defaultProps.style            = { fontFamily: 'Poppins-Regular' };
AnyTextInput.defaultProps.allowFontScaling = false;

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
