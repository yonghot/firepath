import { PUBLISHER } from '@/lib/site';

export const UNDELIVERED_MESSAGE = `Your message could not be delivered. Please email ${PUBLISHER.email} instead.`;

export function messageEndpoint(): string | null {
  return process.env.FEEDBACK_ENDPOINT?.trim() || null;
}

export function isMessageEndpointConfigured(): boolean {
  return messageEndpoint() !== null;
}
