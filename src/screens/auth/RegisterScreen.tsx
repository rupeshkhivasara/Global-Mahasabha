import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import StatusBarSpacer from '../../commanComponents/StatusBarSpacer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { register, login, getStates, getDistricts, getCities } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../../App';
import type { LocationState, LocationDistrict, LocationCity } from '../../api';
import AuthHeader from '../../commanComponents/AuthHeader';
import GradientButton from '../../commanComponents/GradientButton';
import {
  ACCENT, TEXT_PRIMARY as TEXT, TEXT_MUTED as MUTED,
  BG_FIELD as FIELD, BORDER_DEFAULT as BORDER,
} from '../../theme';
import { typeScale as T, font } from '../../typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type SelectItem = { id: number; label: string };

// ── SelectField ───────────────────────────────────────────────────────────────

function SelectField({
  label, value, placeholder, onPress, loading: fieldLoading, disabled,
}: {
  label: string; value: string; placeholder: string;
  onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, styles.selectRow, disabled && styles.selectDisabled]}
        onPress={onPress}
        disabled={disabled || fieldLoading}
        activeOpacity={0.7}>
        {fieldLoading
          ? <ActivityIndicator size="small" color={ACCENT} />
          : <Text style={value ? styles.selectText : styles.selectPlaceholder}>
              {value || placeholder}
            </Text>}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── PickerModal ───────────────────────────────────────────────────────────────

function PickerModal({
  visible, title, items, loading: modalLoading, error: modalError,
  onSelect, onClose, onRetry,
}: {
  visible: boolean; title: string; items: SelectItem[];
  loading?: boolean; error?: string;
  onSelect: (item: SelectItem) => void; onClose: () => void; onRetry?: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {modalLoading ? (
            <View style={styles.sheetCenter}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.sheetCenterText}>Loading…</Text>
            </View>
          ) : modalError ? (
            <View style={styles.sheetCenter}>
              <Text style={styles.sheetErrorText}>{modalError}</Text>
              {onRetry && (
                <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : items.length === 0 ? (
            <View style={styles.sheetCenter}>
              <Text style={styles.sheetCenterText}>No items found</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.sheetItem} onPress={() => onSelect(item)}>
                  <Text style={styles.sheetItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const insets    = useSafeAreaInsets();
  const topPad    = insets.top;
  const bottomPad = Math.max(insets.bottom, 20);

  const [fullName, setFullName]               = useState('');
  const [mobile, setMobile]                   = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress]                 = useState('');
  const [pincode, setPincode]                 = useState('');
  const [agreed, setAgreed]                   = useState(false);

  const [states, setStates]       = useState<SelectItem[]>([]);
  const [districts, setDistricts] = useState<SelectItem[]>([]);
  const [cities, setCities]       = useState<SelectItem[]>([]);

  const [selectedState, setSelectedState]       = useState<SelectItem | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<SelectItem | null>(null);
  const [selectedCity, setSelectedCity]         = useState<SelectItem | null>(null);

  const [statesLoading, setStatesLoading]       = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading]       = useState(false);

  const [statesError, setStatesError]       = useState('');
  const [districtsError, setDistrictsError] = useState('');
  const [citiesError, setCitiesError]       = useState('');

  const [pickerVisible, setPickerVisible] = useState<'state' | 'district' | 'city' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchStates = useCallback(() => {
    setStatesLoading(true); setStatesError('');
    getStates()
      .then(res => {
        if (res.success && res.data) {
          const raw = res.data as { states?: LocationState[] } | LocationState[];
          const list: LocationState[] = Array.isArray(raw)
            ? raw : (raw as { states?: LocationState[] }).states ?? [];
          setStates(list.map(s => ({ id: s.id, label: s.state_name })));
        } else { setStatesError('Could not load states. Tap to retry.'); }
      })
      .catch((err: unknown) => {
        setStatesError(err instanceof Error ? err.message : 'Network error.');
      })
      .finally(() => setStatesLoading(false));
  }, []);

  useEffect(() => { fetchStates(); }, [fetchStates]);

  const fetchDistricts = useCallback(async (stateId: number) => {
    setDistrictsLoading(true); setDistrictsError(''); setDistricts([]); setCities([]);
    try {
      const res = await getDistricts(stateId);
      if (res.success && res.data) {
        const raw = res.data as { districts?: LocationDistrict[] } | LocationDistrict[];
        const list: LocationDistrict[] = Array.isArray(raw)
          ? raw : (raw as { districts?: LocationDistrict[] }).districts ?? [];
        setDistricts(list.map(d => ({ id: d.id, label: d.district_name })));
      } else { setDistrictsError('Could not load districts. Try again.'); }
    } catch (err: unknown) {
      setDistrictsError(err instanceof Error ? err.message : 'Network error.');
    } finally { setDistrictsLoading(false); }
  }, []);

  const fetchCities = useCallback(async (stateId: number, districtId: number) => {
    setCitiesLoading(true); setCitiesError(''); setCities([]);
    try {
      const res = await getCities(stateId, districtId);
      if (res.success && res.data) {
        const raw = res.data as { cities?: LocationCity[] } | LocationCity[];
        const list: LocationCity[] = Array.isArray(raw)
          ? raw : (raw as { cities?: LocationCity[] }).cities ?? [];
        setCities(list.map(c => ({ id: c.id, label: c.city_name })));
      } else { setCitiesError('Could not load cities. Try again.'); }
    } catch (err: unknown) {
      setCitiesError(err instanceof Error ? err.message : 'Network error.');
    } finally { setCitiesLoading(false); }
  }, []);

  const handleStateSelect = useCallback((item: SelectItem) => {
    setSelectedState(item); setSelectedDistrict(null); setSelectedCity(null);
    setPickerVisible(null); fetchDistricts(item.id);
  }, [fetchDistricts]);

  const handleDistrictSelect = useCallback((item: SelectItem) => {
    setSelectedDistrict(item); setSelectedCity(null); setPickerVisible(null);
    if (selectedState) fetchCities(selectedState.id, item.id);
  }, [selectedState, fetchCities]);

  const handleCitySelect = useCallback((item: SelectItem) => {
    setSelectedCity(item); setPickerVisible(null);
  }, []);

  const validate = useCallback((): string | null => {
    if (!fullName.trim())                     return 'Full name is required.';
    if (!/^\d{10}$/.test(mobile))            return 'Mobile must be exactly 10 digits.';
    if (!email.trim())                        return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(email))         return 'Enter a valid email.';
    if (!selectedState)                       return 'Please select a state.';
    if (!selectedDistrict)                    return 'Please select a district.';
    if (!selectedCity)                        return 'Please select a city.';
    if (!address.trim())                      return 'Address is required.';
    if (pincode && !/^\d{6}$/.test(pincode)) return 'Pincode must be 6 digits.';
    if (password.length < 8)                  return 'Password must be at least 8 characters.';
    if (password !== confirmPassword)         return 'Passwords do not match.';
    if (!agreed)                              return 'Please agree to the terms and conditions.';
    return null;
  }, [fullName, mobile, email, selectedState, selectedDistrict, selectedCity, address, pincode, password, confirmPassword, agreed]);

  const handleRegister = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (!selectedState || !selectedDistrict || !selectedCity) return;
    setLoading(true); setError('');
    try {
      const res = await register({
        full_name:   fullName.trim(),
        email:       email.trim(),
        mobile:      mobile.trim(),
        password,
        address:     address.trim(),
        state_id:    selectedState.id,
        district_id: selectedDistrict.id,
        city_id:     selectedCity.id,
        ...(pincode.trim() ? { pincode: pincode.trim() } : {}),
      });
      if (!res.success) { setError(res.message || 'Registration failed.'); return; }
      const loginRes = await login({ identity: email.trim(), password });
      if (loginRes.success) { await signIn(loginRes.data.user); }
      else { navigation.replace('Login'); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
    } finally { setLoading(false); }
  }, [validate, fullName, email, mobile, password, address, selectedState, selectedDistrict, selectedCity, pincode, signIn, navigation]);

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

          <AuthHeader variant="register" />

          <View style={styles.body}>
            <Text style={styles.title}>Registration Form</Text>

            <Text style={styles.label}>Full Name / <Text style={styles.hi}>नाम</Text> <Text style={styles.req}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Enter full name"
              placeholderTextColor="#b7b3b3" value={fullName}
              onChangeText={t => { setFullName(t); setError(''); }} />

            <Text style={styles.label}>Mobile No / <Text style={styles.hi}>मोबाइल न.</Text> <Text style={styles.req}>*</Text></Text>
            <TextInput style={styles.input} placeholder="+91 00000 00000"
              placeholderTextColor="#b7b3b3" keyboardType="phone-pad" maxLength={10}
              value={mobile} onChangeText={t => { setMobile(t.replace(/\D/g, '')); setError(''); }} />

            <Text style={styles.label}>Email <Text style={styles.req}>*</Text></Text>
            <TextInput style={styles.input} placeholder="you@example.com"
              placeholderTextColor="#b7b3b3" keyboardType="email-address"
              autoCapitalize="none" value={email}
              onChangeText={t => { setEmail(t); setError(''); }} />

            <SelectField label="State / राज्य *" value={selectedState?.label ?? ''}
              placeholder="Select state" loading={statesLoading}
              onPress={() => setPickerVisible('state')} />
            <SelectField label="District / जिला *" value={selectedDistrict?.label ?? ''}
              placeholder={selectedState ? 'Select district' : 'Select state first'}
              loading={districtsLoading} disabled={!selectedState}
              onPress={() => setPickerVisible('district')} />
            <SelectField label="City / शहर *" value={selectedCity?.label ?? ''}
              placeholder={selectedDistrict ? 'Select city' : 'Select district first'}
              loading={citiesLoading} disabled={!selectedDistrict}
              onPress={() => setPickerVisible('city')} />

            <Text style={styles.label}>Address / <Text style={styles.hi}>पता</Text> <Text style={styles.req}>*</Text></Text>
            <TextInput style={[styles.input, styles.multiline]}
              placeholder="Enter full address" placeholderTextColor="#b7b3b3"
              multiline numberOfLines={3} value={address}
              onChangeText={t => { setAddress(t); setError(''); }} />

            <Text style={styles.label}>Pin Code / <Text style={styles.hi}>पिन कोड</Text></Text>
            <TextInput style={styles.input} placeholder="000000"
              placeholderTextColor="#b7b3b3" keyboardType="number-pad" maxLength={6}
              value={pincode} onChangeText={t => { setPincode(t.replace(/\D/g, '')); setError(''); }} />

            <Text style={styles.label}>Password (for login) <Text style={styles.req}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Min 8 characters"
              placeholderTextColor="#b7b3b3" secureTextEntry value={password}
              onChangeText={t => { setPassword(t); setError(''); }} />

            <Text style={styles.label}>Confirm Password <Text style={styles.req}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Re-enter password"
              placeholderTextColor="#b7b3b3" secureTextEntry value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setError(''); }} />

            <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.8}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>
                I agree to all terms and conditions.<Text style={styles.req}> *</Text>
              </Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <GradientButton
              title="Submit Registration"
              onPress={handleRegister}
              loading={loading}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already a user? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Login account</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal visible={pickerVisible === 'state'} title="Select State"
        items={states} loading={statesLoading} error={statesError}
        onRetry={fetchStates} onSelect={handleStateSelect}
        onClose={() => setPickerVisible(null)} />
      <PickerModal visible={pickerVisible === 'district'} title="Select District"
        items={districts} loading={districtsLoading} error={districtsError}
        onRetry={() => selectedState && fetchDistricts(selectedState.id)}
        onSelect={handleDistrictSelect} onClose={() => setPickerVisible(null)} />
      <PickerModal visible={pickerVisible === 'city'} title="Select City"
        items={cities} loading={citiesLoading} error={citiesError}
        onRetry={() => selectedState && selectedDistrict && fetchCities(selectedState.id, selectedDistrict.id)}
        onSelect={handleCitySelect} onClose={() => setPickerVisible(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: ACCENT },
  flex:  { flex: 1, backgroundColor: '#fdf5f5' },

  container: { flexGrow: 1 },

  body:  { paddingHorizontal: 22, paddingTop: 24 },
  title: { ...T.title, fontWeight: '800', marginBottom: 22 },

  label: { ...T.label, marginBottom: 8 },
  hi:    { fontFamily: font.medium, fontWeight: '500' },
  req:   { color: ACCENT },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT,
    backgroundColor: FIELD,
    marginBottom: 18,
  },
  multiline:        { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  selectRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectDisabled:   { opacity: 0.45 },
  selectText:       { ...T.body, flex: 1 },
  selectPlaceholder:{ ...T.body, color: '#b7b3b3', flex: 1 },
  chevron:          { fontSize: 20, color: MUTED },

  checkRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 6, marginBottom: 22 },
  checkbox:        { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cfc8c8', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkmark:       { color: '#fff', fontSize: 13, fontFamily: font.bold, fontWeight: '700' },
  checkLabel:      { ...T.subtle, fontSize: 13.5, color: '#4a4242', lineHeight: 20, flex: 1 },

  errorText: { ...T.error, marginBottom: 14 },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  footerText: { ...T.body },
  link:       { ...T.link },

  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  sheetHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle:      { ...T.cardTitle, fontSize: 16, fontWeight: '700' },
  sheetClose:      { fontSize: 18, color: MUTED, paddingHorizontal: 8 },
  sheetItem:       { paddingHorizontal: 20, paddingVertical: 14 },
  sheetItemText:   { ...T.body, fontSize: 15 },
  separator:       { height: 1, backgroundColor: '#F3F4F6' },
  sheetCenter:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  sheetCenterText: { ...T.subtle, textAlign: 'center' },
  sheetErrorText:  { ...T.error, textAlign: 'center', marginBottom: 16 },
  retryBtn:        { borderWidth: 1.5, borderColor: ACCENT, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8 },
  retryBtnText:    { ...T.link, fontFamily: font.semibold, fontWeight: '600' },
});
