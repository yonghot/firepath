import { PUBLISHER } from '@/lib/site';

export const UNDELIVERED_MESSAGE = `Your message could not be delivered. Please email ${PUBLISHER.email} instead.`;

// An endpoint alone proves nothing about who reads it; the owner confirms that the publisher does.
function deliveryConfirmed(): boolean {
  return /^(1|true)$/i.test(process.env.FEEDBACK_DELIVERY_CONFIRMED?.trim() ?? '');
}

export function messageEndpoint(): string | null {
  if (!deliveryConfirmed()) return null;
  return process.env.FEEDBACK_ENDPOINT?.trim() || null;
}

export function isMessageEndpointConfigured(): boolean {
  return messageEndpoint() !== null;
}
