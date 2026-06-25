import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  GRADIENT, GRADIENT_LOCATIONS, GRADIENT_DIR,
  ACCENT, ACCENT_DARK, ACCENT_DEEP,
  SHADOW_BRAND,
} from '../theme';
import { font } from '../typography';

export type AuthHeaderVariant = 'login' | 'register' | 'forgot' | 'verify';

const CONFIG: Record<AuthHeaderVariant, { height: number; radius: number }> = {
  login:    { height: 172, radius: 26 },
  register: { height: 118, radius: 22 },
  forgot:   { height: 150, radius: 26 },
  verify:   { height: 96,  radius: 22 },
};

function LogoCard({ align }: { align: 'right' | 'left' }) {
  return (
    <View style={[styles.logoCard, align === 'right' ? styles.logoRight : styles.logoLeft]}>
      <Image source={require('../../assets/icons/vihar_icon.png')} style={styles.emblem} />
      <View>
        <Text style={styles.logoSmall}>Shree Digambar Jain</Text>
        <Text style={styles.logoBig}>Global Mahasabha</Text>
      </View>
    </View>
  );
}

function IconCard({ emoji, align }: { emoji: string; align: 'bottom-left' | 'center-left' }) {
  return (
    <View style={[styles.iconCard, align === 'bottom-left' ? styles.iconBottom : styles.iconCenter]}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

export default function AuthHeader({ variant }: { variant: AuthHeaderVariant }) {
  const { height, radius } = CONFIG[variant];

  return (
    <LinearGradient
      colors={GRADIENT}
      locations={GRADIENT_LOCATIONS}
      start={GRADIENT_DIR.start}
      end={GRADIENT_DIR.end}
      style={[styles.header, { height, borderRadius: radius }]}>

      {(variant === 'login' || variant === 'forgot') && (
        <View style={[styles.blob, styles.blobTopLeft]} />
      )}
      {variant === 'register' && (
        <View style={[styles.blob, styles.blobBottomLeft]} />
      )}
      {variant === 'verify' && (
        <View style={[styles.blob, styles.blobBottomRight]} />
      )}

      {variant === 'login'    && <LogoCard align="right" />}
      {variant === 'register' && <LogoCard align="left" />}
      {variant === 'forgot'   && <IconCard emoji="🔒" align="bottom-left" />}
      {variant === 'verify'   && <IconCard emoji="🛡"  align="center-left" />}

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
  },
  blob:            { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.15)' },
  blobTopLeft:     { top: -30,   left: -30,  width: 160, height: 160, borderRadius: 80 },
  blobBottomLeft:  { bottom: -40, left: -20, width: 140, height: 140, borderRadius: 70 },
  blobBottomRight: { bottom: -40, right: -10, width: 130, height: 130, borderRadius: 65 },

  logoCard: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingRight: 13,
    paddingLeft:7,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    ...SHADOW_BRAND,
  },
  logoRight: { top: 18, right: 18 },
  logoLeft:  { top: '50%', left: 18, transform: [{ translateY: -24 }] },

  emblem:      { width: 50, height: 50, borderRadius: 15 },
  logoSmall:   { fontSize: 10,  fontFamily: font.semibold,  fontWeight: '600', color: ACCENT },
  logoBig:     { fontSize: 15, fontFamily: font.extrabold, fontWeight: '800', color: ACCENT_DARK },

  iconCard: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_DEEP,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  iconBottom: { bottom: 18, left: 18 },
  iconCenter: { top: '50%', left: 18, transform: [{ translateY: -23 }] },
  iconEmoji:  { fontSize: 22 },
});
