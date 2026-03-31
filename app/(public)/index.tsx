import SocialSignIn from '@/components/social-sign-in'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const PublicPage = () => {
  return (
    <View style={{ backgroundColor: 'orange', flex: 1 }}>
      <Text>PublicPage</Text>
      <SocialSignIn />
    </View>
  )
}

export default PublicPage

const styles = StyleSheet.create({})
