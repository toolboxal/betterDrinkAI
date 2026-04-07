import Text from '@/components/CustomText'
import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { authClient } from '@/lib/auth-client'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import Feather from '@expo/vector-icons/Feather'
import { useMutation, useQuery } from 'convex/react'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ViewShot, { captureRef } from 'react-native-view-shot'

const DrinkDetailsPage = () => {
  const { top } = useSafeAreaInsets()
  const router = useRouter()
  const { drinkId } = useLocalSearchParams<{ drinkId: string }>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const viewShotRef = useRef(null)

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#4caf50' // Green
    if (score >= 5) return '#ff9800' // Orange
    return '#f44336' // Red
  }

  const parsedDrinkData = useQuery(
    api.drinks.getDrink,
    drinkId ? { drinkId: drinkId as Id<'drinks'> } : 'skip',
  )

  const deleteDrink = useMutation(api.drinks.deleteDrink)

  const onShare = async () => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      })

      await Sharing.shareAsync(uri)
    } catch (error) {
      console.error('Share error:', error)
      Alert.alert('Error', 'Failed to share the drink report')
    }
  }

  const handleDelete = async () => {
    if (!drinkId) {
      Alert.alert('Error', 'No drink ID available')
      return
    }

    setIsDeleting(true)
    try {
      await deleteDrink({ drinkId: drinkId as Id<'drinks'> })
      Alert.alert('Success', 'Drink deleted successfully')
      router.back()
    } catch (error: any) {
      console.error('Delete error:', error)

      // Handle specific error types
      if (error.message?.includes('Unauthorized')) {
        Alert.alert(
          'Unauthorized',
          'Your session has expired. Please log in again.',
        )
        await authClient.signOut()
        router.replace('/(public)')
      } else if (error.message?.includes('Forbidden')) {
        Alert.alert('Forbidden', 'You can only delete your own drinks')
        router.back()
      } else if (error.message?.includes('not found')) {
        Alert.alert('Error', 'Drink not found')
        router.back()
      } else {
        Alert.alert('Error', 'Failed to delete drink. Please try again.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (parsedDrinkData === undefined) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          },
        ]}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    )
  }

  if (parsedDrinkData === null) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          },
        ]}
      >
        <Text style={styles.text}>Drink not found or access denied.</Text>
        <Pressable
          style={[styles.btn, { backgroundColor: primary[500], width: 200 }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.btnText, { color: 'white' }]}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitleStyle: {
            fontFamily: 'Inter_700Bold',
          },
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          padding: 10,
          paddingBottom: 70,
          paddingTop: top + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            position: 'relative',
            // backgroundColor: 'red',
            paddingTop: 40,
            paddingBottom: 20,
          }}
        >
          {/* Edit button */}
          <Pressable
            style={[styles.editBtn]}
            onPress={() =>
              router.push({
                pathname: '/drinkEditPage',
                params: { drinkId: parsedDrinkData._id },
              })
            }
          >
            <Feather name="edit-2" size={22} color={gray[400]} />
          </Pressable>
          {/* Share button */}
          <Pressable style={[styles.shareBtn]} onPress={onShare}>
            <Feather name="share" size={22} color={gray[400]} />
          </Pressable>
          {parsedDrinkData.imageUrl &&
          parsedDrinkData.name !== 'Plain Water' ? (
            <View style={styles.shadowImageWrapper}>
              <View style={styles.drinkTitleContainer}>
                <Text style={styles.drinkTitle}>{parsedDrinkData.name}</Text>
              </View>
              <View style={styles.imageContainer}>
                <Image
                  source={parsedDrinkData.imageUrl}
                  style={styles.image}
                  contentFit="cover"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                />
              </View>
              <View style={styles.socialHookContainer}>
                <Text style={styles.socialHook}>
                  {parsedDrinkData.socialHook}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.shadowImageWrapper}>
              <View style={styles.drinkTitleContainer}>
                <Text style={styles.drinkTitle}>{parsedDrinkData.name}</Text>
              </View>
              <View
                style={[
                  styles.imageContainer,
                  {
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: primary[50],
                  },
                ]}
              >
                {/* <Image
                  source={parsedDrinkData.imageUrl}
                  style={styles.image}
                  contentFit="cover"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                /> */}
                <MaterialCommunityIcons
                  name="water"
                  size={150}
                  color={primary[500]}
                />
                <Text
                  style={{
                    fontSize: 25,
                    fontFamily: 'Inter_700Bold',
                    color: primary[500],
                    textAlign: 'center',
                  }}
                >
                  {`PLAIN\nWATER`}
                </Text>
              </View>
              {parsedDrinkData.socialHook && (
                <View style={styles.socialHookContainer}>
                  <Text style={styles.socialHook}>
                    {parsedDrinkData.socialHook}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {/* health score card */}
        <View
          style={[
            styles.cardContainer,
            { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
          ]}
        >
          <View
            style={[
              styles.healthScoreContainer,
              { backgroundColor: getScoreColor(parsedDrinkData.healthScore) },
            ]}
          >
            <Text style={styles.healthScoreText}>
              {parsedDrinkData.healthScore}
            </Text>
          </View>
          <Text style={styles.healthReasonText}>
            {parsedDrinkData.healthScoreReason}
          </Text>
        </View>
        {/* ingredients card */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Breakdown</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Calories</Text>
              <Text style={styles.metricText}>
                {parsedDrinkData.calories}kcal
              </Text>
            </View>
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Sugar</Text>
              <Text style={styles.metricText}>{parsedDrinkData.sugar}g</Text>
            </View>
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Caffeine</Text>
              <Text style={styles.metricText}>
                {parsedDrinkData.caffeine}mg
              </Text>
            </View>
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Alcohol</Text>
              <Text style={styles.metricText}>
                {parsedDrinkData.alcoholContent || 0}%
              </Text>
            </View>
          </View>
        </View>
        {/* packaging and volume */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Packaging & Volume</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Packaging</Text>
              <Text style={styles.metricText}>{parsedDrinkData.packaging}</Text>
            </View>
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Volume</Text>
              <Text style={styles.metricText}>
                {parsedDrinkData.sizeValue}ml
              </Text>
            </View>
          </View>
        </View>
        {/* price and time of consumption */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Price & Time of Consumption</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Price</Text>
              <Text style={styles.metricText}>${parsedDrinkData.price}</Text>
            </View>
            <View style={styles.breakDownContainer}>
              <Text style={styles.metricHeader}>Time</Text>
              <Text style={styles.metricText}>
                {new Date(parsedDrinkData.timestamp).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          style={[
            styles.cardContainer,
            { backgroundColor: 'red', marginTop: 10 },
          ]}
          onPress={handleDelete}
        >
          <Text
            style={{
              textAlign: 'center',
              fontFamily: 'Inter_700Bold',
              color: 'white',
              fontSize: 18,
            }}
          >
            Delete
          </Text>
        </Pressable>
      </ScrollView>

      {/* HIDDEN SHARE CARD TEMPLATE */}
      <View
        style={{
          position: 'absolute',
          left: -1000, // Hide off-screen
          top: 0,
        }}
      >
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={styles.shareCard}
        >
          <View style={styles.shareBrandingContainer}>
            <Text style={styles.shareBrandingText}>DRINKBETTER ANALYSIS</Text>
          </View>

          <View style={[styles.shareHeroContainer]}>
            {parsedDrinkData.imageUrl ? (
              <Image
                source={parsedDrinkData.imageUrl}
                style={styles.shareHeroImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.shareHeroImage,
                  {
                    backgroundColor: primary[50],
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="water"
                  size={180}
                  color={primary[500]}
                />
              </View>
            )}
            <View style={styles.shareScoreBadge}>
              <Text
                style={[
                  styles.shareScoreText,
                  { color: getScoreColor(parsedDrinkData.healthScore) },
                ]}
              >
                {parsedDrinkData.healthScore}
              </Text>
              <Text style={styles.shareScoreLabel}>HEALTH</Text>
            </View>
          </View>

          <View style={styles.shareInfoContainer}>
            <Text style={styles.shareDrinkName}>{parsedDrinkData.name}</Text>
            {parsedDrinkData.socialHook && (
              <Text style={styles.shareSocialHook}>
                "{parsedDrinkData.socialHook}"
              </Text>
            )}

            <View style={styles.shareMetricGrid}>
              <View style={styles.shareMetricItem}>
                <Text style={styles.shareMetricValue}>
                  {parsedDrinkData.sugar}g
                </Text>
                <Text style={styles.shareMetricLabel}>SUGAR</Text>
              </View>
              <View style={styles.shareMetricItem}>
                <Text style={styles.shareMetricValue}>
                  {parsedDrinkData.calories}
                </Text>
                <Text style={styles.shareMetricLabel}>KCAL</Text>
              </View>
              <View style={styles.shareMetricItem}>
                <Text style={styles.shareMetricValue}>
                  {parsedDrinkData.caffeine}mg
                </Text>
                <Text style={styles.shareMetricLabel}>CAFFEINE</Text>
              </View>
            </View>
          </View>

          <View style={styles.shareFooter}>
            <Text style={styles.shareFooterText}>
              JOIN THE LAB @ DRINKBETTER
            </Text>
          </View>
        </ViewShot>
      </View>
    </View>
  )
}

export default DrinkDetailsPage

const styles = StyleSheet.create({
  editBtn: {
    position: 'absolute',
    right: 5,
    zIndex: 2,
    borderRadius: 100,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  shareBtn: {
    position: 'absolute',
    left: 5,
    bottom: 15,
    zIndex: 2,
    borderRadius: 100,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  container: {
    width: '100%',
    backgroundColor: 'white',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
  },
  btn: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 100,
    marginVertical: 10,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: 'black',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  shadowImageWrapper: {
    width: 250,
    height: 300,
    borderRadius: 50,
    marginBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 'auto',
    position: 'relative',
  },
  imageContainer: {
    width: 260,
    height: 320,
    borderRadius: 50,
    overflow: 'hidden',
    objectFit: 'cover',
    transform: [{ rotate: '-2deg' }],
    borderWidth: 5,
    borderColor: 'white',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  drinkTitleContainer: {
    position: 'absolute',
    top: -22,
    left: -40,
    zIndex: 2,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  drinkTitle: {
    color: gray[950],
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  socialHookContainer: {
    position: 'absolute',
    bottom: -40,
    right: -30,
    zIndex: 2,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  socialHook: {
    color: gray[950],
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
    textAlign: 'left',
  },
  cardContainer: {
    width: '100%',
    backgroundColor: primary[100],
    borderRadius: 30,
    padding: 20,
    marginBottom: 5,
  },
  healthScoreContainer: {
    width: 60,
    height: 60,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreText: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  healthReasonText: {
    flex: 1, // THIS FIXES THE WRAPPING
    color: gray[500],
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  cardTitle: {
    color: gray[500],
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  breakDownContainer: {
    flexDirection: 'column',
    gap: 3,
    marginTop: 10,
  },
  metricHeader: {
    color: gray[500],
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  metricText: {
    color: gray[950],
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
    textAlign: 'center',
  },
  // --- SHARE CARD STYLES ---
  shareCard: {
    width: 400,
    padding: 30,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  shareBrandingContainer: {
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: gray[950],
    borderRadius: 8,
  },
  shareBrandingText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: 'white',
    letterSpacing: 2,
  },
  shareHeroContainer: {
    width: 340,
    height: 340,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: gray[100],
    borderWidth: 8,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  shareHeroImage: {
    width: '100%',
    height: '100%',
  },
  shareScoreBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 70,
  },
  shareScoreText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  shareScoreLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: gray[400],
    marginTop: -4,
  },
  shareInfoContainer: {
    width: '100%',
    marginTop: 25,
    alignItems: 'center',
  },
  shareDrinkName: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: gray[950],
    textAlign: 'center',
  },
  shareSocialHook: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: gray[500],
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  shareMetricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 30,
    paddingHorizontal: 10,
  },
  shareMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  shareMetricValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: gray[950],
  },
  shareMetricLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: gray[400],
    letterSpacing: 1,
  },
  shareFooter: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: gray[100],
    paddingTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  shareFooterText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: gray[300],
    letterSpacing: 1,
  },
})
