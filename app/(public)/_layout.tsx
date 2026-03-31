import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const PublicLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboardingPage" />
    </Stack>
  )
}

export default PublicLayout

const styles = StyleSheet.create({})
