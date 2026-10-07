# Activation: which environment name turns on which feature

Names only. No value, link, id or phone number belongs in this file or in source. Every block renders nothing while its names are unset. Setting a name in Vercel is an owner action; signing up for a program is the user's job. Nothing below is signed up for, configured or live on gofirepath.com. On 2026-10-07 the production environment defined four names: `INDEXNOW_KEY`, `FEEDBACK_ENDPOINT`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`.

## Already wired (measurement, ads, contact)

| Name | Effect |
|---|---|
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | AdSense loader and publisher meta. An empty value falls back like an unset one. |
| `NEXT_PUBLIC_ADSENSE_SLOT_ID` | The one slot id every ad placement uses. Digits only (6 or more) or no ad unit renders. |
| `NEXT_PUBLIC_ADSENSE_SLOT_RESULT`, `NEXT_PUBLIC_ADSENSE_SLOT_GUIDE` | Optional per-placement overrides of the slot id. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 stream id. |
| `NEXT_PUBLIC_APP_URL` | Optional canonical host override. Unset uses the site constant. |
| `FEEDBACK_ENDPOINT` | Where the contact form and the feedback widget forward messages. Used only together with `FEEDBACK_DELIVERY_CONFIRMED`. |
| `FEEDBACK_DELIVERY_CONFIRMED` | Set to `1` or `true` only after the publisher has confirmed that it reads what `FEEDBACK_ENDPOINT` collects. Unset, the contact form, the footer feedback link and the Privacy message-collection paragraph are hidden, /contact is email-first, and both message APIs answer 503. |
| `INDEXNOW_KEY` | IndexNow key file and the postbuild submission on production deploys. It submits only URLs added, removed or re-dated against the live sitemap, and nothing if that comparison fails. After a build, `INDEXNOW_DRY_RUN=1 node scripts/indexnow.mjs` prints the delta and never posts. |

## Result-area slots (src/components/monetization/ResultMonetization.tsx)

| Name | Effect |
|---|---|
| `NEXT_PUBLIC_PRIMARY_CTA_TYPE` | `call`, `cpl`, `affiliate` or `none`. The first block under the result. |
| `NEXT_PUBLIC_PPC_NUMBER`, `NEXT_PUBLIC_PPC_LABEL` | The `call` type. |
| `NEXT_PUBLIC_CPL_URL`, `NEXT_PUBLIC_CPL_LABEL` | The `cpl` type (outbound link to a lead form). |
| `MON_FEATURED_PARTNERS` | Server-only JSON list of label, figure and link. Parsed on the server (home and result pages) and passed down as a prop. Never give it a `NEXT_PUBLIC_` name. Feeds the partner table and the `affiliate` type. |
| `NEXT_PUBLIC_SPONSOR_HTML`, `NEXT_PUBLIC_SPONSOR_BACKFILL_URL` | Sponsored block (labelled Sponsored). |
| `NEXT_PUBLIC_EMAIL_CAPTURE`, `NEXT_PUBLIC_POSTAL_ADDRESS` | Newsletter capture. Needs both. |
| `NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED`, `EMAIL_CAPTURE_ENDPOINT`, `EMAIL_CAPTURE_API_KEY`, `NEXT_PUBLIC_POSTAL_ADDRESS` | "Email my results" form. Needs the endpoint, the enabled flag and the postal address. |
| `NEXT_PUBLIC_ADVISOR_CTA_URL`, `NEXT_PUBLIC_ADVISOR_CTA_LABEL`, `NEXT_PUBLIC_ADVISOR_CTA_CONTEXT` | Advisor-matching block on the guide, types and healthcare pages. |
| `NEXT_PUBLIC_AD_PROVIDER` | `adsense` (default), `ezoic`, `raptive`, `journey`, `none`. |
| `NEXT_PUBLIC_EZOIC_ENABLED`, `NEXT_PUBLIC_EZOIC_SITE_ID`, `NEXT_PUBLIC_RAPTIVE_SITE_ID`, `NEXT_PUBLIC_JOURNEY_SITE_ID` | Other ad networks. Dormant. |

Every block that carries an outbound partner, lead or call link renders the FTC disclosure line above it (`AffiliateDisclosure`). Keep it that way for any new block. Partner links carry `rel="sponsored"`.

## Status by program category

| Category | Status |
|---|---|
| Brokerage referral or partner table | Legal review first. Do not activate. |
| Robo-advisor referral (the `affiliate` type) | Legal review first. Do not activate. |
| Insurance referral (health or other) | Legal review first. Do not activate. |
| HELOC or lender lead | Legal review first. Do not activate. |
| Lawyer or attorney directory | Legal review first. Does not match this site's topic. |
| Financial-advisor lead form or phone (`cpl`, `call`, advisor block) | Not on the leader's list; a paid referral in a regulated field, so treat it the same: confirm with the leader before setting any name above. |
| Other ad networks, sponsor block, email capture | Dormant. Do not activate during the AdSense review. |

No program name or link ships in source. Removing a partner means deleting its entry from the value of `MON_FEATURED_PARTNERS`, not editing code.
