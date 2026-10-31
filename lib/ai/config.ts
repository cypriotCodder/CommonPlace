import { InputError } from '../local-api';

export function generationConfig() {
  const url = process.env.N8N_WEBHOOK_URL?.trim();
  const token = process.env.N8N_WEBHOOK_TOKEN?.trim();
  const provider = process.env.N8N_AI_PROVIDER?.trim();
  if (!url || !token || !provider) return null;
  let endpoint: URL;
  try { endpoint = new URL(url); } catch { throw new InputError('The n8n webhook URL is invalid. Update the server configuration.', 503); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if (endpoint.username || endpoint.password || (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:'))) throw new InputError('Use HTTPS for remote n8n, or HTTP on localhost. Keep credentials in the server token setting.', 503);
  if (token.length < 24) throw new InputError('Set a webhook token of at least 24 characters.', 503);
  return { endpoint, token, provider: provider.slice(0, 150) };
}

export function publicGenerationConfig() {
  try {
    const config = generationConfig();
    return { configured: !!config, destination: config?.endpoint.origin ?? 'http://localhost:5678', provider: config?.provider ?? null, message: config ? null : 'Choose an AI provider in n8n, then configure its production webhook and token on this server.' };
  } catch (error) { return { configured: false, destination: null, provider: null, message: error instanceof InputError ? error.message : 'The n8n configuration is unavailable.' }; }
}
