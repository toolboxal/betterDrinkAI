import { authClient } from '@/lib/auth-client'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexProvider, ConvexReactClient, useConvexAuth } from 'convex/react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StrictMode, useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { SubscriptionProvider } from '@/components/SubscriptionProvider'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter'
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

  const [loaded, error] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
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
      // Redirect authenticated users to the home page
      router.replace('/(authenticated)')
    } else if (!isAuthenticated && inAuthGroup) {
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
        const iosApiKey = process.env.EXPO_PUBLIC_RC_TEST_KEY
        const androidApiKey = process.env.EXPO_PUBLIC_RC_TEST_KEY

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

  if (!loaded && !error) {
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
      <ConvexProvider client={convex}>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <SubscriptionProvider>
            <InitialLayout />
          </SubscriptionProvider>
        </ConvexBetterAuthProvider>
      </ConvexProvider>
    </StrictMode>
  )
}
