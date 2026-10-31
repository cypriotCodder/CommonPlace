const http = require('node:http');

/** A local deterministic fixture, never an AI/provider request. Used only with disposable test databases. */
async function startN8nFixture() {
  const token = 'commonplace-fixture-token-not-a-real-secret';
  const calls = [];
  let mode = 'valid';
  const server = http.createServer(async (request, response) => {
    if (request.headers['x-commonplace-token'] !== token) { response.writeHead(401); response.end('{}'); return; }
    const chunks = []; let size = 0;
    for await (const chunk of request) { size += chunk.length; if (size > 150_000) { response.writeHead(413); response.end('{}'); return; } chunks.push(chunk); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); calls.push(body);
    if (mode === 'failure') { response.writeHead(502); response.end('{}'); return; }
    if (mode === 'slow') await new Promise(resolve => setTimeout(resolve, 200));
    const chunk = body.chunks[0];
    const exact = chunk.text.match(/An index helps locate matching rows\./)?.[0] || chunk.text.slice(0, Math.min(100, chunk.text.length));
    const material = { title: 'Finding rows efficiently', question: 'What can an index help a query do?', answer: 'Locate matching rows without examining every row.',
      prompt: 'A query needs a few rows from a large table. Which approach could help?', choices: [{ id: 'a', text: 'A suitable index on the filtered column.' }, { id: 'b', text: 'Adding unrelated columns.' }], correctChoice: 'a', explanation: 'The index can help locate the subset; unrelated columns do not help the filter.' };
    const candidate = { chunkId: chunk.id, quote: exact, reason: 'This explains a transferable query tradeoff.', timeSensitive: mode === 'time-sensitive', freshnessNote: 'Fixture content; no independent current-source check.', material };
    const suggestions = mode === 'invalid' ? [{ ...candidate, quote: 'This quotation is deliberately not in the source text.' }] : [candidate];
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ version: 1, runId: body.runId, batchId: mode === 'wrong-batch' ? 'wrong' : body.batchId, suggestions }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}/webhook/commonplace-test`, token, calls, setMode(value) { mode = value; },
    close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}
module.exports = { startN8nFixture };
