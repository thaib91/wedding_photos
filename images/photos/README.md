# Your wedding photos

Put image files here (JPG, PNG, WebP, or GIF). They are copied into the site at build time and deployed with Vercel.

## Add photos

1. Copy files into this folder, e.g. `ceremony-01.jpg`, `reception-02.png`.
2. Edit **`images/manifest.json`** (at the repo root, next to this folder) and add or replace entries:

```json
{
  "src": "images/photos/ceremony-01.jpg",
  "caption": "Short caption shown under the photo when it’s in focus."
}
```

- **`src`** must start with `images/photos/` and match the filename you added.
- **`caption`** is optional (empty string is fine).

3. Commit and push to GitHub. Vercel will rebuild automatically.

## Order

Photos appear in the order listed in `manifest.json`. Set `"shuffleOrder": true` in `config.json` to randomize on each page load.

## Demo vs your photos

The default `manifest.json` uses placeholder URLs so the gallery works before you add files. Replace those entries with `images/photos/...` paths when your images are ready.
