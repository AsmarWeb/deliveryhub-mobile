# Mobile error review — 20 October 2026

Reviewed the GitHub main snapshot `5f1c43d` together with the merchant automation update prepared in this session. The automation update was not present on GitHub main when checked.

## Fixed

- Cleared 14 ESLint errors and 18 warnings without disabling lint rules. Corrections include stable component definitions, CSS import types, hydration, effect dependencies, imports, and tracking refresh lifecycle.
- Corrected the legacy tracking endpoint from `/v1/driver/location` to `/driver/location`, since the shared API base already includes `/api/v1`.
- Added the required `delivery_id` to legacy and manual location uploads. The driver's home screen looks up accepted active deliveries and asks the driver to select a task if several are active.
- Fixed continuous GPS startup after an initial network/upload failure: the watcher now starts so the next position can retry. Server authorization failures still stop tracking.
- Prevented a GPS watcher from being created after the component unmounts while awaiting location permission. Foreground tracking stops when the app leaves the foreground.
- Prevented stale polling responses from a previous tracking session overwriting the current session.
- Fixed access checks capturing a stale merchant/driver role.

## Verification

- `npm test`: 9 service tests pass. Tests use real TypeScript service implementations with GPS/network boundaries mocked.
- `npx tsc --noEmit`: passes.
- `EXPO_OFFLINE=1 npx expo lint`: passes across the project with no errors or warnings.
- Expo export for Android, iOS and web completes. This validates bundling/static export, not device behavior or store submission.
- Cached/offline Expo dependency validation reports dependencies up to date. An online check timed out, so latest remote compatibility data was not verified.

## Device acceptance still required

Test first-time location permission, denied permission, network loss during startup, screen navigation during permission prompts, background/foreground transitions and the manual location update button. Verify the backend receives the selected delivery ID and that no updates continue after tracking is stopped.

This update does not add background GPS tracking. The app still tracks only while in the foreground. Live Stripe, device permissions, push delivery and production API behavior are outside these static/service checks.
