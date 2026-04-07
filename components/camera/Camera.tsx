import Text from '@/components/CustomText'
import { PulseLoader } from '@/components/PulseLoader'
import { gray, primary } from '@/constants/colors'
import { Doc } from '@/convex/_generated/dataModel'
import { authClient } from '@/lib/auth-client'
import AntDesign from '@expo/vector-icons/AntDesign'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Ionicons from '@expo/vector-icons/Ionicons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Button, Linking, Pressable, StyleSheet, View } from 'react-native'
import ErrorBox from './ErrorBox'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ConvexError } from 'convex/values'

type ErrorType = {
  error: string
  message: string
  reason?: string
  confidence?: number
  suggestion?: string
}

const SAVAGE_MESSAGES = [
  'Judging your recent life choices...',
  'Calculating sugar crash trajectory...',
  'Consulting the hydration experts...',
  'How do I put it nicely...',
  'Preparing emotional damage...',
  'Analyzing liquid calories...',
  'Summoning the savage AI...',
  'Measuring caffeine levels...',
]

const Camera = () => {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [showCamera, setShowCamera] = useState(true)
  const [image, setImage] = useState<string | null>(null)
  const [drinkData, setDrinkData] = useState<Doc<'drinks'> | null>(null)
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off')
  const cameraRef = useRef<CameraView>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ErrorType | null>(null)
  const [invalidCount, setInvalidCount] = useState(0)

  const processDrinkImage = useAction(api.aiHandler.aiHandler)

  useEffect(() => {
    if (drinkData && image) {
      router.replace({
        pathname: './drinkDetailsPage',
        params: { drinkId: drinkData._id },
      })
    }
  }, [drinkData, image, router])

  const sendImagetoAPI = async (imageBase64: string) => {
    try {
      const now = new Date()
      const localDayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      const responseDrinkData = await processDrinkImage({ imageBase64, localDayKey })
      console.log('AI Response (Drink Data):', responseDrinkData)
      setDrinkData(responseDrinkData)
    } catch (e: any) {
      console.error('catch block error:', e)
      
      if (e instanceof ConvexError) {
        const errorData = (e as any).data
        if (errorData?.error === 'Unauthorized') {
          setError(errorData)
          await authClient.signOut()
          setIsLoading(false)
          router.replace('/(public)')
          return
        }

        if (
          errorData?.error === 'not_a_drink' ||
          errorData?.error === 'low_confidence' ||
          errorData?.error === 'unclear_image'
        ) {
          setError(errorData)
          setInvalidCount((prev) => prev + 1)
        } else {
          setError({
            error: errorData?.error || 'Error',
            message: errorData?.message || e.message
          })
        }
      } else {
        setError({
          error: 'Error',
          message: e.message || 'API request failed'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })
    if (!result.canceled) {
      setImage(result.assets[0].uri)
      const imageBase64 = await new File(result.assets[0].uri).base64()
      setIsLoading(true)
      setError(null)
      sendImagetoAPI(imageBase64)
    }
  }

  const takePicture = async () => {
    if (cameraRef.current && !isLoading) {
      setIsLoading(true)
      setError(null)

      const photo = await cameraRef.current.takePictureAsync()
      if (!photo) {
        throw new Error('Failed to take picture.')
      }
      setImage(photo.uri)
      // Convert image to base64

      const imageBase64 = await new File(photo.uri).base64()
      sendImagetoAPI(imageBase64)
    }
  }

  // console.log('Invalid Count ----> ', invalidCount)
  // console.log('error reason ----> ', error?.reason)

  if (!permission) {
    // Camera permissions are still loading.
    return <View />
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button
          onPress={
            permission.canAskAgain ? requestPermission : Linking.openSettings
          }
          title={
            permission.canAskAgain
              ? 'Grant Permission to\naccess Camera'
              : 'Open Settings'
          }
          color={primary[200]}
        />
      </View>
    )
  }
  if (showCamera) {
    return (
      <View style={{ flex: 1, position: 'relative' }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          onCameraReady={() => console.log('Camera ready')}
          flash={flashMode}
          ratio="4:3"
        />
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            // backgroundColor: 'orange',
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly',
          }}
        >
          {/* camera flash button */}
          <Pressable
            style={{
              width: 45,
              height: 40,
              borderRadius: 10,
              backgroundColor: gray[100],
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setFlashMode(flashMode === 'on' ? 'off' : 'on')}
            disabled={!!error}
          >
            {flashMode === 'on' ? (
              <Ionicons name="flash-sharp" size={24} color="orange" />
            ) : (
              <Ionicons name="flash-off" size={24} color="black" />
            )}
          </Pressable>
          {/* Take picture button */}
          <Pressable
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: gray[950],
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={takePicture}
            disabled={!!error}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: gray[500],
                backgroundColor: 'transparent',
              }}
            />
          </Pressable>
          {/* Pick from library button */}
          <Pressable
            style={{
              width: 45,
              height: 40,
              borderRadius: 10,
              backgroundColor: gray[100],
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={pickImage}
            disabled={!!error}
          >
            <FontAwesome name="picture-o" size={24} color="black" />
          </Pressable>
        </View>
        {/* Close button */}
        <Pressable
          style={{
            position: 'absolute',
            top: 30,
            right: 20,
            width: 30,
            height: 30,
            borderRadius: 20,
            backgroundColor: gray[950],
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => {
            router.back()
            setShowCamera(false)
          }}
        >
          <AntDesign name="close" size={20} color="white" />
        </Pressable>

        <Stack.Screen options={{ gestureEnabled: !isLoading }} />
        {/* Loading Overlay */}
        {isLoading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              // backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* <ActivityIndicator size="large" color="white" /> */}
            <PulseLoader msg={SAVAGE_MESSAGES} />
          </View>
        )}
        {/* Unified Error/Recovery Box */}
        {error && !isLoading && (
          <ErrorBox
            error={error}
            setError={setError}
            invalidCount={invalidCount}
            setInvalidCount={setInvalidCount}
          />
        )}
      </View>
    )
  }
}

export default Camera

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: 64,
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
})
