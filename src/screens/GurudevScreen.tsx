import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import WebView from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import StatusBarSpacer from '../commanComponents/StatusBarSpacer';
import { GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR, BG_PAGE } from '../theme';
import { font } from '../typography';

const GURUDEV_URL = 'https://globalmahasabha.com/vihar/guruji_list.php';

export default function GurudevScreen() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading]     = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        if (canGoBack) { webRef.current?.goBack(); return true; }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [canGoBack]),
  );

  return (
    <View style={styles.root}>
      <StatusBarSpacer />
      <LinearGradient
        colors={GRADIENT}
        locations={GRADIENT_LOCATIONS}
        start={GRADIENT_DIR.start}
        end={GRADIENT_DIR.end}
        style={styles.header}>
        <Text style={styles.headerTitle}>Gurudev</Text>
      </LinearGradient>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#c2591c" />
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: GURUDEV_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={s => setCanGoBack(s.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG_PAGE },
  header:      { paddingVertical: 14, paddingHorizontal: 22 },
  headerTitle: { fontFamily: font.extrabold, fontWeight: '800', fontSize: 20, color: '#fff' },
  webview:     { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    top: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_PAGE,
    zIndex: 10,
  },
});
