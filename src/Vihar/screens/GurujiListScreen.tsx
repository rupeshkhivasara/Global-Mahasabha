import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import StatusBarSpacer from '../../commanComponents/StatusBarSpacer';
import { IconMapPin } from '../../commanComponents/Icons';
import GurujiCard, { formatDistance } from '../viharCommanComponents/GurujiCard';
import { getGurujiList } from '../../api/endpoints/vihar';
import type { Guruji } from '../../api/types';
import {
  checkLocationPermission,
  requestLocationPermission,
  startBackgroundLocation,
  stopBackgroundLocation,
  setLocationCallback,
} from '../../Vihar/services/BackgroundLocationService';
import {
  GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR,
  ACCENT, BG_PAGE,
} from '../../theme';
import { typeScale as T } from '../../typography';
import type { AppStackParamList } from './RootNavigator';

type NavProp = NativeStackNavigationProp<AppStackParamList>;

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 44 - 12) / 2;
const VIHAR_BASE = 'https://globalmahasabha.com/vihar/';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (!r.ok) throw new Error('non-ok');
    const d = await r.json();
    return d.city || d.locality || d.principalSubdivision || `${lat.toFixed(3)}°N`;
  } catch {
    return `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`;
  }
}

export default function GurujiListScreen() {
  const navigation = useNavigation<NavProp>();

  const [gurujiList,    setGurujiList]    = useState<Guruji[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [locationLabel, setLocationLabel] = useState('Detecting location…');
  const [locationLive,  setLocationLive]  = useState(false);

  const latRef = useRef<number | undefined>(undefined);
  const lngRef = useRef<number | undefined>(undefined);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchList = useCallback(async (q?: string, lat?: number, lng?: number) => {
    try {
      const res = await getGurujiList({ q, lat, lng });
      if (res.ok) setGurujiList(res.data.guruji);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocationLabel('Detecting location…');
    setLocationLive(false);
    await stopBackgroundLocation().catch(() => {});
    await startBackgroundLocation().catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchList(undefined, undefined, undefined);

    (async () => {
      await requestLocationPermission();
      const perm = await checkLocationPermission();
      if (perm === 'denied') return;

      setLocationCallback(loc => {
        if (!mounted) return;
        latRef.current = loc.latitude;
        lngRef.current = loc.longitude;
        reverseGeocode(loc.latitude, loc.longitude).then(label => {
          if (!mounted) return;
          setLocationLabel(label);
          setLocationLive(true);
        });
        fetchList(searchQuery || undefined, loc.latitude, loc.longitude);
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

  const onSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchList(text || undefined, latRef.current, lngRef.current);
    }, 400);
  }, [fetchList]);

  const openProfile = useCallback((g: Guruji) => {
    navigation.navigate('WebView', {
      url:   `${VIHAR_BASE}guruji_detail.php?g=${g.guruji_token}`,
      title: g.name,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item, index }: { item: Guruji; index: number }) => (
    <GurujiCard
      name={item.name}
      distanceKm={item.distance_km}
      index={index}
      width={CARD_W}
      onPress={() => openProfile(item)}
    />
  ), [openProfile]);

  const keyExtractor = useCallback((item: Guruji) => String(item.id), []);

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

        {/* Nav row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            // hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nearby Gurudev</Text>
          <TouchableOpacity
            onPress={refreshLocation}
            style={styles.locBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconMapPin size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Location chip */}
        <View style={styles.locChip}>
          <View style={[styles.liveDot, locationLive && styles.liveDotActive]} />
          <Text style={styles.locLabel} numberOfLines={1}>{locationLabel}</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Gurudev…"
            placeholderTextColor="#b7b3b3"
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </LinearGradient>

      {/* ── Sort / count row ── */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sorted by distance</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{gurujiList.length} found</Text>
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={gurujiList}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => {
            setRefreshing(true);
            fetchList(searchQuery || undefined, latRef.current, lngRef.current);
          }}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No Gurudev found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_PAGE },

  // ── Header ──
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems:'center'
  },
  backArrow: {
    fontSize: 24, color: '#fff', fontWeight: '700',
    includeFontPadding: false,
    // paddingTop: -2,
  },
  headerTitle: {
    fontSize: 19, fontWeight: '800', color: '#fff',
    letterSpacing: -0.3,
  },
  locBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Location chip ──
  locChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  liveDotActive: { backgroundColor: '#4ade80' },
  locLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.9)', flex: 1 },

  // ── Search bar ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 42,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2b2424',
    fontWeight: '500',
    height: 42,
  },

  // ── Sort row ──
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sortLabel: { ...T.overline, fontSize: 13, color: '#8a7f7f' },
  countPill: {
    backgroundColor: '#f8ebd5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontSize: 13, fontWeight: '700', color: ACCENT },

  // ── Grid ──
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  row: { gap: 12, marginBottom: 12 },

  // ── Empty / loader ──
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText:  { fontSize: 15, color: '#8a7f7f' },
});
