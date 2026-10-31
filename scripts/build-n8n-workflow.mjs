import { writeFile } from 'node:fs/promises';
import { outputSchema, prepareBatch, normalizeOutput } from '../workflows/n8n/contract.mjs';
const workflow = {
  name: 'Commonplace — grounded book study drafts', active: false,
  nodes: [
    { id: 'commonplace-webhook', name: 'Commonplace book batch', type: 'n8n-nodes-base.webhook', typeVersion: 2,
      position: [0, 0], webhookId: 'commonplace-book-study', parameters: { httpMethod: 'POST', path: 'commonplace-book-study', authentication: 'headerAuth', responseMode: 'responseNode', options: {} } },
    { id: 'prepare', name: 'Prepare grounded prompt', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0], parameters: { jsCode: `${prepareBatch.toString()}\nreturn [{ json: prepareBatch($input.first().json.body) }];` } },
    { id: 'llm', name: 'Generate source-grounded drafts', type: '@n8n/n8n-nodes-langchain.chainLlm', typeVersion: 1.7,
      position: [500, 0], parameters: { promptType: 'define', text: '={{ $json.prompt }}', hasOutputParser: true, batching: { batchSize: 1 } } },
    { id: 'parser', name: 'Study draft structure', type: '@n8n/n8n-nodes-langchain.outputParserStructured', typeVersion: 1.2,
      position: [620, 250], parameters: { schemaType: 'manual', inputSchema: JSON.stringify(outputSchema, null, 2) } },
    { id: 'normalize', name: 'Return the original batch identity', type: 'n8n-nodes-base.code', typeVersion: 2, position: [820, 0], parameters: { jsCode: `${normalizeOutput.toString()}\nreturn [{ json: normalizeOutput($input.first().json, $('Prepare grounded prompt').first().json) }];` } },
    { id: 'respond', name: 'Return study drafts', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.4, position: [1090, 0], parameters: { respondWith: 'json', responseBody: '={{ $json }}', options: { responseCode: 200 } } },
    { id: 'setup-note', name: 'Choose model and credentials before publishing', type: 'n8n-nodes-base.stickyNote', typeVersion: 1,
      position: [270, -310], parameters: { width: 680, height: 240, content: '## Setup before activation\n1. Create a Header Auth credential on the Webhook: header `X-Commonplace-Token`, value = the server webhook token.\n2. Add your chosen Chat Model and connect it to the Basic LLM Chain’s **Chat Model** input. No provider is preselected.\n3. Keep the Structured Output Parser connected.\n4. Publish/activate only after testing with the authored fixture.\n\nFreshness checks are disabled. This workflow teaches source-based ideas and does not claim they are up to date.' } },
  ],
  connections: {
    'Commonplace book batch': { main: [[{ node: 'Prepare grounded prompt', type: 'main', index: 0 }]] },
    'Prepare grounded prompt': { main: [[{ node: 'Generate source-grounded drafts', type: 'main', index: 0 }]] },
    'Study draft structure': { ai_outputParser: [[{ node: 'Generate source-grounded drafts', type: 'ai_outputParser', index: 0 }]] },
    'Generate source-grounded drafts': { main: [[{ node: 'Return the original batch identity', type: 'main', index: 0 }]] },
    'Return the original batch identity': { main: [[{ node: 'Return study drafts', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1', executionTimeout: 110, saveExecutionProgress: false, saveManualExecutions: false, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none' },
  pinData: {}, tags: [],
};
await writeFile(new URL('../workflows/n8n/commonplace-book-study.json', import.meta.url), JSON.stringify(workflow, null, 2) + '\n');
