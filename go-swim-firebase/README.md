# go-swim-firebase

Use this folder to deploy the web app to Firebase Hosting.

## One-time setup (run once)

```powershell
cd go-swim-firebase
npm install
npx firebase login
```

> Note: `firebase-config.js` is required for Firebase deployment.
> Create `public/firebase-config.js` from your Firebase app SDK config before deployment.

## Build/publish flow

```powershell
cd go-swim-firebase
npm install
npx firebase login
npm run deploy
```

For local verification:

```powershell
cd go-swim-firebase
npm run serve
```

`go-swim-firebase` is intentionally isolated from the rest of this repository:
- `go-swim-firebase/firebase.json` for Hosting behavior
- `go-swim-firebase/.firebaserc` points to the `go-swim-analysis` Firebase project
- `go-swim-firebase/public/` contains only the app assets
- `go-swim-firebase/package.json` defines `deploy`/`serve` commands
