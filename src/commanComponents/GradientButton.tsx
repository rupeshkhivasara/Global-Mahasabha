import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR, RADIUS_BTN, SHADOW_BTN } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fontSize?: number;
}

export default function GradientButton({
  title,
  onPress,
  loading  = false,
  disabled = false,
  fontSize = 16,
}: Props) {
  const inactive = loading || disabled;

  return (
    <TouchableOpacity onPress={onPress} disabled={inactive} activeOpacity={0.85}>
      <LinearGradient
        colors={inactive ? ['#ccc', '#aaa', '#999'] : GRADIENT}
        locations={inactive ? [0, 0.5, 1] : GRADIENT_LOCATIONS}
        start={GRADIENT_DIR.start}
        end={GRADIENT_DIR.end}
        style={[styles.btn, inactive && styles.btnDisabled]}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={[styles.btnText, { fontSize }]}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: RADIUS_BTN,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_BTN,
  },
  btnText:     { color: '#fff', fontWeight: '700', letterSpacing: 0.2 },
  btnDisabled: { opacity: 0.65 },
});
