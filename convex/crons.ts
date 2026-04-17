import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Automatically clean up old social data (Notifications, Reactions, etc.)
// Runs every Sunday at 3 AM UTC
crons.daily(
  'Weekly social data cleanup',
  { hourUTC: 3, minuteUTC: 0 },
  internal.cleanup.clearOldSocialData,
  { months: 3 },
)

crons.daily(
  'Weekly drinks cleanup',
  { hourUTC: 4, minuteUTC: 0 }, // 4 AM UTC (offset from the other cleanup)
  internal.cleanup.clearOldDrinks,
  { months: 12 },
)

export default crons
