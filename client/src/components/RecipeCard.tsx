import type { RecipeMatch } from '../api.ts'
import { stapleNames } from '../lib/recipes.ts'

interface Props {
  recipe: RecipeMatch
  selected: boolean
  onSelect(id: string): void
}

export default function RecipeCard({ recipe, selected, onSelect }: Props) {
  const staples = stapleNames(recipe)
  const matched = recipe.matched ?? []
  const missing = recipe.missing ?? []
  const ingredients = recipe.ingredients ?? []
  const steps = recipe.steps ?? []
  const titleId = `recipe-${recipe.id}-title`

  function mark(name: string): string {
    if (staples.includes(name)) return 'assumed'
    if (matched.includes(name)) return 'have'
    if (missing.includes(name)) return 'need'
    return ''
  }

  return (
    <article aria-labelledby={titleId} className={selected ? 'card selected' : 'card'}>
      <h3 id={titleId}>{recipe.title}</h3>
      <p className="meta">About {recipe.totalMinutes} min</p>
      <ul className="ingredients">
        {ingredients.map((ing) => {
          const m = mark(ing.name)
          return (
            <li key={ing.name}>
              {m && <span className={`mark mark-${m}`}>{m}</span>}{' '}
              {ing.quantity ? `${ing.quantity} ${ing.name}` : ing.name}
            </li>
          )
        })}
      </ul>
      <p>
        <strong>You have:</strong> {matched.join(', ') || 'nothing yet'}
      </p>
      <p>
        <strong>Missing:</strong>{' '}
        {missing.length > 0 ? missing.join(', ') : 'nothing'}
      </p>
      {staples.length > 0 && <p className="muted">Assumes you have: {staples.join(', ')}</p>}
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${selected ? 'Selected' : 'Show shopping list'}: ${recipe.title}`}
        onClick={() => onSelect(recipe.id)}
      >
        {selected ? 'Selected' : 'Show shopping list'}
      </button>
    </article>
  )
}
