import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import StatusBarSpacer from '../../commanComponents/StatusBarSpacer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { login } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../../App';
import AuthHeader from '../../commanComponents/AuthHeader';
import GradientButton from '../../commanComponents/GradientButton';
import {
  ACCENT, TEXT_PRIMARY as TEXT, BG_FIELD as FIELD, BORDER_DEFAULT as BORDER,
} from '../../theme';
import { typeScale as T } from '../../typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const insets    = useSafeAreaInsets();
  const topPad    = insets.top; // covers iOS notch AND Android 15+ edge-to-edge
  const bottomPad = Math.max(insets.bottom, 20);

  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = useCallback(async () => {
    const id = identity.trim();
    const pw = password.trim();
    if (!id || !pw) { setError('Enter your email / mobile / user ID and password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await login({ identity: id, password: pw });
      if (res.success) { await signIn(res.data.user); }
      else { setError(res.message || 'Login failed. Check your credentials.'); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
    } finally { setLoading(false); }
  }, [identity, password, signIn]);

  return (
    <View style={styles.root}>
      <StatusBarSpacer />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={topPad}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled">

          <AuthHeader variant="login" />

          <View style={styles.body}>
            <Text style={styles.title}>User Login</Text>

            <Text style={styles.label}>Email / Mobile</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email or 10-digit mobile"
              placeholderTextColor="#b7b3b3"
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              value={identity}
              onChangeText={t => { setIdentity(t); setError(''); }}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={styles.pwInput}
                placeholder="Enter password"
                placeholderTextColor="#b7b3b3"
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPw(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <GradientButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
              fontSize={18}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>New user? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.link}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: ACCENT },
  flex:  { flex: 1, backgroundColor: '#fdf5f5' },

  container: { flexGrow: 1 },

  body:  { paddingHorizontal: 26, paddingTop: 28, paddingBottom: 8 },
  title: { ...T.display, fontSize: 30, fontWeight: '800', marginBottom: 24 },

  label: { ...T.label, fontSize: 15, fontWeight: '600', marginBottom: 9 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: TEXT,
    backgroundColor: FIELD,
    marginBottom: 18,
  },

  pwRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pwInput: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    color: TEXT,
    backgroundColor: FIELD,
  },
  eyeBtn:  { position: 'absolute', right: 12, padding: 4 },
  eyeIcon: { fontSize: 18 },

  forgotRow:  { alignItems: 'flex-end', marginBottom: 22 },
  forgotText: { ...T.link },

  errorText: { ...T.error, marginBottom: 12 },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  footerText: { ...T.body, fontSize: 15 },
  link:       { ...T.link, fontSize: 15 },
});
