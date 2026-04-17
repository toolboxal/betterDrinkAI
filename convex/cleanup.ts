import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'

/**
 * Periodically removes old social data to keep the database lean.
 * Deletes in batches of 500 to stay within transaction limits.
 */
export const clearOldSocialData = internalMutation({
  args: { months: v.number() },
  handler: async (ctx, { months }) => {
    const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000

    // 1. Cleanup Notifications (Oldest first)
    const oldNotifications = await ctx.db
      .query('notifications')
      .filter((q) => q.lt(q.field('timestamp'), cutoff))
      .take(500)

    for (const note of oldNotifications) {
      await ctx.db.delete(note._id)
    }

    // 2. Cleanup Reactions
    const oldReactions = await ctx.db
      .query('reactions')
      .filter((q) => q.lt(q.field('timestamp'), cutoff))
      .take(500)

    for (const reaction of oldReactions) {
      await ctx.db.delete(reaction._id)
    }

    // 3. Cleanup Room Activities (Social logs)
    const oldActivities = await ctx.db
      .query('room_activities')
      .filter((q) => q.lt(q.field('timestamp'), cutoff))
      .take(500)

    for (const activity of oldActivities) {
      await ctx.db.delete(activity._id)
    }

    // If we hit the limit, schedule another run in 1 minute to continue clearing
    if (
      oldNotifications.length === 500 ||
      oldReactions.length === 500 ||
      oldActivities.length === 500
    ) {
      await ctx.scheduler.runAfter(
        1000 * 60,
        internal.cleanup.clearOldSocialData,
        { months },
      )
    }

    console.log(`Cleaned up batch of social data older than ${months} months.`)
  },
})

/**
 * Deletes old drink records and their associated images entirely.
 * Keeps the database and file storage lean by dropping data older than the specified months.
 */
export const clearOldDrinks = internalMutation({
  args: { months: v.number() },
  handler: async (ctx, { months }) => {
    const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000

    // Find old drinks
    const oldDrinks = await ctx.db
      .query('drinks')
      .withIndex('byUserAndTimestamp')
      .filter((q) => q.lt(q.field('timestamp'), cutoff))
      .take(100) // Lower batch size for storage operations

    for (const drink of oldDrinks) {
      // 1. Delete the image if it exists
      if (drink.imageId) {
        try {
          await ctx.storage.delete(drink.imageId)
        } catch (e) {
          console.error('Failed to delete old drink image:', e)
        }
      }

      // 2. Delete the drink record itself
      await ctx.db.delete(drink._id)
    }

    // If we hit the limit, schedule another run in 5 seconds to keep cleaning
    if (oldDrinks.length === 100) {
      await ctx.scheduler.runAfter(5000, internal.cleanup.clearOldDrinks, {
        months,
      })
    }

    console.log(`Cleared batch of drinks older than ${months} months.`)
  },
})
