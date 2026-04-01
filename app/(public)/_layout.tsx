import React from 'react'
import { Stack } from 'expo-router'

const PublicLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboardingPage" />
    </Stack>
  )
}

export default PublicLayout
