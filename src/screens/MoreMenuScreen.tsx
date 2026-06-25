import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import StatusBarSpacer from '../commanComponents/StatusBarSpacer';
import {
  IconRoute, IconHeart, IconMap, IconUsers, IconBookmark, IconLandmark,
  IconDonors, IconMedical, IconInfo, IconLock, IconUserCircle,
  IconLogOut, IconChevronRight,
} from '../commanComponents/Icons';
import { useAuth } from '../context/AuthContext';
import {
  GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR,
  ACCENT, BG_PAGE, BG_SOFT, BG_WHITE,
  TEXT_PRIMARY, BORDER_DEFAULT,
  SHADOW_BRAND, RADIUS_XL,
} from '../theme';
import { typeScale as T, font, screenType } from '../typography';
import type { AppStackParamList } from './RootNavigator';
import type { MainTabParamList } from './MainTabNavigator';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

type MoreNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'More'>,
  NativeStackNavigationProp<AppStackParamList>
>;

const VIHAR_BASE = 'https://globalmahasabha.com/vihar/';
const SITE_BASE  = 'https://globalmahasabha.com/';

function resolveUrl(link: string): string {
  if (link.startsWith('http')) return link;
  if (link.startsWith('../'))  return SITE_BASE + link.slice(3);
  return VIHAR_BASE + link;
}

type MenuItem =
  | { kind: 'web'; title: string; icon: React.ReactNode; url: string }
  | { kind: 'sep' };

const MENU: MenuItem[] = [
  { kind: 'web', title: 'Route Planner',       icon: <IconRoute size={20} />,       url: 'route_planner.php' },
  { kind: 'web', title: 'Donate Now',          icon: <IconHeart size={20} />,       url: 'donors.php' },
  { kind: 'web', title: 'Gurudev',             icon: <IconUserCircle size={20} />,  url: 'guruji_list.php' },
  { kind: 'web', title: 'India Map',           icon: <IconMap size={20} />,         url: 'map.php' },
  { kind: 'web', title: 'Members',             icon: <IconUsers size={20} />,       url: 'members.php' },
  { kind: 'sep' },
  { kind: 'web', title: 'Board of Directors',  icon: <IconBookmark size={20} />,    url: '../about.php' },
  { kind: 'web', title: 'Pillars',             icon: <IconLandmark size={20} />,    url: 'pillars.php' },
  { kind: 'web', title: 'Donors',              icon: <IconDonors size={20} />,      url: 'donors.php' },
  { kind: 'web', title: 'Muni Seva Samithi',   icon: <Text style={{ fontSize: 19 }}>🧘</Text>, url: 'about.php' },
  { kind: 'web', title: 'Medical Help',        icon: <IconMedical size={20} />,     url: 'medical.php' },
  { kind: 'web', title: 'Human Resources',     icon: <IconUsers size={20} />,       url: 'human_resources.php' },
  { kind: 'web', title: 'About Us',            icon: <IconInfo size={20} />,        url: '../about.php' },
  { kind: 'web', title: 'Privacy Policy',      icon: <IconLock size={20} />,        url: '../policy.html' },
];

export default function MoreMenuScreen() {
  const { signOut } = useAuth();
  const navigation  = useNavigation<MoreNavProp>();

  const openItem = (item: MenuItem) => {
    if (item.kind === 'web') {
      navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()
        ?.navigate('WebView', { url: resolveUrl(item.url), title: item.title });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBarSpacer />

      {/* ── Gradient header ── */}
      <LinearGradient
        colors={GRADIENT}
        locations={GRADIENT_LOCATIONS}
        start={GRADIENT_DIR.start}
        end={GRADIENT_DIR.end}
        style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <Text style={styles.headerSub}>All services &amp; information</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Menu list ── */}
        <View style={[styles.card, SHADOW_BRAND]}>
          {MENU.map((item, idx) => {
            if (item.kind === 'sep') {
              return <View key={`sep-${idx}`} style={styles.separator} />;
            }
            const isLast = idx === MENU.length - 1;
            return (
              <TouchableOpacity
                key={item.title}
                style={[styles.row, !isLast && styles.rowBorder]}
                onPress={() => openItem(item)}
                activeOpacity={0.7}>
                <View style={styles.iconTile}>
                  {item.icon}
                </View>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <IconChevronRight size={16} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Logout ── */}
        <View style={[styles.card, styles.logoutCard, SHADOW_BRAND]}>
          <TouchableOpacity style={styles.row} onPress={signOut} activeOpacity={0.7}>
            <View style={[styles.iconTile, styles.iconTileRed]}>
              <IconLogOut size={20} color={ACCENT} />
            </View>
            <Text style={[styles.rowTitle, styles.logoutText]}>Logout</Text>
            <IconChevronRight size={16} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG_PAGE },
  header: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22 },
  headerTitle: { ...screenType.menuHeader },
  headerSub:   { ...screenType.menuSub, marginTop: 2 },

  scroll: { padding: 18, paddingBottom: 32 },

  card: {
    backgroundColor: BG_WHITE,
    borderRadius: RADIUS_XL,
    overflow: 'hidden',
    marginBottom: 14,
  },
  logoutCard: {},

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f4eceb' },
  separator: { height: 1, backgroundColor: BORDER_DEFAULT, marginVertical: 4 },

  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BG_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileRed: { backgroundColor: '#fbeae2' },
  iconEmoji:   { fontSize: 18 },

  rowTitle:    { flex: 1, ...T.label },
  logoutText:  { fontFamily: font.bold, fontWeight: '700', color: ACCENT },
  chevron:     { fontSize: 20, color: '#c3b9b8', fontWeight: '300' },
});
