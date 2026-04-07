import { Redirect } from 'expo-router'
import React from 'react'

const Index = () => {
  return <Redirect href="/(authenticated)/(tabs)" />
}

export default Index
