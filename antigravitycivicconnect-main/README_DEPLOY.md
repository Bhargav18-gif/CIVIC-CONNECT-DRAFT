Deployment guide — CivicConnect (Firebase Hosting + Functions)

Overview
- Frontend: built with Vite and deployed to Firebase Hosting
- Backend: Express app converted to a Firebase Function `api` and deployed to Cloud Functions

Prerequisites (local)
- Node.js (18 recommended for functions)
- npm
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project created in Firebase Console

Setup steps
1. Login to Firebase and select project
   - `firebase login`
   - `firebase use --add` (choose your project id)

2. Ensure `.firebaserc` is set (replace `your-project-id`)
   - Edit `.firebaserc` or run `firebase use --add`

3. Add your Firebase web app config to `.env` in project root using `.env.example`.

4. (Optional) Test functions locally
   - `npm run emulate`
   - Or run the dev servers concurrently: `npm run dev:all`

5. Deploy
   - `firebase deploy --only hosting,functions`
   - Or run `npm run deploy` (requires firebase-tools in PATH)

Notes
- Hosting rewrites route `/api/**` to the deployed function `api` (see `firebase.json`).
- If you change functions, redeploy with `firebase deploy --only functions`.
- For local emulation of both hosting and functions, use `firebase emulators:start --only functions,hosting`.

If you'd like, I can run the emulator commands here, but you'll need to run `firebase login` locally to authorize deployments.
