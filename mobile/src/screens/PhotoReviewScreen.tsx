import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { API_CONFIG } from '../config';
import type { DetectorRef } from '../detectTypes';
import type { ApiError } from '../lib/api';
import { LOW_CONFIDENCE } from '../lib/photoReview';
import type { ReviewItem } from '../lib/photoReview';
import { radius, serifFamily, useTheme } from '../theme';
import type { Palette } from '../theme';

interface Props {
  phase: 'uploading' | 'review' | 'error';
  photoUri: string;
  items: ReviewItem[];
  lowQuality: boolean;
  detector: DetectorRef | null;
  error: ApiError | null;
  baseUrl: string;
  onToggle(name: string): void;
  onRemove(name: string): void;
  onAddMissed(raw: string): void;
  onConfirm(): void;
  onCancel(): void;
  onRetry(): void;
  onTypeInstead(): void;
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: p.background },
    content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    headerText: { flex: 1, gap: 4, alignItems: 'flex-start' },
    title: { fontFamily: serifFamily, fontSize: 28, fontWeight: '700', color: p.accent },
    thumb: { width: 96, height: 96, borderRadius: radius.sm, backgroundColor: p.border },
    text: { color: p.text, fontSize: 16 },
    muted: { color: p.muted, fontSize: 15 },
    loading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    errorBox: { gap: 8, alignItems: 'flex-start' },
    errorText: { color: p.danger, fontSize: 16, fontWeight: '600' },
    list: { gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toggle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: p.surface,
      borderWidth: 2,
      borderColor: p.border,
      borderRadius: radius.sm,
    },
    box: { color: p.accent, fontSize: 22, lineHeight: 26 },
    name: { color: p.text, fontSize: 16, fontWeight: '600' },
    tag: { color: p.muted, fontSize: 13, fontStyle: 'italic' },
    remove: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
    removeText: { color: p.text, fontSize: 22, lineHeight: 24 },
    input: {
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: p.text,
      backgroundColor: p.surface,
      borderWidth: 2,
      borderColor: p.border,
      borderRadius: radius.sm,
    },
    label: { color: p.text, fontWeight: '600', fontSize: 16 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  });
}

export default function PhotoReviewScreen(props: Props) {
  const {
    phase, photoUri, items, lowQuality, detector, error,
    onToggle, onRemove, onAddMissed, onConfirm, onCancel, onRetry, onTypeInstead,
  } = props;
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const [missed, setMissed] = useState('');
  const count = items.filter((i) => i.selected).length;

  function submitMissed(value: string) {
    if (value.trim() !== '') onAddMissed(value);
    setMissed('');
  }

  function handleMissedChange(value: string) {
    const idx = value.lastIndexOf(',');
    if (idx >= 0) {
      submitMissed(value.slice(0, idx));
      setMissed(value.slice(idx + 1));
    } else {
      setMissed(value);
    }
  }

  return (
    <SafeAreaView style={s.flex} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={s.header}>
            <View style={s.headerText}>
              <PrimaryButton
                label="‹ Back"
                accessibilityLabel="Back"
                variant="secondary"
                onPress={onCancel}
              />
              <Text style={s.title} accessibilityRole="header">
                Check what we found
              </Text>
            </View>
            <Image source={{ uri: photoUri }} style={s.thumb} accessibilityLabel="Your photo" />
          </View>

          {phase === 'uploading' ? (
            <View style={s.errorBox} accessibilityLiveRegion="polite">
              <View style={s.loading}>
                <ActivityIndicator color={palette.accent} />
                <Text style={s.text}>Looking for ingredients…</Text>
              </View>
              <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} />
            </View>
          ) : null}

          {phase === 'error' && error ? (
            <View style={s.errorBox} accessibilityLiveRegion="polite">
              <Text style={s.errorText}>{error.message}</Text>
              {(error.kind === 'unreachable' || error.kind === 'timeout') && API_CONFIG.ok ? (
                <Text style={s.muted}>
                  Trying to reach {API_CONFIG.baseUrl}. Check that the server is running, the phone
                  is on the same Wi-Fi, and {API_CONFIG.baseUrl}/ opens in Safari on the phone.
                  Changed the URL? Restart Expo with npx expo start -c.
                </Text>
              ) : null}
              <View style={s.actions}>
                <PrimaryButton label="Try again" onPress={onRetry} />
                <PrimaryButton label="Type ingredients instead" variant="secondary" onPress={onTypeInstead} />
              </View>
            </View>
          ) : null}

          {phase === 'review' ? (
            <>
              {detector?.id === 'fixture' ? (
                <Text style={s.muted} accessibilityRole="text">
                  Demo mode: these suggestions are sample data, not read from your photo.
                </Text>
              ) : null}
              {lowQuality ? (
                <Text style={s.text}>
                  We couldn't spot much with confidence. Tick anything that's right, add what we
                  missed, or type them on the main screen.
                </Text>
              ) : null}

              <View style={s.list}>
                {items.length === 0 ? (
                  <Text style={s.muted}>No suggestions. Add what you see below.</Text>
                ) : null}
                {items.map((item) => {
                  const tag =
                    item.source === 'added'
                      ? 'Added by you'
                      : item.confidence !== null && item.confidence < LOW_CONFIDENCE
                        ? 'Not sure'
                        : null;
                  return (
                    <View key={item.name} style={s.row}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.selected }}
                        onPress={() => onToggle(item.name)}
                        style={s.toggle}
                      >
                        <Text style={s.box}>{item.selected ? '☑' : '☐'}</Text>
                        <Text style={s.name}>{item.name}</Text>
                        {tag ? <Text style={s.tag}>{tag}</Text> : null}
                        {item.alreadyInList ? <Text style={s.tag}>Already in your list</Text> : null}
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.name}`}
                        hitSlop={8}
                        onPress={() => onRemove(item.name)}
                        style={s.remove}
                      >
                        <Text style={s.removeText}>×</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={s.label}>Add something we missed</Text>
                <TextInput
                  value={missed}
                  onChangeText={handleMissedChange}
                  onSubmitEditing={() => submitMissed(missed)}
                  accessibilityLabel="Add something we missed"
                  placeholder="e.g. butter"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  returnKeyType="done"
                  submitBehavior="submit"
                  maxLength={80}
                  style={s.input}
                />
              </View>

              <View style={s.actions}>
                <PrimaryButton
                  label={`Add ${count} to my list`}
                  onPress={onConfirm}
                  disabled={count === 0}
                />
                <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
