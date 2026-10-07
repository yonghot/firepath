'use client';

import { AnswerBlock } from '@/components/common/answer-block';
import { AuthorByline } from '@/components/common/author-byline';
import { ResultDisclaimer } from '@/components/compliance/ResultDisclaimer';
import type { GeoAnswerEntity } from '@/lib/seo/geo';

const DATE = '2026-06-29';

// dataVerifiedDate is the pre-5c3a9ed field name; keeping it lets this fixture run unchanged against the d91a670 build.
const legacyField = { dataVerifiedDate: DATE };

const entity: GeoAnswerEntity = {
  query: 'How much do you need to retire early?',
  answer: 'Example answer.',
  lastUpdated: DATE,
  tableHeaders: [],
  tableRows: [],
  factors: [],
  stats: [],
  ...legacyField,
};

export function ClientIsoDates({ only }: { only?: 'disclaimer' | 'answer' | 'byline' }) {
  return (
    <>
      {!only || only === 'disclaimer' ? <ResultDisclaimer lastUpdated={DATE} /> : null}
      {!only || only === 'answer' ? <AnswerBlock entity={entity} /> : null}
      {!only || only === 'byline' ? <AuthorByline lastUpdated={DATE} /> : null}
    </>
  );
}
