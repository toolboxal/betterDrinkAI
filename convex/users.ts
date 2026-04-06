import { v } from 'convex/values'
import { mutation, QueryCtx, query } from './_generated/server'

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }
  const user = await ctx.db
    .query('users')
    .withIndex('by_better_auth_id', (q) =>
      q.eq('betterAuthId', identity.subject),
    )
    .unique()
  if (!user) {
    throw new Error('User not found')
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
    return await getCurrentUserOrThrow(ctx)
  },
})
