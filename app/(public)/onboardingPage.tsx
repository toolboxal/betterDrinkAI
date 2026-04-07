import Text from '@/components/CustomText'
import TextInput from '@/components/CustomTextInput'
import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { fetchHealthData, requestHealthPermissions } from '@/lib/healthService'
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Picker } from '@react-native-picker/picker'
import { useMutation, useQuery } from 'convex/react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import Purchases, { PurchasesOffering } from 'react-native-purchases'
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

type Focus =
  | 'reduce_sugar'
  | 'limit_caffeine'
  | 'quit_alcohol'
  | 'drink_more_water'
  | 'just_track'

type Motivation =
  | 'better_sleep'
  | 'improve_savings'
  | 'steady_energy'
  | 'body_transformation'
  | 'radiant_health'
  | 'mindful_sipping'
  | 'total_sobriety'

type ReferralSource =
  | 'social_media'
  | 'friend_family'
  | 'search_engine'
  | 'app_store'
  | 'advertisement'
  | 'other'

type OnboardingData = {
  username: string
  weight: number
  height: number
  birthDate: Date
  gender: string
  focus: Focus | ''
  motivation: Motivation | ''
  referralSource: ReferralSource | ''
}

const FOCUS_OPTIONS = [
  {
    id: 'reduce_sugar' as Focus,
    icon: '🍬',
    title: 'Cut Sugar',
    description: 'Reduce sugar from soda & drinks',
  },
  {
    id: 'limit_caffeine' as Focus,
    icon: '☕',
    title: 'Limit Caffeine',
    description: 'Better sleep & less jitters',
  },
  {
    id: 'drink_more_water' as Focus,
    icon: '💧',
    title: 'Drink More Water',
    description: 'Stay hydrated daily',
  },
  {
    id: 'quit_alcohol' as Focus,
    icon: '🍷',
    title: 'Cut Alcohol',
    description: 'Track and reduce intake',
  },
  {
    id: 'just_track' as Focus,
    icon: '📊',
    title: 'Just Track',
    description: 'Monitor without specific limits',
  },
]

const MOTIVATION_OPTIONS = [
  {
    id: 'better_sleep' as Motivation,
    icon: '💤',
    title: 'Better Sleep',
    description: 'Wake up feeling refreshed',
  },
  {
    id: 'improve_savings' as Motivation,
    icon: '💰',
    title: 'Improve Savings',
    description: 'Stop the daily drink tax',
  },
  {
    id: 'steady_energy' as Motivation,
    icon: '⚡',
    title: 'Steady Energy',
    description: 'No more afternoon slumps',
  },
  {
    id: 'body_transformation' as Motivation,
    icon: '🏗️',
    title: 'Body Transformation',
    description: 'Reach your weight goals',
  },
  {
    id: 'radiant_health' as Motivation,
    icon: '✨',
    title: 'Radiant Health',
    description: 'Skin clarity & vitality',
  },
  {
    id: 'mindful_sipping' as Motivation,
    icon: '🧘',
    title: 'Mindful Sipping',
    description: 'Break impulsive habits',
  },
  {
    id: 'total_sobriety' as Motivation,
    icon: '🏆',
    title: 'Total Sobriety',
    description: 'Protect your streak & clarity',
  },
]

const REFERRAL_OPTIONS = [
  {
    id: 'social_media' as ReferralSource,
    icon: '📱',
    title: 'Social Media',
    description: 'Instagram, TikTok, Twitter, etc.',
  },
  {
    id: 'friend_family' as ReferralSource,
    icon: '👥',
    title: 'Friend or Family',
    description: 'Someone recommended it',
  },
  {
    id: 'search_engine' as ReferralSource,
    icon: '🔍',
    title: 'Search Engine',
    description: 'Google, Bing, etc.',
  },
  {
    id: 'app_store' as ReferralSource,
    icon: '📲',
    title: 'App Store',
    description: 'Found while browsing',
  },
  {
    id: 'advertisement' as ReferralSource,
    icon: '📢',
    title: 'Advertisement',
    description: 'Saw an ad online',
  },
  {
    id: 'other' as ReferralSource,
    icon: '💭',
    title: 'Other',
    description: 'Another way',
  },
]

const ProgressBar = ({
  totalSteps,
  currentStep,
}: {
  totalSteps: number
  currentStep: number
}) => {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming((currentStep + 1) / totalSteps, {
      duration: 500,
    })
  }, [currentStep, totalSteps])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View style={[styles.progressBarFill, animatedStyle]} />
    </View>
  )
}

const TOTAL_STEPS = 10

const OnboardingPage = () => {
  const { top, bottom } = useSafeAreaInsets()
  const router = useRouter()
  const updateOnboarding = useMutation(api.users.updateOnboardingData)

  const [currentPage, setCurrentPage] = useState(0)
  const [healthLoading, setHealthLoading] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    username: '',
    weight: 70,
    height: 170,
    birthDate: new Date(),
    gender: '',
    focus: '',
    motivation: '',
    referralSource: '',
  })
  const [didSyncHealth, setDidSyncHealth] = useState(false)
  const [debouncedUsername, setDebouncedUsername] = useState(
    onboardingData.username,
  )

  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly')
  const [offering, setOffering] = useState<PurchasesOffering | null>(null)
  const [isLoadingOffers, setIsLoadingOffers] = useState(true)
  const monthlyPrice = offering?.monthly?.product?.price ?? 0
  const annualPrice = offering?.annual?.product?.price ?? 0
  const perMonthCalc = annualPrice > 0 ? annualPrice / 12 : 0
  const savings = monthlyPrice > 0 ? monthlyPrice - perMonthCalc : 0
  const savingsPercentage =
    monthlyPrice > 0 ? (savings / monthlyPrice) * 100 : 0
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings()
        if (offerings.current !== null) {
          setOffering(offerings.current)
        }
      } catch (e) {
        console.error('Error fetching offerings', e)
      } finally {
        setIsLoadingOffers(false)
      }
    }
    fetchOfferings()
  }, [])

  const handleSubscribe = async () => {
    if (!offering) return

    try {
      const packageToBuy =
        selected === 'monthly' ? offering.monthly : offering.annual
      if (packageToBuy) {
        await Purchases.purchasePackage(packageToBuy)
        goToNextPage()
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('Error purchasing', e)
        Alert.alert('Purchase Error', e.message)
      }
    }
  }

  const handleRestore = async () => {
    try {
      setIsLoadingOffers(true)
      const customerInfo = await Purchases.restorePurchases()
      if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
        Alert.alert('Success', 'Your purchases have been restored!')
        goToNextPage()
      } else {
        Alert.alert(
          'No pass found',
          "We couldn't find an active Pro subscription for your account.",
        )
      }
    } catch (e: any) {
      console.error('Error restoring', e)
      Alert.alert('Error', 'There was a problem restoring your purchases.')
    } finally {
      setIsLoadingOffers(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(onboardingData.username.toLowerCase().trim())
    }, 500)
    return () => clearTimeout(timer)
  }, [onboardingData.username])

  const isUsernameAvailable = useQuery(
    api.users.checkUsernameAvailability,
    debouncedUsername.length >= 3 ? { username: debouncedUsername } : 'skip',
  )

  const goToNextPage = () => {
    if (currentPage === 1 && didSyncHealth) {
      setCurrentPage(5)
      return
    }
    if (currentPage < TOTAL_STEPS - 1) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const goBack = () => {
    if (currentPage === 5 && didSyncHealth) {
      setCurrentPage(1)
      return
    }
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1)
    } else {
      router.replace('/(public)')
    }
  }

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

    // Default web-based OAuth for Google
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

  const renderHeader = (isFirst: boolean) => (
    <View style={styles.headerContainer}>
      <Pressable onPress={goBack} style={styles.backBtnWrapper}>
        <View style={styles.iconCircle}>
          <Ionicons name="arrow-back" size={24} color={primary[900]} />
        </View>
      </Pressable>
      <View style={styles.progressWrapper}>
        <ProgressBar totalSteps={TOTAL_STEPS} currentStep={currentPage} />
      </View>
      <View style={styles.placeholderIcon} />
    </View>
  )

  return (
    <View
      style={[
        styles.container,
        { paddingTop: top, backgroundColor: '#FFFFFF' },
      ]}
    >
      {renderHeader(currentPage === 0)}
      <View style={styles.pagerView}>
        <Animated.View
          key={`page-${currentPage}`}
          entering={FadeInRight.duration(400).springify()}
          exiting={FadeOutLeft.duration(400)}
          style={{ flex: 1 }}
        >
          {currentPage === 0 && (
            <View key="0" style={styles.page}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.pageContent}>
                  <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={styles.title}>What should we call you?</Text>
                    <Text style={styles.subtitle}>
                      Let's personalize your experience.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>username</Text>
                      <TextInput
                        value={onboardingData.username}
                        onChangeText={(text) =>
                          setOnboardingData({
                            ...onboardingData,
                            username: text,
                          })
                        }
                        style={styles.inputElement}
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {onboardingData.username.length >= 3 && (
                      <Animated.View entering={FadeInDown}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: 'Montserrat_500Medium',
                            marginTop: -15,
                            marginBottom: 15,
                            color:
                              debouncedUsername !==
                                onboardingData.username.toLowerCase().trim() ||
                              isUsernameAvailable === undefined
                                ? gray[400]
                                : isUsernameAvailable
                                  ? '#4ADE80'
                                  : '#FF4B4B',
                          }}
                        >
                          {debouncedUsername !==
                            onboardingData.username.toLowerCase().trim() ||
                          isUsernameAvailable === undefined
                            ? 'Checking...'
                            : isUsernameAvailable
                              ? 'Username is available'
                              : 'This username is already taken'}
                        </Text>
                      </Animated.View>
                    )}
                  </Animated.View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}

          {/* PAGE 2: Health Choice */}
          {currentPage === 1 && (
            <View key="1" style={styles.page}>
              <View style={styles.pageContent}>
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.title}>Health Data</Text>
                  <Text style={styles.subtitle}>
                    We need your basic vitals to calculate safe hydration limits
                    and health scores.
                  </Text>

                  <View style={styles.infoBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={gray[500]}
                    />
                    <Text style={styles.infoBoxText}>
                      We'll use your Birth Date, Gender, Height, and Weight.
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.appleHealthBtn,
                      { marginBottom: 16 },
                      healthLoading && { opacity: 0.7 },
                    ]}
                    onPress={async () => {
                      try {
                        setHealthLoading(true)
                        const success = await requestHealthPermissions()
                        if (success) {
                          const data = await fetchHealthData()
                          if (data) {
                            setOnboardingData((prev) => ({
                              ...prev,
                              birthDate: data.birthDate || prev.birthDate,
                              height: data.height || prev.height,
                              weight: data.weight || prev.weight,
                              gender: data.gender || prev.gender,
                            }))
                            setDidSyncHealth(true)
                            // Small delay to show "Syncing" before jumping
                            setTimeout(() => {
                              setHealthLoading(false)
                              setCurrentPage(5)
                            }, 800)
                          } else {
                            setHealthLoading(false)
                          }
                        } else {
                          setHealthLoading(false)
                          Alert.alert(
                            'Permission Denied',
                            "We couldn't access your Health data. You can still input it manually.",
                          )
                        }
                      } catch (error) {
                        console.error('HealthKit Error:', error)
                        setHealthLoading(false)
                        Alert.alert(
                          'Health Sync Error',
                          'There was a problem connecting to Apple Health.',
                        )
                      }
                    }}
                    disabled={healthLoading}
                  >
                    <MaterialCommunityIcons
                      name="apple"
                      size={22}
                      color="#FFFFFF"
                    />
                    <Text
                      style={[styles.appleHealthBtnText, { color: '#FFFFFF' }]}
                    >
                      {healthLoading ? 'Syncing...' : 'Sync with Apple Health'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.manualInputBtn}
                    onPress={() => {
                      setDidSyncHealth(false)
                      goToNextPage()
                    }}
                  >
                    <Text style={styles.manualInputBtnText}>
                      Input data manually
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          )}

          {/* PAGE 3: DOB */}
          {/* PAGE 3: Birth Year */}
          {currentPage === 2 && (
            <View key="2" style={styles.page}>
              <View style={styles.pageContent}>
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.title}>What year were you born?</Text>
                  <Text style={styles.subtitle}>
                    We use this to calculate your personalized hydration goals.
                  </Text>
                  <View style={styles.pickerSectionRow}>
                    <View style={styles.pickerWrapper}>
                      <View style={styles.pickerInner}>
                        <Picker
                          selectedValue={onboardingData.birthDate.getFullYear()}
                          onValueChange={(year: number) => {
                            const newDate = new Date(onboardingData.birthDate)
                            newDate.setFullYear(year)
                            newDate.setMonth(0)
                            newDate.setDate(1)
                            setOnboardingData({
                              ...onboardingData,
                              birthDate: newDate,
                            })
                          }}
                          style={{ width: '100%' }}
                          itemStyle={{ color: '#1C1C1E', height: 180 }}
                        >
                          {Array.from(
                            { length: 100 },
                            (_, i) => new Date().getFullYear() - i,
                          ).map((year) => (
                            <Picker.Item
                              key={year}
                              label={year.toString()}
                              value={year}
                              color="#1C1C1E"
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </View>
          )}

          {/* PAGE 3: Height & Weight */}
          {currentPage === 3 && (
            <View key="3" style={styles.page}>
              <View style={styles.pageContent}>
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.title}>Your Body Profile</Text>
                  <Text style={styles.subtitle}>
                    Crucial for accurate health insights.
                  </Text>

                  <View style={styles.pickerSectionRow}>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Height (cm)</Text>
                      <View style={styles.pickerInner}>
                        <Picker
                          selectedValue={onboardingData.height}
                          onValueChange={(value: number) =>
                            setOnboardingData({
                              ...onboardingData,
                              height: value,
                            })
                          }
                          style={styles.pickerItem}
                          itemStyle={{ color: '#1C1C1E' }}
                        >
                          {Array.from({ length: 151 }, (_, i) => i + 100).map(
                            (h) => (
                              <Picker.Item
                                key={h}
                                label={`${h} cm`}
                                value={h}
                                color="#1C1C1E"
                              />
                            ),
                          )}
                        </Picker>
                      </View>
                    </View>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Weight (kg)</Text>
                      <View style={styles.pickerInner}>
                        <Picker
                          selectedValue={onboardingData.weight}
                          onValueChange={(value: number) =>
                            setOnboardingData({
                              ...onboardingData,
                              weight: value,
                            })
                          }
                          style={styles.pickerItem}
                          itemStyle={{ color: '#1C1C1E' }}
                        >
                          {Array.from({ length: 151 }, (_, i) => i + 30).map(
                            (w) => (
                              <Picker.Item
                                key={w}
                                label={`${w} kg`}
                                value={w}
                                color="#1C1C1E"
                              />
                            ),
                          )}
                        </Picker>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </View>
          )}

          {/* PAGE 4: Gender */}
          {currentPage === 4 && (
            <View key="4" style={styles.page}>
              <View style={styles.pageContent}>
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.title}>Gender</Text>
                  <Text style={styles.subtitle}>
                    To tailor your metabolism tracking accurately.
                  </Text>
                  <View style={styles.genderRow}>
                    <Pressable
                      style={[
                        styles.genderCard,
                        onboardingData.gender === 'male' &&
                          styles.genderCardActive,
                      ]}
                      onPress={() =>
                        setOnboardingData({ ...onboardingData, gender: 'male' })
                      }
                    >
                      <Text
                        style={[
                          styles.genderCardText,
                          onboardingData.gender === 'male' &&
                            styles.genderCardTextActive,
                        ]}
                      >
                        Male
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.genderCard,
                        onboardingData.gender === 'female' &&
                          styles.genderCardActive,
                      ]}
                      onPress={() =>
                        setOnboardingData({
                          ...onboardingData,
                          gender: 'female',
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.genderCardText,
                          onboardingData.gender === 'female' &&
                            styles.genderCardTextActive,
                        ]}
                      >
                        Female
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            </View>
          )}

          {/* PAGE 5: Focus */}
          {currentPage === 5 && (
            <View key="5" style={styles.page}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.title}>What's your main priority?</Text>
                  <Text style={styles.subtitle}>
                    Select an area to focus your tracking on.
                  </Text>
                  <View style={styles.listContainer}>
                    {FOCUS_OPTIONS.map((option, index) => (
                      <Animated.View
                        key={option.id}
                        entering={FadeInDown.delay(
                          150 + index * 50,
                        ).springify()}
                      >
                        <Pressable
                          style={[
                            styles.selectCard,
                            onboardingData.focus === option.id &&
                              styles.selectCardActive,
                          ]}
                          onPress={() =>
                            setOnboardingData({
                              ...onboardingData,
                              focus: option.id,
                            })
                          }
                        >
                          <View style={styles.selectCardIconWrapper}>
                            <Text style={styles.selectCardEmoji}>
                              {option.icon}
                            </Text>
                          </View>
                          <View style={styles.selectCardTextContainer}>
                            <Text style={styles.selectCardTitle}>
                              {option.title}
                            </Text>
                            <Text style={styles.selectCardDesc}>
                              {option.description}
                            </Text>
                          </View>
                          <View style={styles.radioIndicator}>
                            {onboardingData.focus === option.id && (
                              <View style={styles.radioIndicatorInner} />
                            )}
                          </View>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>
              </ScrollView>
            </View>
          )}

          {/* PAGE 6: Motivation */}
          {currentPage === 6 && (
            <View key="6" style={styles.page}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.title}>What's your desired outcome?</Text>
                  <Text style={styles.subtitle}>
                    We'll tailor our insights to keep you motivated.
                  </Text>
                  <View style={styles.listContainer}>
                    {MOTIVATION_OPTIONS.map((option, index) => (
                      <Animated.View
                        key={option.id}
                        entering={FadeInDown.delay(
                          150 + index * 50,
                        ).springify()}
                      >
                        <Pressable
                          style={[
                            styles.selectCard,
                            onboardingData.motivation === option.id &&
                              styles.selectCardActive,
                          ]}
                          onPress={() =>
                            setOnboardingData({
                              ...onboardingData,
                              motivation: option.id,
                            })
                          }
                        >
                          <View style={styles.selectCardIconWrapper}>
                            <Text style={styles.selectCardEmoji}>
                              {option.icon}
                            </Text>
                          </View>
                          <View style={styles.selectCardTextContainer}>
                            <Text style={styles.selectCardTitle}>
                              {option.title}
                            </Text>
                            <Text style={styles.selectCardDesc}>
                              {option.description}
                            </Text>
                          </View>
                          <View style={styles.radioIndicator}>
                            {onboardingData.motivation === option.id && (
                              <View style={styles.radioIndicatorInner} />
                            )}
                          </View>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>
              </ScrollView>
            </View>
          )}

          {/* PAGE 7: Referral */}
          {currentPage === 7 && (
            <View key="7" style={styles.page}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.title}>Where did you find us?</Text>
                  <Text style={styles.subtitle}>Help us spread the word.</Text>
                  <View style={styles.listContainer}>
                    {REFERRAL_OPTIONS.map((option, index) => (
                      <Animated.View
                        key={option.id}
                        entering={FadeInDown.delay(
                          150 + index * 50,
                        ).springify()}
                      >
                        <Pressable
                          style={[
                            styles.selectCard,
                            onboardingData.referralSource === option.id &&
                              styles.selectCardActive,
                          ]}
                          onPress={() =>
                            setOnboardingData({
                              ...onboardingData,
                              referralSource: option.id,
                            })
                          }
                        >
                          <View style={styles.selectCardIconWrapper}>
                            <Text style={styles.selectCardEmoji}>
                              {option.icon}
                            </Text>
                          </View>
                          <View style={styles.selectCardTextContainer}>
                            <Text style={styles.selectCardTitle}>
                              {option.title}
                            </Text>
                            <Text style={styles.selectCardDesc}>
                              {option.description}
                            </Text>
                          </View>
                          <View style={styles.radioIndicator}>
                            {onboardingData.referralSource === option.id && (
                              <View style={styles.radioIndicatorInner} />
                            )}
                          </View>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>
              </ScrollView>
            </View>
          )}

          {/* PAGE 8: Paywall */}
          {currentPage === 8 && (
            <View key="8" style={styles.page}>
              <View style={[styles.pageContent, { paddingHorizontal: 24 }]}>
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text
                    style={[
                      styles.title,
                      { marginBottom: 15, textAlign: 'center' },
                    ]}
                  >
                    {`3 Days Free Trial with Full Access`}
                  </Text>

                  <View style={{ marginBottom: 20, gap: 10 }}>
                    <Text
                      style={styles.benefitsText}
                    >{`Drink Better AI that guides you to your goals.`}</Text>
                    <Text
                      style={styles.benefitsText}
                    >{`7 days analysis of your liquid choices.`}</Text>
                    <Text
                      style={styles.benefitsText}
                    >{`Full access to communities that share your goals.`}</Text>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      width: '100%',
                      marginTop: 10,
                    }}
                  >
                    <Pressable
                      style={[
                        styles.paywallFeatureContainer,
                        {
                          backgroundColor:
                            selected === 'monthly' ? primary[950] : 'white',
                          borderColor:
                            selected === 'monthly'
                              ? primary[100]
                              : primary[950],
                        },
                      ]}
                      onPress={() => setSelected('monthly')}
                    >
                      <Text
                        style={[
                          styles.paywallFeatureHeading,
                          {
                            color:
                              selected === 'monthly' ? 'white' : primary[950],
                          },
                        ]}
                      >
                        Monthly
                      </Text>
                      <Text
                        style={[
                          styles.paywallFeaturePrice,
                          {
                            color:
                              selected === 'monthly'
                                ? primary[300]
                                : primary[950],
                          },
                        ]}
                      >
                        {isLoadingOffers ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              selected === 'monthly'
                                ? primary[300]
                                : primary[950]
                            }
                          />
                        ) : (
                          offering?.monthly?.product?.priceString || '$...'
                        )}
                      </Text>
                      <Text
                        style={[
                          styles.paywallFeatureHeading,
                          {
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1.1,
                            color:
                              selected === 'monthly'
                                ? primary[300]
                                : primary[950],
                          },
                        ]}
                      >
                        per month
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.paywallFeatureContainer,
                        {
                          backgroundColor:
                            selected === 'yearly' ? primary[950] : 'white',
                          borderColor:
                            selected === 'yearly' ? 'white' : primary[950],
                          position: 'relative',
                        },
                      ]}
                      onPress={() => setSelected('yearly')}
                    >
                      <View style={styles.paywallSaveContainer}>
                        <Text
                          style={styles.paywallSaveText}
                        >{`SAVE ${savingsPercentage ? savingsPercentage.toFixed(0) : 0}%`}</Text>
                      </View>
                      <Text
                        style={[
                          styles.paywallFeatureHeading,
                          {
                            color:
                              selected === 'yearly' ? 'white' : primary[950],
                          },
                        ]}
                      >
                        Annual
                      </Text>
                      <Text
                        style={[
                          styles.paywallFeaturePrice,
                          {
                            color:
                              selected === 'yearly'
                                ? primary[300]
                                : primary[950],
                          },
                        ]}
                      >
                        {isLoadingOffers ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              selected === 'yearly'
                                ? primary[300]
                                : primary[950]
                            }
                          />
                        ) : (
                          offering?.annual?.product?.priceString || '$...'
                        )}
                      </Text>
                      <Text
                        style={[
                          styles.paywallFeatureHeading,
                          {
                            fontSize: 10,
                            letterSpacing: 1.1,
                            color:
                              selected === 'yearly'
                                ? primary[300]
                                : primary[950],
                          },
                        ]}
                      >
                        {perMonthCalc && offering?.annual?.product?.currencyCode
                          ? `ONLY ${offering.annual.product.currencyCode} ${perMonthCalc.toFixed(2)} / MONTH`
                          : 'PER YEAR'}
                      </Text>
                    </Pressable>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      marginTop: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        Linking.openURL(
                          'https://www.freeprivacypolicy.com/live/ebd5607b-ef22-4f3d-8fe0-36768a6e4648',
                        )
                      }
                    >
                      <Text
                        style={{
                          color: gray[500],
                          fontFamily: 'Montserrat_500Medium',
                          fontSize: 14,
                        }}
                      >
                        Terms of Use
                      </Text>
                    </Pressable>
                    <Pressable
                      style={{
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                        borderLeftColor: gray[500],
                        paddingHorizontal: 10,
                      }}
                      onPress={() =>
                        Linking.openURL(
                          'https://www.freeprivacypolicy.com/live/1f425620-52fa-4cc9-b004-d4c951cc2718',
                        )
                      }
                    >
                      <Text
                        style={{
                          color: gray[500],
                          fontFamily: 'Montserrat_500Medium',
                          fontSize: 14,
                        }}
                      >
                        Private Policy
                      </Text>
                    </Pressable>
                    <Pressable onPress={handleRestore}>
                      <Text
                        style={{
                          color: gray[500],
                          fontFamily: 'Montserrat_500Medium',
                          fontSize: 14,
                        }}
                      >
                        Restore
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            </View>
          )}

          {/* PAGE 9: Auth */}
          {currentPage === 9 && (
            <View key="9" style={styles.page}>
              <View style={styles.pageContent}>
                <Animated.View
                  entering={FadeInDown.delay(100).springify()}
                  style={{ alignItems: 'center', marginTop: 40 }}
                >
                  <View style={styles.securityIconBox}>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={48}
                      color={primary[900]}
                    />
                  </View>
                  <Text style={[styles.title, { textAlign: 'center' }]}>
                    Secure Your Plan
                  </Text>
                  <Text
                    style={[
                      styles.subtitle,
                      {
                        textAlign: 'center',
                        marginBottom: 40,
                        paddingHorizontal: 20,
                      },
                    ]}
                  >
                    Create an account to save your personalized insights and
                    start tracking.
                  </Text>

                  <View style={styles.authButtonsContainer}>
                    <Pressable
                      style={styles.ssoBtn}
                      onPress={() => handleLogin('apple')}
                    >
                      <AntDesign name="apple" size={24} color="#FFF" />
                      <Text style={[styles.ssoBtnText, { color: '#FFF' }]}>
                        Continue with Apple
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.ssoBtn, styles.ssoBtnGoogle]}
                      onPress={() => handleLogin('google')}
                    >
                      <AntDesign name="google" size={24} color={primary[900]} />
                      <Text style={[styles.ssoBtnText, { color: '#1C1C1E' }]}>
                        Continue with Google
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* FINAL STEP: PERSISTENT BOTTOM BAR */}
      {currentPage < 9 && (
        <View
          style={[styles.bottomBar, { paddingBottom: Math.max(bottom, 20) }]}
        >
          <View style={styles.bottomBarRow}>
            {currentPage !== 1 && (
              <Pressable
                style={[
                  styles.primaryBtn,
                  { flex: 1 },
                  ((currentPage === 0 &&
                    (!onboardingData.username.trim() ||
                      onboardingData.username.length < 3 ||
                      debouncedUsername !==
                        onboardingData.username.toLowerCase().trim() ||
                      isUsernameAvailable !== true)) ||
                    (currentPage === 4 && !onboardingData.gender) ||
                    (currentPage === 5 && !onboardingData.focus) ||
                    (currentPage === 6 && !onboardingData.motivation) ||
                    (currentPage === 7 && !onboardingData.referralSource)) &&
                    styles.primaryBtnDisabled,
                ]}
                onPress={currentPage === 8 ? handleSubscribe : goToNextPage}
                disabled={
                  (currentPage === 0 &&
                    (!onboardingData.username.trim() ||
                      onboardingData.username.length < 3 ||
                      debouncedUsername !==
                        onboardingData.username.toLowerCase().trim() ||
                      isUsernameAvailable !== true)) ||
                  (currentPage === 4 && !onboardingData.gender) ||
                  (currentPage === 5 && !onboardingData.focus) ||
                  (currentPage === 6 && !onboardingData.motivation) ||
                  (currentPage === 7 && !onboardingData.referralSource)
                }
              >
                <Text style={styles.primaryBtnText}>
                  {currentPage === 8 ? 'Start Free Trial Today' : 'Continue'}
                </Text>
              </Pressable>
            )}
          </View>

          {currentPage === 8 && (
            <View style={styles.skipBtn}>
              <Text
                style={styles.skipBtnText}
              >{`No charge until trial has ended.`}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default OnboardingPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 60,
  },
  backBtnWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 44,
  },
  progressWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: gray[200],
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: primary[900],
    borderRadius: 10,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Montserrat_700Bold',
    color: '#1C1C1E',
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    color: gray[500],
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    backgroundColor: 'white',
    marginBottom: 24,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: gray[300],
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    color: gray[400],
    marginBottom: 5,
  },
  inputElement: {
    fontSize: 20,
    fontFamily: 'Montserrat_500Medium',
    color: '#1C1C1E',
    // backgroundColor: 'yellow',
  },
  appleHealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: primary[900], // Darker to differentiate
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  appleHealthBtnText: {
    fontSize: 17,
    fontFamily: 'Montserrat_600SemiBold',
  },
  manualInputBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  manualInputBtnText: {
    fontSize: 15,
    fontFamily: 'Montserrat_500Medium',
    color: gray[500],
    textDecorationLine: 'underline',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: gray[100],
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 32,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: gray[600],
    lineHeight: 18,
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: gray[200],
  },
  pickerSectionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: gray[200],
  },
  pickerLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerInner: {
    height: 180,
    justifyContent: 'center',
  },
  pickerItem: {
    fontFamily: 'Montserrat_600SemiBold',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 16,
  },
  genderCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: gray[200],
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  genderCardActive: {
    borderColor: primary[900],
    backgroundColor: primary[900],
  },
  genderCardText: {
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#1C1C1E',
  },
  genderCardTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 16,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectCardActive: {
    borderColor: primary[900],
    backgroundColor: '#F5F5F5',
  },
  selectCardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectCardEmoji: {
    fontSize: 24,
  },
  selectCardTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  selectCardTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  selectCardDesc: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: '#8E8E93',
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    backgroundColor: '#FFFFFF',
  },
  radioIndicatorInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: primary[900],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.02)',
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomBackBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 56,
    backgroundColor: primary[900],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: gray[300],
    shadowOpacity: 0,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 24,
  },
  proBadgeText: {
    color: '#E6A800',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  featuresList: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureRowText: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    color: '#1C1C1E',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 48,
    fontFamily: 'Montserrat_700Bold',
    color: '#1C1C1E',
  },
  pricePeriod: {
    fontSize: 18,
    fontFamily: 'Montserrat_500Medium',
    color: '#8E8E93',
    marginLeft: 4,
  },
  priceGuarantee: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: '#8E8E93',
  },
  skipBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 15,
    fontFamily: 'Montserrat_500Medium',
    color: '#8E8E93',
  },
  securityIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  ssoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: primary[900],
    borderRadius: 16,
    gap: 12,
  },
  ssoBtnGoogle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: gray[200],
  },
  ssoBtnText: {
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
  },
  tosText: {
    marginTop: 32,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: gray[700],
    marginVertical: 5,
    lineHeight: 22,
  },
  paywallFeatureContainer: {
    flexDirection: 'column',
    marginVertical: 10,
    borderWidth: 1.5,
    paddingBottom: 35,
    borderRadius: 15,
    flex: 1,
    overflow: 'visible',
    paddingTop: 60,
    paddingHorizontal: 12,
  },
  paywallFeatureHeading: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: gray[700],
    marginBottom: 12,
  },
  paywallFeaturePrice: {
    fontFamily: 'Montserrat_300Light',
    fontSize: 26,
    color: primary[700],
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  paywallSaveContainer: {
    position: 'absolute',
    top: -10,
    right: 15,
    backgroundColor: primary[300],
    padding: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    zIndex: 1,
  },
  paywallSaveText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: primary[950],
  },
})
