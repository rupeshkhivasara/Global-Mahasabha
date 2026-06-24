import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import StatusBarSpacer from '../../commanComponents/StatusBarSpacer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { verifyOtp, forgotPassword } from '../../api';
import type { AuthStackParamList } from '../../../App';
import AuthHeader from '../../commanComponents/AuthHeader';
import GradientButton from '../../commanComponents/GradientButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOTP'>;

const OTP_LENGTH = 6;
const ACCENT = '#e11d2a';
const TEXT   = '#2b2424';
const LABEL  = '#3a3232';
const FIELD  = '#f6f5f5';
const BORDER = '#ececec';

export default function VerifyOtpScreen({ navigation, route }: Props) {
  const { mobile } = route.params;
  const insets    = useSafeAreaInsets();
  const topPad    = insets.top;
  const bottomPad = Math.max(insets.bottom, 20);

  const [otp, setOtp]                         = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [resending, setResending]             = useState(false);
  const [error, setError]                     = useState('');
  const [banner, setBanner]                   = useState('');
  const [bannerOk, setBannerOk]               = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  const handleOtpChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next); setError('');
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleOtpKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }, [otp]);

  const handleReset = useCallback(async () => {
    const otpStr = otp.join('');
    if (otpStr.length < OTP_LENGTH)    { setError('Enter the complete 6-digit OTP.'); return; }
    if (newPassword.length < 8)         { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword){ setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res = await verifyOtp({ mobile, otp: otpStr, new_password: newPassword });
      if (res.success) { navigation.popToTop(); }
      else { setError(res.message || 'Invalid OTP or expired. Try again.'); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
    } finally { setLoading(false); }
  }, [otp, newPassword, confirmPassword, mobile, navigation]);

  const handleResend = useCallback(async () => {
    setResending(true); setBanner('');
    try {
      const res = await forgotPassword(mobile);
      if (res.success) {
        setBannerOk(true); setBanner('OTP resent successfully.');
        setOtp(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else { setBannerOk(false); setBanner(res.message || 'Could not resend OTP.'); }
    } catch { setBannerOk(false); setBanner('Network error. Try again.'); }
    finally { setResending(false); }
  }, [mobile]);

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

          <AuthHeader variant="verify" />

          <View style={styles.body}>
            <Text style={styles.title}>Verify OTP</Text>

            {banner ? (
              <View style={[styles.bannerBox, bannerOk ? styles.bannerGreen : styles.bannerRed]}>
                <Text style={[styles.bannerText, bannerOk ? styles.bannerTextGreen : styles.bannerTextRed]}>
                  {banner}
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput style={[styles.input, styles.inputReadOnly]} value={`+91 ${mobile}`} editable={false} />

            <Text style={styles.label}>Enter OTP</Text>
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={ref => { inputRefs.current[i] = ref; }}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  value={digit}
                  onChangeText={text => handleOtpChange(text, i)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.pwRow}>
              <TextInput style={styles.pwInput} placeholder="Enter new password"
                placeholderTextColor="#b7b3b3" secureTextEntry={!showNew}
                value={newPassword} onChangeText={t => { setNewPassword(t); setError(''); }} />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.pwRow}>
              <TextInput style={styles.pwInput} placeholder="Re-enter new password"
                placeholderTextColor="#b7b3b3" secureTextEntry={!showConfirm}
                value={confirmPassword} onChangeText={t => { setConfirmPassword(t); setError(''); }} />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <GradientButton
              title="Reset Password"
              onPress={handleReset}
              loading={loading}
            />

            <TouchableOpacity style={styles.centeredRow} onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator size="small" color={ACCENT} />
                : <Text style={styles.accentLink}>Resend OTP</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.centeredRow} onPress={() => navigation.popToTop()}>
              <Text style={styles.accentLink}>Back to login</Text>
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

  body:  { paddingHorizontal: 22, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '800', color: TEXT, letterSpacing: -0.3, marginBottom: 20 },

  bannerBox:      { borderRadius: 13, padding: 13, marginBottom: 18, borderWidth: 1 },
  bannerRed:      { backgroundColor: '#fdecec', borderColor: '#f7c9c9' },
  bannerGreen:    { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  bannerText:     { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  bannerTextRed:  { color: '#c2261c' },
  bannerTextGreen:{ color: '#065f46' },

  label:        { fontSize: 14, fontWeight: '600', color: LABEL, marginBottom: 8 },
  input:        { height: 48, borderWidth: 1.5, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 14, fontSize: 14, color: TEXT, backgroundColor: FIELD, marginBottom: 18 },
  inputReadOnly:{ color: '#6b6363', backgroundColor: '#f0eeee' },

  otpRow:      { flexDirection: 'row', gap: 8, marginBottom: 18 },
  otpBox:      { flex: 1, height: 52, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, textAlign: 'center', fontSize: 20, fontWeight: '700', color: TEXT, backgroundColor: FIELD },
  otpBoxFilled:{ borderColor: ACCENT, backgroundColor: '#fff' },

  pwRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  pwInput: { flex: 1, height: 48, borderWidth: 1.5, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 14, paddingRight: 48, fontSize: 14, color: TEXT, backgroundColor: FIELD },
  eyeBtn:  { position: 'absolute', right: 12, padding: 4 },
  eyeIcon: { fontSize: 17 },

  errorText:   { fontSize: 13, color: ACCENT, marginBottom: 14 },
  centeredRow: { alignItems: 'center', marginTop: 18 },
  accentLink:  { fontSize: 14.5, fontWeight: '700', color: ACCENT },
});
