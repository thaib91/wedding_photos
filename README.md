# Wedding photo gallery

A full-screen D3.js Polaroid-style gallery with auto zoom, floral backdrop, and play/pause.

## Local development

```bash
npm install
npm run build
npm run preview   # serves ./dist
```

## Add or change photos (static files)

1. Drop image files into **`images/photos/`**.
2. Edit **`images/manifest.json`** — each item needs `"src": "images/photos/your-filename.jpg"` and an optional `"caption"`.
3. Run `npm run build` locally to verify, then commit and push.

See **`images/photos/README.md`** for more detail.

## Deploy with GitHub + Vercel

1. Create a new repository on GitHub (empty, no README required).

2. From this project folder:

   ```bash
   git init
   git add .
   git commit -m "Wedding photo gallery"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. In [vercel.com](https://vercel.com) → **Add New…** → **Project** → **Import** your GitHub repo.

4. Use the defaults: **Build Command** `npm run build`, **Output Directory** `dist` (also set in `vercel.json`).

5. After each push (including new files under `images/photos/`), Vercel rebuilds and deploys.

## Configuration

- **`config.json`** — timing, zoom limits, shuffle, default image size hints.
- **`images/manifest.json`** — list of photos and captions.

## Requirements

- Node.js 18+
