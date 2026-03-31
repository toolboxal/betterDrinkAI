import Text from '@/components/CustomText'
import OauthModal from '@/components/public/OauthModal'
import { gray, primary } from '@/constants/colors'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const LandingPage = () => {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()
  const { top, bottom } = useSafeAreaInsets()
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        // justifyContent: 'space-between',
        backgroundColor: 'white',
        paddingTop: top,
        paddingHorizontal: 12,
      }}
    >
      <View
        style={{
          // backgroundColor: 'yellow',
          paddingVertical: 35,
        }}
      >
        <Text style={styles.headerTitle}>{`DRINK \nBETTER`}</Text>
        <View
          style={{
            paddingLeft: 10,
            flexDirection: 'column',
            gap: 8,
            marginTop: 10,
          }}
        >
          <Text style={styles.headerSubTxt}>Stay hydrated</Text>
          <Text style={styles.headerSubTxt}>Make healthier choices</Text>
          <Text style={styles.headerSubTxt}>Accomplish your goals</Text>
        </View>
      </View>

      <View
        style={{
          flex: 1,

          // backgroundColor: 'orange',
          marginBottom: bottom,
          paddingHorizontal: 10,
        }}
      >
        <Image
          source={require('@/assets/images/bubbles_bottle.svg')}
          style={{
            width: 150,
            height: 150,
            alignSelf: 'center',
          }}
          contentFit="contain"
        />
        <Text style={styles.subTxt}>
          {` Insights powered by \nGoogle Gemini AI.`}
        </Text>

        <Pressable
          style={[styles.btnContainer, { borderColor: primary[300] }]}
          onPress={() => router.navigate('./onboardingPage')}
        >
          <Text style={styles.btnText}>Get Started</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowModal(true)}
          style={[
            styles.btnContainer,
            { borderColor: gray[200], backgroundColor: 'white' },
          ]}
        >
          <Text style={[styles.btnText, { color: 'black' }]}>Sign In</Text>
        </Pressable>
        <View style={{ gap: 3, marginTop: 25 }}>
          <Text style={styles.footerTxt}>
            By using Drink Better, you agree to our
          </Text>
          <View
            style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}
          >
            <Pressable>
              <Text
                style={[
                  styles.footerTxt,
                  { fontFamily: 'Raleway_600SemiBold' },
                ]}
              >
                Terms of Service
              </Text>
            </Pressable>
            <Text style={styles.footerTxt}>and</Text>
            <Pressable>
              <Text
                style={[
                  styles.footerTxt,
                  { fontFamily: 'Raleway_600SemiBold' },
                ]}
              >
                Privacy Policy
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <OauthModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  )
}

export default LandingPage

const styles = StyleSheet.create({
  btnContainer: {
    padding: 15,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: primary[400],
    width: '100%',
    marginVertical: 8,
  },
  btnText: {
    fontSize: 20,
    fontFamily: 'Raleway_500Medium',
    color: 'white',
  },
  headerTitle: {
    fontSize: 80,
    fontFamily: 'Raleway_300Light',
    textAlign: 'left',
    color: 'black',
    letterSpacing: -2,
    lineHeight: 80,
  },
  headerSubTxt: {
    fontSize: 18,
    fontFamily: 'Raleway_300Light',
    textAlign: 'left',
    color: gray[500],
  },
  subTxt: {
    fontSize: 20,
    fontFamily: 'Raleway_300Light',
    textAlign: 'center',
    color: gray[500],
    marginVertical: 10,
    lineHeight: 30,
  },
  footerTxt: {
    fontSize: 13,
    fontFamily: 'Raleway_400Regular',
    textAlign: 'center',
    color: gray[500],
  },
})
