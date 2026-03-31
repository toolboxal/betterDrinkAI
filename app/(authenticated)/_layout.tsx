import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const AuthenticatedLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" />
    </Stack>
  )
}

export default AuthenticatedLayout

const styles = StyleSheet.create({})
