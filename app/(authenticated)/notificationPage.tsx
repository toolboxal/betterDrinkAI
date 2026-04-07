import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useMutation, useQuery } from 'convex/react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Image } from 'expo-image'
import React, { useEffect } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Text from '@/components/CustomText'

const NotificationPage = () => {
  const notifications = useQuery(api.rooms.getMyNotifications)
  const markAsRead = useMutation(api.rooms.markNotificationsAsRead)

  useEffect(() => {
    return () => {
      markAsRead()
    }
  }, [])

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      {notifications?.length === 0 && (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 20,
              paddingLeft: 10,
              marginTop: 10,
            }}
          >
            No notifications
          </Text>
        </View>
      )}
      {/* <Text style={styles.title}>Notifications</Text> */}
      {notifications?.map((notification) =>
        notification.type === 'WELCOME' ? (
          <View
            key={notification._id}
            style={[
              styles.notificationContainer,
              { backgroundColor: notification.isRead ? 'white' : primary[100] },
            ]}
          >
            {notification.actor?.image ? (
              <Image
                source={{ uri: notification.actor?.image }}
                style={{ width: 35, height: 35, borderRadius: 100 }}
              />
            ) : (
              <FontAwesome name="user-o" size={24} color="black" />
            )}
            <View style={{ flexDirection: 'column', gap: 3, width: '70%' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}>
                {`${notification.actor?.username} says hi 👋`}
              </Text>
              <View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>
                  {`${notification.room?.name} room`}
                </Text>
              </View>
            </View>
            <View style={{ position: 'absolute', right: 5, bottom: 5 }}>
              <Text
                style={{
                  fontSize: 10,
                  color: gray[500],
                  alignSelf: 'flex-end',
                }}
              >
                {notification.isRead ? '' : 'new'}
              </Text>

              <Text style={{ fontSize: 10, color: gray[500] }}>
                {formatDistanceToNowStrict(notification.timestamp) + ' ago'}
              </Text>
            </View>
          </View>
        ) : (
          <View
            key={notification._id}
            style={[
              styles.notificationContainer,
              { backgroundColor: notification.isRead ? 'white' : primary[100] },
            ]}
          >
            {notification.actor?.image ? (
              <Image
                source={{ uri: notification.actor?.image }}
                style={{ width: 35, height: 35, borderRadius: 100 }}
              />
            ) : (
              <FontAwesome name="user-o" size={24} color="black" />
            )}
            <View style={{ flexDirection: 'column', gap: 5, width: '70%' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}>
                {notification.type === 'LIKE'
                  ? `${notification.actor?.username} liked your post`
                  : notification.type === 'CHEERS'
                    ? `${notification.actor?.username} is cheering for you`
                    : `${notification.actor?.username} thinks you are on a hot streak`}
              </Text>
              <View>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: 'black',
                  }}
                >
                  {notification.activity?.drinkName}
                </Text>
                <View>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 11,
                    }}
                  >
                    {`${notification.room?.name} room`}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ position: 'absolute', right: 5, bottom: 5 }}>
              <Text
                style={{
                  fontSize: 10,
                  color: gray[500],
                  alignSelf: 'flex-end',
                }}
              >
                {notification.isRead ? '' : 'new'}
              </Text>
              <Text style={{ fontSize: 10, color: gray[500] }}>
                {formatDistanceToNowStrict(notification.timestamp) + ' ago'}
              </Text>
            </View>
          </View>
        ),
      )}
    </ScrollView>
  )
}

export default NotificationPage

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 16,
    marginTop: 16,
    fontFamily: 'Inter_700Bold',
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
    padding: 10,
    backgroundColor: 'white',
    // borderRadius: 10,
  },
})
