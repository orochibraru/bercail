// Renders docs/images/feature.webp, the README hero and the project image on orochibraru.com:
// the dark dashboard screenshot framed in a browser window next to a tagline.
import { join } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { file, Image, write } from "bun";

const root = join(import.meta.dir, "..");
const dashboard = `data:image/webp;base64,${Buffer.from(await file(join(root, "docs/images/dashboard-dark.webp")).bytes()).toString("base64")}`;
const logo = await file(join(root, "static/favicon.svg")).text();

// The dark theme's ground, card and text, and the aurora's two Bordeaux glows.
const GROUND = "oklch(0.155 0.018 288)";
const CARD = "oklch(0.245 0.022 288)";
const INK = "oklch(0.97 0.005 285)";
const MUTED = "oklch(0.72 0.03 287)";
const GLOW = "oklch(0.56 0.17 350 / 45%)";
const EMBER = "oklch(0.68 0.12 40 / 30%)";

const page = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1024px; height: 500px; overflow: hidden; }
  body {
    position: relative;
    background:
      radial-gradient(620px 420px at 96% 0%, ${GLOW}, transparent 70%),
      radial-gradient(520px 380px at 4% 108%, ${EMBER}, transparent 70%),
      ${GROUND};
    color: ${INK};
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .mark { position: absolute; left: 600px; top: -160px; width: 480px; opacity: 0.3; filter: blur(40px); }
  .words { position: absolute; left: 64px; top: 0; width: 400px; height: 500px; display: flex; flex-direction: column; justify-content: center; }
  .brand { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 600; letter-spacing: -0.2px; }
  .brand svg { width: 32px; }
  h1 { margin-top: 28px; font-size: 50px; line-height: 1.04; font-weight: 650; letter-spacing: -1.6px; text-wrap: balance; }
  p { margin-top: 18px; max-width: 340px; font-size: 18px; line-height: 1.45; color: ${MUTED}; text-wrap: pretty; }
  .window { position: absolute; left: 470px; top: 80px; width: 760px; overflow: hidden; border-radius: 14px; background: ${GROUND}; box-shadow: 0 30px 80px -20px #000c, 0 0 0 1px #ffffff1f; }
  .window > img { display: block; width: 100%; }
  .bar { display: flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px; background: ${CARD}; border-bottom: 1px solid #ffffff14; }
  .bar i { width: 10px; height: 10px; border-radius: 50%; background: #ffffff2e; }
  .bar span { margin-left: 14px; padding: 4px 14px; border-radius: 8px; background: #ffffff12; color: ${MUTED}; font-size: 11px; }
</style></head><body>
  <div class="mark">${logo}</div>
  <div class="window">
    <div class="bar"><i></i><i></i><i></i><span>dash.example.com</span></div>
    <img src="${dashboard}" alt="">
  </div>
  <div class="words">
    <div class="brand">${logo}Bercail</div>
    <h1>Your homelab, on every new tab.</h1>
    <p>Your links with a live up/down dot, the weather and your server's vitals on top.</p>
  </div>
</body></html>`;

const browser = await chromium.launch();
// Twice the layout's size: the README shows it wide.
const context = await browser.newContext({
	viewport: { width: 1024, height: 500 },
	deviceScaleFactor: 2,
});
const tab = await context.newPage();
await tab.setContent(page, { waitUntil: "load" });
await write(
	join(root, "docs/images/feature.webp"),
	await new Image(await tab.screenshot()).webp({ quality: 92 }).bytes(),
);
await browser.close();
process.stdout.write("docs/images/feature.webp\n");
