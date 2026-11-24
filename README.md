# EasyPlate

Enter the ingredients you have and EasyPlate suggests up to 3 recipes from a built-in catalog of 15. For each recipe it shows what you have, what is missing, and a shopping checklist for the missing items. There is a React web client and an Expo iPhone app, and both use one Express API. Optional photo suggestions use a deterministic demo detector for now.

## Repository layout

| Folder | What it is |
|---|---|
| `server/` | Express 5 + TypeScript API (port 5000). It holds the recipe catalog, ingredient normalization, ranking and the photo detect endpoint. `server/docs/` has the detect contract and `server/eval/` has the detection evaluator. |
| `client/` | React + Vite web client (port 5173, proxies `/api` to port 5000). See [client/README.md](client/README.md). |
| `mobile/` | Expo SDK 58 iPhone app, run in Expo Go. See [mobile/README.md](mobile/README.md). |

Each package has its own `package.json` and lockfile. There is no root `package.json` and no workspaces, so run `npm ci` in each package you use.

## Prerequisites

- Node.js 24 LTS (tested with 24.14.1) and npm 11 (tested with 11.11.0). Check with `node --version` and `npm --version`.
- Windows with Git Bash or PowerShell. macOS and Linux should work but were not tested.
- For the iPhone app: Expo Go 58.x from the App Store and a free Expo account. See [mobile/README.md](mobile/README.md).
- No API keys, paid services or database are needed.

## Quick start (web)

Use two terminals, both starting at the repo root.

Terminal 1, the server:

```
cd server
npm ci
npm run dev
```

Expect `Server running on http://localhost:5000`. If `tsx watch` fails with an IPC permission error (seen on Windows), use `npm run dev:node` instead. To use another port, set `PORT` (Git Bash: `PORT=5001 npm run dev`, PowerShell: `$env:PORT=5001; npm run dev`).

Health check: open `http://localhost:5000/` and expect `EasyPlate API is running`.

Terminal 2, the web client:

```
cd client
npm ci
npm run dev
```

Then open `http://localhost:5173`.

- Vite proxies `/api` to `http://localhost:5000`. Override this with `API_PROXY_TARGET` (Git Bash: `API_PROXY_TARGET=http://localhost:5001 npm run dev`, PowerShell: `$env:API_PROXY_TARGET="http://localhost:5001"; npm run dev`). It also applies to `npm run preview`.
- Production-style server: `npm run build`, then `npm start` (runs `dist/index.js`).

## iPhone app

The short version. Full steps, the Windows firewall rule and troubleshooting are in [mobile/README.md](mobile/README.md).

1. Run the server as above. Keep the phone and the PC on the same Wi-Fi.
2. In Safari on the phone, open `http://<LAN-IP>:5000/` first. It must show `EasyPlate API is running`.
3. `cd mobile`, then copy `.env.example` to `.env` (Git Bash: `cp .env.example .env`, PowerShell: `copy .env.example .env`) and set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:5000`. No trailing slash and no `/api`.
4. `npm ci`, then `npx expo start`, and scan the QR code with Expo Go.
5. After editing `.env`, restart Metro with `npx expo start -c`.

`localhost` on the phone is the phone, not the PC. An Expo tunnel does not expose port 5000.

## Scripts

Server (`server/`):

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with `tsx watch` (restarts on change). |
| `npm run dev:node` | Start the API with `node --import tsx` (no watcher; use if `dev` hits the IPC error). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run build` | Compile to `dist/`. |
| `npm start` | Run the compiled server, `node dist/index.js`. |
| `npm test` | Run the server tests with the Node test runner. |
| `npm run eval:detect` | Score a detector against labelled photos. See [Evaluating detection](#evaluating-detection). |
| `npm run eval:fixtures` | Regenerate the synthetic PNG fixtures in `server/eval/fixtures/`. |

Web client (`client/`):

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server on port 5173. |
| `npm run build` | Typecheck (`tsc -b`) and build with Vite. |
| `npm run lint` | Run ESLint. |
| `npm run preview` | Serve the built client (proxies `/api` too). |

Mobile (`mobile/`):

| Script | What it does |
|---|---|
| `npm start` | `expo start`. |
| `npm run ios` | `expo start --ios`. |
| `npm run android` | `expo start --android`. |
| `npm run typecheck` | `tsc --noEmit`. |

`ios` and `android` only start Expo with that platform flag. Only iOS through Expo Go is targeted.

## API

### GET /

Plain text `EasyPlate API is running`. This is the health check.

### POST /api/recipes/match

Request: `Content-Type: application/json`. The body is `{"ingredients": string[]}`, with at most 50 items and a body of at most 100 KB.

<!-- example: match-request -->
```json
{"ingredients":["chicken","rice","broccoli"]}
```

Git Bash:

```
curl -s -X POST http://localhost:5000/api/recipes/match -H 'Content-Type: application/json' -d '{"ingredients":["chicken","rice","broccoli"]}'
```

In Windows PowerShell 5, `curl` is an alias for `Invoke-WebRequest`. Use Git Bash, or `curl.exe`.

The response is `{"recipes": RecipeMatch[]}` with at most 3 items. The contract lives in `server/src/recipes/types.ts`.

| Field | Meaning |
|---|---|
| `id` | Stable recipe id. |
| `title` | Recipe title. |
| `totalMinutes` | Total time in minutes. |
| `ingredients` | The full ingredient list, `{name, quantity?}`, including staples. |
| `steps` | Cooking steps. |
| `matched` | Canonical names of the non-staple ingredients you have. |
| `missing` | Canonical names of the non-staple ingredients you need to get. This is the shopping list. |
| `staples` | The recipe's ingredients that count as on hand: `salt`, `black pepper`, `oil`, `water`. Unlike `matched` and `missing` (arrays of strings), these are `{name, quantity?}` objects. |

`staples` entries also appear in `ingredients`, but never in `matched` or `missing`. That is intended, not a bug. Clients must not show staples as needed.

Example response for the request above (real server output):

<!-- example: match-response -->
```json
{
  "recipes": [
    {
      "id": "chicken-broccoli-rice-bowl",
      "title": "Chicken, Broccoli and Rice Bowl",
      "totalMinutes": 30,
      "ingredients": [
        {
          "name": "chicken",
          "quantity": "300 g"
        },
        {
          "name": "rice",
          "quantity": "1 cup"
        },
        {
          "name": "broccoli",
          "quantity": "1 head"
        },
        {
          "name": "soy sauce",
          "quantity": "2 tbsp"
        },
        {
          "name": "garlic",
          "quantity": "2 cloves"
        }
      ],
      "steps": [
        "Cook the rice according to the package.",
        "Slice the chicken and sear it in a hot pan until cooked through.",
        "Add chopped broccoli and minced garlic and stir-fry for 4 minutes.",
        "Stir in the soy sauce and serve over the rice."
      ],
      "matched": [
        "chicken",
        "rice",
        "broccoli"
      ],
      "missing": [
        "soy sauce",
        "garlic"
      ],
      "staples": []
    },
    {
      "id": "chicken-rice-soup",
      "title": "Chicken and Rice Soup",
      "totalMinutes": 40,
      "ingredients": [
        {
          "name": "chicken",
          "quantity": "250 g"
        },
        {
          "name": "rice",
          "quantity": "1/2 cup"
        },
        {
          "name": "carrot",
          "quantity": "2"
        },
        {
          "name": "onion",
          "quantity": "1"
        },
        {
          "name": "water",
          "quantity": "6 cups"
        },
        {
          "name": "salt",
          "quantity": "1 tsp"
        },
        {
          "name": "black pepper",
          "quantity": "1/2 tsp"
        }
      ],
      "steps": [
        "Dice the onion and carrots and soften them in a pot.",
        "Add the chicken, rice and water and bring to a boil.",
        "Simmer for 25 minutes until the rice is tender.",
        "Shred the chicken, season with salt and pepper and serve."
      ],
      "matched": [
        "chicken",
        "rice"
      ],
      "missing": [
        "carrot",
        "onion"
      ],
      "staples": [
        {
          "name": "water",
          "quantity": "6 cups"
        },
        {
          "name": "salt",
          "quantity": "1 tsp"
        },
        {
          "name": "black pepper",
          "quantity": "1/2 tsp"
        }
      ]
    },
    {
      "id": "chicken-fried-rice",
      "title": "Chicken Fried Rice",
      "totalMinutes": 25,
      "ingredients": [
        {
          "name": "rice",
          "quantity": "2 cups cooked"
        },
        {
          "name": "chicken",
          "quantity": "200 g"
        },
        {
          "name": "egg",
          "quantity": "2"
        },
        {
          "name": "green onion",
          "quantity": "2 stalks"
        },
        {
          "name": "soy sauce",
          "quantity": "2 tbsp"
        }
      ],
      "steps": [
        "Dice the chicken and cook it in a hot pan.",
        "Push the chicken aside and scramble the eggs.",
        "Add the cooked rice and stir-fry for 3 minutes.",
        "Season with soy sauce and top with sliced green onion."
      ],
      "matched": [
        "rice",
        "chicken"
      ],
      "missing": [
        "egg",
        "green onion",
        "soy sauce"
      ],
      "staples": []
    }
  ]
}
```

If nothing matches, the answer is `200 {"recipes":[]}`, for example for `["chocolate"]`.

### Errors

Errors from the two endpoints documented here are JSON `{"error": string}`. Unknown paths get Express's default HTML 404 page.

| Status | When | Message |
|---|---|---|
| 400 | The body is not a JSON object | `Request body must be a JSON object like {"ingredients":["chicken"]}.` |
| 400 | `ingredients` is not an array | `"ingredients" must be an array of strings.` |
| 400 | More than 50 items | `"ingredients" may contain at most 50 items.` |
| 400 | An item is not a string | `"ingredients" must contain only strings (item N is <type>).` |
| 400 | Nothing left after trimming | `Add at least one ingredient.` |
| 400 | Malformed JSON | `Malformed JSON in request body.` |
| 413 | Body over 100 KB | `Request body is too large.` |
| 500 | Unexpected server error | `Internal server error.` |

The detect endpoint has its own errors, listed below.

### Ingredient normalization

- Each name is trimmed, lowercased and has its inner whitespace collapsed. It is then mapped through `INGREDIENT_ALIASES` in [server/src/recipes/normalize.ts](server/src/recipes/normalize.ts), which has the full list.
- Duplicates are dropped and empty strings are ignored.
- Matching uses canonical names, and `matched` and `missing` hold canonical names.
- Examples: `eggs` becomes `egg`, `chicken breast` becomes `chicken`, `scallions` becomes `green onion`, `spaghetti` becomes `pasta`, `olive oil` and `vegetable oil` become `oil`, `pepper` becomes `black pepper`.
- `pepper` means black pepper, which is a staple, so on its own it matches nothing. Bell pepper is not in the catalog. All oil variants map to the staple `oil`.
- The detect endpoint and the evaluator use the same normalization.

### Ranking

- Recipes with no matched non-staple ingredient are excluded.
- The rest are sorted by the share of required non-staple ingredients you have, highest first. Ties go to the recipe with more matched ingredients, then to the alphabetically first `id`.
- At most 3 are returned.

### POST /api/ingredients/detect (photo suggestions)

Suggests ingredient names for a photo. The full contract is in [server/docs/ingredient-detection.md](server/docs/ingredient-detection.md). Summary:

- Request: JSON `{"image": "<base64>", "mimeType": "image/jpeg"}`. `image` is the raw image bytes in base64 (no `data:` prefix). `mimeType` is optional and must match the real type if given.
- Formats: JPEG, PNG and WebP, detected from the file signature. HEIC is rejected, so convert to JPEG first.
- Limits: 5 MiB of decoded image. The JSON body is capped at 8 MB so the server can return a specific message.
- Response: `{"candidates": [{"name", "confidence"}], "detector": {"id", "version"}}`. Names are normalized as above, `confidence` is 0 to 1, and the list is sorted high to low and capped at 20. Clients treat confidence below 0.5 as "Not sure" and leave it unticked.
- Errors: 400 (bad or empty body, bad base64), 413 (too large), 415 (unsupported or mismatched type), 502 (detector failed).
- `DETECTOR` env var selects the detector. The default is `fixture`. An unknown value stops the server at startup.
- Photos are kept in memory for the request only. They are never stored or logged.
- The `fixture` detector ignores what is in the photo and returns stable sample suggestions, at least one below 0.5 ("Not sure"). No recognition service is called.

Git Bash, from `server/`:

```
printf '{"image":"%s"}' "$(base64 -w0 eval/fixtures/synthetic-red.png)" | curl -s -H 'Content-Type: application/json' --data-binary @- http://localhost:5000/api/ingredients/detect
```

Response (real server output, from `eval/fixtures/synthetic-red.png`):

<!-- example: detect-response -->
```json
{
  "candidates": [
    {
      "name": "butter",
      "confidence": 0.86
    },
    {
      "name": "carrot",
      "confidence": 0.86
    },
    {
      "name": "onion",
      "confidence": 0.83
    },
    {
      "name": "broccoli",
      "confidence": 0.8
    },
    {
      "name": "lettuce",
      "confidence": 0.33
    }
  ],
  "detector": {
    "id": "fixture",
    "version": "1.0.0"
  }
}
```

### Evaluating detection

```
cd server
npm run eval:detect -- --manifest eval/manifest.example.json
```

This runs a detector locally against labelled photos. It prints misses and false guesses per image and the precision and recall, and writes a JSON run record to `server/eval/runs/` (git-ignored). Your own photos go in `server/eval/photos/`, which is also git-ignored. Details: [server/eval/README.md](server/eval/README.md).

## Demo walkthrough

Steps 1 to 4 use the web client at `http://localhost:5173`. The same cases work on the iPhone, see "Demo walkthrough" in [mobile/README.md](mobile/README.md).

1. Add `chicken`, `rice` and `broccoli` and click Find recipes. You get 3 results, with "Chicken, Broccoli and Rice Bowl" (30 min) first. Click its "Show shopping list" button. The list is soy sauce and garlic. Tick one to see the checklist update.
2. Click Clear all, then enter `eggs`, `bread`, `butter`, click Find recipes and open the "Show shopping list" button of "Scrambled Eggs on Toast", which comes first. It shows "You have everything for Scrambled Eggs on Toast. No extra ingredients needed."
3. Click Clear all, then enter `chocolate` and click Find recipes. You get "No recipes use chocolate. Try adding or changing ingredients." (the API answers `200 {"recipes":[]}`).
4. Optional: stop the server and search to see the error. Start the server again and click Retry.
5. Photo demo, iPhone only (the web client has no photo UI): type an ingredient, tap Choose photo and pick any picture. The review screen shows the demo notice and sample suggestions, with a "Not sure" item unticked. Edit the list, tap "Add N to my list", then tap Find recipes. More in the "Photo suggestions (demo)" section of [mobile/README.md](mobile/README.md).
6. Server-only photo demo: run the detect `curl` above and compare with the example response.

## Keeping the clients aligned

- `server/src/recipes/types.ts` is the source of truth for the match contract. `client/src/api.ts` and `mobile/src/types.ts` hold hand-copied mirrors, marked "Keep in sync".
- The detect contract is `server/src/detect/contract.ts`, mirrored in `mobile/src/detectTypes.ts`.
- When a contract changes, update the server types, both mirrors, the example JSON in this README and `server/docs/ingredient-detection.md` in the same commit. Then run `npm run typecheck` and `npm test` in `server/`, `npm run typecheck` in `mobile/`, and `npm run build` and `npm run lint` in `client/`.
- Ranking and the catalog live only on the server. The clients never re-rank.

## Known limitations and not yet done

- No real image-recognition provider, only the fixture detector. Choosing one needs the owner's approval and a server-side key. No real photos have been sent anywhere.
- No accounts, favorites, database-backed pantry, paid services or deployment.
- The catalog is a hard-coded set of 15 recipes.
- Checklist state lasts for the current session only.
- The web client has no photo flow.
- The mobile splash screen is not configured (`mobile/assets/splash-icon.png` is unused).
- The iPhone app has not been tested on a physical iPhone. Typecheck, expo-doctor and an iOS export pass.
- Android and App Store builds are not set up. A standalone build would need HTTPS or an App Transport Security exception.
- `pepper` is treated as black pepper.
- Node is documented but not enforced (no `engines` field or `.nvmrc`). Adding one is a possible follow-up.
- Detection validates the image signature only. A file with a valid header but corrupt content is accepted.
