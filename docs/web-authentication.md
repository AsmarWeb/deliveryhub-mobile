# Web authentication fix

The installed Expo SecureStore package exposes no native storage operations on web. Calling it from the API interceptor, login or session restoration prevented browser authentication.

All token access now goes through `authStorage`. Metro selects `authStorage.web.ts` for web, using the same-origin browser localStorage; native clients retain SecureStore and the existing token key. Server/static rendering never reads window. Logout deletes the token even if the server logout request fails. Blocked browser storage produces a visible error instead of a silently unusable session.

Browser errors now appear inline near the sign-in button, since native Alert dialogs are not a reliable web error surface. Bearer-token API authentication is retained.

Optional environment override for a browser running on the developer Mac:

```
EXPO_PUBLIC_WEB_API_URL=http://localhost:8080/api/v1
```

The installer sets that override for the reported localhost:8081 frontend. Restart Expo with a cleared cache after editing public environment values. A browser on another device needs a backend URL reachable from that device. Browser sessions are scoped to the exact frontend origin; use localhost:8081 consistently when returning from billing.

Verification: session storage/restore/logout, SSR safety, blocked storage, native key compatibility, token attachment and login token persistence have regression tests. The full mobile suite, TypeScript, ESLint and Android/iOS/web export are checked. Actual credentials, CORS/network reachability and merchant approval still require the user's local server.
