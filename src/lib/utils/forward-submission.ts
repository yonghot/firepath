const FORWARD_TIMEOUT_MS = 5000;

export async function forwardSubmission(endpoint: string, record: unknown): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: controller.signal,
    });
    if (!response.ok) console.error(`[forward-submission] endpoint answered ${response.status}`);
    return response.ok;
  } catch (err) {
    console.error('[forward-submission] Failed to forward to FEEDBACK_ENDPOINT:', err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
