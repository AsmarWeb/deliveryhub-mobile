# Merchant automations on mobile

Open **Merchant dashboard → Delivery automations**. The screen lists paginated schedules, refreshes on focus, displays the next execution in each schedule's time zone, and supports pause/reactivate.

Choose **New schedule**, select saved pickup and drop-off addresses, enter a recipient, choose daily or weekly recurrence, and enter a 24-hour time and IANA time zone (default `Asia/Dubai`). Weekly schedules use Sunday=0 through Saturday=6, matching the API. Package type, weight and instructions are optional.

Generated deliveries are drafts for review. The schedule does not automatically approve pricing, dispatch a driver, or charge for delivery. A valid linked Stripe subscription and available automation allowance are checked by the backend. Subscription and limit errors link back to subscription management.

The app uses the existing authenticated `/api/v1` client:

- `GET /merchant/automations?page=...`
- `POST /merchant/automations`
- `PATCH /merchant/automations/{id}/status`

Only the API host in the existing `EXPO_PUBLIC_API_URL` is used. No new native dependencies are needed. The merchant route group retains its existing account/role protection.

## Verification

- TypeScript check passes, including CSS import declarations required by the existing web components.
- ESLint passes without warnings for all feature files and the modified merchant dashboard.
- Android JavaScript/Hermes export completes successfully; this is not a signed APK or device test.
- Full-project lint still reports pre-existing issues in unchanged driver/tracking and other files. Those require a separate cleanup.
- ESLint development dependencies/configuration are included; the lockfile is regenerated to include missing peer dependencies.

## Manual acceptance

1. Sign in as an approved merchant with saved addresses and an eligible subscription.
2. Create a daily schedule a few minutes ahead in `Asia/Dubai`. Confirm it appears on the list with the correct next execution.
3. Leave the backend scheduler running. After the occurrence, verify one draft appears in deliveries and the next execution advances a day.
4. Pause and reactivate a schedule. Confirm the next execution recalculates; verify a merchant at its allowance cannot reactivate an additional schedule.
5. Create a weekly schedule. Check its day, time and timezone after reopening the list.
6. Try an invalid time, missing recipient, missing address and negative weight; verify submission is blocked.
7. Test without a valid subscription, with network loss, and with multiple pages. After a timeout, check the list before retrying creation because the API does not provide a creation idempotency key.
8. Test on physical Android/iOS devices, including Arabic layout and keyboard behavior, before release.
