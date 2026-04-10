import Text from '@/components/CustomText'
import { useSubscription } from '@/components/SubscriptionProvider'
import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { format } from 'date-fns'
import * as Haptics from 'expo-haptics'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const RoomPage = () => {
  const router = useRouter()
  const { top, bottom } = useSafeAreaInsets()
  const { roomId } = useLocalSearchParams<{ roomId: string }>()
  const id = roomId as Id<'rooms'>
  const { isPro } = useSubscription()

  const [viewMode, setViewMode] = useState<'feed' | 'members'>('feed')

  const room = useQuery(api.rooms.listRooms) // We might need a single room query, but for now we haveroomId
  const topShelf = useQuery(api.rooms.getTopShelf, { roomId: id })
  const feed = useQuery(api.rooms.getRoomActivityFeed, { roomId: id })
  const {
    results: members,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.rooms.getMembersDirectory,
    { roomId: id },
    { initialNumItems: 10 },
  )
  const joinRoom = useMutation(api.rooms.joinRoom)
  const react = useMutation(api.rooms.reactToActivity)

  // Ensure user is in the room
  useEffect(() => {
    if (id && isPro) {
      joinRoom({ roomId: id }).catch(console.error)
    }
  }, [id, isPro])

  const handleReact = async (activityId: any, type: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await react({ activityId, type })
  }

  const renderMember = ({ item }: { item: any }) => (
    <View style={styles.memberCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.memberAvatar} />
      ) : (
        <View
          style={[
            styles.memberAvatar,
            {
              backgroundColor: gray[200],
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <FontAwesome name="user" size={32} color={gray[500]} />
        </View>
      )}
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{item.name}</Text>
          {item.isMe && (
            <View style={styles.meBadge}>
              <Text style={styles.meBadgeText}>ME</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberActivity}>
          Last active{' '}
          {new Date(item.lastActiveAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <View style={styles.memberStats}>
          <View style={styles.healthBadge}>
            <Text style={styles.healthLabel}>Avg Health</Text>
            <Text
              style={[
                styles.healthValue,
                { color: item.avgHealthScore > 7 ? '#10B981' : '#F59E0B' },
              ]}
            >
              {item.avgHealthScore}
            </Text>
          </View>
          <View style={styles.drinkHistory}>
            {item.last5Drinks.map((d: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.miniDrinkDot,
                  {
                    backgroundColor: d.healthScore > 7 ? '#10B981' : '#F59E0B',
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  )

  const renderBubble = ({ item }: { item: any }) => {
    return (
      <View style={styles.bubbleContainer}>
        {item.userImageUrl ? (
          <Image
            source={{ uri: item.userImageUrl }}
            style={styles.bubbleAvatar}
          />
        ) : (
          <View
            style={[
              styles.bubbleAvatar,
              {
                backgroundColor: gray[200],
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <FontAwesome name="user" size={20} color={gray[500]} />
          </View>
        )}
        <View style={styles.bubbleContent}>
          <View style={styles.bubbleMain}>
            <Text style={styles.bubbleUser}>{item.userName}</Text>
            <Text style={styles.bubbleAction}>
              {item.type === 'DRINK'
                ? `logged a ${item.drinkName}`
                : 'joined the room'}
            </Text>
            {item.type === 'JOIN' && (
              <View
                style={{
                  padding: 5,
                  backgroundColor: primary[50],
                  borderRadius: 5,
                }}
              >
                <Text style={styles.bubbleAction}>
                  {`Let's Welcome ${item.userName}! 🎉`}
                </Text>
              </View>
            )}

            {item.socialHook && (
              <View style={styles.hookSubBubble}>
                <Ionicons name="sparkles" size={12} color={primary[600]} />
                <Text style={styles.hookText}>{item.socialHook}</Text>
              </View>
            )}

            <View style={styles.reactionRow}>
              {item.type === 'JOIN'
                ? [
                    {
                      type: 'WELCOME',
                      emoji: '👋',
                      count: item.PlusJakartaSansactionStats?.welcome,
                    },
                  ].map((r) => (
                    <Pressable
                      key={r.type}
                      onPress={() => handleReact(item._id, r.type)}
                      style={[
                        styles.reactionPill,
                        item.viewerReactions?.includes(r.type) &&
                          styles.activeReactionPill,
                      ]}
                    >
                      <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                      {r.count > 0 && (
                        <Text style={styles.reactionCount}>{r.count}</Text>
                      )}
                    </Pressable>
                  ))
                : [
                    {
                      type: 'LIKE',
                      emoji: '❤️',
                      count: item.PlusJakartaSansactionStats?.like,
                    },
                    {
                      type: 'FIRE',
                      emoji: '🔥',
                      count: item.PlusJakartaSansactionStats?.fire,
                    },
                    {
                      type: 'CHEERS',
                      emoji: '🥂',
                      count: item.PlusJakartaSansactionStats?.cheers,
                    },
                  ].map((r) => (
                    <Pressable
                      key={r.type}
                      onPress={() => handleReact(item._id, r.type)}
                      style={[
                        styles.reactionPill,
                        item.viewerReactions?.includes(r.type) &&
                          styles.activeReactionPill,
                      ]}
                    >
                      <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                      {r.count > 0 && (
                        <Text style={styles.reactionCount}>{r.count}</Text>
                      )}
                    </Pressable>
                  ))}
            </View>
          </View>
          <Text style={styles.timestamp}>
            {format(new Date(item.timestamp), 'PPpp')}
          </Text>
        </View>
      </View>
    )
  }

  if (!feed || !topShelf) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primary[500]} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="black" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Room Activity</Text>
        </View>
      </View>

      {!isPro ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Ionicons
            name="lock-closed"
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
            Community Locked
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
            Your trial has ended. Upgrade to Pro to unlock your daily Better
            Drink AI analysis, deep dives, and weekly trends.
          </Text>
          <Pressable
            onPress={() => {
              router.push('/(authenticated)/paywallPage')
            }}
            style={{
              marginTop: 30,
              backgroundColor: primary[500],
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 25,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 16,
              }}
            >
              Go Pro
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* TOP SHELF - Live Now */}
          <View style={styles.topShelfSection}>
            <Text style={styles.sectionLabel}>LIVE NOW</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topShelfScroll}
            >
              {topShelf.map((m) => (
                <View key={m.userId} style={styles.shelfUser}>
                  <View style={styles.avatarRing}>
                    {m.imageUrl ? (
                      <Image
                        source={{ uri: m.imageUrl }}
                        style={styles.shelfAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.shelfAvatar,
                          {
                            backgroundColor: gray[200],
                            justifyContent: 'center',
                            alignItems: 'center',
                          },
                        ]}
                      >
                        <FontAwesome name="user" size={24} color={gray[500]} />
                      </View>
                    )}
                    <View style={styles.activeDot} />
                  </View>
                  <Text style={styles.shelfName} numberOfLines={1}>
                    {m.name.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* TABS */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setViewMode('feed')}
              style={[styles.tab, viewMode === 'feed' && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  viewMode === 'feed' && styles.activeTabText,
                ]}
              >
                Feed
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('members')}
              style={[styles.tab, viewMode === 'members' && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  viewMode === 'members' && styles.activeTabText,
                ]}
              >
                Members
              </Text>
            </Pressable>
          </View>

          {viewMode === 'feed' ? (
            <FlatList
              data={feed}
              renderItem={renderBubble}
              keyExtractor={(item) => item._id}
              contentContainerStyle={[
                styles.feedScroll,
                { paddingBottom: bottom },
              ]}
              inverted // Chat style
            />
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.userId}
              contentContainerStyle={[
                styles.memberScroll,
                { paddingBottom: bottom },
              ]}
              onEndReachedThreshold={0.5}
              onEndReached={() => status === 'CanLoadMore' && loadMore(10)}
            />
          )}
        </>
      )}
    </View>
  )
}

export default RoomPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: gray[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: 'black',
  },
  topShelfSection: {
    paddingVertical: 15,
    backgroundColor: gray[50],
    // marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: gray[400],
    marginLeft: 20,
    marginBottom: 5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topShelfScroll: {
    paddingHorizontal: 15,
  },
  shelfUser: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 60,
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#10B981',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shelfAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: gray[50],
  },
  shelfName: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: gray[600],
    marginTop: 6,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: gray[100],
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: gray[500],
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },
  activeTabText: {
    color: primary[600],
  },
  feedScroll: {
    padding: 20,
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  bubbleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginTop: 4,
  },
  bubbleContent: {
    flex: 1,
  },
  bubbleMain: {
    backgroundColor: 'white',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleUser: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: gray[500],
    marginBottom: 4,
  },
  bubbleAction: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: 'black',
    lineHeight: 20,
  },
  hookSubBubble: {
    backgroundColor: primary[50],
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hookText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: primary[700],
    fontStyle: 'italic',
    flex: 1,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: gray[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: gray[100],
  },
  activeReactionPill: {
    backgroundColor: primary[50],
    borderColor: primary[200],
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: gray[700],
  },
  timestamp: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: gray[400],
    marginTop: 6,
    marginLeft: 4,
  },
  memberScroll: {
    padding: 20,
  },
  memberCard: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: gray[100],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: 'black',
  },
  meBadge: {
    backgroundColor: primary[600],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  meBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: 'white',
  },
  memberActivity: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: gray[500],
    marginTop: 2,
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: gray[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 8,
  },
  healthLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: gray[500],
  },
  healthValue: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  drinkHistory: {
    flexDirection: 'row',
    gap: 6,
  },
  miniDrinkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: gray[200],
  },
})
