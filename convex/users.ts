import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, mutation, query, QueryCtx, MutationCtx } from './_generated/server'
import { Id } from './_generated/dataModel'

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }
  return await ctx.db
    .query('users')
    .withIndex('by_better_auth_id', (q) =>
      q.eq('betterAuthId', identity.subject),
    )
    .unique()
}

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx)
  if (!user) {
    throw new Error('Not authenticated')
  }
  return user
}

export const updateOnboardingData = mutation({
  args: {
    data: v.object({
      name: v.optional(v.string()),
      birthDate: v.optional(v.number()),
      gender: v.optional(v.string()),
      focus: v.optional(v.string()),
      motivation: v.optional(v.string()),
      referralSource: v.optional(v.string()),
      height: v.optional(v.number()),
      weight: v.optional(v.number()),
      username: v.optional(v.string()),
    }),
  },
  async handler(ctx, { data }) {
    const user = await getCurrentUserOrThrow(ctx)

    if (data.username) {
      const normalizedUsername = data.username.toLowerCase().trim()
      if (normalizedUsername.length < 3) {
        throw new Error('Username must be at least 3 characters')
      }

      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', normalizedUsername))
        .unique()

      if (existingUser && existingUser._id !== user._id) {
        throw new Error('Username is already taken')
      }
      data.username = normalizedUsername
    }

    await ctx.db.patch(user._id, {
      ...data,
      onboardingCompleted: true,
    })
  },
})

export const checkUsernameAvailability = query({
  args: { username: v.string() },
  async handler(ctx, { username }) {
    const normalized = username.toLowerCase().trim()
    if (normalized.length < 3) return false

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', normalized))
      .unique()

    return existingUser === null
  },
})

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx)
  },
})

export const cleanupUserAccount = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await performUserCleanup(ctx, args.userId)
  },
})

export async function performUserCleanup(ctx: MutationCtx, userId: Id<'users'>) {

    // 1. Delete drinks and their images
    const drinks = await ctx.db
      .query('drinks')
      .withIndex('byUserId', (q) => q.eq('userId', userId))
      .collect()
    for (const drink of drinks) {
      if (drink.imageId) {
        try {
          await ctx.storage.delete(drink.imageId)
        } catch (e) {
          console.error('Failed to delete drink image:', e)
        }
      }
      await ctx.db.delete(drink._id)
    }

    // 2. Delete daily insights
    const insights = await ctx.db
      .query('daily_insights')
      .withIndex('byUserId', (q) => q.eq('userId', userId))
      .collect()
    for (const insight of insights) {
      await ctx.db.delete(insight._id)
    }

    // 3. Delete room memberships
    const memberships = await ctx.db
      .query('room_members')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .collect()
    for (const membership of memberships) {
      await ctx.db.delete(membership._id)
    }

    // 4. Delete room activities
    const activities = await ctx.db
      .query('room_activities')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .collect()
    for (const activity of activities) {
      await ctx.db.delete(activity._id)
    }

    // 5. Delete reactions
    const reactions = await ctx.db
      .query('reactions')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .collect()
    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id)
    }

    // 6. Delete notifications
    const notificationsReceived = await ctx.db
      .query('notifications')
      .withIndex('byUser', (q) => q.eq('userId', userId))
      .collect()
    for (const notification of notificationsReceived) {
      await ctx.db.delete(notification._id)
    }

    const notificationsActed = await ctx.db
      .query('notifications')
      .withIndex('byActor', (q) => q.eq('actorId', userId))
      .collect()
    for (const notification of notificationsActed) {
      await ctx.db.delete(notification._id)
    }

    // 7. Delete the user's profile picture
    const user = await ctx.db.get(userId)
    if (user?.storageId) {
      try {
        await ctx.storage.delete(user.storageId)
      } catch (e) {
        console.error('Failed to delete user profile picture:', e)
      }
    }

    // 8. Delete the user
    await ctx.db.delete(userId)
}

export const updateProfileData = mutation({
  args: {
    data: v.object({
      name: v.optional(v.string()),
      birthDate: v.optional(v.number()),
      gender: v.optional(v.string()),
      height: v.optional(v.number()),
      weight: v.optional(v.number()),
      username: v.optional(v.string()),
      image: v.optional(v.string()),
      focus: v.optional(v.string()),
      motivation: v.optional(v.string()),
      storageId: v.optional(v.id('_storage')),
    }),
  },
  async handler(ctx, { data }) {
    const user = await getCurrentUserOrThrow(ctx)

    if (data.username) {
      const normalized = data.username.toLowerCase().trim()
      if (normalized.length < 3) {
        throw new Error('Username must be at least 3 characters')
      }

      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', normalized))
        .unique()

      if (existingUser && existingUser._id !== user._id) {
        throw new Error('Username is already taken')
      }
      data.username = normalized
    }

    const { storageId: incomingStorageId, ...otherData } = data
    const updates: any = { ...otherData }
    
    // If a new image is being set
    if (incomingStorageId) {
      const url = await ctx.storage.getUrl(incomingStorageId)
      if (url) {
        // Delete the old profile picture if it exists
        if (user.storageId && user.storageId !== incomingStorageId) {
          try {
            await ctx.storage.delete(user.storageId)
          } catch (e) {
            console.error('Failed to delete old profile picture:', e)
          }
        }
        updates.image = url
        updates.storageId = incomingStorageId
      }
    }

    await ctx.db.patch(user._id, updates)

    // Trigger re-analysis of dashboard insights if focus or motivation has changed
    if (updates.focus || updates.motivation) {
      await ctx.runMutation(internal.dashboardAnalysis.invalidateDailyInsight, {
        userId: user._id,
      })
    }
  },
})
