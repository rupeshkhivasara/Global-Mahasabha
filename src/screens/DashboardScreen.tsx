import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import LocationScreen from '../Vihar/screens/LocationScreen';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Welcome</Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {user?.full_name ?? '—'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {user?.vihar_role_type ?? 'Member'}
          </Text>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <LocationScreen />
      </View>

      {/* Bottom bar with logout */}
      <View style={styles.bottomBar}>
        <View style={styles.userChip}>
          <Text style={styles.userChipCode}>{user?.user_code}</Text>
          <Text style={styles.userChipDot}> · </Text>
          <Text style={styles.userChipMobile}>{user?.mobile}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={signOut}
          activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F4F7' },
  header: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerGreeting: { fontSize: 12, color: '#93C5FD', fontWeight: '500' },
  headerName:     { fontSize: 17, color: '#fff', fontWeight: '700', maxWidth: 200 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  content:    { flex: 1 },
  bottomBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  userChip:       { flexDirection: 'row', alignItems: 'center' },
  userChipCode:   { fontSize: 13, color: '#374151', fontWeight: '600' },
  userChipDot:    { fontSize: 13, color: '#9CA3AF' },
  userChipMobile: { fontSize: 13, color: '#6B7280' },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
});
