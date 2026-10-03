// Makes two CC0 title packs as editable SVG plus transparent PNG (1920x1080): lower thirds and silent-film intertitles.
// SVG text stays editable in Illustrator, Affinity, Figma or Inkscape; the PNGs drop straight into any editor.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch } from '../../promo/cdp.mjs';
const OUT = decodeURIComponent(new URL('../../prototype/files/templates/', import.meta.url).pathname), TMP = '/private/tmp/claude-501/-Users-osmangulveren-Our-Originals/e281513c-bac1-4f06-bbf4-51c5910319be/scratchpad/titles/';
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${body}</svg>`;
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";
const lower = {
  'lower-third-bar': svg(`<rect x="96" y="820" width="8" height="120" fill="#f5a623"/><rect x="104" y="820" width="620" height="72" fill="#101216" fill-opacity=".86"/><text x="132" y="868" font-family="${SANS}" font-size="38" font-weight="700" fill="#fff">Name Surname</text><rect x="104" y="892" width="460" height="48" fill="#f5a623"/><text x="132" y="925" font-family="${SANS}" font-size="24" font-weight="600" fill="#101216">Director of Photography</text>`),
  'lower-third-glass': svg(`<rect x="96" y="830" width="640" height="118" rx="26" fill="#ffffff" fill-opacity=".18" stroke="#ffffff" stroke-opacity=".45"/><circle cx="150" cy="889" r="12" fill="#f5a623"/><text x="186" y="880" font-family="${SANS}" font-size="38" font-weight="700" fill="#fff">Name Surname</text><text x="186" y="922" font-family="${SANS}" font-size="24" fill="#fff" fill-opacity=".8">Role or place</text>`),
  'lower-third-serif': svg(`<line x1="96" y1="934" x2="720" y2="934" stroke="#fff" stroke-width="2"/><text x="96" y="908" font-family="${SERIF}" font-size="52" fill="#fff">Name Surname</text><text x="96" y="972" font-family="${SANS}" font-size="22" letter-spacing="5" fill="#fff" fill-opacity=".85">ROLE · PLACE · YEAR</text>`),
  'lower-third-minimal': svg(`<text x="1824" y="930" text-anchor="end" font-family="${SANS}" font-size="34" font-weight="600" fill="#fff">Name Surname</text><text x="1824" y="968" text-anchor="end" font-family="${SANS}" font-size="22" fill="#fff" fill-opacity=".75">Role</text><rect x="1834" y="900" width="4" height="74" fill="#f5a623"/>`),
  'location-tag': svg(`<rect x="96" y="96" width="420" height="64" rx="32" fill="#101216" fill-opacity=".72"/><circle cx="132" cy="128" r="8" fill="#f5a623"/><text x="156" y="138" font-family="${SANS}" font-size="28" font-weight="600" fill="#fff">Kyiv, April 2022</text>`),
  'chapter-title': svg(`<text x="960" y="520" text-anchor="middle" font-family="${SANS}" font-size="26" letter-spacing="10" fill="#f5a623">CHAPTER ONE</text><text x="960" y="600" text-anchor="middle" font-family="${SERIF}" font-size="84" fill="#fff">The title of the chapter</text>`),
};
const border = (k = 1) => `<rect x="80" y="80" width="1760" height="920" fill="none" stroke="#e8e0cc" stroke-width="${3 * k}"/><rect x="104" y="104" width="1712" height="872" fill="none" stroke="#e8e0cc" stroke-width="1.5"/>` +
  [[104, 104], [1816, 104], [104, 976], [1816, 976]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#e8e0cc"/>`).join('');
const inter = {
  'intertitle-classic': svg(`<rect width="1920" height="1080" fill="#0c0b0a"/>${border()}<text x="960" y="470" text-anchor="middle" font-family="${SERIF}" font-size="64" fill="#efe7d3">And so the night train</text><text x="960" y="560" text-anchor="middle" font-family="${SERIF}" font-size="64" fill="#efe7d3">left the station at last.</text><text x="960" y="700" text-anchor="middle" font-family="${SERIF}" font-size="30" font-style="italic" fill="#b9ae96">— your line here —</text>`),
  'intertitle-dialogue': svg(`<rect width="1920" height="1080" fill="#0c0b0a"/>${border()}<text x="960" y="520" text-anchor="middle" font-family="${SERIF}" font-size="78" fill="#efe7d3">“Not another step!”</text><path d="M760 600h400" stroke="#e8e0cc" stroke-width="2"/>`),
  'intertitle-chapter': svg(`<rect width="1920" height="1080" fill="#0c0b0a"/>${border()}<text x="960" y="430" text-anchor="middle" font-family="${SERIF}" font-size="34" letter-spacing="12" fill="#b9ae96">ACT II</text><text x="960" y="560" text-anchor="middle" font-family="${SERIF}" font-size="96" fill="#efe7d3">The Journey</text>`),
  'intertitle-the-end': svg(`<rect width="1920" height="1080" fill="#0c0b0a"/>${border()}<text x="960" y="590" text-anchor="middle" font-family="${SERIF}" font-size="150" font-style="italic" fill="#efe7d3">The End</text>`),
};
const page = await launch({ width: 1920, height: 1080 });
await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const [pack, set] of [['lower-thirds', lower], ['silent-film-intertitles', inter]]) {
  const dir = `${TMP}dein.art ${pack.replace(/-/g, ' ')}/`; mkdirSync(dir, { recursive: true }); mkdirSync(`${OUT}${pack}`, { recursive: true });
  for (const [name, s] of Object.entries(set)) {
    writeFileSync(`${dir}${name}.svg`, s);
    await page.goto('data:text/html,' + encodeURIComponent(`<html><head><meta charset="utf-8"></head><body style="margin:0;background:transparent">${s}</body></html>`));
    const png = await page.shot({ format: 'png' });
    writeFileSync(`${dir}${name}.png`, png);
    // a small preview on a dark checker so transparent parts read
    writeFileSync(`${OUT}${pack}/${name}.png`, png);
  }
  writeFileSync(`${dir}README.txt`, `dein.art ${pack.replace(/-/g, ' ')} — made by dein.art, released under CC0 (public domain).\nEach design comes as an editable SVG (change the text in Illustrator, Affinity, Figma or Inkscape) and a 1920x1080 PNG with a transparent background for Premiere Pro, DaVinci Resolve, Final Cut Pro, Edius, After Effects or any editor.\n`);
  execSync(`cd "${TMP}" && rm -f "${OUT}dein-art-${pack}.zip" && zip -q -r "${OUT}dein-art-${pack}.zip" "dein.art ${pack.replace(/-/g, ' ')}"`);
  console.log(pack, Object.keys(set).length, 'designs');
}
page.close();
