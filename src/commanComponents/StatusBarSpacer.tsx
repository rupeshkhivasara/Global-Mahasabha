import React from 'react';
import { View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATUS_BAR_BG } from '../theme';

interface Props {
  color?: string;
}

export default function StatusBarSpacer({ color = STATUS_BAR_BG }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {top > 0 && <View style={{ height: top, backgroundColor: color }} />}
    </>
  );
}
