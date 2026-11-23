import { useMemo } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { radius, useTheme } from '../theme';
import type { Palette } from '../theme';

interface Props {
  ingredients: string[];
  draft: string;
  error: string | null;
  disabled: boolean;
  inputRef: RefObject<ComponentRef<typeof TextInput> | null>;
  onDraftChange(v: string): void;
  onAdd(raw: string): void;
  onRemove(name: string): void;
  onSubmitEmpty(): void;
}

const LABEL_ID = 'ingredient-input-label';

function makeStyles(p: Palette) {
  return StyleSheet.create({
    label: { color: p.text, fontWeight: '600', fontSize: 16, marginBottom: 2 },
    hint: { color: p.muted, fontSize: 14, marginBottom: 6 },
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
    inputError: { borderColor: p.danger },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '100%',
      backgroundColor: p.accentSoft,
      borderRadius: radius.pill,
      paddingLeft: 12,
      paddingVertical: 2,
    },
    chipText: { color: p.text, fontSize: 16, flexShrink: 1 },
    remove: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
    removeText: { color: p.text, fontSize: 20, lineHeight: 22 },
    error: { color: p.danger, fontSize: 14, marginTop: 6 },
  });
}

export default function IngredientInput({
  ingredients,
  draft,
  error,
  disabled,
  inputRef,
  onDraftChange,
  onAdd,
  onRemove,
  onSubmitEmpty,
}: Props) {
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);

  function handleChange(value: string) {
    const idx = value.lastIndexOf(',');
    if (idx >= 0) {
      onAdd(value.slice(0, idx));
      onDraftChange(value.slice(idx + 1));
    } else {
      onDraftChange(value);
    }
  }

  function handleSubmit() {
    if (draft.trim() !== '') {
      onAdd(draft);
      onDraftChange('');
    } else {
      onSubmitEmpty();
    }
  }

  return (
    <View>
      <Text nativeID={LABEL_ID} style={s.label}>
        Ingredients you have
      </Text>
      <Text style={s.hint}>Type an ingredient and press return or comma</Text>
      <TextInput
        ref={inputRef}
        value={draft}
        editable={!disabled}
        onChangeText={handleChange}
        onSubmitEditing={handleSubmit}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Backspace' && draft === '' && ingredients.length > 0) {
            onRemove(ingredients[ingredients.length - 1]);
          }
        }}
        accessibilityLabel="Ingredients you have"
        accessibilityLabelledBy={LABEL_ID}
        placeholder="e.g. chicken"
        placeholderTextColor={palette.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="done"
        submitBehavior="submit"
        maxLength={80}
        style={[s.input, error ? s.inputError : null]}
      />
      {/* Task 012: "Add from photo" button goes here (opens photoReview view). */}
      {error ? (
        <Text style={s.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {ingredients.length > 0 ? (
        <View style={s.chips}>
          {ingredients.map((name) => (
            <View key={name} style={s.chip}>
              <Text style={s.chipText}>{name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name}`}
                hitSlop={8}
                onPress={() => onRemove(name)}
                style={s.remove}
              >
                <Text style={s.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
