# Merchant wallet and billing

Entry: My account → Wallet & billing (`/merchant/wallet`).

This is a billing hub, not a stored-value balance. It uses the existing authenticated billing endpoints. No card data, top-ups, withdrawals or invented balances are stored in the app. The Stripe portal opens from the validated URL created by the server. In Stripe's customer portal settings, enable invoice history, payment method updates and the subscription actions your business supports; both test and live configurations need checking. Cards and invoices are managed in that portal, not fetched into this screen.

The screen shows server-confirmed access, plan price/currency, paid access end date in Asia/Dubai, automation usage, a plans link and a portal link. Manual subscriptions direct the merchant to plans. Focus/foreground/pull-to-refresh reloads data; the existing subscription return route handles Stripe return polling. Billing action errors appear inline on web and native and distinguish authorization, duplicate subscriptions, rate limits and unavailable billing without exposing provider error bodies.

## Checks

- `npm test`, `npx tsc --noEmit`, `npm run lint`
- `npx expo export --platform web`
- Manually test Arabic/English, narrow mobile/desktop, large text, no subscription, manual subscription, Stripe active/canceled/past_due, network failures, portal return and repeated taps.
- UAE recipient numbers (including Arabic/Persian digits) normalize to +971; international contacts remain supported. Backend validation remains authoritative.

## Review findings and UAE roadmap

Implemented: account entry for billing; responsive billing hub; Arabic row direction on account actions; explicit billing errors on web/native; browser logout confirmation; consistent recipient-phone validation (the prior final-submit regex used an escaped backslash rather than the non-digit character class).

Remaining findings: create-delivery still uses native Alert dialogs for several errors and needs a separate web error-state pass. Existing backup files under src/app should be reviewed and removed outside this feature. No authenticated visual/device review or real Stripe transaction was possible in this development environment; automated export is not a substitute.

Recommended next product work, in order:
1. Structured delivery address: emirate, area, building/villa, unit, landmark, map pin and optional Dubai Makani number. Preserve existing addresses and enforce consistent backend validation. Makani is Dubai's smart addressing system, not a universal UAE postcode (https://u.ae/en/information-and-services/transportation/geospatial-data-in-transportation).
2. Merchant operational dashboard: failed deliveries requiring action, cash-on-delivery amounts and reconciliation ledger, delivery fees and commissions. Do not label subscription invoices as delivery settlement records.
3. Driver reliability: proof of delivery, recipient contact actions, retry/reschedule reasons, clear tracking freshness and offline recovery; audit existing implementations before adding alternatives.
4. Pilot with UAE merchants, measure completion rate, on-time delivery, failed-contact rate and repeat usage before selecting the next integration.

Stripe portal documentation: https://docs.stripe.com/customer-management
