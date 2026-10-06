import { buildConsentDefaultScript } from '@/lib/consent';

export function ConsentDefault() {
  return <script dangerouslySetInnerHTML={{ __html: buildConsentDefaultScript() }} />;
}
