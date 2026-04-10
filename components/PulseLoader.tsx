import { blue } from '@/constants/colors'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Text from './CustomText'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { Circle, Defs, RadialGradient, Stop, Svg } from 'react-native-svg'

export const PulseLoader = ({ msg }: { msg: string[] }) => {
  const [messageIndex, setMessageIndex] = useState(0)
  if (msg.length === 0) {
    return null // or render a default state
  }
  const scale = useSharedValue(1)
  const rippleScale = useSharedValue(1)
  const rippleOpacity = useSharedValue(0.5)

  useEffect(() => {
    setMessageIndex(0) // Reset on msg change
    // Message rotation
    const intervalId = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % msg.length)
    }, 1500)

    // Main circle pulse
    scale.value = withRepeat(
      withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    )

    // Ripple effect
    rippleScale.value = withRepeat(
      withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    )
    rippleOpacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    )

    return () => clearInterval(intervalId)
  }, [msg.length])

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }))

  return (
    <View style={styles.container}>
      {/* Ripple */}
      <Animated.View style={[styles.ripple, rippleAnimatedStyle]} />

      {/* Main Circle */}
      <Animated.View style={[styles.mainCircle, mainAnimatedStyle]}>
        <View style={styles.svgContainer}>
          <Svg height="100%" width="100%" viewBox="0 0 200 200">
            <Defs>
              <RadialGradient
                id="grad"
                cx="50%"
                cy="50%"
                rx="50%"
                ry="50%"
                fx="50%"
                fy="50%"
              >
                <Stop offset="85%" stopColor="#fff" stopOpacity="0" />
                <Stop offset="100%" stopColor={blue[400]} stopOpacity="0.08" />
              </RadialGradient>
            </Defs>
            <Circle cx="100" cy="100" r="100" fill="url(#grad)" />
          </Svg>
        </View>
        <Text style={styles.text}>{msg[messageIndex]}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 300,
  },
  mainCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: blue[50],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    elevation: 10,
    shadowColor: blue[500],
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 2,
  },
  ripple: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: blue[100],
    position: 'absolute',
    opacity: 0.2,
    zIndex: 1,
  },
  text: {
    fontSize: 18,
    color: blue[950],
    fontFamily: 'PlusJakartaSans_300Light',
    textAlign: 'center',
    lineHeight: 24,
  },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
    overflow: 'hidden',
  },
})
