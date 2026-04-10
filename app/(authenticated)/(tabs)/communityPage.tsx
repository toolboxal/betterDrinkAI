import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, SectionList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Text from '@/components/CustomText'

const CommunityPage = () => {
  const router = useRouter()
  const roomsData = useQuery(api.rooms.listRooms)
  const unreadNotificationCount = useQuery(api.rooms.getUnreadNotificationCount)
  const { top } = useSafeAreaInsets()

  const sections = React.useMemo(() => {
    if (!roomsData) return []
    const result = []
    if (roomsData.joined.length > 0) {
      result.push({
        title: 'Communities you are in',
        data: roomsData.joined.map((r) => ({ ...r, isJoined: true })),
      })
    }
    if (roomsData.available.length > 0) {
      result.push({
        title: 'Communities to join',
        data: roomsData.available.map((r) => ({ ...r, isJoined: false })),
      })
    }
    return result
  }, [roomsData])

  const renderRoom = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/(authenticated)/room/${item._id}` as any)}
      style={({ pressed }) => [styles.roomCard, pressed && styles.pressedCard]}
    >
      <View
        style={[
          styles.blurContainer,
          { backgroundColor: item.isJoined ? primary[200] : primary[50] },
        ]}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.roomIcon}>{item.icon}</Text>
        </View>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.roomDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </Pressable>
  )

  return (
    <View style={styles.container}>
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
          alignSelf: 'flex-end',
          marginRight: 20,
          marginTop: top + 20,
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
                fontFamily: 'PlusJakartaSans_700Bold',
              }}
            >
              {unreadNotificationCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <View style={styles.header}>
        <Text style={styles.title}>Communities</Text>
        <Text style={styles.subtitle}>Find your tribe, stay accountable.</Text>
      </View>

      <SectionList
        showsVerticalScrollIndicator={false}
        sections={sections}
        renderItem={renderRoom}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          roomsData ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No communities found...</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

export default CommunityPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    color: 'black',
  },
  title: {
    fontSize: 34,
    color: 'black',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  subtitle: {
    fontSize: 16,
    color: 'black',
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  sectionHeader: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: 'black',
    marginTop: 10,
    marginBottom: 16,
  },
  listContent: {
    padding: 20,
  },
  roomCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: gray[100],
  },
  pressedCard: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  blurContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roomIcon: {
    fontSize: 24,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: 'black',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 14,
    color: gray[600],
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: gray[600],
    fontSize: 16,
  },
})
