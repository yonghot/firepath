import { AlertTriangle } from 'lucide-react';

export function DisclaimerBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <strong>Disclaimer:</strong> This calculator is for educational and informational purposes only.
          It is not financial advice. Results are based on simplified assumptions and do not guarantee future outcomes.
          Consult a qualified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
}
