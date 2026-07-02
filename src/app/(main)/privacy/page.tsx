// DRAFT — REQUIRES REVIEW BY A LICENSED US ATTORNEY BEFORE RELIANCE

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/common/breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'FIREPath Privacy Policy — how we collect, use, and protect your data. Covers account information, saved calculations, analytics, and your rights under GDPR and CCPA.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

/**
 * Privacy Policy page — effective June 28, 2026.
 *
 * OPERATOR NOTE: Replace "FIREPath" with your registered legal business name
 * wherever you see it used as the operator/entity throughout this document.
 * contact@gofirepath.com is the designated contact for privacy inquiries.
 */
export default function PrivacyPage() {
  // Whether ad-related disclosures apply depends on AdSense being configured.
  // Mirrors ADS_ENABLED in cookie-consent-banner.tsx so the policy stays honest:
  // with no ad client id, no advertising cookies are ever set, no ads are shown,
  // and the policy must not claim otherwise.
  const ADS_ENABLED = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs items={[{ name: 'Privacy Policy', path: '/privacy' }]} />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Effective date: June 28, 2026 &mdash; Last updated: July 2, 2026
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">

        <section>
          <h2>1. Who We Are</h2>
          <p>
            FIREPath (&ldquo;FIREPath,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            operates the website{' '}
            <a href="https://gofirepath.com" rel="noopener noreferrer">gofirepath.com</a>{' '}
            and the FIREPath web application, a FIRE (Financial Independence, Retire Early)
            planning calculator.
            {/* OPERATOR NOTE: insert your registered legal business name and jurisdiction here */}
          </p>
          <p>
            Contact us for any privacy-related questions at:{' '}
            <a href="mailto:contact@gofirepath.com">contact@gofirepath.com</a>.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>

          <h3>2a. Account Information</h3>
          <p>
            When you create an account, we collect your <strong>email address</strong> and
            authentication credentials. Authentication is handled by{' '}
            <strong>Supabase</strong> (including Supabase Auth). You may also sign in via
            OAuth providers (such as Google), in which case we receive only the basic profile
            information those providers send us (typically name and email). Passwords are
            never stored by us in plain text; Supabase handles credential hashing.
          </p>

          <h3>2b. Saved Calculation Data</h3>
          <p>
            If you save FIRE calculations while logged in, we store the input parameters you
            provide (such as current savings, monthly contribution, target amount, and assumed
            return rates) and the resulting calculation outputs. This data is linked to your
            account and stored in our database (Supabase / PostgreSQL). Free accounts may
            save up to five calculations; premium accounts have unlimited saves.
          </p>

          <h3>2c. Payment and Subscription Information</h3>
          <p>
            If you subscribe to FIREPath Premium, payment processing is handled exclusively
            by <strong>Stripe</strong>. We do <strong>not</strong> store your credit card
            number, CVV, or full payment card details on our servers. Stripe provides us with
            a subscription status, a customer ID, and limited billing information (e.g.,
            subscription plan, renewal date, last four digits of the card on file) necessary
            to manage your account. By subscribing, you also agree to{' '}
            <a href="https://stripe.com/privacy" rel="noopener noreferrer">Stripe&apos;s Privacy Policy</a>.
          </p>

          <h3>2d. Usage and Analytics Data</h3>
          <p>
            We use <strong>Google Analytics 4 (GA4)</strong> to collect anonymized usage data,
            including pages visited, session duration, browser type, operating system, and
            approximate geographic location (country/region level). GA4 uses cookies to
            distinguish users. This data helps us understand how the calculator is used and
            improve the product. How analytics is initialized depends on your location: visitors
            in the EEA, UK, and Switzerland are asked for consent via the cookie banner before
            analytics cookies are set; visitors elsewhere (e.g. the United States) are subject
            to a notice-and-opt-out model under which analytics loads on the first visit and
            you may opt out at any time.
          </p>

          <h3>2e. Log Data</h3>
          <p>
            Our hosting provider (Vercel) automatically collects server logs including IP
            addresses, request timestamps, HTTP status codes, and referrer URLs. These logs
            are retained for a short period (typically 30 days) for security and debugging
            purposes and are not used for marketing.
          </p>

          <h3>2f. Locally Computed Data</h3>
          <p>
            Calculator inputs are processed in your browser and are not transmitted to or
            stored on our servers unless you explicitly choose to save a calculation while
            signed in (see Section&nbsp;2b). All FIRE calculations you perform without saving
            are computed entirely in your browser using JavaScript running on your device —
            no network request carries your slider values, and no analytics event includes
            your calculator inputs.
          </p>
        </section>

        <section>
          <h2>3. What We Do Not Collect</h2>
          <ul>
            <li>We do not collect your Social Security Number, government ID, or passport details.</li>
            <li>We do not collect precise geolocation.</li>
            <li>
              We do not collect sensitive financial account numbers (bank account numbers,
              brokerage login credentials, etc.). The numbers you enter into the FIRE
              calculator are assumptions you provide, not pulled from live financial accounts.
            </li>
            <li>We do not sell your personal data to third parties.</li>
            {ADS_ENABLED ? (
              <li>
                We do not display advertising to <strong>premium (paid) subscribers</strong>.
                Free users may see display ads served by <strong>Google AdSense</strong>.
                Advertising cookies are subject to geo-differentiated consent: visitors in the
                EEA, UK, and Switzerland must opt in via the cookie/consent banner before
                personalized advertising cookies are set; visitors elsewhere (e.g. the United
                States) operate under a notice-and-opt-out model. See Section&nbsp;4c for
                details and opt-out options.
              </li>
            ) : (
              <li>
                We do not display third-party advertising on FIREPath, and we do not use
                advertising cookies.
              </li>
            )}
          </ul>
        </section>

        <section>
          <h2>4. Cookies and Tracking Technologies</h2>
          <p>We use the following types of cookies and similar technologies:</p>

          <h3>4a. Strictly Necessary Cookies</h3>
          <p>
            These cookies are required for the site to function. They include session cookies
            set by Supabase to keep you authenticated. These cannot be disabled without
            breaking core functionality.
          </p>

          <h3>4b. Analytics Cookies (Non-Essential)</h3>
          <p>
            Google Analytics 4 sets first-party cookies (such as <code>_ga</code> and{' '}
            <code>_ga_*</code>) to measure user behavior. For visitors in the EEA, UK, and
            Switzerland, these cookies are set only after you accept our consent banner
            (opt-in required). For visitors elsewhere (e.g. the United States), analytics
            loads on your first visit under a notice-and-opt-out model; you may opt out at
            any time by clearing your browser cookies, using the{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">
              Google Analytics Opt-out Browser Add-on
            </a>,
            or adjusting your preference via the link in our site footer.
          </p>

          {ADS_ENABLED && (
            <>
              <h3>4c. Advertising Cookies (Non-Essential)</h3>
              <p>
                Free (non-premium) users may see display advertisements served by{' '}
                <strong>Google AdSense</strong>, a third-party advertising network operated by
                Google LLC. Google AdSense uses cookies and similar tracking technologies to
                serve ads that may be personalized to your interests based on your browsing
                activity. These cookies are set by Google, not by FIREPath.
              </p>
              <p>
                <strong>Premium subscribers do not see ads</strong>, and no advertising cookies
                are loaded for their sessions.
              </p>
              <p>
                We use <strong>Google Consent Mode v2</strong> together with a{' '}
                <strong>Google-certified Consent Management Platform (CMP)</strong> to implement
                geo-differentiated consent:
              </p>
              <ul>
                <li>
                  <strong>EEA, UK, and Switzerland (opt-in):</strong> Personalized-advertising
                  and analytics cookies are set only <em>after</em> you grant consent via the
                  cookie/consent banner. Until you consent, ads run in a non-personalized /
                  limited mode.
                </li>
                <li>
                  <strong>United States and other regions (notice-and-opt-out):</strong>{' '}
                  Advertising and analytics cookies load on your first visit, consistent with
                  applicable US and CCPA standards. You may opt out or withdraw consent at any
                  time via the &ldquo;Do Not Sell or Share My Personal Information&rdquo; link
                  in the site footer, or through the options listed below.
                </li>
              </ul>
              <p>
                You can opt out of personalized advertising at any time:
              </p>
              <ul>
                <li>
                  <a href="https://adssettings.google.com" rel="noopener noreferrer">
                    Google Ad Settings
                  </a>{' '}
                  — control how Google uses your data to show you ads.
                </li>
                <li>
                  <a href="https://www.aboutads.info/choices" rel="noopener noreferrer">
                    www.aboutads.info/choices
                  </a>{' '}
                  — opt out of interest-based advertising from participating companies.
                </li>
              </ul>
            </>
          )}

          <h3>{ADS_ENABLED ? '4d' : '4c'}. How to Manage Cookies</h3>
          <p>
            You can control cookies through your browser settings or by clicking
            &ldquo;Decline&rdquo; in our cookie consent banner (where shown). Note that
            disabling strictly necessary cookies will prevent you from signing in. For Google
            Analytics specifically, you may also use the{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">
              Google Analytics Opt-out Browser Add-on
            </a>.
            {ADS_ENABLED && (
              <> To opt out of interest-based advertising or exercise your &ldquo;Do Not Sell
              or Share My Personal Information&rdquo; right, use the link in the site footer
              or visit{' '}
              <a href="https://adssettings.google.com" rel="noopener noreferrer">
                Google Ad Settings
              </a>{' '}
              /{' '}
              <a href="https://www.aboutads.info/choices" rel="noopener noreferrer">
                aboutads.info
              </a>.</>
            )}
          </p>
        </section>

        <section>
          <h2>5. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the FIREPath service and your account.</li>
            <li>To save and retrieve your FIRE calculations on your behalf.</li>
            <li>To process subscription payments and manage your premium access via Stripe.</li>
            <li>
              To analyze aggregate usage patterns (via GA4) to improve the calculator and user
              experience — subject to geo-differentiated consent as described in Section&nbsp;4b.
            </li>
            {ADS_ENABLED && (
              <li>
                To display advertisements to free users via Google AdSense (only for
                non-premium accounts; subject to geo-differentiated consent as described in
                Section&nbsp;4c).
              </li>
            )}
            <li>To respond to your support inquiries and communications.</li>
            <li>To detect and prevent fraud, abuse, and security incidents.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2>6. Affiliate Links Disclosure</h2>
          <p>
            FIREPath may include affiliate links to third-party financial products, services,
            or tools. If you click an affiliate link and make a purchase or open an account,
            we may receive a commission at no additional cost to you. Affiliate relationships
            do not influence the objectivity of our educational content or calculator
            methodology. We only link to services we believe are relevant to FIRE planning.
          </p>
        </section>

        <section>
          <h2>7. Important Financial Disclaimer</h2>
          <p>
            FIREPath is a <strong>financial planning tool for educational and informational
            purposes only</strong>. The calculations, projections, and estimates it provides
            are based on simplified mathematical models and assumptions you enter. They do
            not constitute financial advice, investment advice, tax advice, or legal advice.
            Results are not guarantees of future performance. Past market performance does
            not predict future results. Real investment returns vary and may be lower or
            higher than the rates you assume. Always consult a qualified financial advisor,
            tax professional, or attorney before making significant financial decisions.
          </p>
        </section>

        <section>
          <h2>8. Sharing Your Information</h2>
          <p>We share your personal data only in the following circumstances:</p>
          <ul>
            <li>
              <strong>Supabase:</strong> Our database and authentication provider. Supabase
              processes your email and stored calculations on our behalf under a data
              processing agreement.
            </li>
            <li>
              <strong>Stripe:</strong> Our payment processor for premium subscriptions.
              Stripe processes payment data under Stripe&apos;s own privacy policy.
            </li>
            <li>
              <strong>Google Analytics:</strong> Anonymous usage statistics. Sent after consent
              for EEA/UK/Switzerland visitors; sent on first visit under notice-and-opt-out for
              visitors elsewhere (see Section&nbsp;4b).
            </li>
            {ADS_ENABLED && (
              <li>
                <strong>Google AdSense:</strong> Third-party display advertising for free users
                only. Google may set advertising cookies and receive page-level data (such as
                the page URL and a pseudonymous identifier) to serve and measure ads. For EEA,
                UK, and Swiss visitors this occurs only after consent is granted; for visitors
                elsewhere it occurs on the first visit under a notice-and-opt-out model.
                Premium subscribers are excluded. Google&apos;s use of data is governed by{' '}
                <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
                  Google&apos;s Privacy Policy
                </a>.
              </li>
            )}
            <li>
              <strong>Vercel:</strong> Our hosting provider, which processes server request
              data necessary to deliver the service.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose information if required
              by applicable law, court order, or government authority.
            </li>
            <li>
              <strong>Business transfer:</strong> If FIREPath is acquired or merges with
              another entity, your data may transfer as part of that transaction, subject
              to the same privacy protections.
            </li>
          </ul>
          <p>
            We do not sell, rent, or trade your personal information to third parties for
            money.{' '}
            {ADS_ENABLED
              ? 'When advertising is enabled, our use of Google AdSense to serve personalized ads may qualify as "sharing" for cross-context behavioral advertising under California law (see Section 10b); you can opt out via the "Do Not Sell or Share My Personal Information" link in the site footer, Google Ad Settings, or aboutads.info. We never share the financial figures you enter into the calculator, or your saved calculations, with advertisers.'
              : 'We do not share personal information for cross-context behavioral advertising.'}
          </p>
        </section>

        <section>
          <h2>9. Data Retention</h2>
          <ul>
            <li>
              <strong>Account data:</strong> Retained for as long as your account is active.
              If you delete your account, we will delete your personal data within 30 days,
              except where we are required to retain it for legal or compliance purposes.
            </li>
            <li>
              <strong>Saved calculations:</strong> Retained while your account is active and
              deleted with your account.
            </li>
            <li>
              <strong>Billing records:</strong> Retained for up to 7 years as required for
              tax and accounting compliance.
            </li>
            <li>
              <strong>Server logs:</strong> Typically retained for 30 days.
            </li>
            <li>
              <strong>Analytics data:</strong> Subject to Google Analytics&apos; retention
              settings, which we configure for 14 months.
            </li>
          </ul>
        </section>

        <section>
          <h2>10. Your Rights</h2>

          <h3>10a. GDPR Rights (EEA and UK Residents)</h3>
          <p>
            If you are located in the European Economic Area (EEA) or United Kingdom, you
            have the following rights under the General Data Protection Regulation (GDPR) or
            UK GDPR:
          </p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Erasure:</strong> Request deletion of your personal data (&ldquo;right to be forgotten&rdquo;).</li>
            <li><strong>Restriction:</strong> Request that we restrict processing of your data.</li>
            <li><strong>Data portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong>Object:</strong> Object to processing based on legitimate interests.</li>
            <li>
              <strong>Withdraw consent:</strong> If processing is based on consent (e.g.,
              analytics{ADS_ENABLED ? ' or advertising' : ''} cookies), you may withdraw it at
              any time without affecting the lawfulness of prior processing.
            </li>
            <li>
              <strong>Lodge a complaint:</strong> You have the right to complain to your
              local data protection authority.
            </li>
          </ul>
          <p>
            Our legal basis for processing your data: account data is processed for
            contract performance;{' '}
            {ADS_ENABLED ? 'analytics and advertising cookies are' : 'analytics is'} processed
            on the basis of consent; server logs are processed for legitimate interests
            (security and abuse prevention).
          </p>

          <h3>10b. CCPA Rights (California Residents)</h3>
          <p>
            If you are a California resident, the California Consumer Privacy Act (CCPA)
            as amended by the California Privacy Rights Act (CPRA) grants you:
          </p>
          <ul>
            <li><strong>Right to Know:</strong> Request disclosure of the categories and specific pieces of personal information we have collected about you.</li>
            <li><strong>Right to Delete:</strong> Request deletion of your personal information.</li>
            <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information.</li>
            {ADS_ENABLED ? (
              <li>
                <strong>Right to Opt-Out of Sale or Sharing:</strong> We do not sell personal
                information for money. Free users may have data shared with Google AdSense for
                interest-based advertising under a notice-and-opt-out model, which may
                constitute &ldquo;sharing&rdquo; for cross-context behavioral advertising under
                the CPRA. You may opt out or withdraw consent at any time via the{' '}
                &ldquo;Do Not Sell or Share My Personal Information&rdquo; link in the site
                footer,{' '}
                <a href="https://adssettings.google.com" rel="noopener noreferrer">Google Ad Settings</a>,
                or{' '}
                <a href="https://www.aboutads.info/choices" rel="noopener noreferrer">www.aboutads.info/choices</a>.
                Premium subscribers are never shown ads.
              </li>
            ) : (
              <li>
                <strong>Right to Opt-Out of Sale or Sharing:</strong> We do not sell or share
                personal information for cross-context behavioral advertising. No opt-out is
                required.
              </li>
            )}
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:contact@gofirepath.com">contact@gofirepath.com</a>. We will
            respond within 45 days.
          </p>
        </section>

        <section>
          <h2>11. Children&apos;s Privacy</h2>
          <p>
            FIREPath is not directed to children under the age of 13 (or 16 in the EEA).
            We do not knowingly collect personal data from children. If you believe we have
            inadvertently collected information from a child, please contact us at{' '}
            <a href="mailto:contact@gofirepath.com">contact@gofirepath.com</a> and we will
            promptly delete it.
          </p>
        </section>

        <section>
          <h2>12. Security</h2>
          <p>
            We implement industry-standard security measures including HTTPS encryption for
            all data in transit, row-level security policies in our database, and
            authentication managed by Supabase. No method of transmission over the internet
            is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>13. International Data Transfers</h2>
          <p>
            Your data may be processed in the United States and other countries where our
            service providers (Supabase, Stripe, Google, Vercel) operate. If you are located
            in the EEA or UK, we rely on our service providers&apos; Standard Contractual
            Clauses or other approved transfer mechanisms to ensure your data is protected.
          </p>
        </section>

        <section>
          <h2>14. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised
            policy on this page with an updated effective date. For material changes, we
            will notify registered users via email. Your continued use of FIREPath after
            the effective date constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2>15. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy
            or your personal data, please contact us:
          </p>
          <p>
            <strong>FIREPath</strong>
            {/* OPERATOR NOTE: add your registered legal business name and mailing address here */}
            <br />
            Email:{' '}
            <a href="mailto:contact@gofirepath.com">contact@gofirepath.com</a>
            <br />
            Website:{' '}
            <a href="https://gofirepath.com" rel="noopener noreferrer">gofirepath.com</a>
          </p>
        </section>

        <section className="border-t pt-6">
          <p className="text-sm text-muted-foreground">
            See also:{' '}
            <Link href="/terms" className="underline hover:text-foreground transition-colors duration-200">
              Terms of Service
            </Link>
          </p>
        </section>

      </div>
    </div>
  );
}
