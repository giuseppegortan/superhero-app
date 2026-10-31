// Scarica gli eventi GDELT (file raw da 15 min, CORS aperto) e tiene le ultime 48h.
// db = { at, files: [timestamp già scaricati], events: [{lat,lng,type,place,n,t,u}] }
export const STEP = 15 * 60e3;
const WINDOW = 48 * 3600e3;
// CAMEO: 173 arresto, 182 aggressione (esclusi 1821 sessuale, 1822 tortura, 1823 omicidio). 180 escluso: quasi solo guerra.
const LABEL = { 173: 'Arresto', 182: 'Aggressione' };
const SKIP = new Set(['1821', '1822', '1823']);

const stamp = (t) => new Date(t).toISOString().replace(/\D/g, '').slice(0, 14);
const parseStamp = (s) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12));

// null = file non pubblicato (GDELT salta qualche slot); lancia se manca la rete
async function loadFile(ts) {
  const r = await fetch(`https://data.gdeltproject.org/gdeltv2/${ts}.export.CSV.zip`);
  if (!r.ok) return null;
  const buf = await r.arrayBuffer();
  const dv = new DataView(buf);
  const start = 30 + dv.getUint16(26, true) + dv.getUint16(28, true); // zip con un solo file
  const raw = buf.slice(start, start + dv.getUint32(18, true)); // solo lo stream deflate, senza directory finale
  const text = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  const out = [];
  for (const row of text.split('\n')) {
    const c = row.split('\t');
    if (c.length < 58) continue;
    const lat = parseFloat(c[56]), lng = parseFloat(c[57]);
    if (!LABEL[c[27]] || SKIP.has(c[26]) || isNaN(lat) || isNaN(lng)) continue;
    out.push({ lat, lng, type: LABEL[c[27]], place: c[52], n: +c[31], t: parseStamp(c[59]), u: c[60] });
  }
  return out;
}

export async function sync(db, progress = () => {}) {
  const now = Date.now(), last = Math.floor(now / STEP) * STEP;
  const have = new Set(db.files);
  const todo = [];
  for (let t = last; t > now - WINDOW; t -= STEP) if (!have.has(stamp(t))) todo.push(stamp(t));

  const files = db.files.filter((s) => parseStamp(s) > now - WINDOW);
  let events = db.events.filter((e) => e.t > now - WINDOW), ok = 0, failed = 0, done = 0;
  for (let i = 0; i < todo.length; i += 8) { // 8 download in parallelo
    await Promise.all(todo.slice(i, i + 8).map((ts) => loadFile(ts).then((ev) => {
      if (ev) { files.push(ts); events = events.concat(ev); ok++; }
    }, () => failed++).then(() => progress(++done, todo.length))));
  }
  if (todo.length && !ok && failed) throw new Error('offline');

  const seen = new Set(); // stessa notizia nello stesso posto
  events = events.sort((a, b) => b.t - a.t).filter((e) => !seen.has(e.u + e.place) && seen.add(e.u + e.place));
  return { at: now, files, events };
}
