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
  "olive oil": "oil",
  "vegetable oil": "oil",
  "extra virgin olive oil": "oil",
  "cooking oil": "oil",
  onions: "onion",
  "yellow onion": "onion",
  "yellow onions": "onion",
  "red onion": "onion",
  "red onions": "onion",
  "white onion": "onion",
  "white onions": "onion",
  potatoes: "potato",
  carrots: "carrot",
  tortillas: "tortilla",
  "flour tortilla": "tortilla",
  "flour tortillas": "tortilla",
  cucumbers: "cucumber",
  "cherry tomato": "tomato",
  "cherry tomatoes": "tomato",
  "roma tomato": "tomato",
  "roma tomatoes": "tomato",
  "ground beef": "beef",
  "minced beef": "beef",
  "beef mince": "beef",
  "chicken thigh": "chicken",
  "chicken legs": "chicken",
  "chicken leg": "chicken",
  "garlic clove": "garlic",
  "cloves of garlic": "garlic",
  "soya sauce": "soy sauce",
  "romaine lettuce": "lettuce",
  "basil leaves": "basil",
  "fresh basil": "basil",
  "broccoli florets": "broccoli",
  "bread slices": "bread",
  "slices of bread": "bread",
  "black peppers": "black pepper",
  "ground pepper": "black pepper",
  "ground black pepper": "black pepper",
  "sea salt": "salt",
  "table salt": "salt",
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
export const STAPLES: ReadonlySet<string> = new Set(["salt", "black pepper", "oil", "water"]);

export function isStaple(name: string): boolean {
  return STAPLES.has(name);
}
