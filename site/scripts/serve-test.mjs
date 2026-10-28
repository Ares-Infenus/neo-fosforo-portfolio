// Servidor estático mínimo para probar dist/ sin tocar el servidor estable (Astro solo permite un preview por proyecto).
// Uso: node scripts/serve-test.mjs [puerto]   (por defecto 4323)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), 'dist');
const port = Number(process.argv[2] || 4323);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.webp': 'image/webp' };

createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    let file = join(root, p);
    if (!file.startsWith(root)) throw new Error('fuera de dist');
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('404');
  }
}).listen(port, () => console.log(`dist/ en http://localhost:${port}`));
