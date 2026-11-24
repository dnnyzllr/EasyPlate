# EasyPlate web client

See the [root README](../README.md) for the whole project, the API contract and the demo.

React + Vite + TypeScript front end for EasyPlate. Enter the ingredients you have,
get matching recipes, and tick off a shopping list for what is missing.

## Commands

- `npm ci` install dependencies
- `npm run dev` start the dev server at http://localhost:5173
- `npm run build` type-check and build to `dist/`
- `npm run lint` run ESLint
- `npm run preview` serve the production build

## API proxy

The client calls the relative URL `/api/recipes/match`. Vite proxies `/api` to
`http://localhost:5000` (for the dev server and `npm run preview`). To point at another
port, set `API_PROXY_TARGET`, for example `API_PROXY_TARGET=http://localhost:5001 npm run dev`.

The server must be running in a second terminal: `cd ../server && npm run dev`.
