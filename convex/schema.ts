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

  // Add your own tables here for your app logic
  drinks: defineTable({
    userId: v.id('users'), // Linked to our main users table
    name: v.string(),
    rating: v.optional(v.number()),
  }).index('by_user', ['userId']),
})
