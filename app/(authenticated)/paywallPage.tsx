import { gray, primary } from '@/constants/colors'
import Entypo from '@expo/vector-icons/Entypo'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Purchases, { PurchasesOffering } from 'react-native-purchases'
import { SafeAreaView } from 'react-native-safe-area-context'

const PaywallPage = () => {
  const router = useRouter()
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly')
  const [offering, setOffering] = useState<PurchasesOffering | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
        setIsLoading(false)
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
        router.back() // or router.replace to success screen
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
      setIsLoading(true)
      const customerInfo = await Purchases.restorePurchases()
      // Use the same entitlement check that you use in SubscriptionProvider
      if (
        typeof customerInfo.entitlements.active['Drink Better Premium'] !==
        'undefined'
      ) {
        Alert.alert('Success', 'Your purchases have been restored!')
        router.back()
      } else {
        Alert.alert(
          'No pass found',
          "We couldn't find an active Premium subscription for your account.",
        )
      }
    } catch (e: any) {
      console.error('Error restoring', e)
      Alert.alert('Error', 'There was a problem restoring your purchases.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ marginTop: 10, marginBottom: 15 }}>
        <Pressable
          style={{
            width: 40,
            height: 40,
            alignItems: 'flex-start',
            justifyContent: 'center',
            // backgroundColor: 'green',
            borderRadius: 100,
          }}
          onPress={() => router.back()}
        >
          <Entypo name="chevron-left" size={28} color="black" />
        </Pressable>
      </View>
      <Text style={styles.title}>
        {`Go Premium and \nStart Your Journey \nto Better Health`}
      </Text>
      <View style={{ marginTop: 15, marginBottom: 10, gap: 10 }}>
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
        style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 10 }}
      >
        <Pressable
          style={[
            styles.featureContainer,
            {
              backgroundColor: selected === 'monthly' ? primary[950] : 'white',
              borderColor: selected === 'monthly' ? primary[100] : primary[950],
            },
          ]}
          onPress={() => setSelected('monthly')}
        >
          <Text
            style={[
              styles.featureHeading,
              { color: selected === 'monthly' ? 'white' : primary[950] },
            ]}
          >
            Monthly
          </Text>
          <Text
            style={[
              styles.featurePrice,
              { color: selected === 'monthly' ? primary[300] : primary[950] },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={selected === 'monthly' ? primary[300] : primary[950]}
              />
            ) : (
              offering?.monthly?.product?.priceString || '$...'
            )}
          </Text>
          <Text
            style={[
              styles.featureHeading,
              {
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 1.1,
                color: selected === 'monthly' ? primary[300] : primary[950],
              },
            ]}
          >
            per month
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.featureContainer,
            {
              backgroundColor: selected === 'yearly' ? primary[950] : 'white',
              borderColor: selected === 'yearly' ? 'white' : primary[950],
              position: 'relative',
            },
          ]}
          onPress={() => setSelected('yearly')}
        >
          <View style={styles.saveContainer}>
            <Text
              style={styles.saveText}
            >{`SAVE ${savingsPercentage.toFixed(0)}%`}</Text>
          </View>
          <Text
            style={[
              styles.featureHeading,
              { color: selected === 'yearly' ? 'white' : primary[950] },
            ]}
          >
            Annual
          </Text>
          <Text
            style={[
              styles.featurePrice,
              { color: selected === 'yearly' ? primary[300] : primary[950] },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={selected === 'yearly' ? primary[300] : primary[950]}
              />
            ) : (
              offering?.annual?.product?.priceString || '$...'
            )}
          </Text>
          <Text
            style={[
              styles.featureHeading,
              {
                fontSize: 10,
                letterSpacing: 1.1,
                color: selected === 'yearly' ? primary[300] : primary[950],
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

      <Pressable
        style={{
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
          marginTop: 40,
        }}
        onPress={handleSubscribe}
      >
        <Text
          style={{
            color: 'white',
            fontFamily: 'Montserrat_700Bold',
            fontSize: 18,
          }}
        >
          Subscribe Now
        </Text>
      </Pressable>
    </SafeAreaView>
  )
}

export default PaywallPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  title: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 32,
    color: primary[700],
    lineHeight: 42,
  },
  benefitsText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: gray[700],
    marginVertical: 5,
    lineHeight: 22,
  },
  featureContainer: {
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
  featureHeading: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: gray[700],
    marginBottom: 12,
  },
  featurePrice: {
    fontFamily: 'Montserrat_300Light',
    fontSize: 26,
    color: primary[700],
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  saveContainer: {
    position: 'absolute',
    top: -10,
    right: 15,
    backgroundColor: primary[300],
    padding: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    zIndex: 1,
  },
  saveText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: primary[950],
  },
})
