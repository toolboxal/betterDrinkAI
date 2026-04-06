import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // This table will be automatically synced with Better Auth
  users: defineTable({
    name: v.string(), //from betterAuth
    email: v.string(), //from betterAuth
    image: v.optional(v.string()), //from betterAuth
    betterAuthId: v.string(), //link to betterAuth User Table
    birthDate: v.optional(v.number()),
    gender: v.optional(v.string()),
    focus: v.optional(v.string()),
    motivation: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    username: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
  })
    .index('by_email', ['email'])
    .index('by_better_auth_id', ['betterAuthId'])
    .index('by_username', ['username']),

  drinks: defineTable({
    drinkType: v.string(),
    name: v.string(),
    calories: v.number(),
    sugar: v.number(),
    sizeValue: v.optional(v.number()),
    sizeUnit: v.optional(v.string()),
    packaging: v.string(),
    price: v.optional(v.number()),
    imageId: v.optional(v.id('_storage')),
    caffeine: v.optional(v.number()),
    isAlcoholic: v.boolean(),
    alcoholContent: v.optional(v.number()),
    healthScore: v.number(),
    healthScoreReason: v.string(),
    socialHook: v.optional(v.string()), // Narrative status for community
    userId: v.id('users'),
    timestamp: v.number(), // Unix timestamp
    dayKey: v.string(), // "YYYY-MM-DD"
  })
    .index('byDrinkType', ['drinkType'])
    .index('byUserId', ['userId'])
    .index('byUserAndTimestamp', ['userId', 'timestamp'])
    .index('byUserAndDay', ['userId', 'dayKey']),

  daily_insights: defineTable({
    userId: v.id('users'),
    insight: v.string(),
    mood: v.string(),
    dayKey: v.string(),
  })
    .index('byUserId', ['userId'])
    .index('byUserAndDay', ['userId', 'dayKey']),
  rooms: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(), // emoji
    slug: v.string(), // unique identifier
  }).index('bySlug', ['slug']),
  room_members: defineTable({
    roomId: v.id('rooms'),
    userId: v.id('users'),
    joinedAt: v.number(),
    lastActiveAt: v.number(), // For dynamic ranking in the room
  })
    .index('byRoom', ['roomId'])
    .index('byRoomAndActivity', ['roomId', 'lastActiveAt'])
    .index('byRoomAndJoinedAt', ['roomId', 'joinedAt'])
    .index('byUser', ['userId'])
    .index('byRoomAndUser', ['roomId', 'userId']),
  room_activities: defineTable({
    roomId: v.id('rooms'),
    userId: v.id('users'),
    type: v.union(v.literal('DRINK'), v.literal('JOIN'), v.literal('REACTION')),
    drinkId: v.optional(v.id('drinks')), // NEW: Link to the source drink for cleanup
    socialHook: v.optional(v.string()),
    drinkName: v.optional(v.string()),
    timestamp: v.number(),
    interactionStats: v.object({
      cheers: v.number(),
      like: v.number(),
      fire: v.number(),
      welcome: v.number(),
    }),
  })
    .index('byRoomAndTimestamp', ['roomId', 'timestamp'])
    .index('byDrink', ['drinkId'])
    .index('byUser', ['userId']),

  reactions: defineTable({
    activityId: v.id('room_activities'),
    userId: v.id('users'),
    type: v.union(
      v.literal('CHEERS'),
      v.literal('LIKE'),
      v.literal('FIRE'),
      v.literal('WELCOME'),
    ),
    timestamp: v.number(),
  })
    .index('byActivity', ['activityId'])
    .index('byActivityAndUser', ['activityId', 'userId'])
    .index('byUser', ['userId']),

  notifications: defineTable({
    userId: v.id('users'), // recipient
    actorId: v.id('users'), // person who triggered the notification
    type: v.union(
      v.literal('CHEERS'),
      v.literal('LIKE'),
      v.literal('FIRE'),
      v.literal('WELCOME'),
    ),
    activityId: v.optional(v.id('room_activities')),
    text: v.string(), // e.g., "cheered your soda log"
    isRead: v.boolean(),
    timestamp: v.number(),
  })
    .index('byUser', ['userId'])
    .index('byActor', ['actorId']),
})
