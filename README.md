# Raslo Mobile

**Merchant and driver application for Raslo, the open-source delivery platform.**

Built with Expo SDK 57, React Native, TypeScript, and Expo Router. Previously named DeliveryHub Mobile.

## Current capabilities

- Merchant and driver registration, login, and account status.
- Merchant delivery creation and delivery views.
- Driver assignments and delivery workflow screens.
- In-app notifications and optional native phone push.
- Arabic and English interfaces.

This is an application under active development. Real Android push has been tested on a development build; production rollout and complete end-to-end validation remain separate milestones.

## Development

```bash
git clone https://github.com/AsmarWeb/deliveryhub-mobile.git raslo-mobile
cd raslo-mobile
npm ci
```

Configure `EXPO_PUBLIC_API_URL` in your local environment to point to a backend reachable from the device. A phone's `localhost` is the phone itself, not your development computer. Public Expo environment values are bundled into the client; never put private credentials there.

```bash
npx expo start --dev-client --clear
```

Install an EAS development build on your device first. See [phone push setup](docs/phone-push.md). Expo Go does not provide the Android remote push test environment used by this project.

## Checks

```bash
npm test
npx tsc --noEmit
npm run lint
```

## Android development build

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
```

Contributors must link their own Expo project and configure matching Firebase credentials. Keep service-account private keys and local environment files out of Git.

The existing installation retains its EAS project ID, project slug, application identifiers, URL scheme, and storage keys. The visible application name is **Raslo**. Rebuild and reinstall to update the native launcher name; changing JavaScript alone does not update installed native metadata.

## Roadmap

- Validate the full merchant-to-driver delivery journey.
- Improve quote, booking, tracking, and failure recovery experiences.
- Add store connection management once the backend integration API exists.
- Prepare production builds after operational validation.

Store integration and checkout delivery quotes are planned backend capabilities, not features already exposed by this app.

## Project links

- [Backend](https://github.com/AsmarWeb/deliveryhub)
- [Mobile source](https://github.com/AsmarWeb/deliveryhub-mobile)
- [Rename guide](docs/raslo-rebrand.md)

The GitHub repositories currently retain their original URLs. See the rename guide before changing repository or Expo identifiers.
