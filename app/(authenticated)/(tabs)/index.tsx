import { PulseLoader } from '@/components/PulseLoader'
import { useSubscription } from '@/components/SubscriptionProvider'
import { blue, gray, green, primary, red } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { fetchStepCount, requestHealthPermissions } from '@/lib/healthService'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import FontAwesome6 from '@expo/vector-icons/FontAwesome6'
import { useAction, useQuery, useConvexAuth } from 'convex/react'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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

const HomePage = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const router = useRouter()
  const [steps, setSteps] = useState<number | undefined>(undefined)
  const { top } = useSafeAreaInsets()
  const { isPro } = useSubscription()

  // -- DAILY INSIGHT LOGIC --
  const now = new Date()
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const dailyInsight = useQuery(api.dashboardAnalysis.getDailyInsight, {
    dayKey,
  })
  const generateInsight = useAction(api.dashboardAnalysis.generateDailyInsight)

  const isGeneratingRef = useRef(false)

  // Helper to access parsedInsight safely
  const insight = dailyInsight?.parsedInsight

  useEffect(() => {
    const initInsights = async () => {
      if (isAuthLoading || !isAuthenticated) return

      let currentSteps = 0

      // Fetch health data (steps)
      try {
        const hasPerms = await requestHealthPermissions()
        if (hasPerms) {
          currentSteps = await fetchStepCount(dayKey)
          setSteps(currentSteps)
        }
      } catch (e) {
        console.log('Health fetch failed', e)
      }

      // Trigger generation only when insight is null and we aren't currently generating
      if (dailyInsight === null && !isGeneratingRef.current) {
        isGeneratingRef.current = true
        const offset = new Date().getTimezoneOffset()

        generateInsight({
          dayKey,
          timezoneOffset: offset,
          steps: currentSteps || undefined,
        })
          .catch((err) => {
            console.error('AI Generation failed', err)
          })
          .finally(() => {
            // Unlock the generation ref so future cache invalidations can run
            isGeneratingRef.current = false
          })
      }
    }

    initInsights()
  }, [dailyInsight, isAuthLoading, isAuthenticated, dayKey, isPro])

  if (!isPro) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center', padding: 20 },
        ]}
      >
        <FontAwesome6
          name="lock"
          size={50}
          color={primary[500]}
          style={{ marginBottom: 20 }}
        />
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'Merriweather_700Bold',
            textAlign: 'center',
            marginBottom: 10,
            color: 'black',
          }}
        >
          Drink Better AI Locked
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontFamily: 'Montserrat_400Regular',
            textAlign: 'center',
            color: gray[600],
            lineHeight: 22,
          }}
        >
          Your trial has ended. Upgrade to Premium to unlock your daily Drink
          Better AI analysis, deep dives, and weekly trends.
        </Text>
        <LinearGradient
          colors={[primary[400], primary[600]]}
          style={{ marginTop: 30, borderRadius: 25, overflow: 'hidden' }}
        >
          <Pressable
            onPress={() => {
              router.push('/(authenticated)/paywallPage')
            }}
            style={{ paddingHorizontal: 30, paddingVertical: 15 }}
          >
            <Text
              style={{
                color: 'white',
                fontFamily: 'Montserrat_700Bold',
                fontSize: 16,
              }}
            >
              Go Premium
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {isAuthLoading || !dailyInsight || dailyInsight == null ? (
        <Animated.View
          key="loader"
          exiting={FadeOut.duration(500)}
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'center', alignItems: 'center', zIndex: 1 },
          ]}
        >
          <PulseLoader msg={SAVAGE_MESSAGES} />
        </Animated.View>
      ) : (
        <Animated.ScrollView
          entering={FadeIn.duration(800).delay(200)}
          style={styles.container}
          bounces={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 5,
            paddingTop: top + 20,
            paddingBottom: 100,
            backgroundColor: 'white',
          }}
        >
          {/* LOGO */}
          <Animated.View
            entering={FadeInDown.delay(180).duration(600)}
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              paddingLeft: 5,
              marginBottom: 25,
            }}
          >
            <Image
              source={require('@/assets/images/bubbles_bottle.svg')}
              style={{ width: 26, height: 26 }}
              contentFit="contain"
            />
            <Text
              style={{
                fontFamily: 'Montserrat_300Light',
                fontSize: 32,
                letterSpacing: -2,
                marginLeft: -4,
              }}
            >
              Drink Better
            </Text>
          </Animated.View>

          {/* 1. TOP SECTION: SUMMARIZED ANALYSIS */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View style={{ padding: 10 }}>
              {/* <Text
                style={[
                  styles.topCardTitle,
                  { fontSize: 28, marginBottom: 10 },
                ]}
              >
                Daily Summary
              </Text> */}
              <Text style={styles.titleDescription}>summary</Text>
              <Text style={styles.topCardTitle}>
                {insight?.topSummary?.title || 'Daily Summary'}
              </Text>
              <Text style={styles.summaryText}>
                {insight?.topSummary?.content}
              </Text>
            </View>
          </Animated.View>

          {/* 2. MIDDLE SECTION: DEEP DIVE */}
          <View style={{ marginTop: 15 }}>
            <Animated.View entering={FadeInDown.delay(400).duration(600)}>
              <View style={{ padding: 10 }}>
                <Text style={styles.titleDescription}>deep dive</Text>
                <Text style={[styles.sectionTitle]}>
                  {insight?.deepDive?.title || 'The Deep Dive'}
                </Text>
              </View>
              {insight?.deepDive?.good ? (
                <LinearGradient
                  colors={[green[500], green[800]]}
                  style={styles.sectionContainer}
                >
                  <View style={{ gap: 20 }}>
                    {/* GOOD SECTION */}
                    {insight?.deepDive?.good && (
                      <View>
                        <View style={styles.insightHeaderRow}>
                          <FontAwesome6
                            name="thumbs-up"
                            size={22}
                            color={green[200]}
                          />
                          <Text style={styles.drinkNameLabel}>
                            {insight.deepDive.good.drinkName}
                          </Text>
                        </View>
                        <Text style={styles.insightReason}>
                          {insight.deepDive.good.reason}
                        </Text>
                        <Text style={styles.cheerText}>
                          {insight.deepDive.good.cheer}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              ) : null}
              {insight?.deepDive?.bad ? (
                <LinearGradient
                  colors={[red[700], red[900]]}
                  style={styles.sectionContainer}
                >
                  {/* BAD SECTION */}
                  {insight?.deepDive?.bad && (
                    <View>
                      <View style={styles.insightHeaderRow}>
                        <FontAwesome6
                          name="thumbs-down"
                          size={22}
                          color={red[300]}
                        />
                        <Text style={styles.drinkNameLabel}>
                          {insight.deepDive.bad.drinkName}
                        </Text>
                      </View>
                      <Text style={styles.insightReason}>
                        {insight.deepDive.bad.reason}
                      </Text>

                      {/* Burn-off Stat */}

                      <View style={styles.burnOffMetric}>
                        <Text style={styles.burnOffLabel}>
                          Steps Needed To Burn Off
                        </Text>
                        <Text style={styles.burnOffValue}>
                          {insight.deepDive.bad.costInSteps.toLocaleString()}{' '}
                          steps
                        </Text>
                      </View>

                      <View style={styles.burnOffMetric}>
                        <Text style={styles.burnOffLabel}>Better Decision</Text>
                        <Text style={[styles.cheerText, { color: red[200] }]}>
                          {insight.deepDive.bad.suggestedSwap}
                        </Text>
                      </View>
                    </View>
                  )}
                </LinearGradient>
              ) : null}

              {/* HYDRATION SECTION */}
              {insight?.deepDive?.hydrationReport ? (
                <LinearGradient
                  colors={[blue[700], blue[900]]}
                  style={styles.sectionContainer}
                >
                  <View>
                    <View
                      style={[
                        styles.insightHeaderRow,
                        { gap: 0, marginBottom: 0 },
                      ]}
                    >
                      <View
                        style={[
                          styles.insightHeaderRow,
                          { gap: 5, alignItems: 'center' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="water-outline"
                          size={26}
                          color="white"
                        />
                        <Text style={styles.drinkNameLabel}>
                          Hydration Status
                        </Text>
                      </View>
                    </View>
                    {/* Badge */}
                    <View style={{ flexDirection: 'row', marginBottom: 7 }}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: blue[200] },
                        ]}
                      >
                        <Text
                          style={[styles.statusBadgeText, { color: blue[700] }]}
                        >
                          {insight?.deepDive?.hydrationReport?.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cardText, { color: 'white' }]}>
                      {insight?.deepDive?.hydrationReport?.analysis}
                    </Text>
                  </View>
                </LinearGradient>
              ) : null}
            </Animated.View>

            {/* 3. BOTTOM SECTION: 7-DAY TREND */}
            <Animated.View entering={FadeInDown.delay(600).duration(600)}>
              <View style={{ padding: 10, marginTop: 30, marginBottom: 10 }}>
                <Text style={styles.titleDescription}>weekly trend</Text>
                <Text style={[styles.sectionTitle]}>
                  {insight?.trend7Day?.title}
                </Text>
                <Text style={[styles.summaryText]}>
                  {insight?.trend7Day?.analysis}
                </Text>
              </View>
              <LinearGradient
                colors={[primary[50], primary[100]]}
                style={[
                  styles.sectionContainer,
                  { backgroundColor: gray[100], gap: 12 },
                ]}
              >
                {/* TREND SUB-SECTIONS */}

                {/* Spending Habit */}
                <View>
                  <Text
                    style={[styles.drinkNameLabel, { color: primary[700] }]}
                  >
                    Drink Expenditure
                  </Text>

                  <Text style={[styles.cardText, { color: gray[950] }]}>
                    {insight?.trend7Day?.spendingHabit}
                  </Text>
                </View>

                {/* Environmental Impact */}
                <View>
                  <Text style={[styles.drinkNameLabel, { color: green[500] }]}>
                    Eco Status
                  </Text>

                  <Text style={[styles.cardText, { color: gray[950] }]}>
                    {insight?.trend7Day?.environmentalImpact}
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </Animated.ScrollView>
      )}
    </View>
  )
}

export default HomePage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 30,
    marginBottom: 20,
    fontFamily: 'Montserrat_500Medium',
    paddingLeft: 10,
    color: 'black',
  },
  cardText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 3,
  },
  summaryText: {
    fontSize: 16,
    color: gray[950],
    lineHeight: 22,
    fontFamily: 'Montserrat_400Regular',
  },
  sectionContainer: {
    borderRadius: 40,
    backgroundColor: primary[100],
    padding: 30,
    paddingBottom: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 3,
  },
  titleDescription: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 25,
    fontFamily: 'Merriweather_700Bold',
    // textTransform: 'uppercase',
    color: 'black',
    marginTop: 5,
    marginBottom: 15,
  },
  topCardTitle: {
    fontSize: 25,
    fontFamily: 'Merriweather_700Bold',
    // textTransform: 'uppercase',
    color: 'black',
    marginTop: 5,
    marginBottom: 15,
  },
  burnOffContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: gray[100],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  burnOffMetric: {
    flex: 1,
    marginVertical: 8,
  },
  burnOffLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: 'white',
    textTransform: 'uppercase',
    marginVertical: 3,
  },
  burnOffValue: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: 'white',
  },

  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  drinkNameLabel: {
    fontSize: 20,
    fontFamily: 'Merriweather_900Black_Italic',
    color: 'white',
    marginBottom: 10,
  },
  insightReason: {
    fontSize: 16,
    fontFamily: 'Merriweather_400Regular_Italic',
    color: 'white',
    lineHeight: 20,
    marginBottom: 8,
    letterSpacing: 0.7,
  },
  cheerText: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: green[100],
    marginTop: 10,
    lineHeight: 20,
  },
  hydrationContainer: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 4,
  },
  statusBadgeText: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
  },
})
