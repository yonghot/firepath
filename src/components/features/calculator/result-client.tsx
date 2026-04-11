'use client';

import { useEffect } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { decodeState } from '@/lib/engine/url-state';
import { FIRETimelineChart } from '@/components/features/calculator/fire-timeline-chart';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { DisclaimerBanner } from '@/components/common/disclaimer-banner';
import { Button } from '@/components/ui/button';
import { Share2, Calculator } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function ResultClient() {
  const { output, setInput } = useCalculatorStore();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const decoded = decodeState(hash);
    if (decoded) setInput(decoded);
  }, [setInput]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">Your FIRE Results</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          <Link href="/">
            <Button size="sm">
              <Calculator className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 md:p-6">
        <FIRETimelineChart timeline={output.timeline} results={output.results} />
      </div>

      <FIREResultCards results={output.results} />
      <DisclaimerBanner />
    </>
  );
}
