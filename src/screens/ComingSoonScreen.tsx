import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import StatusBarSpacer from '../commanComponents/StatusBarSpacer';
import { IconChevronLeft, IconGift, IconBriefcase, IconMala } from '../commanComponents/Icons';
import GradientButton from '../commanComponents/GradientButton';
import { MODULES } from '../config/modules';
import type { ModuleIcon } from '../config/modules';
import {
  GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR,
  BG_PAGE, BG_SOFT, BG_WHITE,
  TEXT_PRIMARY, TEXT_MUTED, ACCENT,
  SHADOW_BRAND,
} from '../theme';
import { font } from '../typography';
import type { AppStackParamList } from '../Vihar/screens/RootNavigator';

type NavProp   = NativeStackNavigationProp<AppStackParamList, 'ComingSoon'>;
type RouteType = RouteProp<AppStackParamList, 'ComingSoon'>;

const NOTIFY_KEY_PREFIX = '@module_notify_';

function ModuleGlyph({ icon, size }: { icon: ModuleIcon; size: number }) {
  switch (icon) {
    case 'gift':      return <IconGift size={size} color="#fff" />;
    case 'briefcase': return <IconBriefcase size={size} color="#fff" />;
    case 'mala':      return <IconMala size={size} color="#fff" />;
    default:          return null;
  }
}

export default function ComingSoonScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteType>();

  const mod = MODULES.find(m => m.key === route.params?.module);
  const label    = mod?.label ?? 'Coming Soon';
  const subtitle = mod?.subtitle ?? "We're working on this module. Check back soon.";
  const icon     = mod?.icon ?? 'gift';

  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFY_KEY_PREFIX + route.params?.module)
      .then(v => setSubscribed(v === '1'))
      .catch(() => {});
  }, [route.params?.module]);

  const onNotify = useCallback(async () => {
    if (subscribed) return;
    setSubscribed(true);
    await AsyncStorage.setItem(NOTIFY_KEY_PREFIX + route.params?.module, '1').catch(() => {});
  }, [subscribed, route.params?.module]);

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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{label}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.badgeWrap}>
          <View style={styles.badgeOuter}>
            <LinearGradient
              colors={GRADIENT}
              locations={GRADIENT_LOCATIONS}
              start={GRADIENT_DIR.start}
              end={GRADIENT_DIR.end}
              style={styles.badgeInner}>
              <ModuleGlyph icon={icon} size={36} />
            </LinearGradient>
          </View>
          <View style={styles.soonPill}>
            <Text style={styles.soonPillText}>SOON</Text>
          </View>
        </View>

        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.desc}>{subtitle}</Text>

        <View style={styles.btnWrap}>
          <GradientButton
            title={subscribed ? "You're on the list ✓" : "Notify Me When It's Ready"}
            onPress={onNotify}
            disabled={subscribed}
            fontSize={15}
          />
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backLink}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_PAGE },

  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: font.bold, fontWeight: '700', fontSize: 16, color: '#fff' },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },

  badgeWrap: { width: 110, height: 110, marginBottom: 26, position: 'relative' },
  badgeOuter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 55, backgroundColor: BG_SOFT,
  },
  badgeInner: {
    position: 'absolute', top: 14, left: 14, right: 14, bottom: 14,
    borderRadius: 41,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW_BRAND,
  },
  soonPill: {
    position: 'absolute', top: -2, right: 2,
    backgroundColor: BG_WHITE,
    borderWidth: 1, borderColor: '#f1e2d3',
    borderRadius: 9,
    paddingHorizontal: 8, paddingVertical: 4,
    ...SHADOW_BRAND,
  },
  soonPillText: { fontFamily: font.extrabold, fontWeight: '800', fontSize: 9, color: ACCENT, letterSpacing: 0.5 },

  title: { fontFamily: font.extrabold, fontWeight: '800', fontSize: 24, color: TEXT_PRIMARY, marginBottom: 10 },
  desc: {
    fontFamily: font.medium, fontWeight: '500', fontSize: 13.5, color: TEXT_MUTED,
    lineHeight: 21, textAlign: 'center', maxWidth: 260,
  },

  btnWrap: { width: '100%', marginTop: 28 },
  backLink: { fontFamily: font.bold, fontWeight: '700', fontSize: 13, color: ACCENT, marginTop: 16 },
});
