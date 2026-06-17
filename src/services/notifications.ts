import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

async function displayNotification(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: remoteMessage.notification?.title,
    body: remoteMessage.notification?.body,
    data: remoteMessage.data,
    android: {
      channelId,
      pressAction: { id: 'default' },
    },
  });
}

export function onForegroundMessage(
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): () => void {
  return messaging().onMessage(async remoteMessage => {
    await displayNotification(remoteMessage);
    handler(remoteMessage);
  });
}

export function onNotificationOpenedApp(
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): () => void {
  return messaging().onNotificationOpenedApp(handler);
}

export async function getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
  return messaging().getInitialNotification();
}

export async function setupNotifications(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    console.warn('Notification permission denied');
    return;
  }

  await getFCMToken();

  // Handle notification that opened the app from background
  onNotificationOpenedApp(remoteMessage => {
    console.log('App opened from background notification:', remoteMessage);
  });

  // Handle notification that opened the app from quit state
  const initialMessage = await getInitialNotification();
  if (initialMessage) {
    console.log('App opened from quit state notification:', initialMessage);
  }
}
