# EasyPlate mobile (Expo, iPhone)

Expo SDK 58 React Native app for EasyPlate. Enter the ingredients you have, find recipes, open one to see what you are missing, and tick items off a shopping list.

Status: not yet tested on a physical iPhone. Typecheck, `expo-doctor` and an iOS bundle export pass, and the API logic has been run against the real server.

## 1. Prerequisites

- Node 24 (tested with 24.14.1) on Windows.
- An iPhone with **Expo Go from the App Store, version 58.x** (SDK 58). Update Expo Go if it is older. The store version of Expo Go runs one SDK only.
- A free Expo account. Expo Go on iOS needs you signed in to the **same** account in the Expo CLI (`npx expo login`) and in the Expo Go app (avatar, top right). No paid plan is needed.

## 2. Start the backend (terminal 1)

```
cd server
npm ci
npm run dev
```

If `tsx watch` fails with an IPC permission error, use `npm run dev:node`. On the PC, `http://localhost:5000/` should show `EasyPlate API is running`.

## 3. Same network

- Connect the PC and the iPhone to the same Wi-Fi. No guest network or "client isolation", and turn VPNs off.
- Find the PC's IP with `ipconfig`: the Wi-Fi adapter's "IPv4 Address", for example `192.168.1.50`.

## 4. Windows Firewall

- Set the Wi-Fi network profile to **Private** (Settings > Network & internet > Wi-Fi > your network).
- When Windows asks, allow Node.js on private networks.
- If requests still fail, add inbound rules in an elevated PowerShell for TCP 5000 (API) and 8081 (Metro):

```
New-NetFirewallRule -DisplayName "EasyPlate dev" -Direction Inbound -Protocol TCP -LocalPort 5000,8081 -Action Allow -Profile Private
```

## 5. Health check from the phone first

In Safari on the iPhone, open `http://<LAN-IP>:5000/`. It must show `EasyPlate API is running`. If it does not, fix the network or firewall before debugging the app.

## 6. Configure the app

- `cd mobile`, then `copy .env.example .env` (cmd) or `cp .env.example .env` (Git Bash).
- Set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:5000`, with no trailing slash and no `/api`.
- `.env` is git-ignored.

## 7. Start Expo (terminal 2)

```
npm ci
npx expo login     # once
npx expo start
```

- Scan the QR code with the iPhone Camera app. It opens in Expo Go.
- When iOS asks to let Expo Go find devices on the **local network**, tap Allow. If you denied it earlier: Settings > Privacy & Security > Local Network > Expo Go.

## 8. After changing `.env`

Stop Metro (Ctrl+C) and run `npx expo start -c`. `EXPO_PUBLIC_*` values are inlined at bundle time, so a reload alone is not enough.

## 9. Caveats

- **localhost:** `localhost` on the phone means the phone itself, never the PC.
- **Tunnel:** `npx expo start --tunnel` only serves the app bundle to the phone. The Express API still needs its own address the phone can reach (the LAN IP, or a separately exposed URL). The tunnel does not proxy port 5000.
- **HTTP:** plain `http://` to a LAN IP works in Expo Go. A future standalone build would need an HTTPS URL or an App Transport Security exception.

## 10. Demo walkthrough

1. With an empty form, tap Find recipes. The inline error "Add at least one ingredient to search." appears and no request is sent.
2. Type `  Chicken ` and press return, then `RICE,`, then `rice,`, then `Broccoli` and return. That gives 3 chips. Backspace on the empty input removes the last chip.
3. Tap Find recipes. Loading appears, then 3 results, with Chicken, Broccoli and Rice Bowl first. Open it to see about 30 min, ingredients with have/need marks, and the steps. The shopping list shows exactly soy sauce and garlic. Checking one updates "1 of 2 picked up", and the check survives going Back and reopening the recipe.
4. Enter `eggs, bread, butter`, find, and open Scrambled Eggs on Toast. The "You have everything" message appears.
5. Enter `chocolate`. The no-match message appears, and "Edit ingredients" focuses the input.
6. Stop the server and tap Find recipes. The "Can't reach the EasyPlate server." error appears with the URL hint. Start the server and tap Retry, and results load.
7. Delete `.env` and restart with `npx expo start -c`. The "not set" banner appears.
8. With the keyboard open: chips, the remove buttons and Find recipes stay tappable. Dark mode is readable, and nothing sits under the notch or home indicator.

## 11. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| "not set" banner | `.env` missing, or Metro not restarted with `-c` |
| "Can't reach..." | Safari health check, firewall, same Wi-Fi, IP changed (DHCP) |
| Timeout | Wrong IP, or the PC is on a different network |
| QR won't open | Expo Go SDK mismatch, or not logged in |
| QR code or bundle URL has the wrong IP (common with Hyper-V, WSL or VPN adapters) | In PowerShell, set the LAN IP Metro should advertise, then start Expo: `$env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.50"; npx expo start` (use your own LAN IP from `ipconfig`) |

## 12. Commands

- `npm run typecheck` runs `tsc --noEmit`.
- `npm start`, `npm run ios`, `npm run android` start Expo. Only iOS through Expo Go is targeted.
