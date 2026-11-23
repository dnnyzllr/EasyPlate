import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, matchRecipes } from './api.ts'
import type { RecipeMatch } from './api.ts'
import { addEntries, removeEntry } from './lib/ingredients.ts'
import IngredientInput from './components/IngredientInput.tsx'
import RecipeCard from './components/RecipeCard.tsx'
import ShoppingList from './components/ShoppingList.tsx'

type Status = 'idle' | 'loading' | 'success' | 'error'

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export default function App() {
  const [ingredients, setIngredients] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [recipes, setRecipes] = useState<RecipeMatch[]>([])
  const [searchedWith, setSearchedWith] = useState<string[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, Record<string, boolean>>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)

  function handleAdd(raw: string) {
    const next = addEntries(ingredients, raw)
    setIngredients(next)
    if (next.length > ingredients.length) setFormError(null)
  }

  function handleRemove(name: string) {
    setIngredients(removeEntry(ingredients, name))
    inputRef.current?.focus()
  }

  function handleClear() {
    setIngredients([])
    setFormError(null)
    inputRef.current?.focus()
  }

  async function runSearch(list: string[]) {
    const id = ++requestId.current
    setStatus('loading')
    setSearchedWith(list)
    setError(null)
    setSelectedId(null)
    try {
      const result = await matchRecipes(list)
      if (id !== requestId.current) return
      setRecipes(result)
      setStatus('success')
      inputRef.current?.focus()
    } catch (err) {
      if (id !== requestId.current) return
      setError(
        err instanceof ApiError
          ? err
          : new ApiError('server', 'Something went wrong. Please try again.'),
      )
      setStatus('error')
      inputRef.current?.focus()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    const list = addEntries(ingredients, draft)
    setIngredients(list)
    setDraft('')
    if (list.length === 0) {
      setFormError('Add at least one ingredient to search.')
      inputRef.current?.focus()
      return
    }
    setFormError(null)
    void runSearch(list)
  }

  function handleRetry() {
    void runSearch(searchedWith)
  }

  function handleEdit() {
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ block: 'center' })
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    requestAnimationFrame(() => {
      document.getElementById('shopping-list')?.scrollIntoView({ block: 'start' })
    })
  }

  function handleToggle(name: string) {
    if (selectedId === null) return
    const id = selectedId
    setChecked((prev) => ({
      ...prev,
      [id]: { ...prev[id], [name]: !prev[id]?.[name] },
    }))
  }

  const selected = recipes.find((r) => r.id === selectedId)
  const loading = status === 'loading'
  const stale =
    (status === 'success' || status === 'error') && !sameList(ingredients, searchedWith)

  let statusText = ''
  if (loading) statusText = 'Finding recipes…'
  else if (stale) statusText = 'Your ingredients changed. Search again to update the results.'
  else if (status === 'success' && recipes.length > 0)
    statusText = `${recipes.length} ${recipes.length === 1 ? 'recipe matches' : 'recipes match'} ${searchedWith.join(', ')}`
  else if (status === 'success') statusText = `No recipes use ${searchedWith.join(', ')}.`

  return (
    <>
      <header>
        <h1>EasyPlate</h1>
        <p className="muted">Turn the ingredients you have into recipe ideas.</p>
      </header>
      <main>
        <form onSubmit={handleSubmit} aria-label="Find recipes">
          <IngredientInput
            ingredients={ingredients}
            draft={draft}
            error={formError}
            inputRef={inputRef}
            onDraftChange={setDraft}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Find recipes'}
            </button>
            {ingredients.length > 0 && (
              <button type="button" className="secondary" onClick={handleClear}>
                Clear all
              </button>
            )}
          </div>
        </form>

        <p aria-live="polite" className={statusText ? 'muted' : 'visually-hidden'}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading && ' '}
          {statusText}
        </p>

        <div className="results">
          {status === 'success' && recipes.length > 0 && (
            <>
              <h2>Recipes</h2>
              <div className="grid">
                {recipes.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    selected={r.id === selectedId}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </>
          )}
          {status === 'success' && recipes.length === 0 && (
            <div className="notice">
              <p>
                No recipes use {searchedWith.join(', ')}. Try adding or changing ingredients.
              </p>
              <button type="button" onClick={handleEdit}>
                Edit ingredients
              </button>
            </div>
          )}
          {status === 'error' && error && (
            <div role="alert" className="notice error">
              <p>{error.message}</p>
              {error.kind === 'rejected' && <p>Check your ingredients and try again.</p>}
              <button type="button" onClick={handleRetry} disabled={loading}>
                Retry
              </button>
            </div>
          )}
        </div>

        {selected && (
          <ShoppingList
            recipe={selected}
            checked={checked[selected.id] ?? {}}
            onToggle={handleToggle}
          />
        )}
      </main>
    </>
  )
}
