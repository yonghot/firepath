import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
    a: 'The 4% rule suggests you can withdraw 4% of your portfolio annually in retirement without running out of money over a 30-year period. It was derived from the Trinity Study. FIREPath lets you adjust this Safe Withdrawal Rate to match your risk tolerance.',
  },
  {
    q: 'How accurate is the FIRE calculator?',
    a: 'FIREPath uses real return rates (adjusted for inflation) and year-by-year compounding for projections. While no calculator can predict the future, the model provides a solid baseline. For deeper analysis, the Monte Carlo simulation tests 1,000 random market scenarios to show probability ranges.',
  },
  {
    q: 'Can I save my calculations?',
    a: 'Yes. Create a free account to save up to 5 calculations. You can also share any calculation via URL — the parameters are encoded in the link so anyone can see your exact scenario.',
  },
] as const;

export function FAQSection() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-6">
        Frequently Asked Questions
      </h2>
      <Accordion className="w-full">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
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

// JSON-LD for FAQPage structured data
export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}
