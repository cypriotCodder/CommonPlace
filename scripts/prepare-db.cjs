const { mkdirSync, closeSync, openSync, chmodSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
// The checked-in .env uses the default URL; explicit overrides must also be local SQLite.
const url = process.env.DATABASE_URL ||= 'file:../data/commonplace.db';
if (!url.startsWith('file:')) throw new Error('Commonplace requires a local SQLite database.');
const databasePath = path.resolve('prisma', decodeURIComponent(url.slice(5).split('?')[0]));
mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
// Append mode creates the database only when absent and never truncates it.
closeSync(openSync(databasePath, 'a', 0o600));
chmodSync(databasePath, 0o600);
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
