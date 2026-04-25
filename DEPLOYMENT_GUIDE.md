# PromptOS Full Deployment Guide

This guide details how to deploy the various phases of PromptOS from a single monorepo to Vercel, how to distribute the CLI and Extension without paying for stores, and how to handle hardcoded URLs dynamically.

## 1. Deploying a Monorepo to Vercel

Since all your phases are in a single GitHub repository, Vercel makes it easy to deploy specific directories as independent sites.

### Deploying the Dashboard (`phase-4-dashboard`)
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New... > Project**.
3. Import your PromptOS GitHub repository.
4. In the **Configure Project** step:
   - **Project Name:** `promptos-dashboard`
   - **Framework Preset:** Next.js (it should auto-detect).
   - **Root Directory:** Click "Edit" and select `phase-4-dashboard`.
5. Open the **Environment Variables** section and add the necessary variables from your `.env.local` or `.env` file (e.g., Supabase URLs, secret keys).
6. Click **Deploy**.

### Deploying the Backend (`phase-1-backend`)
If your backend is built with Node.js/Express, you can also deploy it to Vercel (using Vercel Serverless Functions) or another platform like Render/Railway. If it's a standard Vercel API deployment:
1. Repeat the same steps as above (Add New Project, Import Repo).
2. **Project Name:** `promptos-backend`
3. **Root Directory:** Select `phase-1-backend`.
4. **Framework Preset:** Other (or Node.js depending on your setup).
5. Add your backend environment variables (Supabase, API keys, etc.).
6. Click **Deploy**.

*Note: Once deployed, Vercel will give you a public URL (e.g., `https://promptos-backend.vercel.app`). You will need this URL for the CLI, Extension, and Dashboard to communicate with the backend.*

---

## 2. Handling Hardcoded URLs

To avoid hardcoded URLs like `http://localhost:3000` in your CLI and Extensions, you should use Environment Variables or Configuration files.

### For the Dashboard & Backend
In `phase-4-dashboard`, you use `.env.local` for development and set environment variables in Vercel for production.

```env
# .env.local
NEXT_PUBLIC_API_URL=https://prompt-os-dusky.vercel.app
```
In Vercel's dashboard, set `NEXT_PUBLIC_API_URL` to `https://promptos-backend.vercel.app`.

### For the CLI (`phase-2-cli`)
Since you distribute the CLI, you can't easily use `.env` files that the user won't have. Instead, you have a few options:

**Option A: Build-time Injection**
If you bundle the CLI using a tool like Webpack or esbuild, you can inject the production URL during the build process before publishing.

**Option B: Configurable Base URL (Recommended)**
Allow the user to set the API URL via a configuration command or environment variable when they run the CLI.

```javascript
// Inside your CLI code
const API_URL = process.env.PROMPTOS_API_URL || 'https://promptos-backend.vercel.app';
```

### For the Extension (`phase-5-extensions`)
Similar to the CLI, use a constants file or environment variables injected via a bundler (if you are using React/Vite for the extension). If using plain JavaScript, define a configuration file:

```javascript
// config.js
export const CONFIG = {
  API_URL: 'https://promptos-backend.vercel.app'
};
```
When running locally, you can change this to `localhost`, but before packaging for users, ensure it points to the production URL.

---

## 3. Distributing the CLI for Free

You don't need to pay to distribute a CLI. You can use **npm (Node Package Manager)**.

1. Ensure your `phase-2-cli/package.json` has:
   ```json
   {
     "name": "promptos-cli",
     "version": "1.0.0",
     "bin": {
       "promptos": "./index.js"
     }
   }
   ```
2. Create an account on [npmjs.com](https://www.npmjs.com/).
3. Log in via terminal: `npm login`.
4. Publish the package: `npm publish` (from the `phase-2-cli` directory).

**User Installation:**
Users can install it globally using:
```bash
npm install -g promptos-cli
```

Alternatively, users can just clone the repository and run `npm link` inside the `phase-2-cli` folder.

---

## 4. Distributing the Extensions for Free

### Chrome Extension
The Chrome Web Store charges a one-time $5 developer fee. If you don't want to pay that, you can distribute the extension directly via your GitHub repository or Dashboard.

**Packaging the Chrome Extension:**
1. Ensure the production backend URL is set in the extension code.
2. Zip the `phase-5-extensions/browser-extension` folder. Let's call it `promptos-chrome-ext.zip`.
3. Upload this `.zip` file to your GitHub repository's **Releases** page or host it directly on your Vercel dashboard as a static asset.

**User Installation (Developer Mode):**
Since it's not in the Web Store, users must install it manually:
1. Download the `promptos-chrome-ext.zip` file and extract it.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked**.
5. Select the extracted `browser-extension` folder.
The extension is now installed and ready to use!

### VS Code Extension
Publishing a VS Code Extension to the Visual Studio Marketplace is actually **completely free**. You just need a Microsoft account and to create a publisher profile on the [VS Marketplace](https://marketplace.visualstudio.com/manage). 

However, if you want to distribute it directly without the Marketplace:

**Packaging the VS Code Extension:**
1. Ensure you have the `vsce` tool installed globally: `npm install -g @vscode/vsce`
2. Navigate to your VS Code extension directory.
3. Run `vsce package` to bundle it into a `.vsix` file (e.g., `promptos-1.0.0.vsix`).
4. Distribute this `.vsix` file via your GitHub Releases or Dashboard.

**User Installation:**
1. Download the `promptos-1.0.0.vsix` file.
2. Open VS Code.
3. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
4. Click the `...` menu in the top right corner of the Extensions view.
5. Select **Install from VSIX...**
6. Choose the downloaded `.vsix` file.
The extension will install locally and be ready to use!
