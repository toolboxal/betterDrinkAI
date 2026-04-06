import React from 'react'
import { Stack } from 'expo-router'

const SettingsPageLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[slug]" />
    </Stack>
  )
}

export default SettingsPageLayout
