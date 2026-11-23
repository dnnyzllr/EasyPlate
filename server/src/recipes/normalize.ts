export const INGREDIENT_ALIASES: Readonly<Record<string, string>> = {
  eggs: "egg",
  tomatoes: "tomato",
  "chicken breast": "chicken",
  "chicken breasts": "chicken",
  "chicken thighs": "chicken",
  scallion: "green onion",
  scallions: "green onion",
  "spring onion": "green onion",
  "spring onions": "green onion",
  "green onions": "green onion",
  spaghetti: "pasta",
  penne: "pasta",
  "white rice": "rice",
  "brown rice": "rice",
  soy: "soy sauce",
  cheddar: "cheese",
  "garlic cloves": "garlic",
  toast: "bread",
  pepper: "black pepper",
  oil: "olive oil",
  "vegetable oil": "olive oil",
};

export function normalizeIngredient(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return Object.hasOwn(INGREDIENT_ALIASES, cleaned)
    ? (INGREDIENT_ALIASES[cleaned] as string)
    : cleaned;
}

export function normalizeIngredients(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const item of raw) {
    const name = normalizeIngredient(item);
    if (name !== "") seen.add(name);
  }
  return [...seen];
}

/** Canonical names assumed to be on hand in every kitchen. */
export const STAPLES: ReadonlySet<string> = new Set(["salt", "black pepper", "olive oil", "water"]);

export function isStaple(name: string): boolean {
  return STAPLES.has(name);
}
