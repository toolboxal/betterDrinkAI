import Text from '@/components/CustomText'
import { PulseLoader } from '@/components/PulseLoader'
import { api } from '@/convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

const OnboardingProcessing = () => {
  const router = useRouter()
  const user = useQuery(api.users.current)
  const updateOnboarding = useMutation(api.users.updateOnboardingData)
  const [status, setStatus] = useState('Personalizing your experience...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processOnboarding = async () => {
      // 1. Wait for user to be created by webhook
      if (!user) {
        setStatus('Setting up your high-performance profile...')
        return
      }

      try {
        // 2. Retrieve data from SecureStore
        const savedData = await SecureStore.getItemAsync(
          'pendingOnboardingData',
        )
        if (!savedData) {
          // If no data, just go home
          router.replace('/(authenticated)/(tabs)')
          return
        }

        const onboardingData = JSON.parse(savedData)
        setStatus('Almost ready...')

        // 3. Call mutation
        await updateOnboarding({
          data: onboardingData,
        })

        // 4. Clear storage and redirect
        await SecureStore.deleteItemAsync('pendingOnboardingData')
        setStatus('Welcome to Defizz!')

        setTimeout(() => {
          router.replace('/(authenticated)/(tabs)')
        }, 1000)
      } catch (err: any) {
        console.error('Processing error:', err)
        setError('Something went wrong. Please try again.')
      }
    }

    processOnboarding()
  }, [user])

  const messages = [
    'Analyzing your hydration goals...',
    'Tuning the Savage AI engine...',
    'Connecting with Apple Health...',
    'Personalizing your insights...',
  ]

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % messages.length
      if (!user) {
        setStatus(messages[i])
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [user])

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(800)} style={styles.content}>
        <PulseLoader msg={[status]} />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  errorText: {
    color: '#FF4B4B',
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
})

export default OnboardingProcessing
