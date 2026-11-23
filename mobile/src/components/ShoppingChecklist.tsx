import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, serifFamily, useTheme } from '../theme';
import type { Palette } from '../theme';
import type { RecipeMatch } from '../types';

interface Props {
  recipe: RecipeMatch;
  checked: Record<string, boolean>;
  onToggle(name: string): void;
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    box: {
      backgroundColor: p.surface,
      borderColor: p.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 14,
      marginTop: 16,
    },
    heading: { fontFamily: serifFamily, fontSize: 20, fontWeight: '600', color: p.text, marginBottom: 6 },
    text: { color: p.text, fontSize: 16 },
    muted: { color: p.muted, fontSize: 15, marginTop: 8 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10 },
    glyph: { color: p.accent, fontSize: 24 },
    rowText: { color: p.text, fontSize: 16, flexShrink: 1 },
    rowDone: { textDecorationLine: 'line-through', color: p.muted },
  });
}

export default function ShoppingChecklist({ recipe, checked, onToggle }: Props) {
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const doneCount = recipe.missing.filter((n) => checked[n]).length;
  return (
    <View style={s.box}>
      <Text style={s.heading} accessibilityRole="header">
        Shopping list
      </Text>
      {recipe.missing.length === 0 ? (
        <Text style={s.text}>
          You have everything for {recipe.title}. No extra ingredients needed.
        </Text>
      ) : (
        <>
          {recipe.missing.map((name) => {
            const qty = recipe.ingredients.find((i) => i.name === name)?.quantity;
            const label = qty ? `${qty} ${name}` : name;
            const isChecked = checked[name] === true;
            return (
              <Pressable
                key={name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={label}
                onPress={() => onToggle(name)}
                style={s.row}
              >
                <Text style={s.glyph}>{isChecked ? '☑' : '☐'}</Text>
                <Text style={[s.rowText, isChecked && s.rowDone]}>{label}</Text>
              </Pressable>
            );
          })}
          <Text style={s.muted} accessibilityLiveRegion="polite">
            {doneCount} of {recipe.missing.length} picked up
          </Text>
        </>
      )}
    </View>
  );
}
