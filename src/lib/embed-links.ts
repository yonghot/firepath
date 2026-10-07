export function embedLinkProps(embedded: boolean | undefined): { target?: '_blank'; rel?: string } {
  return embedded ? { target: '_blank', rel: 'noopener' } : {};
}
