import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, Image,
  StyleSheet, Dimensions, ActivityIndicator, Alert, Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import StatusBarSpacer from '../commanComponents/StatusBarSpacer';
import {
  IconRoute, IconHeart, IconMap, IconUsers, IconBookmark, IconLandmark,
  IconDonors, IconMedical, IconInfo, IconLock,
  IconBell, IconMapPin,
} from '../commanComponents/Icons';
import { useAuth } from '../context/AuthContext';
import { getHome } from '../api';
import type { HomeData, Banner } from '../api/types';
import {
  checkLocationPermission,
  requestLocationPermission,
  startBackgroundLocation,
  stopBackgroundLocation,
  setLocationCallback,
} from '../Vihar/services/BackgroundLocationService';
import {
  GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR,
  ACCENT,
  BG_PAGE, BG_SOFT, BG_WHITE,
  SHADOW_BRAND, RADIUS_LG, RADIUS_XL,
} from '../theme';
import { typeScale as T, screenType } from '../typography';
import type { AppStackParamList } from './RootNavigator';
import type { MainTabParamList } from './MainTabNavigator';

// ── Navigation type ───────────────────────────────────────────────────────────

type DashNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const VIHAR_BASE = 'https://globalmahasabha.com/vihar/';
const SITE_BASE  = 'https://globalmahasabha.com/';
const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = SCREEN_W - 44; // 22px horizontal padding each side

function resolveUrl(link: string): string {
  if (link.startsWith('http')) return link;
  if (link.startsWith('../'))  return SITE_BASE + link.slice(3);
  return VIHAR_BASE + link;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (!r.ok) throw new Error('non-ok');
    const d = await r.json();
    return d.city || d.locality || d.principalSubdivision || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  } catch {
    return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  }
}

// Font Awesome class → SVG icon component
const FA_SVG: Record<string, (s: number) => React.ReactNode> = {
  'fa-route':               s => <IconRoute size={s} />,
  'fa-hand-holding-heart':  s => <IconHeart size={s} />,
  'fa-circle-user':         s => <Text style={{ fontSize: s }}>🧘</Text>,
  'fa-map-location-dot':    s => <IconMap size={s} />,
  'fa-users':               s => <IconUsers size={s} />,
  'fa-bookmark':            s => <IconBookmark size={s} />,
  'fa-kit-medical':         s => <IconMedical size={s} />,
  'fa-dollar-sign':         s => <IconDonors size={s} />,
  'fa-file-lines':          s => <Text style={{ fontSize: s }}>🧘</Text>,
  'fa-people-group':        s => <IconUsers size={s} />,
  'fa-lock':                s => <IconLock size={s} />,
  'fa-info':                s => <IconInfo size={s} />,
  'fa-landmark':            s => <IconLandmark size={s} />,
};

function renderTileIcon(iconClass: string, size = 22): React.ReactNode {
  const key = iconClass.split(' ').find(c => c.startsWith('fa-') && c !== 'fa-solid' && c !== 'fa-regular') ?? '';
  return FA_SVG[key]?.(size) ?? <Text style={{ fontSize: size }}>⚡</Text>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={hdr.row}>
      <Text style={hdr.title}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={hdr.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const hdr = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title:  { ...T.sectionHead },
  action: { ...T.link, fontSize: 12 },
});

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  useAuth(); // keeps auth context subscribed; signOut lives in MoreMenuScreen
  const navigation = useNavigation<DashNavProp>();

  const [homeData,      setHomeData]      = useState<HomeData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [bannerIdx,     setBannerIdx]     = useState(0);
  const [locationLabel, setLocationLabel] = useState('Detecting location…');

  const bannerRef   = useRef<FlatList<Banner>>(null);
  const scrollTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ── Open WebView (pushed onto parent AppStack) ─────────────────────────────

  const openWebView = useCallback((url: string, title: string) => {
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('WebView', { url: resolveUrl(url), title });
  }, [navigation]);

  // ── Fetch home data ────────────────────────────────────────────────────────

  const fetchHome = useCallback(async (lat?: number, lng?: number) => {
    try {
      const res = await getHome({ lat, lng, guruji_limit: 4 });
      if (res.ok) setHomeData(res.data);
    } catch (_) {
      // silent — show cached data if any
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Location + initial data load ──────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    fetchHome(); // immediate load without GPS coords

    (async () => {
      // Attempt to get full permission (fine + background).
      // We don't gate on the return value because on Android the user may
      // allow "while using" (fine) but decline "all the time" (background),
      // which returns false even though foreground tracking is still possible.
      await requestLocationPermission();

      // Now check what level we actually have.
      const perm = await checkLocationPermission();

      if (perm === 'denied') {
        setLocationLabel('Location permission denied');
        Alert.alert(
          'Location Permission',
          'Grant location access to show nearby Gurudev and personalised vihar results.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      setLocationCallback(loc => {
        if (!mounted) return;
        reverseGeocode(loc.latitude, loc.longitude).then(label => {
          if (!mounted) return;
          setLocationLabel(label);
        });
        fetchHome(loc.latitude, loc.longitude);
      });
      await startBackgroundLocation();
    })();

    return () => {
      mounted = false;
      setLocationCallback(() => {});
      stopBackgroundLocation().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Banner auto-scroll ─────────────────────────────────────────────────────

  useEffect(() => {
    const banners = homeData?.banners ?? [];
    if (banners.length <= 1) return;

    scrollTimer.current = setInterval(() => {
      setBannerIdx(prev => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);

    return () => clearInterval(scrollTimer.current);
  }, [homeData?.banners]);

  // ── Sections ───────────────────────────────────────────────────────────────

  const banners     = homeData?.banners     ?? [];
  const quickLinks  = homeData?.quick_links ?? [];
  const moreLinks   = homeData?.more_links  ?? [];
  const gurujiList  = homeData?.nearby_guruji ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBarSpacer />

      {/* ── Gradient header (fixed) ── */}
      <LinearGradient
        colors={GRADIENT}
        locations={GRADIENT_LOCATIONS}
        start={GRADIENT_DIR.start}
        end={GRADIENT_DIR.end}
        style={styles.header}>

        {/* Greeting row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/icons/vihar_icon.png')} style={styles.emblem} />
            <View>
              <Text style={styles.greetSub}>Jai Jinendra 🙏</Text>
              <Text style={styles.greetMain}>Global Mahasabha</Text>
            </View>
          </View>
          <View style={styles.bellWrap}>
            <IconBell size={22} color="#fff" />
            <View style={styles.bellDot} />
          </View>
        </View>

        {/* Location chip */}
        <View style={styles.locChip}>
          <IconMapPin size={18} color={ACCENT} />
          <View style={styles.locText}>
            <Text style={styles.locLabel}>YOUR LOCATION</Text>
            <Text style={styles.locValue} numberOfLines={1}>{locationLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setLocationLabel('Detecting location…')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.locChange}>Change</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Scrollable content ── */}
      {loading && !homeData ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* ── Banner carousel ── */}
          {banners.length > 0 && (
            <View style={styles.section}>
              <FlatList
                ref={bannerRef}
                data={banners}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => String(item.id)}
                onMomentumScrollEnd={e => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
                  setBannerIdx(idx);
                }}
                renderItem={({ item }) => (
                  <View style={[styles.bannerItem, { width: BANNER_W }]}>
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.bannerImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#3a1410', '#7a2615', '#b8431f']}
                        style={styles.bannerPlaceholder}>
                        <Text style={styles.bannerPlaceholderText}>
                          Paryushan Mahaparv 2026
                        </Text>
                        <Text style={styles.bannerPlaceholderSub}>
                          Tap to view events &amp; vihar updates
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                )}
              />
              {/* Pagination dots */}
              {banners.length > 1 && (
                <View style={styles.dotsRow}>
                  {banners.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === bannerIdx && styles.dotActive]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Quick Links ── */}
          {quickLinks.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Quick Links" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.quickRow}>
                  {quickLinks.map(item => (
                    <TouchableOpacity
                      key={item.title}
                      style={styles.quickItem}
                      onPress={() => openWebView(item.link_url, item.title)}
                      activeOpacity={0.75}>
                      <View style={styles.quickTile}>
                        {renderTileIcon(item.icon_class, 22)}
                      </View>
                      <Text style={styles.quickLabel} numberOfLines={2}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ── Vihar locations banner ── */}
          <View style={styles.section}>
            <LinearGradient
              colors={GRADIENT}
              locations={GRADIENT_LOCATIONS}
              start={GRADIENT_DIR.start}
              end={GRADIENT_DIR.end}
              style={styles.viharBanner}>
              <View>
                <Text style={styles.viharCount}>1,693</Text>
                <Text style={styles.viharSub}>Vihar locations across India</Text>
              </View>
              <TouchableOpacity
                style={styles.viharBtn}
                onPress={() => openWebView('map.php', 'India Map')}
                activeOpacity={0.85}>
                <Text style={styles.viharBtnText}>View Map</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* ── Nearby Gurudev ── */}
          {gurujiList.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Nearby Gurudev"
                actionLabel="View All"
                onAction={() => openWebView('guruji_list.php', 'Gurudev')}
              />
              {gurujiList.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={styles.guruCard}
                  onPress={() => openWebView(
                    `guruji_detail.php?g=${g.guruji_token}`,
                    g.name,
                  )}
                  activeOpacity={0.8}>
                  <View style={styles.guruAvatar}>
                    {g.profile_url ? (
                      <Image source={{ uri: g.profile_url }} style={styles.guruAvatarImg} />
                    ) : (
                      <Text style={styles.guruAvatarEmoji}>🧘</Text>
                    )}
                  </View>
                  <View style={styles.guruInfo}>
                    <Text style={styles.guruName} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.guruSub}>Maharaj</Text>
                  </View>
                  {g.distance_km != null && (
                    <View style={styles.guruDist}>
                      <Text style={styles.guruDistNum}>{g.distance_km.toFixed(1)}</Text>
                      <Text style={styles.guruDistUnit}>km</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── More grid ── */}
          {moreLinks.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="More"
                actionLabel="See All"
                onAction={() => navigation.navigate('More')}
              />
              <View style={styles.moreGrid}>
                {moreLinks.map(item => (
                  <TouchableOpacity
                    key={item.title}
                    style={styles.moreItem}
                    onPress={() => openWebView(item.link_url, item.title)}
                    activeOpacity={0.75}>
                    <View style={styles.moreTile}>
                      {renderTileIcon(item.icon_class, 22)}
                    </View>
                    <Text style={styles.moreLabel} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG_PAGE },

  // ── Header ──
  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  emblem: { width: 38, height: 38 },

  greetSub:  { ...screenType.greetSub },
  greetMain: { ...screenType.greetMain },

  bellWrap: { position: 'relative' },
  bellIcon: { fontSize: 22 },
  bellDot:  {
    position: 'absolute', top: 1, right: 0,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ef6b54',
  },

  locChip: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOW_BRAND,
  },
  locPin:    { fontSize: 18 },
  locText:   { flex: 1 },
  locLabel:  { ...T.overline, letterSpacing: 0.5 },
  locValue:  { ...T.cardTitle, marginTop: 1 },
  locChange: { ...T.link, fontSize: 12 },

  // ── Scroll ──
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:      { flex: 1 },
  scrollContent: { paddingTop: 18, paddingBottom: 30 },
  section:   { paddingHorizontal: 22, marginBottom: 10},

  // ── Banner ──
  bannerItem: { borderRadius: RADIUS_XL, overflow: 'hidden', height: 150 },
  bannerImg:  { width: '100%', height: '100%' },
  bannerPlaceholder: {
    flex: 1, padding: 20, justifyContent: 'flex-end',
    borderRadius: RADIUS_XL, overflow: 'hidden',
  },
  bannerPlaceholderText: { ...screenType.heroTitle },
  bannerPlaceholderSub:  { ...screenType.heroSub, marginTop: 4 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, marginTop: 10,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#e7d3d1',
  },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: ACCENT },

  // ── Quick links ──
  quickRow: { flexDirection: 'row', gap: 7 },
  quickItem: { alignItems: 'center', width: (SCREEN_W - 44 - 30) / 5, gap: 7},
  quickTile: {
    width: 48, height: 48, borderRadius: 15,
    backgroundColor: BG_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  quickEmoji: { fontSize: 22 },
  quickLabel: { ...T.tileLabel },

  // ── Vihar banner ──
  viharBanner: {
    borderRadius: RADIUS_XL,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW_BRAND,
  },
  viharCount: { ...screenType.viharCount },
  viharSub:   { ...screenType.heroSub, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  viharBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viharBtnText: { ...T.link, fontSize: 12 },

  // ── Gurudev list ──
  guruCard: {
    backgroundColor: BG_WHITE,
    borderRadius: RADIUS_LG,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    ...SHADOW_BRAND,
  },
  guruAvatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: BG_SOFT,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  guruAvatarImg:   { width: '100%', height: '100%' },
  guruAvatarEmoji: { fontSize: 22 },
  guruInfo:  { flex: 1 },
  guruName:  { ...screenType.guruName },
  guruSub:   { ...screenType.guruRole, marginTop: 2 },
  guruDist:  { alignItems: 'flex-end' },
  guruDistNum:  { ...screenType.guruDistNum },
  guruDistUnit: { ...T.overline },

  // ── More grid ──
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moreItem: {
    width: (SCREEN_W - 44 - 30) / 4, // 4 cols with 3 gaps of 10 + 22px padding each side
    alignItems: 'center',
    gap: 4,
  },
  moreTile: {
    width: 52, height: 52, borderRadius: 15,
    backgroundColor: BG_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  moreEmoji: { fontSize: 22 },
  moreLabel: { ...T.tileLabelSm },
});
