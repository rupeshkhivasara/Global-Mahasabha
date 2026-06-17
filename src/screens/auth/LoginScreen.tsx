import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { login } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../../App';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async () => {
    const id = identity.trim();
    const pw = password.trim();
    if (!id || !pw) {
      setError('Enter your email / mobile / user ID and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login({ identity: id, password: pw });
      if (res.success) {
        await signIn(res.data.user);
      } else {
        setError(res.message || 'Login failed. Check your credentials.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }, [identity, password, signIn]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>GM</Text>
          </View>
          <Text style={styles.appName}>Global Mahasabha</Text>
          <Text style={styles.tagline}>Sign in to continue</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>

          <Text style={styles.label}>Email / Mobile / User ID</Text>
          <TextInput
            style={[styles.input, error && !password ? styles.inputError : null]}
            placeholder="Enter email, 10-digit mobile or user ID"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            value={identity}
            onChangeText={t => { setIdentity(t); setError(''); }}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Enter password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            value={password}
            onChangeText={t => { setPassword(t); setError(''); }}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Create Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F4F7' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText:  { fontSize: 24, fontWeight: '700', color: '#fff' },
  appName:   { fontSize: 20, fontWeight: '700', color: '#111827' },
  tagline:   { fontSize: 13, color: '#6B7280', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 14,
  },
  inputError:    { borderColor: '#EF4444' },
  errorText:     { fontSize: 13, color: '#EF4444', marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled:   { opacity: 0.6 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: { fontSize: 14, color: '#6B7280' },
  linkText:   { fontSize: 14, color: '#2563EB', fontWeight: '600' },
});
