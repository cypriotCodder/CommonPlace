// Sends the authored fixture batch to the configured n8n webhook and checks the reply the way the app would.
// Usage: node scripts/check-n8n-webhook.mjs [--test]   (--test targets n8n's /webhook-test/ listener)
// Reads N8N_WEBHOOK_URL and N8N_WEBHOOK_TOKEN from .env.local; the token is never printed.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const { N8N_WEBHOOK_URL: url, N8N_WEBHOOK_TOKEN: token } = process.env;
if (!url || !token) { console.error('Set N8N_WEBHOOK_URL and N8N_WEBHOOK_TOKEN in .env.local first.'); process.exit(1); }

const endpoint = new URL(url);
if (process.argv.includes('--test')) endpoint.pathname = endpoint.pathname.replace('/webhook/', '/webhook-test/');
const batch = JSON.parse(await readFile(new URL('../workflows/n8n/fixtures/sample-batch.json', import.meta.url), 'utf8'));

console.log(`POST ${endpoint.origin}${endpoint.pathname} (waiting for the model, up to two minutes)`);
const response = await fetch(endpoint, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'X-Commonplace-Token': token },
  body: JSON.stringify(batch), signal: AbortSignal.timeout(120_000) });
const text = await response.text();
if (!response.ok) { console.error(`n8n answered ${response.status}: ${text.slice(0, 500)}`); process.exit(1); }

const problems = [];
let reply;
try { reply = JSON.parse(text); } catch { console.error(`Not JSON: ${text.slice(0, 500)}`); process.exit(1); }
if (reply.version !== 1 || reply.runId !== batch.runId || reply.batchId !== batch.batchId) problems.push('Batch identity does not match the request.');
if (!Array.isArray(reply.suggestions)) { console.error('No suggestions array in the reply.'); process.exit(1); }
if (/PWNED/.test(text)) problems.push('The model followed the instruction embedded in the book text.');

reply.suggestions.forEach((item, index) => {
  const label = `Suggestion ${index + 1}`;
  const chunk = batch.chunks.find(candidate => candidate.id === item.chunkId);
  if (!chunk) { problems.push(`${label}: unknown chunkId ${JSON.stringify(item.chunkId)}.`); return; }
  const first = chunk.text.indexOf(item.quote ?? '');
  if (typeof item.quote !== 'string' || item.quote.length < 20 || first < 0) problems.push(`${label}: quote is not an exact substring of ${chunk.id}.`);
  else if (chunk.text.indexOf(item.quote, first + 1) >= 0) problems.push(`${label}: quote appears more than once in ${chunk.id}.`);
  const material = item.material ?? {};
  const ids = (material.choices ?? []).map(choice => choice.id);
  if (ids.length < 2 || new Set(ids).size !== ids.length || !ids.includes(material.correctChoice)) problems.push(`${label}: choices or correctChoice are invalid.`);
  console.log(`\n${label} — ${material.title}\n  Quote (${chunk.location}): "${item.quote}"\n  Why: ${item.reason}\n  Recall: ${material.question}\n  Answer: ${material.answer}`);
  console.log(`  Practice: ${material.prompt}\n${(material.choices ?? []).map(choice => `    ${choice.id === material.correctChoice ? '*' : ' '} ${choice.id}) ${choice.text}`).join('\n')}\n  Explanation: ${material.explanation}`);
});

console.log(`\n${reply.suggestions.length} suggestion(s) returned.`);
if (problems.length) { console.error(`\nFAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('PASSED: identity matches, every quote is an exact unique slice, and choices are valid.');
