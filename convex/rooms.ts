import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUserOrThrow } from './users'

// List all available goal rooms
export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx)
    const allRooms = await ctx.db.query('rooms').collect()

    const memberships = await ctx.db
      .query('room_members')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .collect()

    const joinedRoomIds = new Set(memberships.map((m) => m.roomId))

    const joined = allRooms.filter((r) => joinedRoomIds.has(r._id))
    const available = allRooms.filter((r) => !joinedRoomIds.has(r._id))

    return {
      joined,
      available,
    }
  },
})

// Join a room
export const joinRoom = mutation({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)

    const room = await ctx.db.get(args.roomId)
    if (!room) throw new Error('Room not found')

    const existing = await ctx.db
      .query('room_members')
      .withIndex('byRoomAndUser', (q) =>
        q.eq('roomId', args.roomId).eq('userId', user._id),
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { lastActiveAt: Date.now() })
      return existing._id
    }

    const memberId = await ctx.db.insert('room_members', {
      roomId: args.roomId,
      userId: user._id,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    })

    // Create a "JOIN" activity
    await ctx.db.insert('room_activities', {
      roomId: args.roomId,
      userId: user._id,
      type: 'JOIN',
      timestamp: Date.now(),
      interactionStats: {
        cheers: 0,
        like: 0,
        fire: 0,
        welcome: 0,
      },
    })

    return memberId
  },
})

// 1. The "Top Shelf" - Top 10 most recently active users
export const getTopShelf = query({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, args) => {
    const activeMembers = await ctx.db
      .query('room_members')
      .withIndex('byRoomAndActivity', (q) => q.eq('roomId', args.roomId))
      .order('desc')
      .take(10)

    const shelf = await Promise.all(
      activeMembers.map(async (m) => {
        const user = await ctx.db.get(m.userId)
        if (!user) return null
        return {
          userId: user._id,
          name: user.username || 'Anonymous',
          imageUrl: user.image,
          lastActiveAt: m.lastActiveAt,
        }
      }),
    )

    return shelf.filter((s) => s !== null)
  },
})

// 2. The Activity Feed (Scrollable List)
export const getRoomActivityFeed = query({
  args: { roomId: v.id('rooms'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrThrow(ctx)
    const limit = args.limit ?? 20
    const activities = await ctx.db
      .query('room_activities')
      .withIndex('byRoomAndTimestamp', (q) => q.eq('roomId', args.roomId))
      .order('desc')
      .take(limit)

    return await Promise.all(
      activities.map(async (a) => {
        const user = await ctx.db.get(a.userId)

        // Find if current user has reacted to this specific bubble
        let viewerReactions: string[] = []
        if (me) {
          const userReactions = await ctx.db
            .query('reactions')
            .withIndex('byActivityAndUser', (q) =>
              q.eq('activityId', a._id).eq('userId', me._id),
            )
            .collect()
          viewerReactions = userReactions.map((r) => r.type)
        }

        return {
          ...a,
          userName: user?.username || 'Someone',
          userImageUrl: user?.image,
          viewerReactions, // Array of reaction types me has already clicked
        }
      }),
    )
  },
})

// 3. The Member Directory (Paginated by Activity)
export const getMembersDirectory = query({
  args: {
    roomId: v.id('rooms'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrThrow(ctx)

    const membersPage = await ctx.db
      .query('room_members')
      .withIndex('byRoomAndActivity', (q) => q.eq('roomId', args.roomId))
      .order('desc')
      .paginate(args.paginationOpts)

    const members = await Promise.all(
      membersPage.page.map(async (m) => {
        const user = await ctx.db.get(m.userId)
        if (!user) return null

        // Quick Stats for the card
        const lastDrinks = await ctx.db
          .query('drinks')
          .withIndex('byUserAndTimestamp', (q) => q.eq('userId', user._id))
          .order('desc')
          .take(5)

        const avgHealth =
          lastDrinks.length > 0
            ? lastDrinks.reduce((acc, d) => acc + d.healthScore, 0) /
              lastDrinks.length
            : 0

        return {
          userId: user._id,
          name: user.username || 'Anonymous',
          imageUrl: user.image,
          avgHealthScore: Math.round(avgHealth * 10) / 10,
          last5Drinks: lastDrinks.map((d) => ({
            name: d.name,
            healthScore: d.healthScore,
          })),
          isMe: me?._id === user._id,
          lastActiveAt: m.lastActiveAt,
        }
      }),
    )

    return {
      ...membersPage,
      page: members.filter((m) => m !== null) as any[],
    }
  },
})

// Internal Helper to track room-wide activity when someone logs a drink
import { internalMutation } from './_generated/server'

export const trackDrinkActivity = internalMutation({
  args: {
    userId: v.id('users'),
    drinkId: v.id('drinks'),
    socialHook: v.optional(v.string()),
    drinkName: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Find all rooms this user is in
    const rooms = await ctx.db
      .query('room_members')
      .withIndex('byUser', (q) => q.eq('userId', args.userId))
      .collect()

    // 2. Insert activity into all those rooms
    for (const room of rooms) {
      await ctx.db.insert('room_activities', {
        roomId: room.roomId,
        userId: args.userId,
        type: 'DRINK',
        drinkId: args.drinkId, // Link for cleanup
        socialHook: args.socialHook,
        drinkName: args.drinkName,
        timestamp: Date.now(),
        interactionStats: {
          cheers: 0,
          like: 0,
          fire: 0,
          welcome: 0,
        },
      })

      // 3. Update the user's "lastActiveAt" to move them to the Top Shelf
      await ctx.db.patch(room._id, { lastActiveAt: Date.now() })
    }
  },
})

// React to an activity (Toggle logic)
export const reactToActivity = mutation({
  args: {
    activityId: v.id('room_activities'),
    type: v.union(
      v.literal('CHEERS'),
      v.literal('LIKE'),
      v.literal('FIRE'),
      v.literal('WELCOME'),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)

    const activity = await ctx.db.get(args.activityId)
    if (!activity) throw new Error('Activity not found')

    // Safeguard: Don't allow users to react to their own activities
    if (activity.userId === user._id) return null

    // Find if this specific reaction already exists
    const existing = await ctx.db
      .query('reactions')
      .withIndex('byActivityAndUser', (q) =>
        q.eq('activityId', args.activityId).eq('userId', user._id),
      )
      .filter((q) => q.eq(q.field('type'), args.type))
      .unique()

    const stats = { ...activity.interactionStats }

    if (existing) {
      // TOGGLE OFF: Remove reaction
      await ctx.db.delete(existing._id)
      if (args.type === 'CHEERS') stats.cheers = Math.max(0, stats.cheers - 1)
      if (args.type === 'LIKE') stats.like = Math.max(0, stats.like - 1)
      if (args.type === 'FIRE') stats.fire = Math.max(0, stats.fire - 1)
      if (args.type === 'WELCOME')
        stats.welcome = Math.max(0, stats.welcome - 1)
    } else {
      // TOGGLE ON: Add reaction
      await ctx.db.insert('reactions', {
        activityId: args.activityId,
        userId: user._id,
        type: args.type,
        timestamp: Date.now(),
      })

      if (args.type === 'CHEERS') stats.cheers++
      if (args.type === 'LIKE') stats.like++
      if (args.type === 'FIRE') stats.fire++
      if (args.type === 'WELCOME') stats.welcome++

      // Only notify if we are adding a reaction (not removing)
      if (activity.userId !== user._id) {
        await ctx.db.insert('notifications', {
          userId: activity.userId,
          actorId: user._id,
          type: args.type,
          activityId: args.activityId,
          text: `reacted with ${args.type} to your post`,
          isRead: false,
          timestamp: Date.now(),
        })
      }
    }

    // Update the denormalized stats on the activity itself
    await ctx.db.patch(args.activityId, { interactionStats: stats })

    // Update the reactor's "lastActiveAt" (Ranking)
    const member = await ctx.db
      .query('room_members')
      .withIndex('byRoomAndUser', (q) =>
        q.eq('roomId', activity.roomId).eq('userId', user._id),
      )
      .unique()
    if (member) {
      await ctx.db.patch(member._id, { lastActiveAt: Date.now() })
    }
  },
})

// Get personal notifications (Inbox)
export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx)

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(20)

    return await Promise.all(
      notifications.map(async (notification) => {
        const actor = await ctx.db.get(notification.actorId)
        const activity = notification.activityId
          ? await ctx.db.get(notification.activityId)
          : null

        // Get room information from the activity
        const room =
          activity && activity.roomId ? await ctx.db.get(activity.roomId) : null

        return {
          ...notification,
          actor: actor
            ? {
                _id: actor._id,
                username: actor.username,
                image: actor.image,
              }
            : null,
          activity: activity
            ? {
                _id: activity._id,
                type: activity.type,
                drinkName: activity.drinkName,
                socialHook: activity.socialHook,
                timestamp: activity.timestamp,
              }
            : null,
          room: room
            ? {
                _id: room._id,
                name: room.name,
                icon: room.icon,
              }
            : null,
        }
      }),
    )
  },
})

// Mark all notifications for the current user as read
export const markNotificationsAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx)

    const unreadNotifications = await ctx.db
      .query('notifications')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('isRead'), false))
      .take(50)

    for (const n of unreadNotifications) {
      await ctx.db.patch(n._id, { isRead: true })
    }

    return unreadNotifications.length
  },
})

// Cleanup when a drink is deleted
export const cleanupDrinkSocial = internalMutation({
  args: { drinkId: v.id('drinks') },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query('room_activities')
      .withIndex('byDrink', (q) => q.eq('drinkId', args.drinkId))
      .collect()

    for (const activity of activities) {
      // 1. Delete all reactions to this activity
      const reactions = await ctx.db
        .query('reactions')
        .withIndex('byActivity', (q) => q.eq('activityId', activity._id))
        .collect()
      for (const r of reactions) await ctx.db.delete(r._id)

      // 2. Delete all notifications linked to this activity
      const notifications = await ctx.db.query('notifications').collect() // Filter manually since activityId isn't indexed in notifications

      const relatedNotifications = notifications.filter(
        (n) => n.activityId === activity._id,
      )
      for (const n of relatedNotifications) await ctx.db.delete(n._id)

      // 3. Delete the activity itself
      await ctx.db.delete(activity._id)
    }
  },
})

// Sync when a drink is updated
export const syncDrinkUpdate = internalMutation({
  args: {
    drinkId: v.id('drinks'),
    updates: v.object({
      drinkName: v.optional(v.string()),
      socialHook: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query('room_activities')
      .withIndex('byDrink', (q) => q.eq('drinkId', args.drinkId))
      .collect()

    for (const activity of activities) {
      await ctx.db.patch(activity._id, args.updates)
    }
  },
})

export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx)

    const unreadNotifications = await ctx.db
      .query('notifications')
      .withIndex('byUser', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('isRead'), false))
      .take(20)

    return unreadNotifications.length
  },
})
