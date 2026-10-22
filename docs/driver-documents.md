# Driver documents and account menus

Backend prerequisite: Raslo driver-document API update and migration. Existing users, application IDs, EAS project and stored tokens/language remain unchanged.

- Drivers: My account → My documents. Pending applicants: Application status → My documents.
- Merchants: My account → Manage my business → Store integrations. The old button above the account header is removed.
- Images/PDF up to 5 MiB. Profile photo requires an image. Dated documents require YYYY-MM-DD today or later. Server validation is authoritative.
- File selection uses expo-document-picker; native camera uses expo-image-picker with explicit camera permission and no microphone permission requested by this plugin. Native open/save uses expo-file-system and expo-sharing; web uses authenticated downloads. PDFs are not embedded in the app. Native downloaded copies are cleaned after the share action; exported copies are user-controlled.
- Upload status, rejection reasons and expiry are shown per slot. Re-upload resets review. No client can approve a document.
- No public document URLs or tokens in URLs. Refresh after upload timeout before retrying.
- In-account notifications open My documents and use the selected language. Pending users can read the slots without operational access.

Install npm ci, run npx tsc --noEmit, npm run lint and npm test. Rebuild the development client because native file selection/sharing dependencies were added, then start Expo with --clear. Existing development binaries may not contain the new native modules. Test camera, permission denial, image/PDF selection, upload, reopen/save and logout on real Android/iOS before production.

The driver tab bar uses device bottom insets; account screens use safe areas and RTL/LTR rows. Browser QA covers account/home/integration/documents screens at 390px in both languages, 320px account/document layouts, file upload/date validation, offline service and expired session. This does not certify every screen or replace physical device testing.
