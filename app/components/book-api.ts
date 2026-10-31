export async function bookApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The operation could not be completed.');
  return body as T;
}
export function jsonOptions(method: string, value: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Please try again.'; }
export function passagesChanged() { window.dispatchEvent(new Event('commonplace:passages-changed')); }
