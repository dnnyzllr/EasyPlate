import { useMemo } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import IngredientInput from '../components/IngredientInput';
import PrimaryButton from '../components/PrimaryButton';
import RecipeCard from '../components/RecipeCard';
import { API_CONFIG } from '../config';
import type { ApiError } from '../lib/api';
import { radius, serifFamily, useTheme } from '../theme';
import type { Palette } from '../theme';
import type { RecipeMatch, Status } from '../types';

interface Props {
  ingredients: string[];
  draft: string;
  formError: string | null;
  status: Status;
  recipes: RecipeMatch[];
  searchedWith: string[];
  error: ApiError | null;
  inputRef: RefObject<ComponentRef<typeof TextInput> | null>;
  scrollRef: RefObject<ComponentRef<typeof ScrollView> | null>;
  onDraftChange(v: string): void;
  onAdd(raw: string): void;
  onRemove(name: string): void;
  onFind(): void;
  onClear(): void;
  onRetry(): void;
  onEdit(): void;
  onOpen(id: string): void;
  photoBusy: boolean;
  photoNotice: { text: string; settings: boolean } | null;
  onTakePhoto(): void;
  onChoosePhoto(): void;
  onOpenSettings(): void;
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: p.background },
    content: { paddingHorizontal: 16, paddingTop: 12 },
    title: { fontFamily: serifFamily, fontSize: 32, fontWeight: '700', color: p.accent },
    tagline: { color: p.muted, fontSize: 16, marginBottom: 16 },
    banner: {
      borderWidth: 1,
      borderColor: p.danger,
      borderRadius: radius.sm,
      padding: 12,
      marginBottom: 12,
      backgroundColor: p.surface,
    },
    bannerText: { color: p.danger, fontSize: 15 },
    warn: { color: p.danger, fontSize: 14, marginBottom: 12 },
    notice: { marginTop: 10, gap: 8, alignItems: 'flex-start' },
    noticeText: { color: p.text, fontSize: 15 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
    status: { marginTop: 8 },
    loading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    text: { color: p.text, fontSize: 16 },
    muted: { color: p.muted, fontSize: 15, marginBottom: 10 },
    h2: { fontFamily: serifFamily, fontSize: 24, fontWeight: '600', color: p.text, marginTop: 20, marginBottom: 4 },
    stale: { color: p.muted, fontSize: 15, marginTop: 16, fontStyle: 'italic' },
    errorBox: { marginTop: 16, gap: 8, alignItems: 'flex-start' },
    errorText: { color: p.danger, fontSize: 16, fontWeight: '600' },
    hint: { color: p.muted, fontSize: 15 },
    empty: { marginTop: 16, gap: 10, alignItems: 'flex-start' },
  });
}

export default function SearchScreen(props: Props) {
  const {
    ingredients, draft, formError, status, recipes, searchedWith, error,
    inputRef, scrollRef, onDraftChange, onAdd, onRemove, onFind, onClear, onRetry, onEdit, onOpen,
    photoBusy, photoNotice, onTakePhoto, onChoosePhoto, onOpenSettings,
  } = props;
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const loading = status === 'loading';
  const stale =
    (status === 'success' || status === 'error') && !sameList(ingredients, searchedWith);

  return (
    <SafeAreaView style={s.flex} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <Text style={s.title} accessibilityRole="header">
            EasyPlate
          </Text>
          <Text style={s.tagline}>Turn the ingredients you have into recipe ideas.</Text>

          {!API_CONFIG.ok ? (
            <View style={s.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={s.bannerText}>
                {API_CONFIG.reason === 'missing'
                  ? "EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env, set your computer's LAN IP (for example http://192.168.1.50:5000), then restart Expo with `npx expo start -c`."
                  : `EXPO_PUBLIC_API_URL must start with http:// or https:// (currently "${API_CONFIG.raw}").`}
              </Text>
            </View>
          ) : API_CONFIG.isLoopback ? (
            <Text style={s.warn}>
              localhost on a phone means the phone itself. Use your computer's LAN IP.
            </Text>
          ) : null}

          <IngredientInput
            ingredients={ingredients}
            draft={draft}
            error={formError}
            disabled={loading}
            inputRef={inputRef}
            onDraftChange={onDraftChange}
            onAdd={onAdd}
            onRemove={onRemove}
            onSubmitEmpty={onFind}
            onTakePhoto={onTakePhoto}
            onChoosePhoto={onChoosePhoto}
            photoBusy={photoBusy}
          />
          <View accessibilityLiveRegion="polite">
            {photoNotice ? (
              <View style={s.notice}>
                <Text style={s.noticeText}>{photoNotice.text}</Text>
                {photoNotice.settings ? (
                  <PrimaryButton label="Open Settings" variant="secondary" onPress={onOpenSettings} />
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={s.actions}>
            <PrimaryButton
              label={loading ? 'Searching…' : 'Find recipes'}
              onPress={onFind}
              disabled={loading}
            />
            {ingredients.length > 0 ? (
              <PrimaryButton label="Clear all" variant="secondary" onPress={onClear} />
            ) : null}
          </View>

          <View style={s.status} accessibilityLiveRegion="polite">
            {loading ? (
              <View style={s.loading}>
                <ActivityIndicator color={palette.accent} />
                <Text style={s.text}>Finding recipes…</Text>
              </View>
            ) : null}

            {status === 'success' && recipes.length > 0 ? (
              <View>
                <Text style={s.h2} accessibilityRole="header">
                  Recipes
                </Text>
                <Text style={s.muted}>
                  {recipes.length} {recipes.length === 1 ? 'recipe matches' : 'recipes match'}{' '}
                  {searchedWith.join(', ')}
                </Text>
                {recipes.map((r) => (
                  <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
                ))}
              </View>
            ) : null}

            {status === 'success' && recipes.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.text}>
                  No recipes use {searchedWith.join(', ')}. Try adding or changing ingredients.
                </Text>
                <PrimaryButton label="Edit ingredients" variant="secondary" onPress={onEdit} />
              </View>
            ) : null}

            {status === 'error' && error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error.message}</Text>
                {error.kind === 'rejected' ? (
                  <Text style={s.hint}>Check your ingredients and try again.</Text>
                ) : API_CONFIG.ok ? (
                  <Text style={s.hint}>
                    Trying to reach {API_CONFIG.baseUrl}. Check that the server is running, the
                    phone is on the same Wi-Fi, and {API_CONFIG.baseUrl}/ opens in Safari on the
                    phone. Changed the URL? Restart Expo with npx expo start -c.
                  </Text>
                ) : null}
                <PrimaryButton label="Retry" onPress={onRetry} disabled={loading} />
              </View>
            ) : null}

            {stale ? (
              <Text style={s.stale}>
                Your ingredients changed. Search again to update the results.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
