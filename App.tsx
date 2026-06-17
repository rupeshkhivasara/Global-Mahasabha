import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { setupNotifications, onForegroundMessage } from './src/services/notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';

// ── Navigation types ──────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type AppStackParamList = {
  Dashboard: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack  = createNativeStackNavigator<AppStackParamList>();

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

// ── Root navigator (auth-gated) ───────────────────────────────────────────────

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F7' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (user) {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Dashboard" component={DashboardScreen} />
      </AppStack.Navigator>
    );
  }

  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login">
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

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
