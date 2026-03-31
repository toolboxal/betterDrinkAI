import { authClient } from '@/lib/auth-client'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexProvider, ConvexReactClient, useConvexAuth } from 'convex/react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StrictMode, useEffect } from 'react'

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
          <InitialLayout />
        </ConvexBetterAuthProvider>
      </ConvexProvider>
    </StrictMode>
  )
}
