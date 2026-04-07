import TextInput from '@/components/CustomTextInput'
import { blue, gray } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from 'convex/react'
import React from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { z } from 'zod'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

import { syncWaterToHealth } from '@/lib/healthService'

const AddWaterModal = ({
  visible,
  onClose,
  date,
}: {
  visible: boolean
  onClose: () => void
  date?: Date
}) => {
  const createDrink = useMutation(api.drinks.createNewDrink)
  const { bottom } = useSafeAreaInsets()
  const handleAddWater = async (data: { amount: string }) => {
    const logDate = date || new Date()
    const amountMl = Number(data.amount)
    try {
      await createDrink({
        drink: {
          drinkType: 'Water',
          name: 'Plain Water',
          calories: 0,
          sugar: 0,
          caffeine: 0,
          isAlcoholic: false,
          healthScore: 10,
          healthScoreReason: 'Pure hydration, essential for health.',
          packaging: 'none',
          price: 0,
          timestamp: logDate.getTime(),
          dayKey: `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`,
          sizeValue: amountMl,
          sizeUnit: 'ml',
        },
      })
      // Sync to Apple Health
      try {
        await syncWaterToHealth(amountMl)
      } catch (healthError) {
        console.warn('Health sync failed, but water was logged:', healthError)
      }
      onClose()
    } catch (error) {
      console.error('Failed to log water:', error)
      // TODO: Show user-facing error notification
    }
  }

  const { handleSubmit, control } = useForm({
    resolver: zodResolver(
      z.object({
        amount: z
          .string()
          .min(1, 'Amount is required')
          .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
            message: 'Amount must be a positive number',
          }),
      }),
    ),
    defaultValues: {
      amount: '250',
    },
  })

  const amountValue = useWatch({
    control,
    name: 'amount',
    defaultValue: '250',
  })

  const parsedAmount = Number(amountValue)
  const rawCupSize = isNaN(parsedAmount) ? 0 : parsedAmount / 250
  const cupSize = Number.isInteger(rawCupSize)
    ? rawCupSize
    : rawCupSize.toFixed(1)

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={[styles.overlay]}>
        <AnimatedPressable
          style={styles.backdrop}
          onPress={onClose}
          entering={FadeIn.delay(400).duration(500)}
          exiting={FadeOut}
        />
        <KeyboardAvoidingView behavior="padding" style={styles.container}>
          <View style={styles.container}>
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.title}>You are logging</Text>
              <Text
                style={[styles.title, { color: blue[600], fontSize: 34 }]}
              >{`${cupSize} ${
                Number(cupSize) <= 1 ? 'cup' : 'cups'
              } water`}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                // backgroundColor: 'pink',
                justifyContent: 'flex-start',
              }}
            >
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    style={styles.textInputStyle}
                    keyboardType="numeric"
                    // autoFocus={true}
                    cursorColor="black"
                    maxLength={4}
                  />
                )}
              />
              <Text
                style={{
                  fontSize: 35,
                  fontFamily: 'Montserrat_700Bold',
                  color: gray[300],
                }}
              >
                ml
              </Text>
            </View>
            <Pressable
              style={[styles.logButton, { marginBottom: bottom }]}
              onPress={handleSubmit(handleAddWater)}
            >
              <Text style={styles.logButtonText}>Log Water</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

export default AddWaterModal

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
  title: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#000',
    textAlign: 'left',
    lineHeight: 38,
  },
  container: {
    backgroundColor: blue[50],
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
    borderRadius: 30,
  },
  textInputStyle: {
    backgroundColor: blue[50],
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 40,
    paddingHorizontal: 5,
    color: gray[950],
    // minWidth: 110,
  },
  logButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
})
