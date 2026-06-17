/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Firebase kill-state handler — fires when app is killed and FCM push arrives
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

AppRegistry.registerComponent(appName, () => App);
