import Text from '@/components/CustomText'
import TextInput from '@/components/CustomTextInput'
import { useSubscription } from '@/components/SubscriptionProvider'
import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { syncCaffeineToHealth, syncSugarToHealth } from '@/lib/healthService'
import { Ionicons } from '@expo/vector-icons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const NumericInput = ({
  value,
  onChange,
  style,
  placeholder,
  textAlign,
}: {
  value?: number
  onChange: (val: number) => void
  style?: any
  placeholder?: string
  textAlign?: 'left' | 'center' | 'right'
}) => {
  const [text, setText] = useState(value?.toString() ?? '')
  const lastEmittedValue = useRef<number | undefined>(value)

  useEffect(() => {
    // If the incoming value matches what we last emitted, don't update text
    // This preserves PlusJakartaSansmediate states like "1." or "0.0" while typing
    if (value === lastEmittedValue.current) return

    setText(value?.toString() ?? '')
    lastEmittedValue.current = value
  }, [value])

  const handleChangeText = (newText: string) => {
    setText(newText)

    // Handle empty string or just decimal point or minus sign
    if (newText === '' || newText === '.' || newText === '-') {
      // Don't emit 0 yet, just let the text update.
      // Or emit 0 if that's desired behavior.
      // For now, let's emit 0 if empty, but maybe keep previous value if just "."?
      // Actually, safer to just try parse.
      return
    }

    const numericValue = parseFloat(newText)
    if (!isNaN(numericValue)) {
      lastEmittedValue.current = numericValue
      onChange(numericValue)
    }
  }

  const handleBlur = () => {
    // On blur, force sync with the actual numeric value to clean up formatting
    if (value !== undefined) {
      setText(value.toString())
      lastEmittedValue.current = value
    }
  }

  return (
    <TextInput
      value={text}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      keyboardType="numeric"
      style={style}
      placeholder={placeholder}
      textAlign={textAlign}
    />
  )
}

const DrinkEditPage = () => {
  const router = useRouter()
  const { drinkId } = useLocalSearchParams<{ drinkId: string }>()
  const insets = useSafeAreaInsets()

  const drink = useQuery(api.drinks.getDrink, {
    drinkId: drinkId as Id<'drinks'>,
  })

  const updateDrink = useMutation(api.drinks.updateDrink)
  const analyzeHealth = useAction(api.drinkAnalysis.analyzeDrinkHealth)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { isPro } = useSubscription()

  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Doc<'drinks'>>({
    defaultValues: {
      drinkType: '',
      name: '',
      calories: 0,
      sugar: 0,
      sizeValue: 0,
      sizeUnit: 'ml',
      packaging: '',
      price: 0,
      caffeine: 0,
      isAlcoholic: false,
      alcoholContent: 0,
      healthScore: 0,
      healthScoreReason: '',
    },
  })

  // Reset form when drink data is loaded
  useEffect(() => {
    if (drink) {
      reset({
        drinkType: drink.drinkType,
        name: drink.name,
        calories: drink.calories,
        sugar: drink.sugar,
        sizeValue: drink.sizeValue,
        sizeUnit: drink.sizeUnit,
        packaging: drink.packaging,
        price: drink.price,
        imageId: drink.imageId,
        caffeine: drink.caffeine,
        isAlcoholic: drink.isAlcoholic,
        alcoholContent: drink.alcoholContent,
        healthScore: drink.healthScore,
        healthScoreReason: drink.healthScoreReason,
      })
    }
  }, [drink, reset])

  const isAlcoholic = watch('isAlcoholic')

  const onSubmit = async (data: Doc<'drinks'>) => {
    try {
      setIsAnalyzing(true)

      // 1. Update the drink with user edits (excluding health score)
      await updateDrink({
        drinkId: drinkId as Id<'drinks'>,
        updates: {
          drinkType: data.drinkType,
          name: data.name,
          calories: data.calories,
          sugar: data.sugar,
          sizeValue: data.sizeValue,
          sizeUnit: data.sizeUnit,
          packaging: data.packaging,
          price: data.price,
          caffeine: data.caffeine,
          isAlcoholic: data.isAlcoholic,
          alcoholContent: data.alcoholContent,
          // Don't update health score yet
        },
      })

      // 2. Analyze health based on new data
      const analysis = await analyzeHealth({
        name: data.name,
        drinkType: data.drinkType,
        calories: data.calories,
        sugar: data.sugar,
        caffeine: data.caffeine,
        isAlcoholic: data.isAlcoholic,
        alcoholContent: data.alcoholContent,
        sizeValue: data.sizeValue,
        sizeUnit: data.sizeUnit,
      })

      // 3. Update the health score
      await updateDrink({
        drinkId: drinkId as Id<'drinks'>,
        updates: {
          healthScore: analysis.healthScore,
          healthScoreReason: analysis.healthScoreReason,
          socialHook: analysis.socialHook,
        },
      })

      // 4. Sync to Apple Health
      if (data.sugar && data.sugar > 0) {
        await syncSugarToHealth(data.sugar)
      }
      if (data.caffeine && data.caffeine > 0) {
        await syncCaffeineToHealth(data.caffeine)
      }

      router.back()
    } catch (error) {
      console.error('Failed to update drink:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!drink) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  if (!isPro) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center', padding: 20 },
        ]}
      >
        <MaterialCommunityIcons
          name="lock"
          size={50}
          color={primary[500]}
          style={{ marginBottom: 20 }}
        />
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'PlusJakartaSans_700Bold',
            textAlign: 'center',
            marginBottom: 10,
            color: 'black',
          }}
        >
          Drinks Editing Locked
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontFamily: 'PlusJakartaSans_400Regular',
            textAlign: 'center',
            color: gray[600],
            lineHeight: 22,
          }}
        >
          Your trial has ended. Upgrade to Premium to edit drinks and unlock new
          AI health assessments.
        </Text>
        <View style={{ marginTop: 30, width: '100%', paddingHorizontal: 40 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              paddingHorizontal: 30,
              paddingVertical: 15,
              backgroundColor: gray[200],
              borderRadius: 25,
              marginBottom: 15,
            }}
          >
            <Text
              style={{
                color: 'black',
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 16,
                textAlign: 'center',
              }}
            >
              Go Back
            </Text>
          </Pressable>
          <LinearGradient
            colors={[primary[400], primary[600]]}
            style={{ borderRadius: 25, overflow: 'hidden' }}
          >
            <Pressable
              onPress={() => {
                /* TODO: Open Paywall */
              }}
              style={{ paddingHorizontal: 30, paddingVertical: 15 }}
            >
              <Text
                style={{
                  color: 'white',
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: 16,
                  textAlign: 'center',
                }}
              >
                Go Pro
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Image Section */}
          <View style={styles.headerContainer}>
            {drink.imageUrl ? (
              <Image
                source={{ uri: drink.imageUrl ?? undefined }}
                style={styles.headerImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.headerImage,
                  styles.placeholderHeader,
                  drink.drinkType === 'Water' && { backgroundColor: '#e3f2fd' },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    drink.drinkType === 'Water'
                      ? 'water'
                      : 'bottle-soda-classic'
                  }
                  size={80}
                  color={
                    drink.drinkType === 'Water'
                      ? '#2196f3'
                      : 'rgba(255,255,255,0.5)'
                  }
                />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.25)']}
              style={styles.headerGradient}
            />
            <Pressable
              style={[styles.backButton, { top: insets.top + 10 }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{drink.name}</Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.contentContainer}>
            {/* Basic Info Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Essentials</Text>

              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      style={styles.input}
                      placeholder="Drink Name"
                    />
                  </View>
                )}
              />

              <View style={styles.row}>
                <Controller
                  control={control}
                  name="drinkType"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <View
                      style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}
                    >
                      <Text style={styles.label}>Type</Text>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        style={styles.input}
                        placeholder="Soda, Tea, etc."
                      />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="price"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <View style={[styles.inputGroup, { flex: 0.6 }]}>
                      <Text style={styles.label}>Price ($)</Text>
                      <NumericInput
                        value={value}
                        onChange={onChange}
                        style={styles.input}
                        placeholder="0.00"
                      />
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Nutrition Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Nutrition Facts</Text>
              </View>

              <View style={styles.statsGrid}>
                <Controller
                  control={control}
                  name="calories"
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.statItem}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: '#FFF0E6' },
                        ]}
                      >
                        <Ionicons name="flame" size={20} color="#FF6B00" />
                      </View>
                      <Text style={styles.statLabel}>Calories</Text>
                      <NumericInput
                        value={value}
                        onChange={onChange}
                        style={styles.statInput}
                        textAlign="center"
                      />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="sugar"
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.statItem}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: '#E6F4FF' },
                        ]}
                      >
                        <Ionicons name="cube" size={20} color="#0091FF" />
                      </View>
                      <Text style={styles.statLabel}>Sugar (g)</Text>
                      <NumericInput
                        value={value}
                        onChange={onChange}
                        style={styles.statInput}
                        textAlign="center"
                      />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="caffeine"
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.statItem}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: '#F0E6FF' },
                        ]}
                      >
                        <Ionicons name="flash" size={20} color="#7B00FF" />
                      </View>
                      <Text style={styles.statLabel}>Caffeine (mg)</Text>
                      <NumericInput
                        value={value}
                        onChange={onChange}
                        style={styles.statInput}
                        textAlign="center"
                      />
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Details</Text>

              <View style={styles.row}>
                <Controller
                  control={control}
                  name="sizeValue"
                  render={({ field: { value, onChange } }) => (
                    <View
                      style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}
                    >
                      <Text style={styles.label}>Size</Text>
                      <NumericInput
                        value={value}
                        onChange={onChange}
                        style={styles.input}
                        placeholder="330"
                      />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="sizeUnit"
                  render={({ field: { value, onChange } }) => (
                    <View style={[styles.inputGroup, { flex: 0.6 }]}>
                      <Text style={styles.label}>Unit</Text>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        style={styles.input}
                        placeholder="ml"
                      />
                    </View>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="packaging"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Packaging</Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      style={styles.input}
                      placeholder="Can, Bottle, etc."
                    />
                  </View>
                )}
              />

              <View style={styles.divider} />

              <Controller
                control={control}
                name="isAlcoholic"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Alcoholic Beverage</Text>
                    <Switch
                      value={value}
                      onValueChange={onChange}
                      trackColor={{ false: '#767577', true: '#000' }}
                      thumbColor={value ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                )}
              />

              {isAlcoholic && (
                <Controller
                  control={control}
                  name="alcoholContent"
                  render={({ field: { value, onChange } }) => (
                    <View style={[styles.inputGroup, { marginTop: 10 }]}>
                      <Text style={styles.label}>Alcohol Content (%)</Text>
                      <NumericInput
                        value={value}
                        onChange={onChange}
                        style={styles.input}
                        placeholder="5.0"
                      />
                    </View>
                  )}
                />
              )}
            </View>

            {/* Health Score Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Health Assessment (AI Generated)
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Health Score (1-10)</Text>
                <View style={styles.scoreContainer}>
                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor:
                          drink.healthScore > 7
                            ? '#4CAF50'
                            : drink.healthScore > 4
                              ? '#FFC107'
                              : '#F44336',
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                      },
                    ]}
                  >
                    <Text style={[styles.scoreBadgeText, { fontSize: 24 }]}>
                      {drink.healthScore}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_400Regular',
                        color: gray[600],
                        fontSize: 14,
                      }}
                    >
                      This score is calculated by AI based on the nutritional
                      values.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reasoning</Text>
                <View
                  style={[
                    styles.input,
                    {
                      backgroundColor: '#F2F2F7',
                      minHeight: 60,
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      color: '#000',
                      fontSize: 16,
                    }}
                  >
                    {drink.healthScoreReason}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Save Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => [
              styles.saveButton,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            disabled={isSubmitting}
          >
            {isAnalyzing ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <ActivityIndicator color="white" />
                <Text style={styles.saveButtonText}>Analyzing Health...</Text>
              </View>
            ) : isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

export default DrinkEditPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  placeholderHeader: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitleContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_700Bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 4,
  },
  contentContainer: {
    marginTop: -20,
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#000',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: gray[600],
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: gray[600],
    marginBottom: 4,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  statInput: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 4,
    minWidth: 40,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: '#000',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreInput: {
    flex: 1,
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadgeText: {
    color: 'white',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
})
