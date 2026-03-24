import * as esbuild from "esbuild";
import { mkdir, writeFile, readFile, copyFile, cp } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = join(ROOT, "dist");

async function build() {
  await mkdir(join(DIST, "assets"), { recursive: true });
  await mkdir(join(DIST, "css"), { recursive: true });
  await mkdir(join(DIST, "images"), { recursive: true });

  await esbuild.build({
    entryPoints: [join(ROOT, "js", "app.js")],
    bundle: true,
    minify: true,
    format: "esm",
    target: ["es2020"],
    outfile: join(DIST, "assets", "app.js"),
    sourcemap: false,
  });

  const css = await readFile(join(ROOT, "css", "style.css"), "utf-8");
  const cssMin = css
    .replace(/\s*\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
  await writeFile(join(DIST, "css", "style.css"), cssMin);

  const html = await readFile(join(ROOT, "index.html"), "utf-8");
  const htmlOut = html
    .replace('href="css/style.css"', 'href="css/style.css"')
    .replace('src="js/app.js"', 'src="assets/app.js"');
  await writeFile(join(DIST, "index.html"), htmlOut);

  await copyFile(join(ROOT, "config.json"), join(DIST, "config.json"));
  // Copy entire images tree: manifest.json + images/photos/* (your files)
  await cp(join(ROOT, "images"), join(DIST, "images"), { recursive: true });

  console.log("Build done: dist/");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
