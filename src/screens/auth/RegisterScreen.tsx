import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Modal, FlatList,
  StatusBar,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  register, login, getStates, getDistricts, getCities,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../../App';
import type { LocationState, LocationDistrict, LocationCity } from '../../api';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

type SelectItem = { id: number; label: string };

function SelectField({
  label, value, placeholder, onPress, loading: fieldLoading, disabled,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, styles.selectInput, disabled && styles.selectDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}>
        {fieldLoading
          ? <ActivityIndicator size="small" color="#2563EB" />
          : <Text style={value ? styles.selectText : styles.selectPlaceholder}>
              {value || placeholder}
            </Text>}
        <Text style={styles.selectChevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

function PickerModal({
  visible, title, items, loading: modalLoading, error: modalError,
  onSelect, onClose, onRetry,
}: {
  visible: boolean;
  title: string;
  items: SelectItem[];
  loading?: boolean;
  error?: string;
  onSelect: (item: SelectItem) => void;
  onClose: () => void;
  onRetry?: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {modalLoading ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.modalCenterText}>Loading…</Text>
            </View>
          ) : modalError ? (
            <View style={styles.modalCenter}>
              <Text style={styles.modalErrorText}>{modalError}</Text>
              {onRetry && (
                <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : items.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={styles.modalCenterText}>No items found</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
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

export default function RegisterScreen({ navigation }: Props) {
  const { signIn } = useAuth();

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  // Location cascade
  const [states, setStates] = useState<SelectItem[]>([]);
  const [districts, setDistricts] = useState<SelectItem[]>([]);
  const [cities, setCities] = useState<SelectItem[]>([]);

  const [selectedState, setSelectedState] = useState<SelectItem | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<SelectItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<SelectItem | null>(null);

  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [statesError, setStatesError] = useState('');
  const [districtsError, setDistrictsError] = useState('');
  const [citiesError, setCitiesError] = useState('');

  // Modal state
  const [pickerVisible, setPickerVisible] = useState<'state' | 'district' | 'city' | null>(null);

  // Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStates = useCallback(() => {
    setStatesLoading(true);
    setStatesError('');
    getStates()
      .then(res => {
        console.log('[Register] getStates response:', JSON.stringify(res).slice(0, 300));
        if (res.success && res.data && 'states' in res.data) {
          setStates(
            (res.data as { states: LocationState[] }).states.map(s => ({
              id: s.id,
              label: s.state_name,
            })),
          );
        } else {
          setStatesError('Could not load states. Tap to retry.');
        }
      })
      .catch(err => {
        console.warn('[Register] getStates error:', err?.message ?? err);
        setStatesError(err?.message ?? 'Network error. Tap to retry.');
      })
      .finally(() => setStatesLoading(false));
  }, []);

  useEffect(() => { fetchStates(); }, [fetchStates]);

  const loadDistricts = useCallback(async (stateId: number) => {
    setDistrictsLoading(true);
    setDistrictsError('');
    setDistricts([]);
    setCities([]);
    try {
      const res = await getDistricts(stateId);
      if (res.success && res.data && 'districts' in res.data) {
        setDistricts(
          (res.data as { districts: LocationDistrict[] }).districts.map(d => ({
            id: d.id,
            label: d.district_name,
          })),
        );
      } else {
        setDistrictsError('Could not load districts.');
      }
    } catch (err: unknown) {
      setDistrictsError(err instanceof Error ? err.message : 'Network error.');
    }
    setDistrictsLoading(false);
  }, []);

  const loadCities = useCallback(async (stateId: number, districtId: number) => {
    setCitiesLoading(true);
    setCitiesError('');
    setCities([]);
    try {
      const res = await getCities(stateId, districtId);
      if (res.success && res.data && 'cities' in res.data) {
        setCities(
          (res.data as { cities: LocationCity[] }).cities.map(c => ({
            id: c.id,
            label: c.city_name,
          })),
        );
      } else {
        setCitiesError('Could not load cities.');
      }
    } catch (err: unknown) {
      setCitiesError(err instanceof Error ? err.message : 'Network error.');
    }
    setCitiesLoading(false);
  }, []);

  const handleStateSelect = useCallback((item: SelectItem) => {
    setSelectedState(item);
    setSelectedDistrict(null);
    setSelectedCity(null);
    setPickerVisible(null);
    loadDistricts(item.id);
  }, [loadDistricts]);

  const handleDistrictSelect = useCallback((item: SelectItem) => {
    setSelectedDistrict(item);
    setSelectedCity(null);
    setPickerVisible(null);
    if (selectedState) {
      loadCities(selectedState.id, item.id);
    }
  }, [selectedState, loadCities]);

  const handleCitySelect = useCallback((item: SelectItem) => {
    setSelectedCity(item);
    setPickerVisible(null);
  }, []);

  const validate = useCallback((): string | null => {
    if (!fullName.trim())   return 'Full name is required.';
    if (!email.trim())      return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email.';
    if (!/^\d{10}$/.test(mobile))    return 'Mobile must be exactly 10 digits.';
    if (password.length < 8)         return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!address.trim())             return 'Address is required.';
    if (!selectedState)              return 'Please select a state.';
    if (!selectedDistrict)           return 'Please select a district.';
    if (!selectedCity)               return 'Please select a city.';
    if (pincode && !/^\d{6}$/.test(pincode)) return 'Pincode must be 6 digits.';
    return null;
  }, [fullName, email, mobile, password, confirmPassword, address, selectedState, selectedDistrict, selectedCity, pincode]);

  const handleRegister = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (!selectedState || !selectedDistrict || !selectedCity) return;

    setLoading(true);
    setError('');
    try {
      const res = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        address: address.trim(),
        state_id: selectedState.id,
        district_id: selectedDistrict.id,
        city_id: selectedCity.id,
        ...(pincode.trim() ? { pincode: pincode.trim() } : {}),
      });

      if (!res.success) {
        setError(res.message || 'Registration failed.');
        return;
      }

      // Auto-login after registration
      const loginRes = await login({ identity: email.trim(), password });
      if (loginRes.success) {
        await signIn(loginRes.data.user);
      } else {
        // Registration succeeded but auto-login failed — go to login screen
        navigation.replace('Login');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }, [
    validate, fullName, email, mobile, password, address,
    selectedState, selectedDistrict, selectedCity, pincode, signIn, navigation,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">

        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>GM</Text>
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Join Global Mahasabha</Text>
        </View>

        <View style={styles.card}>

          <Text style={styles.sectionLabel}>Personal Details</Text>

          <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={t => { setFullName(t); setError(''); }}
          />

          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
          />

          <Text style={styles.label}>Mobile <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
            value={mobile}
            onChangeText={t => { setMobile(t.replace(/\D/g, '')); setError(''); }}
          />

          <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Min 8 characters"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={t => { setPassword(t); setError(''); }}
          />

          <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={confirmPassword}
            onChangeText={t => { setConfirmPassword(t); setError(''); }}
          />

          <Text style={styles.sectionLabel}>Address</Text>

          <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Street / locality"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            value={address}
            onChangeText={t => { setAddress(t); setError(''); }}
          />

          <SelectField
            label="State *"
            value={selectedState?.label ?? ''}
            placeholder="Select state"
            loading={statesLoading}
            onPress={() => setPickerVisible('state')}
          />

          <SelectField
            label="District *"
            value={selectedDistrict?.label ?? ''}
            placeholder={selectedState ? 'Select district' : 'Select state first'}
            loading={districtsLoading}
            disabled={!selectedState}
            onPress={() => setPickerVisible('district')}
          />

          <SelectField
            label="City *"
            value={selectedCity?.label ?? ''}
            placeholder={selectedDistrict ? 'Select city' : 'Select district first'}
            loading={citiesLoading}
            disabled={!selectedDistrict}
            onPress={() => setPickerVisible('city')}
          />

          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={styles.input}
            placeholder="6-digit pincode (optional)"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={t => { setPincode(t.replace(/\D/g, '')); setError(''); }}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* State picker */}
      <PickerModal
        visible={pickerVisible === 'state'}
        title="Select State"
        items={states}
        loading={statesLoading}
        error={statesError}
        onRetry={fetchStates}
        onSelect={handleStateSelect}
        onClose={() => setPickerVisible(null)}
      />

      {/* District picker */}
      <PickerModal
        visible={pickerVisible === 'district'}
        title="Select District"
        items={districts}
        loading={districtsLoading}
        error={districtsError}
        onRetry={() => selectedState && loadDistricts(selectedState.id)}
        onSelect={handleDistrictSelect}
        onClose={() => setPickerVisible(null)}
      />

      {/* City picker */}
      <PickerModal
        visible={pickerVisible === 'city'}
        title="Select City"
        items={cities}
        loading={citiesLoading}
        error={citiesError}
        onRetry={() => selectedState && selectedDistrict && loadCities(selectedState.id, selectedDistrict.id)}
        onSelect={handleCitySelect}
        onClose={() => setPickerVisible(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F4F7' },
  container: { flexGrow: 1, padding: 24, paddingTop: 40 },
  logoArea:  { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  logoText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  appName:  { fontSize: 20, fontWeight: '700', color: '#111827' },
  tagline:  { fontSize: 13, color: '#6B7280', marginTop: 4 },
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
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: 8, marginBottom: 14,
  },
  label:    { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB',
    marginBottom: 14,
  },
  multilineInput:    { minHeight: 72, textAlignVertical: 'top' },
  selectInput:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectDisabled:    { opacity: 0.45, backgroundColor: '#F3F4F6' },
  selectText:        { fontSize: 14, color: '#111827', flex: 1 },
  selectPlaceholder: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  selectChevron:     { fontSize: 18, color: '#6B7280', marginLeft: 8 },
  errorText:  { fontSize: 13, color: '#EF4444', marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled:    { opacity: 0.6 },
  footer: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 28, marginBottom: 16,
  },
  footerText: { fontSize: 14, color: '#6B7280' },
  linkText:   { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle:     { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalClose:     { fontSize: 18, color: '#6B7280', paddingHorizontal: 8 },
  modalItem:      { paddingHorizontal: 20, paddingVertical: 14 },
  modalItemText:  { fontSize: 15, color: '#111827' },
  separator:      { height: 1, backgroundColor: '#F3F4F6' },
  modalCenter: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 48, paddingHorizontal: 24,
  },
  modalCenterText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  modalErrorText:  { fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    borderWidth: 1.5, borderColor: '#2563EB', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 8,
  },
  retryBtnText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
});
