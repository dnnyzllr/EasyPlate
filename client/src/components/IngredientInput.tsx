import type { ChangeEvent, KeyboardEvent, RefObject } from 'react'

interface Props {
  ingredients: string[]
  draft: string
  error: string | null
  inputRef: RefObject<HTMLInputElement | null>
  onDraftChange(value: string): void
  onAdd(raw: string): void
  onRemove(name: string): void
}

export default function IngredientInput({
  ingredients,
  draft,
  error,
  inputRef,
  onDraftChange,
  onAdd,
  onRemove,
}: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    const comma = value.lastIndexOf(',')
    if (comma >= 0) {
      onAdd(value.slice(0, comma + 1))
      onDraftChange(value.slice(comma + 1))
    } else {
      onDraftChange(value)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return
      if (draft.trim() !== '') {
        e.preventDefault()
        onAdd(draft)
        onDraftChange('')
      }
    } else if (e.key === 'Backspace' && draft === '' && ingredients.length > 0) {
      onRemove(ingredients[ingredients.length - 1])
    }
  }

  const describedBy = error ? 'ingredient-hint ingredient-error' : 'ingredient-hint'

  return (
    <div className="field">
      <label htmlFor="ingredient-input">Ingredients you have</label>
      <p id="ingredient-hint" className="hint">
        Type an ingredient and press Enter or comma
      </p>
      <input
        id="ingredient-input"
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        enterKeyHint="done"
        maxLength={80}
        value={draft}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {error && (
        <p id="ingredient-error" role="alert" className="error-text">
          {error}
        </p>
      )}
      {ingredients.length > 0 && (
        <ul className="chips" aria-label="Selected ingredients">
          {ingredients.map((name) => (
            <li key={name} className="chip">
              <span>{name}</span>
              <button
                type="button"
                className="chip-remove"
                aria-label={`Remove ${name}`}
                onClick={() => onRemove(name)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
