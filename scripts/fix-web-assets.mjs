// Vercel does not serve files under a `node_modules` path from build output, so any asset
// Expo exports to dist/assets/node_modules/... 404s in production (this is what blanked the
// icon fonts). Move them to dist/assets/vendor/... and rewrite every reference.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');
if (!fs.existsSync(from)) {
  console.log('fix-web-assets: nothing to move');
  process.exit(0);
}
fs.rmSync(to, { recursive: true, force: true });
fs.renameSync(from, to);

let files = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|html|css|json|map)$/.test(e.name)) {
      const src = fs.readFileSync(p, 'utf8');
      if (src.includes('/assets/node_modules/')) {
        fs.writeFileSync(p, src.split('/assets/node_modules/').join('/assets/vendor/'));
        files++;
      }
    }
  }
};
walk(dist);
console.log(`fix-web-assets: moved node_modules assets to assets/vendor, rewrote ${files} file(s)`);
