import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, serifFamily, useTheme } from '../theme';
import type { Palette } from '../theme';
import type { RecipeMatch } from '../types';

interface Props {
  recipe: RecipeMatch;
  onOpen(id: string): void;
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    card: {
      backgroundColor: p.surface,
      borderColor: p.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 12,
    },
    pressed: { opacity: 0.75 },
    title: { fontFamily: serifFamily, fontSize: 20, fontWeight: '600', color: p.text },
    meta: { color: p.muted, fontSize: 15, marginTop: 2 },
    line: { color: p.text, fontSize: 15, marginTop: 4 },
    view: { color: p.accent, fontSize: 16, fontWeight: '600', marginTop: 8 },
  });
}

export default function RecipeCard({ recipe, onOpen }: Props) {
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const total = recipe.matched.length + recipe.missing.length;
  const missing =
    recipe.missing.length > 0
      ? `missing ${recipe.missing.length}: ${recipe.missing.join(', ')}`
      : 'missing nothing';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}, about ${recipe.totalMinutes} minutes, you have ${recipe.matched.length} of ${total}, ${missing}`}
      accessibilityHint="Opens recipe details and shopping list"
      onPress={() => onOpen(recipe.id)}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
    >
      <Text style={s.title}>{recipe.title}</Text>
      <Text style={s.meta}>About {recipe.totalMinutes} min</Text>
      <Text style={s.line}>
        You have {recipe.matched.length} of {total}
      </Text>
      <Text style={s.line}>
        Missing: {recipe.missing.length > 0 ? recipe.missing.join(', ') : 'nothing'}
      </Text>
      <Text style={s.view} accessibilityElementsHidden importantForAccessibility="no">
        View recipe ›
      </Text>
    </Pressable>
  );
}
