import { authClient } from '@/lib/auth-client'
import { posthog } from '@/lib/posthog'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexProvider, ConvexReactClient, useConvexAuth } from 'convex/react'
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from 'expo-router'
import { PostHogProvider } from 'posthog-react-native'
import { StrictMode, useEffect, useRef } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { SubscriptionProvider } from '@/components/SubscriptionProvider'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_300Light_Italic,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_400Regular_Italic,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_500Medium_Italic,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_600SemiBold_Italic,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_700Bold_Italic,
  PlusJakartaSans_800ExtraBold,
  PlusJakartaSans_800ExtraBold_Italic,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import {
  Merriweather_300Light,
  Merriweather_300Light_Italic,
  Merriweather_400Regular,
  Merriweather_400Regular_Italic,
  Merriweather_700Bold,
  Merriweather_700Bold_Italic,
  Merriweather_900Black,
  Merriweather_900Black_Italic,
} from '@expo-google-fonts/merriweather'
import { Platform } from 'react-native'

SplashScreen.preventAutoHideAsync()

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    unsavedChangesWarning: false,
  },
)

function InitialLayout() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const segments = useSegments()
  const router = useRouter()
  const pathname = usePathname()
  const params = useGlobalSearchParams()
  const previousPathname = useRef<string | undefined>(undefined)

  // Manual screen tracking for Expo Router
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      })
      previousPathname.current = pathname
    }
  }, [pathname, params])

  const [loaded, error] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_300Light_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_400Regular_Italic,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_500Medium_Italic,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_600SemiBold_Italic,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_700Bold_Italic,
    PlusJakartaSans_800ExtraBold,
    PlusJakartaSans_800ExtraBold_Italic,
    Merriweather_300Light,
    Merriweather_300Light_Italic,
    Merriweather_400Regular,
    Merriweather_400Regular_Italic,
    Merriweather_700Bold,
    Merriweather_700Bold_Italic,
    Merriweather_900Black,
    Merriweather_900Black_Italic,
  })

  useEffect(() => {
    if (isAuthLoading || !loaded) return

    const inAuthGroup = segments[0] === '(authenticated)'

    if (isAuthenticated && !inAuthGroup) {
      // If they are authenticating BUT somehow missing onboarding, let them finish it
      if (segments[segments.length - 1] === 'onboardingPage') {
        return
      }
      // Redirect authenticated users to the processing page first
      router.replace('/(authenticated)/onboardingProcessing')
    } else if (!isAuthenticated && inAuthGroup) {
      // Exception: Allow users to stay on the onboardingProcessing screen while authentication is finalizing
      if (segments[segments.length - 1] === 'onboardingProcessing') {
        return
      }
      // Redirect unauthenticated users to the login/public page
      router.replace('/(public)')
    }
  }, [isAuthenticated, isAuthLoading, segments, loaded])

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync()
    }
  }, [loaded, error])

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.WARN)
        // Platform-specific API keys
        const iosApiKey = process.env.EXPO_PUBLIC_RC_IOS_API_KEY
        const androidApiKey = process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY

        if (iosApiKey) {
          if (Platform.OS === 'ios') {
            Purchases.configure({ apiKey: iosApiKey })
          } else if (Platform.OS === 'android') {
            Purchases.configure({ apiKey: androidApiKey as string })
          }
        }
      } catch (error) {
        console.error('RevenueCat init error:', error)
      }
    }
    initRevenueCat()
  }, [])

  if ((!loaded && !error) || isAuthLoading) {
    return null
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(public)" />
      <Stack.Screen name="(authenticated)" />
    </Stack>
  )
}

export default function AuthLayout() {
  return (
    <StrictMode>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ['testID'],
        }}
      >
        <ConvexProvider client={convex}>
          <ConvexBetterAuthProvider client={convex} authClient={authClient}>
            <SubscriptionProvider>
              <InitialLayout />
            </SubscriptionProvider>
          </ConvexBetterAuthProvider>
        </ConvexProvider>
      </PostHogProvider>
    </StrictMode>
  )
}
