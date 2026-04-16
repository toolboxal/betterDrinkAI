<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Better Drink AI. Here is a summary of every change made:

- **`app.config.js`** (new) — Converted `app.json` to a JS config that exposes `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` from `.env.local` via `Constants.expoConfig.extra`, following the Expo pattern for build-time env vars.
- **`.env.local`** — Added `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` keys with the correct project values.
- **`lib/posthog.ts`** (new) — Singleton PostHog client configured via `expo-constants`. Disabled automatically if the token is not set. Includes lifecycle event capture, batching, and feature flag support.
- **`app/_layout.tsx`** — Wrapped the entire app in `PostHogProvider` with autocapture enabled for touches. Added manual screen tracking with `posthog.screen()` on every route change using `usePathname` + `useGlobalSearchParams`.
- **`app/(public)/index.tsx`** — Added `get_started_tapped` and `sign_in_tapped` events on the landing page CTAs.
- **`app/(authenticated)/onboardingProcessing.tsx`** — Added `posthog.identify()` with user ID, name, and username on first onboarding completion. Added `onboarding_completed` event with goal and focus properties.
- **`components/camera/Camera.tsx`** — Added `drink_scan_initiated` (with `source: camera|library`), `drink_logged` (with drink name, health score, type, calories), and `drink_scan_failed` (with error type and reason) events.
- **`app/(authenticated)/drinkDetailsPage.tsx`** — Added `drink_deleted` and `drink_shared` events with drink name and health score.
- **`app/(authenticated)/drinkEditPage.tsx`** — Added `drink_updated` event on successful AI re-analysis and save.
- **`app/(authenticated)/paywallPage.tsx`** — Added `subscription_plan_selected`, `subscription_purchased` (with plan, price, currency), `subscription_purchase_cancelled`, `subscription_purchase_failed`, and `subscription_restored` events.
- **`app/(authenticated)/(tabs)/index.tsx`** — Added `go_pro_tapped` event with `source: dashboard` on the locked dashboard paywall prompt.
- **`app/(authenticated)/(tabs)/communityPage.tsx`** — Added `community_room_entered` event with room ID, name, and join status.
- **`app/(authenticated)/(tabs)/settingsPage/index.tsx`** — Added `apple_health_connected`, `user_logged_out` (with `posthog.reset()`), and `account_deleted` (with `posthog.reset()`) events.

## Events instrumented

| Event | Description | File |
|-------|-------------|------|
| `get_started_tapped` | User taps 'Get Started' on landing page | `app/(public)/index.tsx` |
| `sign_in_tapped` | User taps 'Sign In' on landing page | `app/(public)/index.tsx` |
| `onboarding_completed` | User completes onboarding; user identified | `app/(authenticated)/onboardingProcessing.tsx` |
| `drink_scan_initiated` | User takes photo or picks image to scan a drink | `components/camera/Camera.tsx` |
| `drink_logged` | Drink AI analysis succeeded and was saved | `components/camera/Camera.tsx` |
| `drink_scan_failed` | Drink scan failed (not a drink, low confidence, API error) | `components/camera/Camera.tsx` |
| `drink_deleted` | User deletes a logged drink | `app/(authenticated)/drinkDetailsPage.tsx` |
| `drink_shared` | User shares a drink report card image | `app/(authenticated)/drinkDetailsPage.tsx` |
| `drink_updated` | User saves edits and AI re-analyzes a drink | `app/(authenticated)/drinkEditPage.tsx` |
| `go_pro_tapped` | User taps 'Go Pro' from a locked screen | `app/(authenticated)/(tabs)/index.tsx` |
| `subscription_plan_selected` | User selects monthly or yearly plan on paywall | `app/(authenticated)/paywallPage.tsx` |
| `subscription_purchased` | Subscription purchase completed successfully | `app/(authenticated)/paywallPage.tsx` |
| `subscription_purchase_cancelled` | User cancelled the purchase dialog | `app/(authenticated)/paywallPage.tsx` |
| `subscription_purchase_failed` | Purchase failed with an error | `app/(authenticated)/paywallPage.tsx` |
| `subscription_restored` | User successfully restored a previous purchase | `app/(authenticated)/paywallPage.tsx` |
| `apple_health_connected` | User connects Apple Health in settings | `app/(authenticated)/(tabs)/settingsPage/index.tsx` |
| `user_logged_out` | User signs out | `app/(authenticated)/(tabs)/settingsPage/index.tsx` |
| `account_deleted` | User deletes their account and all data | `app/(authenticated)/(tabs)/settingsPage/index.tsx` |
| `community_room_entered` | User navigates into a community room | `app/(authenticated)/(tabs)/communityPage.tsx` |

## Next steps

We've built a dashboard and 5 insights for you to monitor user behaviour:

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/381736/dashboard/1465266)
- **Acquisition to Onboarding Funnel**: [View insight](https://us.posthog.com/project/381736/insights/aEk4Nr3j)
- **Subscription Conversion Funnel**: [View insight](https://us.posthog.com/project/381736/insights/74B5lhMI)
- **Drink Scan Success vs Failure**: [View insight](https://us.posthog.com/project/381736/insights/ng0FEezP)
- **Subscription Revenue Events**: [View insight](https://us.posthog.com/project/381736/insights/DfAcQrmc)
- **Churn Signals**: [View insight](https://us.posthog.com/project/381736/insights/aSa2WdK4)

### One action required

Run the following to complete the package installation (sandbox restrictions prevented the automated install):

```bash
npx expo install posthog-react-native
```

Or with bun:

```bash
bun add posthog-react-native
```

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
