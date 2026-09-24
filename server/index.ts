// Production server: the API + the built site (dist/) on one port.
//   npm run build && npm start        → http://localhost:3000
// Env: PORT (default 3000), DB_PATH (default server/data/campusconnect.db)
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { openDb } from './db';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const port = Number(process.env.PORT || 3000);

const app = createApp(openDb());
if (!existsSync(join(DIST, 'index.html'))) {
  console.warn('dist/ not found. Run `npm run build` first (the API still works).');
}
app.use(express.static(DIST));
// Hash router: every page is served by index.html
app.get('/', (_req, res) => res.sendFile(join(DIST, 'index.html')));

app.listen(port, () => console.log(`CampusConnect running on http://localhost:${port}`));
