import { authClient } from '@/lib/auth-client'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexProvider, ConvexReactClient, useConvexAuth } from 'convex/react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StrictMode, useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import {
  Raleway_100Thin,
  Raleway_100Thin_Italic,
  Raleway_200ExtraLight,
  Raleway_200ExtraLight_Italic,
  Raleway_300Light,
  Raleway_300Light_Italic,
  Raleway_400Regular,
  Raleway_400Regular_Italic,
  Raleway_500Medium,
  Raleway_500Medium_Italic,
  Raleway_600SemiBold,
  Raleway_600SemiBold_Italic,
  Raleway_700Bold,
  Raleway_700Bold_Italic,
  Raleway_800ExtraBold,
  Raleway_800ExtraBold_Italic,
  Raleway_900Black,
  Raleway_900Black_Italic,
  useFonts,
} from '@expo-google-fonts/raleway'

SplashScreen.preventAutoHideAsync()

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    expectAuth: true,
    unsavedChangesWarning: false,
  },
)

function InitialLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const segments = useSegments()
  const router = useRouter()

  const [loaded, error] = useFonts({
    Raleway_100Thin,
    Raleway_100Thin_Italic,
    Raleway_200ExtraLight,
    Raleway_200ExtraLight_Italic,
    Raleway_300Light,
    Raleway_300Light_Italic,
    Raleway_400Regular,
    Raleway_400Regular_Italic,
    Raleway_500Medium,
    Raleway_500Medium_Italic,
    Raleway_600SemiBold,
    Raleway_600SemiBold_Italic,
    Raleway_700Bold,
    Raleway_700Bold_Italic,
    Raleway_800ExtraBold,
    Raleway_800ExtraBold_Italic,
    Raleway_900Black,
    Raleway_900Black_Italic,
  })

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(authenticated)'

    if (isAuthenticated && !inAuthGroup) {
      // Redirect authenticated users to the home page
      router.replace('/(authenticated)')
    } else if (!isAuthenticated && inAuthGroup) {
      // Redirect unauthenticated users to the login/public page
      router.replace('/(public)')
    }
  }, [isAuthenticated, isLoading, segments])

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync()
    }
  }, [loaded, error])

  if (!loaded && !error) {
    return null
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(authenticated)" />
      </Stack.Protected>
    </Stack>
  )
}

export default function AuthLayout() {
  return (
    <StrictMode>
      <ConvexProvider client={convex}>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <InitialLayout />
        </ConvexBetterAuthProvider>
      </ConvexProvider>
    </StrictMode>
  )
}
