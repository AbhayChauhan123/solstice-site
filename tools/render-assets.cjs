/* Renders the site's icons and social image with Playwright's Chromium.
   Run from the site root:  NODE_PATH=<folder with playwright> node tools/render-assets.cjs [--og]
   Writes: assets/favicon.svg, assets/favicon.ico, assets/apple-touch-icon.png, and with --og assets/og-image.png */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const assets = path.join(root, "assets");
const geist = "file://" + path.join(assets, "fonts", "geist-latin.woff2");

const INK = "#0A0F1C";
const BLUE = "#2563EB";

/* Icon colors: Old Glory Red, white and Old Glory Blue, outlined in the site's ink, on a white tile. */
const ICON_TILE = "#FFFFFF";
const ICON_OUTLINE = INK;
/* Visible outline in screen pixels, kept faint: about 0.3 px at 16, 0.4 px at 32, 1 px at 180. */
const iconOutlinePx = (size) => 0.25 + size * 0.004;
const ICON_BANDS = ["#B31942", "#FFFFFF", "#0A3161"];

/* Geist Bold "S" outline (font units, y up), so the favicon needs no font. */
const S_PATH = "M355 -16Q263 -16 197.0 15.0Q131 46 94.0 102.0Q57 158 52 234L205 241Q211 199 229.5 169.5Q248 140 279.5 125.0Q311 110 357 110Q395 110 421.5 119.0Q448 128 462.0 146.5Q476 165 476 192Q476 217 464.0 235.5Q452 254 418.0 269.5Q384 285 318 300Q227 321 171.5 347.0Q116 373 91.0 412.5Q66 452 66 512Q66 576 97.5 624.0Q129 672 189.0 699.0Q249 726 332 726Q420 726 481.0 695.0Q542 664 576.5 610.0Q611 556 618 486L466 478Q463 515 446.0 542.5Q429 570 400.0 585.0Q371 600 330 600Q278 600 248.5 577.0Q219 554 219 517Q219 491 232.5 473.5Q246 456 277.5 443.0Q309 430 367 418Q466 398 523.5 367.5Q581 337 605.0 295.0Q629 253 629 199Q629 133 595.5 84.5Q562 36 500.5 10.0Q439 -16 355 -16Z";

/* size: canvas in px; radius: corner radius in px; glyph: glyph height as a share of the canvas.
   The S is split into three even horizontal bands: red, white, blue (top to bottom), drawn over
   an outlined copy of the letter so the white band stays visible.
   Each band clips a group, so the clip rectangles use canvas coordinates, not the glyph's. */
const iconSvg = (size, radius, glyph) => {
  const s = (size * glyph) / 742;
  const h = size * glyph;
  const top = size / 2 - h / 2;
  const cut = [0, top + h / 3, top + (2 * h) / 3, size];
  /* The stroke is centred on the edge, so it is twice the visible width, converted to font units. */
  const outlineUnits = ((2 * iconOutlinePx(size)) / s).toFixed(1);
  const glyphPath = `transform="translate(${size / 2} ${size / 2}) scale(${s.toFixed(5)} ${(-s).toFixed(5)}) translate(-340.5 -355)" d="${S_PATH}"`;
  const clips = ICON_BANDS.map((_, i) =>
    `<clipPath id="band-${i}"><rect y="${cut[i].toFixed(3)}" width="${size}" height="${(cut[i + 1] - cut[i]).toFixed(3)}"/></clipPath>`).join("");
  const bands = ICON_BANDS.map((color, i) =>
    `<g clip-path="url(#band-${i})"><path fill="${color}" ${glyphPath}/></g>`).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <title>Solstice Group</title>
  <defs>${clips}</defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="${ICON_TILE}"/>
  <path fill="${ICON_OUTLINE}" stroke="${ICON_OUTLINE}" stroke-width="${outlineUnits}" stroke-linejoin="round" ${glyphPath}/>
  ${bands}
</svg>
`;
};

const ogHtml = `<!doctype html><html><head><style>
  @font-face { font-family: "Geist"; src: url("${geist}") format("woff2"); font-weight: 100 900; }
  html, body { margin: 0; }
  body { width: 1200px; height: 630px; background: #FFFFFF; color: ${INK}; font-family: "Geist"; position: relative; }
  .name { position: absolute; left: 80px; top: 72px; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  .head { position: absolute; left: 80px; top: 196px; display: flex; gap: 36px; }
  .rule { width: 4px; background: ${BLUE}; }
  h1 { margin: 0; font-size: 80px; font-weight: 700; line-height: 1; letter-spacing: -0.03em; max-width: 900px; }
  .url { position: absolute; left: 80px; bottom: 64px; font-size: 16px; font-weight: 500; color: #4B5563; }
</style></head><body>
  <div class="name">Solstice Group</div>
  <div class="head"><div class="rule"></div><h1>We build software and distribute products.</h1></div>
  <div class="url">solsticegroupusa.com</div>
</body></html>`;

/* ICO container holding PNG images (supported by every current browser). */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0);
    e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

async function shoot(browser, html, width, height, file, transparent) {
  const tmp = path.join(assets, ".render-tmp.html");
  fs.writeFileSync(tmp, html);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto("file://" + tmp);
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: "png", omitBackground: Boolean(transparent), path: file || undefined });
  await page.close();
  fs.unlinkSync(tmp);
  return buf;
}

const wrap = (svg, size) => `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${svg}</body></html>`;

(async () => {
  fs.writeFileSync(path.join(assets, "favicon.svg"), iconSvg(32, 6, 0.56));
  const browser = await chromium.launch();
  /* The social image only changes with the copy; pass --og to re-render it. */
  if (process.argv.includes("--og")) await shoot(browser, ogHtml, 1200, 630, path.join(assets, "og-image.png"));
  await shoot(browser, wrap(iconSvg(180, 0, 0.5), 180), 180, 180, path.join(assets, "apple-touch-icon.png"));
  const icoPngs = [];
  for (const size of [16, 32, 48]) {
    icoPngs.push({ size, data: await shoot(browser, wrap(iconSvg(size, size * 0.1875, 0.56), size), size, size, null, true) });
  }
  fs.writeFileSync(path.join(assets, "favicon.ico"), buildIco(icoPngs));
  await browser.close();
  console.log("Wrote favicon.svg, favicon.ico, apple-touch-icon.png" + (process.argv.includes("--og") ? ", og-image.png" : ""));
})();
