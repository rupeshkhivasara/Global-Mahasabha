import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import StatusBarSpacer from '../commanComponents/StatusBarSpacer';
import {
  IconBell, IconGift, IconBriefcase, IconMala, IconChevronRight,
} from '../commanComponents/Icons';
import MalaEntryCard from '../commanComponents/MalaEntryCard';
import { useAuth } from '../context/AuthContext';
import { useAppSelector } from '../store';
import { MODULES } from '../config/modules';
import type { ModuleConfig, ModuleIcon } from '../config/modules';
import {
  GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR,
  ACCENT, BG_PAGE, BG_SOFT, BG_WHITE,
  SHADOW_BRAND,
} from '../theme';
import { typeScale as T, font, screenType } from '../typography';
import type { AppStackParamList } from '../Vihar/screens/RootNavigator';

type NavProp = NativeStackNavigationProp<AppStackParamList, 'MainDashboard'>;

const CARD_BORDER = '#f1e2d3';

function ModuleGlyph({ icon, size, color }: { icon: ModuleIcon; size: number; color: string }) {
  switch (icon) {
    case 'vihar':
      return (
        <Image
          source={require('../../assets/icons/vihar_icon.png')}
          style={{ width: size, height: size, borderRadius: size * 0.28 }}
        />
      );
    case 'gift':       return <IconGift size={size} color={color} />;
    case 'briefcase':  return <IconBriefcase size={size} color={color} />;
    case 'mala':       return <IconMala size={size} color={color} />;
    default:           return null;
  }
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function roleLabel(viharRoleType?: string): string {
  if (viharRoleType === 'guruji') return 'Guruji';
  if (viharRoleType === 'both')   return 'Guruji & Member';
  return 'Member';
}

// ── Module cards ────────────────────────────────────────────────────────────

function LiveModuleCard({ mod, onPress }: { mod: ModuleConfig; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={GRADIENT}
        locations={GRADIENT_LOCATIONS}
        start={GRADIENT_DIR.start}
        end={GRADIENT_DIR.end}
        style={styles.liveCard}>
        <View style={styles.liveIconTile}>
          <ModuleGlyph icon={mod.icon} size={40} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.liveTitle}>{mod.label}</Text>
          <Text style={styles.liveSubtitle}>{mod.subtitle}</Text>
        </View>
        <IconChevronRight size={20} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SoonModuleCard({ mod, onPress, spanFull }: {
  mod: ModuleConfig; onPress: () => void; spanFull: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.soonCard, spanFull ? styles.soonCardFull : styles.soonCardHalf]}>
      <View style={styles.soonTop}>
        <View style={styles.soonIconTile}>
          <ModuleGlyph icon={mod.icon} size={22} color={ACCENT} />
        </View>
        <View style={styles.soonBadge}>
          <Text style={styles.soonBadgeText}>SOON</Text>
        </View>
      </View>
      <Text style={styles.soonTitle}>{mod.label}</Text>
      <Text style={styles.soonSubtitle}>{mod.subtitle}</Text>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MainDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();

  // MODULES ships a static placeholder for the Digital Mala progress chip.
  // /api/digital_mala.php isn't deployed yet (404), so this reads the
  // interim Redux-backed count instead — see src/store/digitalMalaSlice.ts.
  const malaTodayCount = useAppSelector(state => state.digitalMala.todayCount);

  const liveModules = MODULES
    .filter(m => m.status === 'live')
    .map(m => (m.key === 'digitalMala' ? { ...m, todayCount: malaTodayCount } : m));
  const soonModules = MODULES.filter(m => m.status === 'soon');

  const onPressModule = (m: ModuleConfig) => {
    if (m.status === 'live' && m.route) navigation.navigate(m.route);
    else navigation.navigate('ComingSoon', { module: m.key });
  };

  const fullName = user?.full_name ?? 'Member';

  return (
    <View style={styles.root}>
      <StatusBarSpacer />

      <LinearGradient
        colors={GRADIENT}
        locations={GRADIENT_LOCATIONS}
        start={GRADIENT_DIR.start}
        end={GRADIENT_DIR.end}
        style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/icons/vihar_icon.png')} style={styles.emblem} />
            <View>
              <Text style={styles.greetSub}>Jai Jinendra 🙏</Text>
              <Text style={styles.greetMain}>Global Mahasabha</Text>
            </View>
          </View>
          <View style={styles.bellWrap}>
            <IconBell size={20} color="#fff" />
            <View style={styles.bellDot} />
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(fullName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeName} numberOfLines={1}>Welcome, {fullName}</Text>
            <Text style={styles.welcomeRole}>{roleLabel(user?.vihar_role_type)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionTitle}>Choose a module</Text>
        <Text style={styles.sectionSub}>Select a service to continue</Text>

        {liveModules.map(m => (
          <View key={m.key} style={styles.liveWrap}>
            {m.key === 'digitalMala'
              ? <MalaEntryCard mod={m} onPress={() => onPressModule(m)} />
              : <LiveModuleCard mod={m} onPress={() => onPressModule(m)} />}
          </View>
        ))}

        <View style={styles.grid}>
          {soonModules.map((m, i) => (
            <SoonModuleCard
              key={m.key}
              mod={m}
              onPress={() => onPressModule(m)}
              spanFull={soonModules.length % 2 === 1 && i === soonModules.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_PAGE },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
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
  emblem: { width: 38, height: 38, borderRadius: 11 },

  greetSub:  { ...screenType.greetSub },
  greetMain: { ...screenType.greetMain },

  bellWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ef6b54',
  },

  welcomeCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    ...SHADOW_BRAND,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BG_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: font.extrabold, fontWeight: '800', fontSize: 16, color: ACCENT },
  welcomeName: { ...T.cardTitle },
  welcomeRole: { ...T.subtle, fontSize: 12, marginTop: 1 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30 },

  sectionTitle: { ...T.sectionHead },
  sectionSub:   { ...T.subtle, fontSize: 12, marginTop: 3, marginBottom: 16 },

  liveWrap: { marginBottom: 14 },
  liveCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...SHADOW_BRAND,
  },
  liveIconTile: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  liveTitle:    { fontFamily: font.extrabold, fontWeight: '800', fontSize: 17, color: '#fff' },
  liveSubtitle: { fontFamily: font.medium, fontWeight: '500', fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  soonCard: {
    backgroundColor: BG_WHITE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 15,
    minHeight: 44,
  },
  soonCardHalf: { width: '47%' },
  soonCardFull: { width: '100%' },
  soonTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  soonIconTile: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: BG_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  soonBadge: { backgroundColor: '#fbeae2', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  soonBadgeText: { fontFamily: font.extrabold, fontWeight: '800', fontSize: 9, color: ACCENT, letterSpacing: 0.5 },
  soonTitle:    { ...T.cardTitle },
  soonSubtitle: { ...T.subtle, fontSize: 11, marginTop: 2 },
});
