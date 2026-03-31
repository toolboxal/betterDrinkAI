import { gray, primary } from '@/constants/colors'
import AntDesign from '@expo/vector-icons/AntDesign'
import { useRouter } from 'expo-router'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authClient } from '@/lib/auth-client'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'

const OauthModal = ({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) => {
  const router = useRouter()
  const { bottom } = useSafeAreaInsets()

  const handleLogin = async (typeofOauth: 'google' | 'apple') => {
    if (typeofOauth === 'apple' && Platform.OS === 'ios') {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        })

        if (credential.identityToken) {
          const { error } = await authClient.signIn.social({
            provider: 'apple',
            idToken: { token: credential.identityToken },
          })

          if (error) {
            console.error('Native Apple Auth Error:', error)
            return
          }
          router.replace('/(authenticated)')
        }
      } catch (e: any) {
        if (e.code !== 'ERR_REQUEST_CANCELED') {
          console.error('Apple Sign-In Error:', e)
        }
      }
      return
    }

    // Default web-based OAuth for Google or Android-Apple
    const { error } = await authClient.signIn.social({
      provider: typeofOauth,
      callbackURL: 'betterdrinkai://(authenticated)',
    })
    if (error) {
      console.error(`${typeofOauth} Auth Error:`, error)
      return
    }
    router.replace('/(authenticated)')
  }

  return (
    <Modal
      style={{ flex: 1, backgroundColor: 'none' }}
      visible={visible}
      onRequestClose={onClose}
      transparent={true}
      animationType="slide"
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.modalContainer, { marginBottom: bottom }]}>
        <Pressable style={styles.authBtn} onPress={() => handleLogin('apple')}>
          <AntDesign name="apple" size={24} color={primary[900]} />
          <Text style={styles.btnText}>Continue with Apple</Text>
        </Pressable>
        <Pressable
          style={[styles.authBtn]}
          onPress={() => handleLogin('google')}
        >
          <AntDesign name="google" size={24} color={primary[900]} />
          <Text style={styles.btnText}>Continue with Google</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

export default OauthModal

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: primary[100],
    borderRadius: 30,
    padding: 10,
    width: '95%',
    marginHorizontal: 'auto',
    gap: 15,
  },
  overlay: {
    flex: 3,
  },
  authBtn: {
    padding: 15,
    width: '90%',
    marginHorizontal: 'auto',
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'white',
  },
  btnText: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: primary[900],
    letterSpacing: -0.5,
  },

  lastUsedBadge: {
    position: 'absolute',
    top: -10,
    right: 15,
    backgroundColor: primary[900],
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 50,
  },
  lastUsedText: {
    color: primary[50],
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
})
