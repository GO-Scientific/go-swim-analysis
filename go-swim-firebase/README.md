# go-swim-firebase

Use this folder to deploy the web app to Firebase Hosting.

## One-time setup (run once)

```powershell
npm install
npx firebase login
```

## Deploy (ready-to-run)

```powershell
npm run deploy
```

`go-swim-firebase` is intentionally isolated from the rest of this repository:
- `go-swim-firebase/firebase.json` for Hosting behavior
- `go-swim-firebase/.firebaserc` points to the `go-swim-analysis` Firebase project
- `go-swim-firebase/public/` contains only the app assets
- `go-swim-firebase/package.json` defines `deploy`/`serve` commands
