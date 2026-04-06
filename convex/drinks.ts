import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalQuery, mutation, query } from './_generated/server'
import { getCurrentUserOrThrow } from './users'

export const createNewDrink = mutation({
  args: {
    drink: v.object({
      drinkType: v.string(),
      name: v.string(),
      calories: v.number(),
      sugar: v.number(),
      sizeValue: v.optional(v.number()),
      sizeUnit: v.optional(v.string()),
      packaging: v.string(),
      price: v.number(),
      imageId: v.optional(v.id('_storage')),
      caffeine: v.number(),
      isAlcoholic: v.boolean(),
      alcoholContent: v.optional(v.number()),
      healthScore: v.number(),
      healthScoreReason: v.string(),
      socialHook: v.optional(v.string()),
      timestamp: v.number(),
      dayKey: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const user = await getCurrentUserOrThrow(ctx)

    // Insert drink with the authenticated user's ID
    const newDrinkId = await ctx.db.insert('drinks', {
      ...args.drink,
      userId: user._id,
    })

    // NEW: Update room activities and user ranking
    await ctx.runMutation(internal.rooms.trackDrinkActivity, {
      userId: user._id,
      drinkId: newDrinkId,
      socialHook: args.drink.socialHook,
      drinkName: args.drink.name,
    })

    // Invalidate Daily Insight Cache for the specific day of the drink
    const existing = await ctx.db
      .query('daily_insights')
      .withIndex('byUserAndDay', (q) =>
        q.eq('userId', user._id).eq('dayKey', args.drink.dayKey),
      )
      .unique()
    if (existing) {
      await ctx.db.delete(existing._id)
    }

    // Fetch and return the complete document
    const newDrink = await ctx.db.get(newDrinkId)
    return newDrink
  },
})

export const updateDrink = mutation({
  args: {
    drinkId: v.id('drinks'),
    updates: v.object({
      drinkType: v.optional(v.string()),
      name: v.optional(v.string()),
      calories: v.optional(v.number()),
      sugar: v.optional(v.number()),
      sizeValue: v.optional(v.number()),
      sizeUnit: v.optional(v.string()),
      packaging: v.optional(v.string()),
      price: v.optional(v.number()),
      imageId: v.optional(v.id('_storage')),
      caffeine: v.optional(v.number()),
      isAlcoholic: v.optional(v.boolean()),
      alcoholContent: v.optional(v.number()),
      healthScore: v.optional(v.number()),
      healthScoreReason: v.optional(v.string()),
      socialHook: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const user = await getCurrentUserOrThrow(ctx)

    // Fetch the drink to verify ownership
    const drink = await ctx.db.get(args.drinkId)
    if (!drink) {
      throw new Error('Drink not found')
    }

    // Verify the user owns this drink
    if (drink.userId !== user._id) {
      throw new Error('Forbidden: You can only update your own drinks')
    }

    // Update the drink with only the provided fields
    await ctx.db.patch(args.drinkId, args.updates)

    // Invalidate Cache for the day of this drink
    const existingCache = await ctx.db
      .query('daily_insights')
      .withIndex('byUserAndDay', (q) =>
        q.eq('userId', user._id).eq('dayKey', drink.dayKey),
      )
      .unique()
    if (existingCache) await ctx.db.delete(existingCache._id)

    // NEW: Sync update to social room activities
    const socialUpdates: { drinkName?: string; socialHook?: string } = {}
    if (args.updates.name && args.updates.name !== drink.name) {
      socialUpdates.drinkName = args.updates.name
    }
    if (
      args.updates.socialHook &&
      args.updates.socialHook !== drink.socialHook
    ) {
      socialUpdates.socialHook = args.updates.socialHook
    }

    if (Object.keys(socialUpdates).length > 0) {
      await ctx.runMutation(internal.rooms.syncDrinkUpdate, {
        drinkId: args.drinkId,
        updates: socialUpdates,
      })
    }

    // Fetch and return the updated document
    const updatedDrink = await ctx.db.get(args.drinkId)
    return updatedDrink
  },
})

export const deleteDrink = mutation({
  args: {
    drinkId: v.id('drinks'),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const user = await getCurrentUserOrThrow(ctx)

    // Fetch the drink to verify ownership
    const drink = await ctx.db.get(args.drinkId)
    if (!drink) {
      throw new Error('Drink not found')
    }

    // Verify the user owns this drink
    if (drink.userId !== user._id) {
      throw new Error('Forbidden: You can only delete your own drinks')
    }

    // Delete the image from storage if it exists
    if (drink.imageId) {
      try {
        await ctx.storage.delete(drink.imageId)
      } catch (storageError) {
        console.error('Failed to delete image from storage:', storageError)
        // Continue with drink deletion even if storage deletion fails
      }
    }

    // Delete the drink document
    await ctx.db.delete(args.drinkId)

    // Invalidate Cache for the day of this drink
    const existingCache = await ctx.db
      .query('daily_insights')
      .withIndex('byUserAndDay', (q) =>
        q.eq('userId', user._id).eq('dayKey', drink.dayKey),
      )
      .unique()
    if (existingCache) await ctx.db.delete(existingCache._id)

    // NEW: Cleanup social room activities and notifications
    await ctx.runMutation(internal.rooms.cleanupDrinkSocial, {
      drinkId: args.drinkId,
    })
  },
})

export const getDrink = query({
  args: {
    drinkId: v.id('drinks'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)

    const drink = await ctx.db.get(args.drinkId)
    if (!drink) {
      return null
    }

    // Verify ownership
    if (drink.userId !== user._id) {
      return null
    }

    let imageUrl = null
    if (drink.imageId) {
      imageUrl = await ctx.storage.getUrl(drink.imageId)
    }

    return {
      ...drink,
      imageUrl,
    }
  },
})
export const getAllDrinks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx)

    // Query all drinks for this user using the byUserId index
    const drinks = await ctx.db
      .query('drinks')
      .withIndex('byUserId', (q) => q.eq('userId', user._id))
      .collect()

    // Convert storage IDs to URLs for each drink
    const drinksWithUrls = await Promise.all(
      drinks.map(async (drink) => {
        let imageUrl = null
        if (drink.imageId) {
          imageUrl = await ctx.storage.getUrl(drink.imageId)
        }
        return {
          ...drink,
          imageUrl,
        }
      }),
    )

    return drinksWithUrls
  },
})

export const getDrinksByDay = query({
  args: {
    dayKey: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)

    // Query drinks for this user and specific day using the byUserAndDay index
    const drinks = await ctx.db
      .query('drinks')
      .withIndex('byUserAndDay', (q) =>
        q.eq('userId', user._id).eq('dayKey', args.dayKey),
      )
      .collect()

    // Convert storage IDs to URLs for each drink
    const drinksWithUrls = await Promise.all(
      drinks.map(async (drink) => {
        let imageUrl = null
        if (drink.imageId) {
          imageUrl = await ctx.storage.getUrl(drink.imageId)
        }
        return {
          ...drink,
          imageUrl,
        }
      }),
    )

    return drinksWithUrls
  },
})

export const hasEverLoggedInternal = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const drink = await ctx.db
      .query('drinks')
      .withIndex('byUserId', (q) => q.eq('userId', args.userId))
      .first()
    return !!drink
  },
})

export const getDrinksByDateRangeInternal = internalQuery({
  args: {
    userId: v.id('users'),
    since: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('drinks')
      .withIndex('byUserAndTimestamp', (q) =>
        q.eq('userId', args.userId).gt('timestamp', args.since),
      )
      .collect()
  },
})

export const getRecentHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx)

    return await ctx.db
      .query('drinks')
      .withIndex('byUserId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(5)
  },
})
