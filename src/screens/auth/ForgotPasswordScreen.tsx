import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import StatusBarSpacer from '../../commanComponents/StatusBarSpacer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { forgotPassword } from '../../api';
import type { AuthStackParamList } from '../../../App';
import AuthHeader from '../../commanComponents/AuthHeader';
import GradientButton from '../../commanComponents/GradientButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

import {
  ACCENT, TEXT_PRIMARY as TEXT, BG_FIELD as FIELD, BORDER_DEFAULT as BORDER,
} from '../../theme';
import { typeScale as T } from '../../typography';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const insets    = useSafeAreaInsets();
  const topPad    = insets.top;
  const bottomPad = Math.max(insets.bottom, 20);

  const [mobile, setMobile]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSendOtp = useCallback(async () => {
    const m = mobile.trim();
    if (!/^\d{10}$/.test(m)) { setError('Enter a valid 10-digit mobile number.'); return; }
    setLoading(true); setError('');
    try {
      const res = await forgotPassword(m);
      if (res.success) { navigation.navigate('VerifyOTP', { mobile: m }); }
      else { setError(res.message || 'Could not send OTP. Try again.'); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
    } finally { setLoading(false); }
  }, [mobile, navigation]);

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

          <AuthHeader variant="forgot" />

          <View style={styles.body}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered mobile number and we'll send an OTP to reset your password.
            </Text>

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="+91 00000 00000"
              placeholderTextColor="#b7b3b3"
              keyboardType="phone-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
              value={mobile}
              onChangeText={t => { setMobile(t.replace(/\D/g, '')); setError(''); }}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <GradientButton
              title="Send OTP"
              onPress={handleSendOtp}
              loading={loading}
              fontSize={18}
            />

            <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backLink}>Back to login</Text>
            </TouchableOpacity>
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

  body:     { paddingHorizontal: 26, paddingTop: 30, paddingBottom: 8 },
  title:    { ...T.display, fontWeight: '800', marginBottom: 10 },
  subtitle: { ...T.subtle, fontSize: 14.5, lineHeight: 22, marginBottom: 30 },

  label:      { ...T.label, fontSize: 15, fontWeight: '600', marginBottom: 9 },
  input:      { height: 52, borderWidth: 1.5, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 16, fontSize: 15, color: TEXT, backgroundColor: FIELD, marginBottom: 22 },
  inputError: { borderColor: ACCENT },
  errorText:  { ...T.error, marginBottom: 14 },

  backRow:  { alignItems: 'center', marginTop: 24 },
  backLink: { ...T.link, fontSize: 15 },
});
