import type { RecipeMatch } from '../api.ts'
import { stapleNames } from '../lib/recipes.ts'

interface Props {
  recipe: RecipeMatch
  checked: Record<string, boolean>
  onToggle(name: string): void
}

export default function ShoppingList({ recipe, checked, onToggle }: Props) {
  const staples = stapleNames(recipe)
  const toBuy = (recipe.missing ?? []).filter((n) => !staples.includes(n))
  const done = toBuy.filter((n) => checked[n]).length

  return (
    <section id="shopping-list" aria-labelledby="shopping-title" className="shopping">
      <h2 id="shopping-title">Shopping list for {recipe.title}</h2>
      {toBuy.length === 0 ? (
        <p>You have everything for {recipe.title}. No extra ingredients needed.</p>
      ) : (
        <>
          <ul className="checklist">
            {toBuy.map((name) => {
              const quantity = (recipe.ingredients ?? []).find((i) => i.name === name)?.quantity
              return (
                <li key={name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!checked[name]}
                      onChange={() => onToggle(name)}
                    />
                    <span>{quantity ? `${quantity} ${name}` : name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="muted">
            {done} of {toBuy.length} picked up
          </p>
        </>
      )}
    </section>
  )
}
