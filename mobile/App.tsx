import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, View } from 'react-native';
import type { ComponentRef } from 'react';
import { ScrollView, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { API_CONFIG } from './src/config';
import { ApiError, matchRecipes } from './src/lib/api';
import { addEntries, removeEntry } from './src/lib/ingredients';
import RecipeScreen from './src/screens/RecipeScreen';
import SearchScreen from './src/screens/SearchScreen';
import { useTheme } from './src/theme';
import type { RecipeMatch } from './src/types';

type Status = 'idle' | 'loading' | 'success' | 'error';
// Task 012 adds { name: 'photoReview'; ... } here.
type View_ = { name: 'search' } | { name: 'recipe'; id: string };

export default function App() {
  const { palette } = useTheme();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [recipes, setRecipes] = useState<RecipeMatch[]>([]);
  const [searchedWith, setSearchedWith] = useState<string[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [view, setView] = useState<View_>({ name: 'search' });
  const [checked, setChecked] = useState<Record<string, Record<string, boolean>>>({});
  const inputRef = useRef<ComponentRef<typeof TextInput> | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const requestId = useRef(0);

  const inRecipe = view.name === 'recipe';
  useEffect(() => {
    if (!inRecipe) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setView({ name: 'search' });
      return true;
    });
    return () => sub.remove();
  }, [inRecipe]);

  function handleAdd(raw: string) {
    const next = addEntries(ingredients, raw);
    setIngredients(next);
    if (next.length > ingredients.length) setFormError(null);
  }

  function handleRemove(name: string) {
    setIngredients(removeEntry(ingredients, name));
    inputRef.current?.focus();
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
    const list = addEntries(ingredients, draft);
    setIngredients(list);
    setDraft('');
    if (list.length === 0) {
      setFormError('Add at least one ingredient to search.');
      inputRef.current?.focus();
      return;
    }
    setFormError(null);
    if (!API_CONFIG.ok) return;
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
        {current ? (
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
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}
