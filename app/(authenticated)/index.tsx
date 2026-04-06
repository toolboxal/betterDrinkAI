import { Button, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { authClient } from '@/lib/auth-client'

const AuthenticatedPage = () => {
  const { data: session } = authClient.useSession()

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authenticated Page</Text>
      {session?.user && (
        <Text style={styles.userText}>Logged in as: {session.user.name}</Text>
      )}
      <Button title="Sign Out" onPress={handleSignOut} color="#FF6347" />
    </View>
  )
}

export default AuthenticatedPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 40,
  },
})
