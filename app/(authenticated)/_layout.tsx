import React from 'react'
import { Stack } from 'expo-router'
import { Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import Text from '@/components/CustomText'

const AuthenticatedLayout = () => {
  const router = useRouter()
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="onboardingProcessing"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="cameraPage"
        options={{
          presentation: 'modal',
          headerTitle: 'Camera',
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()}>
                <Text>back</Text>
              </Pressable>
            )
          },
        }}
      />
      <Stack.Screen
        name="paywallPage"
        options={{
          presentation: 'card',
          headerTitle: 'Paywall',
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()}>
                <Text>back</Text>
              </Pressable>
            )
          },
        }}
      />
      <Stack.Screen
        name="drinkDetailsPage"
        options={{
          presentation: 'card',
          headerTitle: 'Drink Details',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="drinkEditPage"
        options={{
          presentation: 'card',
          headerTitle: 'Drink Edit',
          // gestureEnabled: false,
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()}>
                <Text>back</Text>
              </Pressable>
            )
          },
        }}
      />
      <Stack.Screen
        name="notificationPage"
        options={{
          presentation: 'card',
          headerShown: true,
          headerTitle: 'Notifications',
          // gestureEnabled: false,
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()}>
                <Text style={{ fontSize: 16, color: '#007AFF' }}>Back</Text>
              </Pressable>
            )
          },
        }}
      />
    </Stack>
  )
}

export default AuthenticatedLayout
