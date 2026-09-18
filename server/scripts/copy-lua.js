/**
 * tsc does not copy .lua files, so mirror src/redis/lua -> dist/redis/lua
 * after every build. Keeps the runtime script loader path-identical in dev
 * (tsx, reading from src) and production (node, reading from dist).
 */
const fs = require('node:fs');
const path = require('node:path');

const from = path.join(__dirname, '..', 'src', 'redis', 'lua');
const to = path.join(__dirname, '..', 'dist', 'redis', 'lua');

fs.mkdirSync(to, { recursive: true });
for (const file of fs.readdirSync(from)) {
  if (file.endsWith('.lua')) fs.copyFileSync(path.join(from, file), path.join(to, file));
}
console.log(`[build] copied Lua scripts -> ${to}`);
