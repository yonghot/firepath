export function isMessageEndpointConfigured(): boolean {
  return Boolean(process.env.FEEDBACK_ENDPOINT?.trim());
}
