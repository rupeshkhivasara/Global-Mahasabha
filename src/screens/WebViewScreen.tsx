import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, BackHandler,
} from 'react-native';
import WebView from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusBarSpacer from '../commanComponents/StatusBarSpacer';
import { GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR, BG_PAGE } from '../theme';
import { font } from '../typography';
import type { AppStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'WebView'>;

export default function WebViewScreen({ route, navigation }: Props) {
  const { url, title } = route.params;
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading]     = useState(true);

  // Android hardware back → go back in WebView history first
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.backBtn} />
      </LinearGradient>

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#c2591c" />
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG_PAGE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backBtn:       { width: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow:     { fontSize: 32, fontFamily: font.regular, fontWeight: '300', color: '#fff', lineHeight: 36 },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: font.bold, fontWeight: '700', color: '#fff' },
  webview:       { flex: 1 },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_PAGE,
    zIndex: 10,
  },
});
