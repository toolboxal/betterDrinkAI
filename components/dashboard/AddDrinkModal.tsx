import { useSubscription } from '@/components/SubscriptionProvider'
import { blue, gray } from '@/constants/colors'
import FontAwesome6 from '@expo/vector-icons/FontAwesome6'
import { useRouter } from 'expo-router'
import React from 'react'
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Text from '../CustomText'

const AddDrinkModal = ({
  visible,
  onClose,
  setShowAddWaterModal,
}: {
  visible: boolean
  onClose: () => void
  setShowAddWaterModal: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  const { bottom } = useSafeAreaInsets()
  const router = useRouter()
  const { isPro } = useSubscription()

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={[styles.overlay, { paddingBottom: bottom }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalCardContainer}>
          <Pressable
            style={styles.modalCard}
            onPress={() => {
              onClose()
              setShowAddWaterModal(true)
            }}
          >
            <Text style={styles.title}>{`Plain Water`}</Text>
            <FontAwesome6 name="glass-water" size={50} color={blue[500]} />
          </Pressable>
          <Pressable
            style={styles.modalCard}
            onPress={() => {
              onClose()
              if (isPro) {
                router.push('/(authenticated)/cameraPage')
              } else {
                Alert.alert(
                  'Camera Locked',
                  'Your trial has ended. Upgrade to Pro to use the AI Camera scanner.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Go Pro',
                      onPress: () => {
                        router.push('/(authenticated)/paywallPage')
                      },
                    },
                  ],
                )
              }
            }}
          >
            <Text style={styles.title}>{`Camera`}</Text>
            <View style={{ position: 'relative' }}>
              <FontAwesome6 name="camera" size={50} color={gray[950]} />
              {!isPro && (
                <View
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -12,
                    backgroundColor: '#fff',
                    borderRadius: 10,
                    padding: 2,
                  }}
                >
                  <FontAwesome6 name="lock" size={16} color={gray[950]} />
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

export default AddDrinkModal

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCardContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  modalCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  closeButton: {
    marginTop: 10,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
})
