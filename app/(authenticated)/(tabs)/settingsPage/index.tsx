import { gray } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import {
  checkHealthPermissions,
  requestHealthPermissions,
} from '@/lib/healthService'
import Entypo from '@expo/vector-icons/Entypo'
import { useFocusEffect } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authClient } from '@/lib/auth-client'
import Text from '@/components/CustomText'

const SettingsPage = () => {
  const deleteAccount = useMutation(api.users.deleteAccount)

  const router = useRouter()
  const [isHealthConnected, setIsHealthConnected] = useState(false)

  const checkStatus = useCallback(async () => {
    const isAuthorized = await checkHealthPermissions()
    setIsHealthConnected(isAuthorized)
  }, [])

  useFocusEffect(
    useCallback(() => {
      checkStatus()
    }, [checkStatus]),
  )

  const handleHealthConnection = async () => {
    if (isHealthConnected) {
      Alert.alert('Apple Health', 'Your Apple Health is already connected.')
      return
    }

    // This might return "true" even if the user silently denied it,
    // because Apple hides the user's choice from developers!
    await requestHealthPermissions()

    // We MUST check the actual hard status afterward to see if it really connected
    const trueStatus = await checkHealthPermissions()

    if (trueStatus) {
      setIsHealthConnected(true)
      Alert.alert('Success', 'Apple Health connected successfully!')
    } else {
      Alert.alert(
        'Action Required',
        'Your phone requires manual approval. Please go to your iPhone Settings > Privacy & Security > Health > Drink Better, and turn all permissions ON.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openURL('app-settings:'),
          },
        ],
      )
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This will permanently delete all your drinks, history, and records. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Delete all data from Convex
              await deleteAccount()
              // 2. Sign out since the account is gone
              await authClient.signOut()
            } catch (error) {
              console.error(error)
              Alert.alert(
                'Error',
                'Failed to delete account. Please try again.',
              )
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 20 }}>
      <Text style={styles.headerText}>Settings</Text>
      {/* <Text style={styles.subHeader}>Account</Text> */}
      <View style={styles.container}>
        <Pressable
          style={styles.subContainer}
          onPress={() => router.push(`/settingsPage/user_profile`)}
        >
          <Text style={styles.contentText}>Your Profile</Text>
          <Entypo name="chevron-small-right" size={24} color="black" />
        </Pressable>
        <Pressable style={styles.subContainer} onPress={handleHealthConnection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.contentText}>Apple Health</Text>
            <View
              style={{
                padding: 4,
                borderRadius: 5,
                backgroundColor: isHealthConnected ? 'green' : gray[500],
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: 'Inter_400Regular',
                  color: 'white',
                }}
              >
                {isHealthConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </View>
          <Entypo
            name="chevron-small-right"
            size={24}
            color={isHealthConnected ? 'green' : 'black'}
          />
        </Pressable>
        <Pressable
          style={styles.subContainer}
          onPress={() => router.push(`/settingsPage/change_goal`)}
        >
          <Text style={styles.contentText}>Change Goal</Text>
          <Entypo name="chevron-small-right" size={24} color="black" />
        </Pressable>

        <Pressable
          style={styles.subContainer}
          onPress={() =>
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              {
                text: 'Cancel',
                onPress: () => console.log('Cancel Pressed'),
                style: 'cancel',
              },
              {
                text: 'Logout',
                onPress: async () => {
                  try {
                    await authClient.signOut()
                  } catch (error) {
                    Alert.alert('Error', 'Failed to logout. Please try again.')
                  }
                },
              },
            ])
          }
        >
          <Text style={styles.contentText}>Logout</Text>
          <Entypo name="chevron-small-right" size={24} color="black" />
        </Pressable>
        <Pressable style={styles.subContainer} onPress={handleDeleteAccount}>
          <Text style={[styles.contentText, { color: 'red' }]}>
            Delete Account
          </Text>
          <Entypo name="chevron-small-right" size={24} color="red" />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

export default SettingsPage

const styles = StyleSheet.create({
  headerText: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginVertical: 15,
  },
  subHeader: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginVertical: 10,
  },
  container: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    paddingVertical: 0,
    marginVertical: 20,
  },
  subContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: gray[200],
    paddingLeft: 10,
    paddingVertical: 15,
  },
  contentText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
})
