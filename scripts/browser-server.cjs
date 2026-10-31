const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync, spawn } = require('node:child_process');
const { startN8nFixture } = require('../tests/helpers/n8n.cjs');
async function main() {
  const directory = mkdtempSync(join(tmpdir(), 'commonplace-browser-'));
  const n8n = await startN8nFixture();
  const env = { ...process.env, DATABASE_URL: `file:${join(directory, 'test.db')}`, COMMONPLACE_DIST_DIR: '.next-browser-tests', NEXT_TELEMETRY_DISABLED: '1',
    N8N_WEBHOOK_URL: n8n.url, N8N_WEBHOOK_TOKEN: n8n.token, N8N_AI_PROVIDER: 'Local test fixture (no AI service)' };
  const preparation = spawnSync(process.execPath, [join(__dirname, 'prepare-db.cjs')], { env, stdio: 'inherit' });
  if (preparation.status !== 0) { await n8n.close(); rmSync(directory, { recursive: true, force: true }); process.exit(preparation.status || 1); }
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', process.env.COMMONPLACE_TEST_PORT || '43117'], { env, stdio: 'inherit' });
  let stopping = false;
  function stop() { if (!stopping) { stopping = true; server.kill('SIGTERM'); } }
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  server.on('exit', async code => { await n8n.close(); rmSync(directory, { recursive: true, force: true }); process.exit(stopping ? 0 : code || 0); });
}
main().catch(() => { console.error('The isolated test server could not start.'); process.exit(1); });
