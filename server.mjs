// Server statico per l'installazione sul tablet (i dati li scarica la pagina da GDELT).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const PUBLIC = /^\/(index\.html|sync\.js|sw\.js|manifest\.webmanifest|(vendor|icons)\/[\w.-]+)$/;

http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const file = path === '/' ? '/index.html' : path;
  try {
    if (!PUBLIC.test(file)) throw 0;
    res.writeHead(200, { 'content-type': TYPES[extname(file)] });
    res.end(await readFile(join(ROOT, file)));
  } catch { res.writeHead(404).end(); }
}).listen(process.env.PORT || 8080, () => console.log('http://localhost:8080'));
