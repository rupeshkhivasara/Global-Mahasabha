import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DashboardScreen from './DashboardScreen';
import GurudevScreen   from './GurudevScreen';
import RoutePlanScreen from './RoutePlanScreen';
import DonateScreen    from './DonateScreen';
import MoreMenuScreen  from './MoreMenuScreen';

import {
  GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR, ACCENT,
} from '../theme';
import { typeScale as T, font } from '../typography';
import {
  IconHomeActive, IconHomeInactive, IconMapTab,
  IconHeartTab, IconMoreTab,
} from '../commanComponents/Icons';

// ── Param list ────────────────────────────────────────────────────────────────

export type MainTabParamList = {
  Home:      undefined;
  Gurudev:   undefined;
  RoutePlan: undefined;
  Donate:    undefined;
  More:      undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home:      'Home',
  Gurudev:   'Gurudev',
  RoutePlan: 'Route Plan',
  Donate:    'Donate',
  More:      'More',
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function TabIcon({ name, isFocused }: { name: keyof MainTabParamList; isFocused: boolean }) {
  switch (name) {
    case 'Home':
      return isFocused
        ? <IconHomeActive size={25} color={ACCENT} />
        : <IconHomeInactive size={25} color="#9a9296" />;
    case 'Gurudev':
      return (
        <Text style={{ fontSize: 21, lineHeight: 23, opacity: isFocused ? 1 : 0.55 }}>
          🧘
        </Text>
      );
    case 'Donate':
      return <IconHeartTab size={25} color={isFocused ? ACCENT : '#9a9296'} />;
    case 'More':
      return <IconMoreTab size={25} color={isFocused ? ACCENT : '#9a9296'} />;
    default:
      return null;
  }
}

// ── Custom tab bar ────────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets          = useSafeAreaInsets();
  const centerIsFocused = state.index === 2;

  const onCenterPress = () => {
    const route = state.routes[2];
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!centerIsFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 5 }]}>
      <View style={styles.bar}>

        {/* ── Elevated FAB ──────────────────────────────────────────────────
            Absolutely positioned inside `bar`. top:-22 lifts it above the bar
            edge; left:'50%' + marginLeft:-29 centers the 58px circle. */}
        <TouchableOpacity
          onPress={onCenterPress}
          activeOpacity={0.85}
          style={styles.centerTouchable}>
          <LinearGradient
            colors={GRADIENT}
            locations={GRADIENT_LOCATIONS}
            start={GRADIENT_DIR.start}
            end={GRADIENT_DIR.end}
            style={[styles.centerCircle, centerIsFocused && styles.centerCircleActive]}>
            <IconMapTab size={26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Tab columns ───────────────────────────────────────────────── */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter  = index === 2;
          const name      = route.name as keyof MainTabParamList;
          const label     = TAB_LABELS[name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Center column: flex:1 spacer that bottom-aligns the two-line
          // "Route Plan" label with the other labels. The FAB itself is
          // positioned absolutely above (see centerTouchable).
          if (isCenter) {
            return (
              <View key={route.key} style={styles.centerWrapper}>
                <Text style={styles.centerLabel}>{'Route\nPlan'}</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}>
              <TabIcon name={name} isFocused={isFocused} />
              <Text style={[styles.tabLabel, isFocused && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────────────────

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home"      component={DashboardScreen} />
      <Tab.Screen name="Gurudev"   component={GurudevScreen} />
      <Tab.Screen name="RoutePlan" component={RoutePlanScreen} />
      <Tab.Screen name="Donate"    component={DonateScreen} />
      <Tab.Screen name="More"      component={MoreMenuScreen} />
    </Tab.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // Bar container — white card, upward shadow.
  // Android elevation kept LOW so the FAB (elevation 12) floats on top.
  container: {
    backgroundColor: '#fff',
    borderTopWidth:  1,
    borderTopColor:  '#f0e8e6',
    ...Platform.select({
      ios:     { shadowColor: '#462814', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: -8 } },
      android: { elevation: 4 },
    }),
  },

  bar: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingTop:        15,
    paddingHorizontal: 18,
  },

  // Standard tab columns
  tabItem: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 8,
    gap:             4,
  },
  tabLabel:    { ...T.tabLabel },
  labelActive: { fontFamily: font.bold, color: ACCENT },

  // ── Center FAB ─────────────────────────────────────────────────────────────
  centerTouchable: {
    position: 'absolute',
    top:      -27,
    left:     SCREEN_W / 2 - 29,   // exact pixel center: (screenWidth - circleWidth) / 2
    zIndex:   10,
  },

  centerCircle: {
    width:          63,
    height:         63,
    borderRadius:   29,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    4,
    borderColor:    '#fff',
    ...Platform.select({
      ios: {
        shadowColor:   '#c2591c',
        shadowOpacity: 0.6,
        shadowRadius:  22,
        shadowOffset:  { width: 0, height: 12 },
      },
      android: { elevation: 12 },
    }),
  },

  // Slightly warmer border when the Route Plan tab is active
  centerCircleActive: { borderColor: '#fffdf6' },

  // Center spacer column — paddingVertical matches tabItem so its label
  // bottom-aligns with the others.
  centerWrapper: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'flex-end',
    paddingVertical: 8,
  },

  // FAB label: always inactive colour, two-line, centred
  centerLabel: {
    ...T.tabLabel,
    textAlign:  'center',
    lineHeight: 14,
  },
});