import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, useTheme } from '../theme';
import type { Palette } from '../theme';

interface Props {
  label: string;
  onPress(): void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    base: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    primary: { backgroundColor: p.accent, borderColor: p.accent },
    secondary: { backgroundColor: 'transparent', borderColor: p.accent },
    primaryText: { color: p.onAccent, fontWeight: '600', fontSize: 16 },
    secondaryText: { color: p.accent, fontWeight: '600', fontSize: 16 },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.75 },
  });
}

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  accessibilityHint,
}: Props) {
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        isPrimary ? s.primary : s.secondary,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <Text style={isPrimary ? s.primaryText : s.secondaryText}>{label}</Text>
    </Pressable>
  );
}
