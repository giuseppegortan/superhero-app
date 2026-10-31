// node check.mjs — scarica 48h da GDELT e verifica parser, sync incrementale e filtri
import assert from 'node:assert';
import { sync } from './sync.js';

const db = await sync({ at: 0, files: [], events: [] }, (d, t) => d % 48 === 0 && console.log(`${d}/${t}`));
console.log(db.files.length, 'file,', db.events.length, 'eventi');
assert(db.files.length > 150 && db.events.length > 500);
assert(db.events.every((e) => ['Arresto', 'Aggressione'].includes(e.type) && !isNaN(e.lat) && e.t > Date.now() - 49 * 3600e3));
const again = await sync(db); // incrementale: niente da riscaricare (a parte slot mancanti)
assert(again.events.length >= db.events.length - 5);
console.log('ok');
