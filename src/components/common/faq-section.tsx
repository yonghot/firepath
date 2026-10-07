import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS = [
  {
    q: 'What is FIRE (Financial Independence, Retire Early)?',
    a: 'FIRE is a financial movement focused on aggressive saving and investing to achieve financial independence much earlier than traditional retirement age. The goal is to accumulate enough wealth so your investment returns cover your living expenses indefinitely.',
  },
  {
    q: 'What are the different types of FIRE?',
    a: 'There are five main types: Lean FIRE (retiring on a minimal budget, ~60% of current expenses), Regular FIRE (maintaining your current lifestyle), Fat FIRE (retiring with a more luxurious lifestyle, ~150% of expenses), Coast FIRE (saving enough early so compound growth reaches your goal without additional contributions), and Barista FIRE (semi-retiring with part-time work covering ~50% of expenses).',
  },
  {
    q: 'How is the FIRE number calculated?',
    a: 'Your FIRE number is based on the 4% rule (Safe Withdrawal Rate). Divide your annual expenses by your SWR to get the portfolio size needed. For example, if you spend $40,000/year with a 4% SWR, you need $1,000,000. Each FIRE type applies a different multiplier to your expenses.',
  },
  {
    q: 'What is the 4% rule?',
    a: 'The 4% rule suggests you can withdraw 4% of your portfolio annually in retirement without running out of money over a 30-year period. It was first established by William Bengen in 1994 and later popularized by the Trinity Study (1998). FIREPath lets you adjust this Safe Withdrawal Rate to match your risk tolerance.',
  },
  {
    q: 'How accurate is the FIRE calculator?',
    a: 'FIREPath uses real return rates (adjusted for inflation) and year-by-year compounding for projections. While no calculator can predict the future, the model provides a solid baseline. It assumes constant returns, inflation, and savings, and does not model market volatility, taxes, or sequence-of-returns risk, so treat the results as estimates rather than predictions.',
  },
  {
    q: 'Can I save my calculations?',
    a: 'Your inputs stay in your own browser and are never sent to a server. The calculator keeps your latest inputs in your browser\'s local storage so you can pick up where you left off on the same device, and the footer link "Clear my saved calculator data" erases them. To keep or share a scenario, copy the page address: the parameters are encoded in the link so anyone can see your exact scenario.',
  },
] as const;

interface FAQSectionProps {
  /**
   * Page-specific Q&A pairs (부속M K01 — entity-level FAQ content per
   * calculator page). Defaults to the site-wide FIRE FAQ (home page,
   * unchanged behavior) when omitted, so every existing call site keeps
   * rendering exactly what it did before this prop was added.
   */
  items?: readonly FaqItem[];
  /** Override the section heading (default: "Frequently Asked Questions"). */
  title?: string;
  /** Distinguishes multiple FAQ sections' accordion `value` keys on one page. */
  idPrefix?: string;
  className?: string;
}

export function FAQSection({
  items = FAQ_ITEMS,
  title = 'Frequently Asked Questions',
  idPrefix = 'faq',
  className,
}: FAQSectionProps = {}) {
  return (
    <section className={className ?? 'mx-auto max-w-3xl px-4 py-12'}>
      <h2 className="text-3xl font-bold text-center mb-6">{title}</h2>
      <Accordion keepMounted className="w-full">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`${idPrefix}-${i}`}>
            <AccordionTrigger className="text-left text-base font-medium">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

// 부속P CODE-02 — FAQPage JSON-LD is deprecated for SERP display in 2026 and
// is intentionally NOT emitted anywhere in this codebase. FAQSection above
// still renders the same Q&A as on-page H2/H3 text, which remains valuable
// for GEO (AI-answer extraction) even without the schema wrapper. A
// faqJsonLd() builder previously existed here and was removed rather than
// left unused, so `grep -r FAQPage src` has nothing to find — see
// src/components/common/__tests__/faq-section.test.ts (부속P CODE-02
// regression guard) for the enforcement.
