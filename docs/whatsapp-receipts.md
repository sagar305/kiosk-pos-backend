# WhatsApp receipts

Lets a business send the order receipt as a WhatsApp message to a customer
who provided their mobile number at checkout, using **Meta's WhatsApp Cloud
API** directly (no third-party reseller). Each business brings its own
credentials, configured under Settings → WhatsApp receipts.

## How it works in this codebase

- `Business.settings.whatsapp` stores `enabled`, `phoneNumberId`,
  `accessToken` (live) and `testPhoneNumberId`, `testAccessToken` (test).
- `POST /api/orders/:id/send-receipt-whatsapp` sends the receipt to
  `token.customerMobile` for that order.
- `src/utils/whatsapp.js` picks live vs. test credentials based on the
  server's `SIMULATE` env var.

## Dev vs prod / simulate mode

- Set `SIMULATE=1` in `.env` on a dev/staging server. Sends then use the
  business's `testPhoneNumberId` / `testAccessToken` instead of their live
  ones - no real customer numbers are messaged and no production charges are
  incurred.
- Set `SIMULATE=0` (or leave unset) in production. Sends use the business's
  live `phoneNumberId` / `accessToken`.
- A business can fill in both sets of credentials at once; which one is used
  is decided purely by the server's `SIMULATE` flag, not by anything the
  business chooses per-request.

## How a business gets its keys

1. Create a free Meta developer account at developers.facebook.com and create
   a new App (type: Business).
2. Add the "WhatsApp" product to the app. Meta auto-provisions a **test
   phone number** and a **temporary access token** (valid 24h) - use these as
   `testPhoneNumberId` / `testAccessToken` while building/trying the feature.
   Test messages can only be sent to up to 5 phone numbers you've added to an
   allow-list in the WhatsApp Manager, and don't cost anything.
3. For production: in WhatsApp Manager, add and verify your own business
   phone number (a number not already on WhatsApp), and complete Meta
   Business verification (id docs/domain check, usually 1-3 days).
4. Generate a permanent access token: System Users → Add system user → assign
   the WhatsApp app with `whatsapp_business_messaging` permission → generate
   token (no expiry). Use this as `accessToken`, and the verified number's ID
   as `phoneNumberId` (both shown in WhatsApp Manager → API Setup).
5. Paste both into Settings → WhatsApp receipts → "Live credentials" in this
   app, toggle "Enable", and Save.

Full walkthrough: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

## Message sending options considered

| Option | Notes |
|---|---|
| **Meta WhatsApp Cloud API (chosen)** | Official, free API, business owns the number/token directly, no markup. Slightly more setup (business verification) for production use. |
| Twilio WhatsApp API | Instant sandbox for testing, but production needs Twilio's own approval flow and adds a per-message fee on top of Meta's rate. |
| Gupshup / 360dialog (BSPs) | Reseller layer over Meta aimed at faster India onboarding, adds a monthly fee + per-message markup. |

We went with the direct Cloud API since this app already has a pattern of
businesses bringing their own provider keys (see `RESEND_API_KEY` for email),
and it's the cheapest option with no added markup.

## Rates (Meta's published conversation-based pricing, India, 2025)

WhatsApp bills per 24-hour "conversation" with a customer, not per message -
all messages exchanged with one customer within 24 hours of the first one
count as a single conversation.

- **Free tier**: first 1,000 conversations per business per month, in any
  environment - this covers most dev/test usage and small businesses.
- **Test number (test* credentials)**: always free, no conversation charge,
  but limited to 5 allow-listed recipient numbers - good for `SIMULATE=1`
  dev/staging.
- **Production, beyond the free tier**: receipts are "utility" template
  conversations, charged at roughly **$0.0035-0.02 (₹0.30-1.70)
  per conversation** in India as of 2025 (utility is Meta's cheapest
  category vs. marketing/authentication). Exact current rate:
  https://developers.facebook.com/docs/whatsapp/pricing
- There is **no separate Meta platform fee** - that's the entire production
  cost when sending directly via the Cloud API (unlike Twilio/BSPs, which add
  their own fee on top).

In short: dev/test sending is free via the test number; production cost scales
with the number of receipts beyond 1,000/month and is currently a few cents
or less per receipt.
