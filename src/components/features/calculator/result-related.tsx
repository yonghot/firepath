import { NextStep } from '@/components/common/next-step';
import { resultNextSteps } from '@/lib/next-steps';
import type { FIREInput, FIREOutput } from '@/types/fire.types';

interface ResultRelatedProps {
  output: FIREOutput;
  input: FIREInput;
  className?: string;
  embedded?: boolean;
}

// mb-32 plus the monetization section's mt-8 keeps 160px between these links and any ad that follows
export function ResultRelated({ output, input, className, embedded }: ResultRelatedProps) {
  return (
    <NextStep
      items={resultNextSteps(input, output)}
      embedded={embedded}
      className={`mt-6 mb-32 ${className ?? ''}`.trim()}
    />
  );
}
