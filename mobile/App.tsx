import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard, Linking, Platform, ScrollView, TextInput, View } from 'react-native';
import type { ComponentRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { API_CONFIG } from './src/config';
import type { DetectorRef } from './src/detectTypes';
import { ApiError, detectIngredients, matchRecipes } from './src/lib/api';
import { addEntries, removeEntry } from './src/lib/ingredients';
import {
  addMissed,
  confirmedNames,
  initReview,
  isLowQuality,
  removeItem,
  toggleItem,
} from './src/lib/photoReview';
import type { ReviewItem } from './src/lib/photoReview';
import { pickPhoto } from './src/lib/pickPhoto';
import PhotoReviewScreen from './src/screens/PhotoReviewScreen';
import RecipeScreen from './src/screens/RecipeScreen';
import SearchScreen from './src/screens/SearchScreen';
import { useTheme } from './src/theme';
import type { RecipeMatch, Status } from './src/types';

type AppView = { name: 'search' } | { name: 'recipe'; id: string } | { name: 'photoReview' };

// Base64 is held only in error.retry, so "Try again" can re-send without re-picking.
type PhotoState =
  | { phase: 'idle' }
  | { phase: 'uploading'; uri: string }
  | { phase: 'review'; uri: string; items: ReviewItem[]; lowQuality: boolean; detector: DetectorRef }
  | { phase: 'error'; uri: string; error: ApiError; retry: { base64: string; mimeType: string } };

interface PhotoNotice {
  text: string;
  settings: boolean;
}

export default function App() {
  const { palette } = useTheme();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [recipes, setRecipes] = useState<RecipeMatch[]>([]);
  const [searchedWith, setSearchedWith] = useState<string[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [view, setView] = useState<AppView>({ name: 'search' });
  const [checked, setChecked] = useState<Record<string, Record<string, boolean>>>({});
  const inputRef = useRef<ComponentRef<typeof TextInput> | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const requestId = useRef(0);
  const [photo, setPhoto] = useState<PhotoState>({ phase: 'idle' });
  const [photoNotice, setPhotoNotice] = useState<PhotoNotice | null>(null);
  const photoRequestId = useRef(0);

  const inRecipe = view.name === 'recipe';
  const inPhoto = view.name === 'photoReview';
  useEffect(() => {
    if (!inRecipe && !inPhoto) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inPhoto) handleCancelPhoto();
      else setView({ name: 'search' });
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRecipe, inPhoto]);

  // Android announces changes through accessibilityLiveRegion. iOS has no
  // equivalent, so VoiceOver is told explicitly.
  function announce(message: string) {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }

  // Announce only when a search starts or finishes, not on every list change.
  useEffect(() => {
    if (status === 'loading') announce('Finding recipes');
    else if (status === 'success') {
      announce(
        recipes.length === 0
          ? 'No recipes match. Try adding or changing ingredients.'
          : `${recipes.length} ${recipes.length === 1 ? 'recipe matches' : 'recipes match'}`,
      );
    } else if (status === 'error' && error) announce(error.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function showPhotoNotice(text: string, settings = false) {
    setPhotoNotice({ text, settings });
    announce(text);
  }

  function handleAdd(raw: string) {
    const next = addEntries(ingredients, raw);
    setIngredients(next);
    setPhotoNotice(null);
    if (next.length > ingredients.length) setFormError(null);
  }

  function handleRemove(name: string) {
    setIngredients(removeEntry(ingredients, name));
    setPhotoNotice(null);
    inputRef.current?.focus();
  }

  async function upload(uri: string, base64: string, mimeType: string) {
    if (!API_CONFIG.ok) return;
    const id = ++photoRequestId.current;
    setPhoto({ phase: 'uploading', uri });
    setView({ name: 'photoReview' });
    Keyboard.dismiss();
    announce('Looking for ingredients');
    try {
      const res = await detectIngredients(API_CONFIG.baseUrl, { base64, mimeType });
      if (id !== photoRequestId.current) return;
      const suggested = res.candidates.length;
      announce(
        suggested === 0
          ? 'No ingredients found. Add what you see, or type them instead.'
          : `${suggested} ${suggested === 1 ? 'suggestion' : 'suggestions'} ready to review`,
      );
      setPhoto({
        phase: 'review',
        uri,
        items: initReview(res.candidates, ingredients),
        lowQuality: isLowQuality(res.candidates),
        detector: res.detector,
      });
    } catch (err) {
      if (id !== photoRequestId.current) return;
      const apiErr =
        err instanceof ApiError
          ? err
          : new ApiError('server', 'Something went wrong. Please try again.');
      announce(apiErr.message);
      setPhoto({
        phase: 'error',
        uri,
        error: apiErr,
        retry: { base64, mimeType },
      });
    }
  }

  async function handlePhoto(source: 'camera' | 'library') {
    if (photo.phase === 'uploading') return;
    setPhotoNotice(null);
    if (!API_CONFIG.ok) {
      // The config banner is already on screen; this tells VoiceOver.
      announce(
        API_CONFIG.reason === 'missing'
          ? 'EXPO_PUBLIC_API_URL is not set. See the message on screen.'
          : 'EXPO_PUBLIC_API_URL is invalid. See the message on screen.',
      );
      return;
    }
    const result = await pickPhoto(source);
    switch (result.kind) {
      case 'cancelled':
        return;
      case 'denied': {
        const what = source === 'camera' ? 'camera' : 'photos';
        showPhotoNotice(
          result.canAskAgain
            ? `EasyPlate can't use the ${what}. Allow access when asked, or type your ingredients.`
            : `EasyPlate can't use the ${what}. Allow access in Settings, or type your ingredients.`,
          !result.canAskAgain,
        );
        return;
      }
      case 'tooLarge':
        showPhotoNotice('That photo is over 5 MB. Try another, or type your ingredients.');
        return;
      case 'failed':
        showPhotoNotice(result.message);
        return;
      case 'ok':
        void upload(result.uri, result.base64, result.mimeType);
        return;
    }
  }

  function handleConfirmPhoto() {
    if (photo.phase !== 'review') return;
    const names = confirmedNames(photo.items);
    // Merge through the normal add path: keeps typed chips and the draft, and dedupes.
    // This deliberately does not search. The user taps Find when ready.
    handleAdd(names.join(','));
    const added = names.filter((n) => !ingredients.includes(n)).length;
    ++photoRequestId.current;
    setPhoto({ phase: 'idle' });
    setView({ name: 'search' });
    showPhotoNotice(
      added === 0
        ? 'Those ingredients were already on your list.'
        : `Added ${added} ${added === 1 ? 'ingredient' : 'ingredients'} from your photo. Review the list, then tap Find recipes.`,
    );
  }

  function handleCancelPhoto() {
    ++photoRequestId.current;
    setPhoto({ phase: 'idle' });
    setView({ name: 'search' });
  }

  function handleTypeInstead() {
    handleCancelPhoto();
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleRetryPhoto() {
    if (photo.phase !== 'error') return;
    void upload(photo.uri, photo.retry.base64, photo.retry.mimeType);
  }

  function updateItems(fn: (items: ReviewItem[]) => ReviewItem[]) {
    setPhoto((p) => (p.phase === 'review' ? { ...p, items: fn(p.items) } : p));
  }

  async function runSearch(list: string[]) {
    if (!API_CONFIG.ok) return;
    const id = ++requestId.current;
    setStatus('loading');
    setSearchedWith(list);
    setError(null);
    setView({ name: 'search' });
    Keyboard.dismiss();
    try {
      const result = await matchRecipes(API_CONFIG.baseUrl, list);
      if (id !== requestId.current) return;
      setRecipes(result);
      setStatus('success');
    } catch (err) {
      if (id !== requestId.current) return;
      setError(
        err instanceof ApiError
          ? err
          : new ApiError('server', 'Something went wrong. Please try again.'),
      );
      setStatus('error');
    }
  }

  function handleFind() {
    if (status === 'loading') return;
    setPhotoNotice(null);
    const list = addEntries(ingredients, draft);
    setIngredients(list);
    setDraft('');
    if (list.length === 0) {
      setFormError('Add at least one ingredient to search.');
      inputRef.current?.focus();
      return;
    }
    setFormError(null);
    if (!API_CONFIG.ok) {
      announce(
        API_CONFIG.reason === 'missing'
          ? 'EXPO_PUBLIC_API_URL is not set. See the message on screen.'
          : 'EXPO_PUBLIC_API_URL is invalid. See the message on screen.',
      );
      return;
    }
    void runSearch(list);
  }

  function handleRetry() {
    if (status === 'loading') return;
    void runSearch(searchedWith);
  }

  function handleEdit() {
    inputRef.current?.focus();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleToggle(name: string) {
    if (view.name !== 'recipe') return;
    const id = view.id;
    setChecked((prev) => ({
      ...prev,
      [id]: { ...prev[id], [name]: !prev[id]?.[name] },
    }));
  }

  const current = view.name === 'recipe' ? recipes.find((r) => r.id === view.id) : undefined;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        {view.name === 'photoReview' && photo.phase !== 'idle' ? (
          <PhotoReviewScreen
            phase={photo.phase}
            photoUri={photo.uri}
            items={photo.phase === 'review' ? photo.items : []}
            lowQuality={photo.phase === 'review' ? photo.lowQuality : false}
            detector={photo.phase === 'review' ? photo.detector : null}
            error={photo.phase === 'error' ? photo.error : null}
            baseUrl={API_CONFIG.ok ? API_CONFIG.baseUrl : ''}
            onToggle={(name) => updateItems((items) => toggleItem(items, name))}
            onRemove={(name) => updateItems((items) => removeItem(items, name))}
            onAddMissed={(raw) => updateItems((items) => addMissed(items, raw, ingredients))}
            onConfirm={handleConfirmPhoto}
            onCancel={handleCancelPhoto}
            onRetry={handleRetryPhoto}
            onTypeInstead={handleTypeInstead}
          />
        ) : current ? (
          <RecipeScreen
            recipe={current}
            checked={checked[current.id] ?? {}}
            onToggle={handleToggle}
            onBack={() => setView({ name: 'search' })}
          />
        ) : (
          <SearchScreen
            ingredients={ingredients}
            draft={draft}
            formError={formError}
            status={status}
            recipes={recipes}
            searchedWith={searchedWith}
            error={error}
            inputRef={inputRef}
            scrollRef={scrollRef}
            onDraftChange={setDraft}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onFind={handleFind}
            onClear={() => setIngredients([])}
            onRetry={handleRetry}
            onEdit={handleEdit}
            onOpen={(id) => setView({ name: 'recipe', id })}
            photoBusy={photo.phase === 'uploading'}
            photoNotice={photoNotice}
            onTakePhoto={() => void handlePhoto('camera')}
            onChoosePhoto={() => void handlePhoto('library')}
            onOpenSettings={() => void Linking.openSettings()}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}
