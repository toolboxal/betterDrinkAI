import { gray, ratingColor } from '@/constants/colors'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import Text from '../CustomText'

type ErrorType = {
  error: string
  message: string
  reason?: string
  confidence?: number
  suggestion?: string
}

type ErrorProps = {
  error: ErrorType
  setError: React.Dispatch<React.SetStateAction<ErrorType | null>>
  invalidCount: number
  setInvalidCount: React.Dispatch<React.SetStateAction<number>>
}

const ErrorBox = ({
  error,
  setError,
  invalidCount,
  setInvalidCount,
}: ErrorProps) => {
  const router = useRouter()
  const isHighFailure = invalidCount >= 3

  const handleRetry = () => {
    setError(null)
    // We don't necessarily reset invalidCount on every retry,
    // but maybe we should if the user is cleared of the error?
    // Actually, keeping the count helps trigger the "Add Manually" option.
    // If they click "Try Again" after 3 failures, we could either keep showing it or reset.
    // Let's reset it if they explicitly hit retry to give them a fresh start if they want.
    if (isHighFailure) {
      setInvalidCount(0)
    }
  }

  const handleManualAdd = () => {
    setError(null)
    setInvalidCount(0)
    // Going back to the dashboard often provides the "Add Drink" options again.
    // If a specific manual input page is created, this route should be updated.
    router.back()
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          isHighFailure && styles.highFailureIconContainer,
        ]}
      >
        <Ionicons
          name={isHighFailure ? 'help-circle' : 'warning'}
          size={32}
          color={isHighFailure ? gray[700] : ratingColor.poor}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {isHighFailure ? 'Still having trouble?' : error.message}
        </Text>

        <Text style={styles.reason}>
          {isHighFailure
            ? "We're struggling to recognize this drink. You might want to try better lighting or just add it manually."
            : error.reason || 'Something went wrong while analyzing the image.'}
        </Text>

        {error.suggestion && error.suggestion !== 'N/A' && !isHighFailure && (
          <View style={styles.suggestionContainer}>
            <Text style={styles.suggestion}>💡 {error.suggestion}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleRetry}
          style={[
            styles.btn,
            isHighFailure ? styles.secondaryBtn : styles.primaryBtn,
          ]}
        >
          <Text
            style={[styles.btnText, isHighFailure && styles.secondaryBtnText]}
          >
            Try Again
          </Text>
        </Pressable>

        {isHighFailure && (
          <Pressable
            onPress={handleManualAdd}
            style={[styles.btn, styles.primaryBtn]}
          >
            <Text style={styles.btnText}>Add Manually</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

export default ErrorBox

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  highFailureIconContainer: {
    backgroundColor: gray[50],
  },
  content: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: gray[950],
    textAlign: 'center',
    marginBottom: 8,
  },
  reason: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: gray[50],
    borderRadius: 12,
  },
  suggestion: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: gray[700],
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: gray[950],
  },
  secondaryBtn: {
    backgroundColor: gray[100],
  },
  btnText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  secondaryBtnText: {
    color: gray[950],
  },
})
