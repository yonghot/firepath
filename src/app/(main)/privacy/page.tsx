// DRAFT — REQUIRES REVIEW BY A LICENSED US ATTORNEY BEFORE RELIANCE

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { PUBLISHER } from '@/lib/site';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { isPremiumPurchasable } from '@/lib/premium-availability';
import { adsEnabled } from '@/lib/ads-env';
import { isMessageEndpointConfigured } from '@/lib/feedback-endpoint';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Privacy Policy',
    description: `FIREPath Privacy Policy — how we collect, use, and protect your data. Covers ${
      isSupabaseConfigured() ? 'account information, saved calculations, ' : ''
    }analytics, and your rights under GDPR and CCPA.`,
    alternates: { canonical: '/privacy' },
    // 부속M K09 — Discover/Images full-size image preview eligibility.
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
  };
}

export default function PrivacyPage() {
  // Whether ad-related disclosures apply depends on AdSense being configured.
  // Mirrors ADS_ENABLED in cookie-consent-banner.tsx so the policy stays honest:
  // with no ad client id, no advertising cookies are ever set, no ads are shown,
  // and the policy must not claim otherwise.
  const ADS_ENABLED = adsEnabled();
  // Accounts and billing exist only where Supabase / a purchasable plan are configured.
  const ACCOUNTS = isSupabaseConfigured();
  const PAYMENTS = isPremiumPurchasable();
  // Same flag the contact page uses to show its form: messages are collected only when a collector is configured.
  const MESSAGES = isMessageEndpointConfigured();
  const SECTION_2 = [
    ACCOUNTS && 'account',
    ACCOUNTS && 'saved',
    PAYMENTS && 'payment',
    MESSAGES && 'messages',
    'usage',
    'log',
    'local',
  ].filter(Boolean) as string[];
  const sub2 = (id: string) => `2${String.fromCharCode(97 + SECTION_2.indexOf(id))}`;
  const processors = [ACCOUNTS && 'Supabase', PAYMENTS && 'Stripe', 'Google', 'Vercel'].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs items={[{ name: 'Privacy Policy', path: '/privacy' }]} />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Effective date: June 28, 2026 &mdash; Last updated: October 7, 2026
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">

        <section>
          <h2>1. Who We Are</h2>
          <p>
            FIREPath (&ldquo;FIREPath,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            is published by {PUBLISHER.name} ({new URL(PUBLISHER.url).hostname}) and operates the website{' '}
            <a href="https://gofirepath.com" rel="noopener noreferrer">gofirepath.com</a>{' '}
            and the FIREPath web application, a FIRE (Financial Independence, Retire Early)
            planning calculator.
          </p>
          <p>
            Contact us for any privacy-related questions at:{' '}
            <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>

          {ACCOUNTS && (
            <>
              <h3>{sub2('account')}. Account Information</h3>
              <p>
                When you create an account, we collect your <strong>email address</strong> and
                authentication credentials. Authentication is handled by{' '}
                <strong>Supabase</strong> (including Supabase Auth). You may also sign in via
                OAuth providers (such as Google), in which case we receive only the basic profile
                information those providers send us (typically name and email). Passwords are
                never stored by us in plain text; Supabase handles credential hashing.
              </p>

              <h3>{sub2('saved')}. Saved Calculation Data</h3>
              <p>
                If you save FIRE calculations while logged in, we store the input parameters you
                provide (such as current savings, monthly contribution, target amount, and assumed
                return rates) and the resulting calculation outputs. This data is linked to your
                account and stored in our database (Supabase / PostgreSQL). Free accounts may
                save up to five calculations{PAYMENTS ? '; premium accounts have unlimited saves' : ''}.
              </p>
            </>
          )}

          {PAYMENTS && (
            <>
              <h3>{sub2('payment')}. Payment and Subscription Information</h3>
              <p>
                If you subscribe to FIREPath Premium, payment processing is handled exclusively
                by <strong>Stripe</strong>. We do <strong>not</strong> store your credit card
                number, CVV, or full payment card details on our servers. Stripe provides us with
                a subscription status, a customer ID, and limited billing information (e.g.,
                subscription plan, renewal date, last four digits of the card on file) necessary
                to manage your account. By subscribing, you also agree to{' '}
                <a href="https://stripe.com/privacy" rel="noopener noreferrer">Stripe&apos;s Privacy Policy</a>.
              </p>
            </>
          )}

          {MESSAGES && (
            <>
              <h3>{sub2('messages')}. Messages You Send Us</h3>
              <p>
                If you use the contact form, we collect the <strong>name</strong>,{' '}
                <strong>email address</strong> and <strong>message</strong> you type. If you send
                feedback with the Feedback button, we collect your message, the type of feedback
                you choose, an optional email address, the page address you were on (the path and
                query string, without anything after a #), and your browser&apos;s user agent.
                Our server forwards these messages to a collection service configured by{' '}
                {PUBLISHER.name}, the publisher, which uses them to answer you and to correct or
                improve the site. They are not sent to advertisers. Writing to{' '}
                <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> by email needs neither form.
              </p>
            </>
          )}

          <h3>{sub2('usage')}. Usage and Analytics Data</h3>
          <p>
            We use <strong>Google Analytics 4 (GA4)</strong> to collect anonymized usage data,
            including pages visited, session duration, browser type, operating system, and
            approximate geographic location (country/region level). GA4 uses cookies to
            distinguish users. This data helps us understand how the calculator is used and
            improve the product. How analytics starts depends on your location.{' '}
            {ADS_ENABLED ? (
              <>
                In the EEA, UK, and Switzerland, consent is collected by Google&apos;s certified
                consent message (a Google Funding Choices consent management platform); until you
                consent, Google Analytics runs with analytics storage denied, so it sets no
                analytics cookies and receives only limited, cookieless signals.
              </>
            ) : (
              <>
                In the EEA, UK, and Switzerland, analytics storage stays denied: no analytics
                cookies are set and Google Analytics receives only limited, cookieless signals.
              </>
            )}{' '}
            Elsewhere (e.g. the United States), analytics loads on your first visit under a
            notice-and-opt-out model. Use the &ldquo;Do Not Sell or Share My Personal
            Information / Manage Consent&rdquo; link in the site footer to open a notice with a
            Decline button. Decline tells Google to deny analytics and advertising storage
            straight away. Your choice is saved in your browser (local storage key{' '}
            <code>firepath_cookie_consent</code>), is not sent to our servers, and is applied
            again on every later visit.
          </p>

          <h3>{sub2('log')}. Log Data</h3>
          <p>
            Our hosting provider (Vercel) automatically collects server logs including IP
            addresses, request timestamps, HTTP status codes, and referrer URLs. These logs
            are retained for a short period (typically 30 days) for security and debugging
            purposes and are not used for marketing.
          </p>

          <h3>{sub2('local')}. Locally Computed Data</h3>
          <p>
            Calculator inputs are processed in your browser and are not transmitted to or
            stored on our servers
            {ACCOUNTS && <> unless you explicitly choose to save a calculation while signed in (see Section&nbsp;{sub2('saved')})</>}
            . All FIRE calculations you perform{ACCOUNTS ? ' without saving' : ''} are
            computed entirely in your browser using JavaScript running on your device —
            no network request carries your slider values, and the analytics events we send
            carry at most a coarse size band of the result (for example whether the target
            amount is under $500,000), never the exact figures you entered.
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
                Visitors may see display ads served by <strong>Google AdSense</strong>.
                Advertising cookies are subject to geo-differentiated consent: visitors in the
                EEA, UK, and Switzerland choose in Google&apos;s certified consent message before
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
          <h2 id="4-cookies-and-tracking-technologies">4. Cookies and Tracking Technologies</h2>
          <p>We use the following types of cookies and similar technologies:</p>

          <h3>4a. Strictly Necessary Cookies</h3>
          <p>
            These cookies are required for the site to function. FIREPath sets a first-party
            cookie named <code>visitor_country</code> that holds a two-letter country code
            taken from your request, so the notice that fits your region can be shown; it
            expires after one day. If you make a cookie choice, it is saved in your
            browser&apos;s local storage under <code>firepath_cookie_consent</code> and is not
            sent to our servers.
            {ACCOUNTS && <> If you sign in, Supabase also sets session cookies to keep you authenticated, and signing in does not work without them.</>}
          </p>

          <h3>4b. Analytics Cookies (Non-Essential)</h3>
          <p>
            Google Analytics 4 sets first-party cookies (such as <code>_ga</code> and{' '}
            <code>_ga_*</code>) to measure user behavior. For visitors in the EEA, UK, and
            Switzerland, these cookies are set only after you consent
            {ADS_ENABLED ? <> in Google&apos;s certified consent message</> : null}{' '}
            (opt-in required). For visitors elsewhere (e.g. the United States), analytics
            loads on your first visit under a notice-and-opt-out model; you may opt out at
            any time by choosing Decline in the notice opened from the footer link, clearing
            your browser cookies, or using the{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">
              Google Analytics Opt-out Browser Add-on
            </a>.
          </p>

          {ADS_ENABLED && (
            <>
              <h3>4c. Advertising Cookies (Non-Essential)</h3>
              <p>
                Visitors may see display advertisements served by{' '}
                <strong>Google AdSense</strong>, a third-party advertising network operated by
                Google LLC. Google AdSense uses cookies and similar tracking technologies to
                serve ads that may be personalized to your interests based on your browsing
                activity. These cookies are set by Google, not by FIREPath.
              </p>
              <p>
                We use <strong>Google Consent Mode v2</strong> to implement geo-differentiated
                consent:
              </p>
              <ul>
                <li>
                  <strong>EEA, UK, and Switzerland (opt-in):</strong> Consent is collected by
                  Google&apos;s certified consent message (a Google Funding Choices consent
                  management platform), which is the only consent screen shown there; our own
                  cookie notice is not shown. Personalized-advertising and analytics cookies are
                  set only <em>after</em> you grant consent in that message. Until you consent,
                  ads run in a non-personalized / limited mode. The &ldquo;Do Not Sell or Share
                  My Personal Information / Manage Consent&rdquo; link in the site footer
                  reopens Google&apos;s message so you can change or withdraw your choice.
                </li>
                <li>
                  <strong>United States and other regions (notice-and-opt-out):</strong>{' '}
                  Advertising and analytics cookies load on your first visit, consistent with
                  applicable US and CCPA standards. The &ldquo;Do Not Sell or Share My Personal
                  Information / Manage Consent&rdquo; link in the site footer opens a notice with
                  a Decline button; Decline tells Google to deny advertising and analytics
                  storage straight away, and the choice is saved in your browser and applied
                  again on each later visit. You can also opt out through the options listed
                  below.
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

          {/*
            부속W CODE-08 — AdSense's documentation requires the privacy policy
            to carry three specific things, and a generic template does not
            satisfy them: (1) the third-party-cookie notice, (2) a route to
            Google's ad settings, and (3) a NAMED list of the third-party
            vendors serving/loading on THIS site. The list below is derived from
            what gofirepath.com actually contacts — the loader in
            src/components/ads/ad-loader.tsx, the GA tag injected by cookie-consent-banner.tsx,
            the Supabase browser client, the Stripe-hosted checkout redirect, and
            the Vercel edge — not copied from a sibling site. Supabase and Stripe are
            listed only when their feature is configured (ACCOUNTS, PAYMENTS). Keep it in sync
            with the code; src/app/(main)/privacy/__tests__ pins the required
            elements. If NEXT_PUBLIC_AD_PROVIDER is ever switched away from
            AdSense (see components/monetization/AdProvider.tsx), the "only
            advertising network" sentence below stops being true and must change
            with it.
          */}
          <h3>
            {ADS_ENABLED ? '4d' : '4c'}. Third-party vendors and ad networks used on this site
          </h3>
          {ADS_ENABLED && (
            <p>
              <strong>
                Third-party vendors, including Google, use cookies to serve ads based on your
                prior visits
              </strong>{' '}
              to this website or other websites. Google&apos;s use of advertising cookies
              enables it and its partners to serve ads to you based on your visit to
              gofirepath.com and/or other sites on the internet.
            </p>
          )}
          <p>
            These are the third parties gofirepath.com actually loads or sends you to. No other
            third-party script, tracker, or ad network runs on this site:
          </p>
          <ul>
            {ADS_ENABLED && (
              <li>
                <strong>Google AdSense</strong> (
                <code>pagead2.googlesyndication.com</code>,{' '}
                <code>googleads.g.doubleclick.net</code>) — Google may show ads, including
                automatically placed ads, on content pages, and delivers its certified consent
                message (Google Funding Choices) to visitors in the EEA, UK, and Switzerland.
                Google AdSense is the only advertising network loaded on this site. See{' '}
                <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer">
                  How Google uses cookies in advertising
                </a>
                .
              </li>
            )}
            <li>
              <strong>Google Analytics 4</strong> (<code>www.googletagmanager.com</code>) —
              aggregate traffic measurement, subject to the consent posture described in
              Section&nbsp;4b. The measurement tag is loaded only on the production
              gofirepath.com hostname, never on preview deployments. The page address we send
              to Google has the URL fragment stripped, so the FIRE figures you enter (which
              live in that fragment when you share a scenario) are never transmitted to
              Google Analytics.
            </li>
            {ACCOUNTS && (
              <li>
                <strong>Supabase</strong> (<code>*.supabase.co</code>) — sign-in and the
                calculations you choose to save. Your browser talks to Supabase directly, and
                Supabase sets a strictly necessary session cookie to keep you signed in. Nothing
                is sent to Supabase unless you create an account or save a calculation.
              </li>
            )}
            {PAYMENTS && (
              <li>
                <strong>Stripe</strong> (<code>stripe.com</code>) — premium subscriptions only.
                No Stripe script runs on FIREPath pages; if you start a subscription or open the
                billing portal you are redirected to a Stripe-hosted page, where Stripe&apos;s
                own privacy policy applies.
              </li>
            )}
            <li>
              <strong>Vercel</strong> — hosting and content delivery. Vercel processes request
              metadata (IP address, user agent, referrer) in server logs to deliver the site,
              and provides the country-level signal we use to decide which consent posture
              applies to your visit (Section&nbsp;4b).
            </li>
          </ul>
          <p>
            Web fonts are self-hosted with the site&apos;s own assets, so loading a FIREPath
            page makes no request to Google Fonts. The FIRE calculations you run are computed
            in your browser; the figures you enter reach none of the vendors above
            {ACCOUNTS && <> unless you deliberately save a calculation to your account (Supabase, above)</>}
            .
          </p>
          {ADS_ENABLED && (
            <p>
              You can opt out of personalized advertising from Google at{' '}
              <a href="https://adssettings.google.com" rel="noopener noreferrer">
                Google Ad Settings
              </a>
              , and from many other vendors at{' '}
              <a href="https://www.aboutads.info/choices" rel="noopener noreferrer">
                www.aboutads.info/choices
              </a>
              . Opting out does not remove advertising; it makes the ads you see
              non-personalized.
            </p>
          )}

          <h3>{ADS_ENABLED ? '4e' : '4d'}. How to Manage Cookies</h3>
          <p>
            You can control cookies through your browser settings. In the EEA, UK, and
            Switzerland, use the footer link to reopen the consent message; elsewhere, use the
            footer link to open our notice and choose &ldquo;Decline&rdquo;.
            {ACCOUNTS && <> Note that disabling strictly necessary cookies will prevent you from signing in.</>}{' '}
            For Google Analytics specifically, you may also use the{' '}
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
            <li>To provide and maintain the FIREPath service{ACCOUNTS ? ' and your account' : ''}.</li>
            {ACCOUNTS && <li>To save and retrieve your FIRE calculations on your behalf.</li>}
            {PAYMENTS && <li>To process subscription payments and manage your premium access via Stripe.</li>}
            <li>
              To analyze aggregate usage patterns (via GA4) to improve the calculator and user
              experience — subject to geo-differentiated consent as described in Section&nbsp;4b.
            </li>
            {ADS_ENABLED && (
              <li>
                To display advertisements via Google AdSense (subject to
                geo-differentiated consent as described in Section&nbsp;4c).
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
            {ACCOUNTS && (
              <li>
                <strong>Supabase:</strong> Our database and authentication provider. Supabase
                processes your email and stored calculations on our behalf under a data
                processing agreement.
              </li>
            )}
            {PAYMENTS && (
              <li>
                <strong>Stripe:</strong> Our payment processor for premium subscriptions.
                Stripe processes payment data under Stripe&apos;s own privacy policy.
              </li>
            )}
            {MESSAGES && (
              <li>
                <strong>Message collection service:</strong> The contact-form and feedback
                messages described in Section&nbsp;{sub2('messages')} are forwarded by our server
                to a collection service configured by {PUBLISHER.name} so they can be read and
                answered.
              </li>
            )}
            <li>
              <strong>Google Analytics:</strong> Anonymous usage statistics. Sent after consent
              for EEA/UK/Switzerland visitors; sent on first visit under notice-and-opt-out for
              visitors elsewhere (see Section&nbsp;4b).
            </li>
            {ADS_ENABLED && (
              <li>
                <strong>Google AdSense:</strong> Third-party display advertising. Google may set
                advertising cookies and receive page-level data (such as
                the page URL and a pseudonymous identifier) to serve and measure ads. For EEA,
                UK, and Swiss visitors this occurs only after consent is granted; for visitors
                elsewhere it occurs on the first visit under a notice-and-opt-out model.
                Google&apos;s use of data is governed by{' '}
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
              ? 'When advertising is enabled, our use of Google AdSense to serve personalized ads may qualify as "sharing" for cross-context behavioral advertising under California law (see Section 10b); you can opt out via the "Do Not Sell or Share My Personal Information" link in the site footer, Google Ad Settings, or aboutads.info. We never share the financial figures you enter into the calculator' + (ACCOUNTS ? ', or your saved calculations,' : '') + ' with advertisers.'
              : 'We do not share personal information for cross-context behavioral advertising.'}
          </p>
        </section>

        <section>
          <h2>9. Data Retention</h2>
          <ul>
            {ACCOUNTS && (
              <>
                <li>
                  <strong>Account data:</strong> Retained for as long as your account is active.
                  If you delete your account, we will delete your personal data within 30 days,
                  except where we are required to retain it for legal or compliance purposes.
                </li>
                <li>
                  <strong>Saved calculations:</strong> Retained while your account is active and
                  deleted with your account.
                </li>
              </>
            )}
            {PAYMENTS && (
              <li>
                <strong>Billing records:</strong> Retained for up to 7 years as required for
                tax and accounting compliance.
              </li>
            )}
            <li>
              <strong>Server logs:</strong> Typically retained for 30 days.
            </li>
            <li>
              <strong>Analytics data:</strong> Subject to Google Analytics&apos; own retention
              settings.
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
            Our legal basis for processing your data:{' '}
            {ACCOUNTS && <>account data is processed for contract performance; </>}
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
                information for money. Visitors may have data shared with Google AdSense for
                interest-based advertising under a notice-and-opt-out model, which may
                constitute &ldquo;sharing&rdquo; for cross-context behavioral advertising under
                the CPRA. You may opt out or withdraw consent at any time via the{' '}
                &ldquo;Do Not Sell or Share My Personal Information&rdquo; link in the site
                footer,{' '}
                <a href="https://adssettings.google.com" rel="noopener noreferrer">Google Ad Settings</a>,
                or{' '}
                <a href="https://www.aboutads.info/choices" rel="noopener noreferrer">www.aboutads.info/choices</a>.
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
            <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>. We will
            respond within 45 days.
          </p>
        </section>

        <section>
          <h2>11. Children&apos;s Privacy</h2>
          <p>
            FIREPath is not directed to children under the age of 13 (or 16 in the EEA).
            We do not knowingly collect personal data from children. If you believe we have
            inadvertently collected information from a child, please contact us at{' '}
            <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> and we will
            promptly delete it.
          </p>
        </section>

        <section>
          <h2>12. Security</h2>
          <p>
            We implement industry-standard security measures including HTTPS encryption for
            all data in transit
            {ACCOUNTS && <>, row-level security policies in our database, and authentication managed by Supabase</>}
            . No method of transmission over the internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>13. International Data Transfers</h2>
          <p>
            Your data may be processed in the United States and other countries where our
            service providers ({processors}) operate. If you are located
            in the EEA or UK, we rely on our service providers&apos; Standard Contractual
            Clauses or other approved transfer mechanisms to ensure your data is protected.
          </p>
        </section>

        <section>
          <h2>14. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised
            policy on this page with an updated effective date.
            {ACCOUNTS && <> For material changes, we will notify registered users via email.</>}{' '}
            Your continued use of FIREPath after the effective date constitutes acceptance of
            the revised policy.
          </p>
        </section>

        <section>
          <h2>15. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy
            or your personal data, please contact us:
          </p>
          <p>
            <strong>FIREPath</strong>, published by {PUBLISHER.name}
            <br />
            Email:{' '}
            <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
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
