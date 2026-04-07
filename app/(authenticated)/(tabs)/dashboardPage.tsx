import AddDrinkModal from '@/components/dashboard/AddDrinkModal'
import AddWaterModal from '@/components/dashboard/AddWaterModal'
import DatePickerModal from '@/components/dashboard/DatePickerModal'
import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from 'convex/react'
import { Image } from 'expo-image'
import { Stack, useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// --- HELPER FUNCTIONS ---

const isToday = (timestamp: number) => {
  const date = new Date(timestamp)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// --- COMPONENTS ---

const MetricCard = ({
  title,
  children,
  style,
  iconName,
  iconLib = 'Ionicons',
}: {
  title: string
  children: React.ReactNode
  style?: any
  iconName?: string
  iconLib?: string
}) => {
  const IconComponent =
    iconLib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {iconName && (
            <IconComponent
              name={iconName as any}
              size={18}
              color="#555"
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      </View>
      {children}
    </View>
  )
}

// --- MAIN PAGE ---

const DashboardPage = () => {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const { bottom } = useSafeAreaInsets()

  const unreadNotificationCount = useQuery(api.rooms.getUnreadNotificationCount)
  // console.log(unreadNotificationCount)

  const dayKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const drinks = useQuery(api.drinks.getDrinksByDay, { dayKey })

  // const createDrink = useMutation(api.drinks.createNewDrink)
  const [showDrinkOptionsModal, setShowDrinkOptionsModal] = useState(false)
  const [showAddWaterModal, setShowAddWaterModal] = useState(false)

  const onChangeDate = (event: any, date?: Date) => {
    setShowDatePicker(false)
    if (date) {
      setSelectedDate(date)
    }
  }

  if (drinks === undefined) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  const todayDrinks = drinks || []

  // --- CALCULATE METRICS DIRECTLY ---
  // This reacts instantly to any Convex data change for the selected day

  // 1. Sugar Cubes (Selected Day)
  const totalSugarToday = todayDrinks.reduce(
    (acc: number, d: any) => acc + (d.sugar || 0),
    0,
  )
  const sugarCubes = Math.ceil(totalSugarToday / 4)

  // 2. Caffeine (Selected Day)
  const totalCaffeineToday = todayDrinks.reduce(
    (acc: number, d: any) => acc + (d.caffeine || 0),
    0,
  )

  // 3. Liquid Calories (Selected Day)
  const totalCaloriesToday = todayDrinks.reduce(
    (acc: number, d: any) => acc + (d.calories || 0),
    0,
  )
  const caloriePercent = Math.min((totalCaloriesToday / 2000) * 100, 100)

  // 4. Total Volume (Selected Day)
  const totalVolumeToday = todayDrinks.reduce(
    (acc: number, d: any) => acc + (d.sizeValue || 0),
    0,
  )

  // 5. Cost Per Sip (Selected Day Average)
  const totalSpent = todayDrinks.reduce(
    (acc: number, d: any) => acc + (d.price || 0),
    0,
  )
  const avgCost = todayDrinks.length > 0 ? totalSpent / todayDrinks.length : 0

  // 5. Latte Factor (Selected Day Total)
  const thisSpent = totalSpent

  // 6. Witching Hour (Bucket by Time of Day for Selected Day)
  const buckets: Record<string, number> = {
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
  }
  todayDrinks.forEach((d: any) => {
    const hour = new Date(d.timestamp).getHours()
    if (hour >= 0 && hour < 12) buckets.Morning++
    else if (hour >= 12 && hour < 17) buckets.Afternoon++
    else buckets.Evening++
  })
  const maxBucket = Object.entries(buckets).reduce(
    (a, b) => (b[1] > a[1] ? b : a),
    ['N/A', 0],
  ) as [string, number]

  const metrics = {
    today: {
      sugar: totalSugarToday,
      cubes: sugarCubes,
      caffeine: totalCaffeineToday,
      calories: totalCaloriesToday,
      caloriePercent,
      volume: totalVolumeToday,
    },
    finance: { avgCost, totalSpent: totalSpent },
    habits: { maxBucket },
  }

  // --- GROUP DRINKS BY TIME OF DAY ---
  const categorizedDrinks = {
    Morning: todayDrinks.filter((d: any) => {
      const hour = new Date(d.timestamp).getHours()
      return hour >= 0 && hour < 12
    }),
    Afternoon: todayDrinks.filter((d: any) => {
      const hour = new Date(d.timestamp).getHours()
      return hour >= 12 && hour < 17
    }),
    Evening: todayDrinks.filter((d: any) => {
      const hour = new Date(d.timestamp).getHours()
      return hour >= 17 && hour < 24
    }),
  }

  const renderDrinkCard = (drink: any, index: number) => {
    if (drink.imageUrl) {
      return (
        <Pressable
          onPress={() => {
            router.push({
              pathname: '/(authenticated)/drinkDetailsPage',
              params: { drinkId: drink._id },
            })
          }}
          key={drink._id}
          style={{
            transform: [{ rotate: `${(Math.sin(index) * -5).toFixed(1)}deg` }],
            ...styles.drinkImageCard,
          }}
        >
          <Image
            source={{ uri: drink.imageUrl }}
            style={{
              width: 60,
              height: 80,
              borderRadius: 15,
              borderWidth: 3,
              borderColor: '#fff',
            }}
          />
        </Pressable>
      )
    }

    if (drink.drinkType === 'Water') {
      return (
        <Pressable
          onPress={() => {
            router.push({
              pathname: '/(authenticated)/drinkDetailsPage',
              params: { drinkId: drink._id },
            })
          }}
          key={drink._id}
          style={{
            transform: [{ rotate: `${(Math.sin(index) * -5).toFixed(1)}deg` }],
            ...styles.drinkImageCard,
            borderRadius: 15,
            borderWidth: 3,
            borderColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            width: 60,
            height: 80,
            backgroundColor: primary[50],
          }}
        >
          <MaterialCommunityIcons name="water" size={32} color={primary[500]} />
          <Text
            style={{
              fontSize: 10,
              fontFamily: 'Montserrat_700Bold',
              color: primary[500],
              textAlign: 'center',
            }}
          >
            {`PLAIN\nWATER`}
          </Text>
        </Pressable>
      )
    }

    return null
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: bottom + 60 },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 5,
        }}
      >
        {/* Date Picker */}
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={styles.datePickerButton}
        >
          <Text
            style={{
              fontFamily: 'Montserrat_700Bold',
              color: '#666',
              fontSize: 22,
            }}
          >
            {selectedDate.toDateString() === new Date().toDateString()
              ? 'Today'
              : selectedDate.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
          </Text>
          <Entypo name="chevron-down" size={23} color="#666" />
          <DatePickerModal
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            selectedDate={selectedDate}
            onChangeDate={onChangeDate}
          />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Notification Button */}

          <Pressable
            onPress={() => router.push('/notificationPage')}
            style={{
              backgroundColor: 'white',
              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: 45,
              width: 45,
              position: 'relative',
            }}
          >
            <MaterialCommunityIcons name="bell" size={22} color="black" />
            {unreadNotificationCount !== undefined &&
            unreadNotificationCount !== 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  width: 18,
                  height: 18,
                  borderRadius: 10,
                  backgroundColor: 'red',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 9,
                    fontFamily: 'Montserrat_700Bold',
                  }}
                >
                  {unreadNotificationCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {/* Add Drink Button */}
          <Pressable
            onPress={() => setShowDrinkOptionsModal((prev) => !prev)}
            style={{
              backgroundColor: gray[950],

              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: 45,
              width: 45,
            }}
          >
            <MaterialCommunityIcons name="plus" size={25} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={{ marginVertical: 10, gap: 5 }}>
        {(['Morning', 'Afternoon', 'Evening'] as const).map((period) => {
          const drinksInPeriod = categorizedDrinks[period]
          if (drinksInPeriod.length === 0) return null

          const pSpent = drinksInPeriod.reduce(
            (acc: number, d: any) => acc + (d.price || 0),
            0,
          )
          const pSugar = drinksInPeriod.reduce(
            (acc: number, d: any) => acc + (d.sugar || 0),
            0,
          )
          const pCaffeine = drinksInPeriod.reduce(
            (acc: number, d: any) => acc + (d.caffeine || 0),
            0,
          )
          const pVolume = drinksInPeriod.reduce(
            (acc: number, d: any) => acc + (d.sizeValue || 0),
            0,
          )
          const pHealth =
            drinksInPeriod.reduce(
              (acc: number, d: any) => acc + (d.healthScore || 0),
              0,
            ) / drinksInPeriod.length

          const healthColor =
            pHealth >= 8 ? '#4caf50' : pHealth >= 5 ? '#ff9800' : '#f44336'

          return (
            <View
              key={period}
              style={{
                // backgroundColor: primary[100],
                padding: 15,
                borderRadius: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={styles.sectionTitle}>{period}</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: healthColor + '15',
                    borderRadius: 100,
                    height: 42,
                    width: 42,
                    borderWidth: 2,
                    borderColor: healthColor + '15',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Montserrat_700Bold',
                      fontSize: 24,
                      color: healthColor,
                    }}
                  >
                    {Math.round(pHealth)}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  rowGap: 8,
                  marginTop: 8,
                }}
              >
                {drinksInPeriod.map((drink, idx) =>
                  renderDrinkCard(drink, idx),
                )}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 15,
                  marginTop: 10,
                }}
              >
                <View style={styles.microMetric}>
                  <Text style={styles.microMetricHeader}>Volume</Text>
                  <Text style={styles.microMetricText}>{pVolume}ml</Text>
                </View>

                {pSugar > 0 && (
                  <View style={styles.microMetric}>
                    <Text style={styles.microMetricHeader}>Sugar</Text>
                    <Text style={styles.microMetricText}>{pSugar}g</Text>
                  </View>
                )}
                {pCaffeine > 0 && (
                  <View style={styles.microMetric}>
                    <Text style={styles.microMetricHeader}>Caffeine</Text>
                    <Text style={styles.microMetricText}>{pCaffeine}mg</Text>
                  </View>
                )}
                {pSpent > 0 && (
                  <View style={styles.microMetric}>
                    <Text style={styles.microMetricHeader}>Spent</Text>
                    <Text style={styles.microMetricText}>
                      ${pSpent.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )
        })}
      </View>
      <AddDrinkModal
        visible={showDrinkOptionsModal}
        onClose={() => setShowDrinkOptionsModal(false)}
        setShowAddWaterModal={setShowAddWaterModal}
      />
      <AddWaterModal
        visible={showAddWaterModal}
        onClose={() => setShowAddWaterModal(false)}
        date={selectedDate}
      />

      {/* 1. Sugar Cubes */}
      <MetricCard title="Sugar Intake">
        <View style={styles.sugarContainer}>
          <View
            style={[
              styles.centerContent,
              { flexDirection: 'row', alignItems: 'baseline' },
            ]}
          >
            <Text style={styles.bigStat}>{metrics.today.sugar}</Text>
            <Text style={styles.unit}>g</Text>
          </View>
          <Text style={styles.detailText}>
            {metrics.today.cubes} cubes worth of sugar
          </Text>
          <View style={styles.cubeGrid}>
            {Array.from({
              length: Math.min(metrics.today.cubes || 0, 50),
            }).map((_, i) => (
              <MaterialCommunityIcons
                key={i}
                name="cube-outline"
                size={20}
                color="#ff8fab"
                style={styles.cubeIcon}
              />
            ))}
            {(metrics.today.cubes || 0) > 50 && (
              <Text style={styles.moreText}>
                +{(metrics.today.cubes || 0) - 50} more...
              </Text>
            )}
          </View>
        </View>
      </MetricCard>

      <View style={styles.row}>
        {/* 2. Caffeine Jitters */}
        <MetricCard title="Caffeine" style={styles.halfCard}>
          <View style={styles.centerContent}>
            <Text
              style={[
                styles.bigStat,
                {
                  color:
                    (metrics.today.caffeine || 0) > 400 ? '#d32f2f' : '#333',
                },
              ]}
            >
              {metrics.today.caffeine}
              <Text style={styles.unit}>mg</Text>
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(((metrics.today.caffeine || 0) / 400) * 100, 100)}%`,
                    backgroundColor:
                      (metrics.today.caffeine || 0) > 300
                        ? '#ff9800'
                        : '#4caf50',
                  },
                ]}
              />
            </View>
            <Text style={styles.microText}>
              {metrics.today.caffeine
                ? metrics.today.caffeine > 400
                  ? 'Jittery zone!'
                  : 'Safe zone'
                : 'No caffeine yet'}
            </Text>
          </View>
        </MetricCard>

        {/* 3. Liquid Calories */}
        <MetricCard title="Liquid Cals" style={styles.halfCard}>
          <View style={styles.centerContent}>
            <Text style={styles.bigStat}>{metrics.today.calories}</Text>
            <Text style={styles.microText}>of ~2000 daily</Text>
            <View style={styles.circularProgress}>
              <View style={[styles.progressBarBg, { marginTop: 10 }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${metrics.today.caloriePercent}%`,
                      backgroundColor: '#2196f3',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </MetricCard>
      </View>

      {/* 4. Total Volume / Hydration */}
      <MetricCard title="Daily Hydration">
        <View style={styles.centerContent}>
          <Text style={styles.bigStat}>
            {metrics.today.volume}
            <Text style={styles.unit}>ml</Text>
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min((metrics.today.volume / 2000) * 100, 100)}%`,
                  backgroundColor: '#03a9f4',
                },
              ]}
            />
          </View>
          <Text style={styles.microText}>Goal: 2000ml (Approx. 8 cups)</Text>
        </View>
      </MetricCard>

      {/* 5. Wallet Watch */}
      <MetricCard title="Wallet Watch">
        <View style={styles.financeRow}>
          <View style={styles.financeItem}>
            <Text style={styles.label}>Avg/Drink</Text>
            <Text style={styles.financeValue}>
              ${metrics.finance.avgCost.toFixed(2)}
            </Text>
          </View>
          <View style={styles.financeItem}>
            <Text style={styles.label}>Day Total</Text>
            <Text style={styles.financeValue}>
              ${metrics.finance.totalSpent.toFixed(2)}
            </Text>
          </View>
        </View>
        <Text style={styles.insightText}>
          {metrics.finance.totalSpent > 15
            ? '� A bit of a spendy day!'
            : "💰 You're keeping it budget-friendly today."}
        </Text>
      </MetricCard>

      <View>
        {/* 6. Witching Hour */}
        <MetricCard title="Peak Time">
          <View style={styles.centerContent}>
            <MaterialCommunityIcons
              name={
                metrics.habits.maxBucket[0] === 'Night'
                  ? 'weather-night'
                  : 'white-balance-sunny'
              }
              size={32}
              color="#666"
              style={{ marginBottom: 5 }}
            />
            <Text style={styles.mediumStat}>
              {metrics.habits.maxBucket[0] || 'N/A'}
            </Text>
            <Text style={styles.microText}>
              {metrics.habits.maxBucket[1]} drinks logged
            </Text>
          </View>
        </MetricCard>
      </View>
    </ScrollView>
  )
}

export default DashboardPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontFamily: 'Montserrat_900Black',
    fontSize: 32,
    color: '#1a1a1a',
    marginBottom: 5,
  },
  subHeader: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    backgroundColor: primary[100],
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: 'black',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 15,
    color: 'black',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: gray[500],
    textTransform: 'uppercase',
  },
  sugarContainer: {
    alignItems: 'flex-start',
  },
  bigStat: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 36,
    color: gray[950],
    marginBottom: 3,
  },
  mediumStat: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    color: gray[950],
  },
  detailText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  cubeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cubeIcon: {
    opacity: 0.8,
  },
  moreText: {
    fontSize: 12,
    color: gray[500],
    alignSelf: 'center',
    marginLeft: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  halfCard: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  unit: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: gray[500],
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  microText: {
    fontSize: 12,
    color: gray[500],
    fontFamily: 'Montserrat_400Regular',
  },
  circularProgress: {
    width: '100%',
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  financeItem: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: gray[500],
    marginBottom: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  financeValue: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#333',
  },
  insightText: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  rankNum: {
    fontWeight: 'bold',
    marginRight: 8,
    color: '#ccc',
    width: 15,
  },
  rankName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#444',
  },
  rankPercent: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Montserrat_400Regular',
  },
  drinkImageCard: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: -10,
  },
  datePickerButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  microMetric: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  microMetricHeader: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: gray[300],
  },
  microMetricText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: gray[950],
  },
})
