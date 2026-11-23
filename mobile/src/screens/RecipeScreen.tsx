import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import ShoppingChecklist from '../components/ShoppingChecklist';
import { serifFamily, useTheme } from '../theme';
import type { Palette } from '../theme';
import type { RecipeMatch } from '../types';

interface Props {
  recipe: RecipeMatch;
  checked: Record<string, boolean>;
  onToggle(name: string): void;
  onBack(): void;
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: p.background },
    content: { paddingHorizontal: 16, paddingTop: 12 },
    back: { alignSelf: 'flex-start', marginBottom: 12 },
    title: { fontFamily: serifFamily, fontSize: 28, fontWeight: '700', color: p.accent },
    meta: { color: p.muted, fontSize: 16, marginBottom: 8 },
    h2: { fontFamily: serifFamily, fontSize: 22, fontWeight: '600', color: p.text, marginTop: 20, marginBottom: 6 },
    ingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, paddingVertical: 4 },
    ingText: { color: p.text, fontSize: 16, flexShrink: 1 },
    have: { color: p.success, fontSize: 14, fontWeight: '700' },
    need: { color: p.danger, fontSize: 14, fontWeight: '700' },
    pantry: { color: p.muted, fontSize: 14, fontWeight: '700' },
    assumes: { color: p.muted, fontSize: 15, marginTop: 8 },
    step: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
    stepNum: { color: p.accent, fontSize: 16, fontWeight: '700', minWidth: 22 },
    stepText: { color: p.text, fontSize: 16, flex: 1 },
  });
}

export default function RecipeScreen({ recipe, checked, onToggle, onBack }: Props) {
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const matched = new Set(recipe.matched);
  const missing = new Set(recipe.missing);
  const staples = new Set(recipe.staples.map((i) => i.name));

  return (
    <SafeAreaView style={s.flex} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={s.back}>
            <PrimaryButton
              label="‹ Back to recipes"
              accessibilityLabel="Back to recipes"
              variant="secondary"
              onPress={onBack}
            />
          </View>
          <Text style={s.title} accessibilityRole="header">
            {recipe.title}
          </Text>
          <Text style={s.meta}>About {recipe.totalMinutes} min</Text>

          <Text style={s.h2} accessibilityRole="header">
            Ingredients
          </Text>
          {recipe.ingredients.map((ing) => {
            const isHave = matched.has(ing.name);
            const isNeed = missing.has(ing.name);
            const isPantry = !isHave && !isNeed && staples.has(ing.name);
            return (
              <View key={ing.name} style={s.ingRow}>
                <Text style={s.ingText}>
                  {ing.quantity ? `${ing.quantity} ` : ''}
                  {ing.name}
                </Text>
                {isHave ? <Text style={s.have}>have</Text> : null}
                {isNeed ? <Text style={s.need}>need</Text> : null}
                {isPantry ? <Text style={s.pantry}>pantry</Text> : null}
              </View>
            );
          })}
          {recipe.staples.length > 0 ? (
            <Text style={s.assumes}>
              Assumes you have: {recipe.staples.map((i) => i.name).join(', ')}
            </Text>
          ) : null}

          <ShoppingChecklist recipe={recipe} checked={checked} onToggle={onToggle} />

          <Text style={s.h2} accessibilityRole="header">
            Steps
          </Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={s.step}>
              <Text style={s.stepNum}>{i + 1}.</Text>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
