import AddDrinkModal from '@/components/dashboard/AddDrinkModal'
import AddWaterModal from '@/components/dashboard/AddWaterModal'
import { primary } from '@/constants/colors'
import Entypo from '@expo/vector-icons/Entypo'
import Feather from '@expo/vector-icons/Feather'
import Ionicons from '@expo/vector-icons/Ionicons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { BlurView } from 'expo-blur'
import { Tabs, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TabsLayout = () => {
  const router = useRouter()
  const { bottom } = useSafeAreaInsets()
  const { width } = Dimensions.get('window')
  const [showDrinkOptionsModal, setShowDrinkOptionsModal] = useState(false)
  const [showAddWaterModal, setShowAddWaterModal] = useState(false)

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarInactiveTintColor: 'white',
          tabBarActiveTintColor: primary[300],
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderRadius: 50,
            height: 65,
            bottom: Math.max(bottom - 15, 10),
            width: width * 0.9,
            marginHorizontal: width * 0.05,
            elevation: 0,
            flexDirection: 'row',
            alignItems: 'center',
          },
          tabBarBackground: () => (
            <BlurView
              intensity={55}
              tint="dark"
              style={{
                borderRadius: 50,
                overflow: 'hidden',
                flex: 1,
              }}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'home',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboardPage"
          options={{
            title: 'stats',
            tabBarIcon: ({ color, size }) => (
              <Feather name="bar-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="communityPage"
          options={{
            title: 'community',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settingsPage"
          options={{
            title: 'settings',
            tabBarLabel: 'settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="placeholder"
          options={{
            title: 'add',
            tabBarIcon: ({ focused, color, size }) => {
              return <Ionicons name="water" size={size} color={color} />
            },
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setShowDrinkOptionsModal(true)
            },
          }}
        />
      </Tabs>
      <AddDrinkModal
        visible={showDrinkOptionsModal}
        onClose={() => setShowDrinkOptionsModal(false)}
        setShowAddWaterModal={setShowAddWaterModal}
      />
      <AddWaterModal
        visible={showAddWaterModal}
        onClose={() => setShowAddWaterModal(false)}
        date={new Date()}
      />
    </>
  )
}
export default TabsLayout
