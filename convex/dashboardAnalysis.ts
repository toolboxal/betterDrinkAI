import { v } from 'convex/values'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { api, internal } from './_generated/api' // Import api to call internal queries
import { Doc } from './_generated/dataModel'
import { action, internalMutation, query } from './_generated/server'
import { createGeminiClient } from './gemini'
import { createOpenAIClient } from './openai'
import { getCurrentUserOrThrow } from './users'

export type DailyAnalysis = z.infer<typeof dailyAnalysisSchema>

const dailyAnalysisSchema = z.object({
  topSummary: z.object({
    title: z.string().describe('Catchy summarizes title with emoji'),
    content: z
      .string()
      .describe(
        'A concise 2-3 sentence qualitative narrative of the day. Focus on the "story" or "vibe" of the journey so far (e.g. "The Energy Slump" or "The Clean Streak"). Avoid listing raw numbers here.',
      ),
  }),
  deepDive: z.object({
    title: z.string().describe('Deep Dive title (e.g., "The Lab Report")'),
    good: z
      .object({
        drinkName: z.string(),
        reason: z.string(),
        cheer: z.string(),
      })
      .nullable()
      .describe(
        'Best drink logged today. Null if only unhealthy drinks logged.',
      ),
    bad: z
      .object({
        drinkName: z.string(),
        reason: z.string(),
        costInSteps: z.number(),
        suggestedSwap: z.string(),
      })
      .nullable()
      .describe(
        'Least healthy drink logged today. Null if only healthy drinks logged.',
      ),
    hydrationReport: z.object({
      status: z.string().describe('Short status like "Hydrated" or "At Risk"'),
      analysis: z.string().describe('Advice based on volume vs steps taken.'),
    }),
  }),
  trend7Day: z.object({
    title: z.string().describe('Weekly Trend title'),
    analysis: z.string().describe(
      `An analysis of the past 7 days.
      - Focus on consistency and progress toward the 7-day goal.
      - Use worded trends rather than numbers.
      - Tone: Reflective.`,
    ),
    spendingHabit: z
      .string()
      .describe('Analysis of spending habits vs an average person.'),
    environmentalImpact: z
      .string()
      .describe(
        'Analysis of packaging sustainability and eco-friendly suggestions.',
      ),
  }),
  mood: z
    .enum(['happy', 'neutral', 'savage'])
    .describe('The overall mood of the insight.'),
})

/**
 * 1. GET DAILY INSIGHT (CACHE CHECK)
 */
export const getDailyInsight = query({
  args: {
    dayKey: v.string(), // "YYYY-MM-DD"
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    (Doc<'daily_insights'> & { parsedInsight?: DailyAnalysis }) | null
  > => {
    const userRecord = await getCurrentUserOrThrow(ctx)

    const cachedInsight = await ctx.db
      .query('daily_insights')
      .withIndex('byUserAndDay', (q) =>
        q.eq('userId', userRecord._id).eq('dayKey', args.dayKey),
      )
      .unique()

    if (!cachedInsight) return null

    try {
      const parsedInsight = JSON.parse(cachedInsight.insight) as DailyAnalysis
      return {
        ...cachedInsight,
        parsedInsight,
      }
    } catch (e) {
      return {
        ...cachedInsight,
      }
    }
  },
})

/**
 * 2. INVALIDATE CACHE
 */
export const invalidateDailyInsight = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const existingInsights = await ctx.db
      .query('daily_insights')
      .withIndex('byUserId', (q) => q.eq('userId', args.userId))
      .collect()

    for (const insight of existingInsights) {
      await ctx.db.delete(insight._id)
    }
  },
})

/**
 * 3. SAVE INSIGHT (INTERNAL)
 */
export const saveDailyInsight = internalMutation({
  args: {
    userId: v.id('users'),
    dayKey: v.string(),
    insight: v.string(),
    mood: v.string(),
  },
  handler: async (ctx, args) => {
    const existingInsights = await ctx.db
      .query('daily_insights')
      .withIndex('byUserId', (q) => q.eq('userId', args.userId))
      .collect()

    for (const insight of existingInsights) {
      await ctx.db.delete(insight._id)
    }

    await ctx.db.insert('daily_insights', {
      userId: args.userId,
      dayKey: args.dayKey,
      insight: args.insight,
      mood: args.mood,
    })
  },
})

/**
 * 4. GENERATE INSIGHT
 */
export const generateDailyInsight = action({
  args: {
    dayKey: v.string(),
    timezoneOffset: v.number(),
    steps: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DailyAnalysis> => {
    const user = await ctx.runQuery(api.users.current)
    if (!user) throw new Error('User not found')

    const userName = user.username || 'Friend'
    const userFocus = (user.focus || 'Stay Healthy').replace(/_/g, ' ')
    const userMotivation = (user.motivation || 'Overall Well-being').replace(
      /_/g,
      ' ',
    )

    const now = Date.now()
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const since = now - SEVEN_DAYS_MS

    // Optimize: only fetch what we need for the 7-day trend
    const last7DaysDrinks = await ctx.runQuery(
      internal.drinks.getDrinksByDateRangeInternal,
      {
        userId: user._id,
        since,
      },
    )

    const todayDrinks = last7DaysDrinks.filter((d) => d.dayKey === args.dayKey)

    const todayStats = calculateTodayStats(todayDrinks)
    const trendStats = calculateTrendStats(last7DaysDrinks)

    // Calculate age if birthDate exists
    let age = 'Unknown'
    if (user.birthDate) {
      const birthYear = new Date(user.birthDate).getFullYear()
      const currentYear = new Date().getFullYear()
      age = (currentYear - birthYear).toString()
    }

    // -- TIME-AWARE LOGIC --
    // getTimezoneOffset() returns (UTC - Local) in minutes.
    // To get Local from UTC, we do: Local = UTC - Offset.
    const localTimeMs = Date.now() - args.timezoneOffset * 60000
    const localDate = new Date(localTimeMs)
    const currentHour = localDate.getUTCHours()
    const currentLocalTime = `${String(currentHour).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`

    // -- NEW USER LOGIC --
    // A user is "New" only if they have never logged a drink ever.
    const hasHistory = await ctx.runQuery(
      internal.drinks.hasEverLoggedInternal,
      { userId: user._id },
    )
    const isNewUser = !hasHistory

    if (todayDrinks.length === 0) {
      const isEarlyMorning = currentHour >= 5 && currentHour < 11
      const isLateNight = currentHour >= 22 || currentHour < 5
      const hasSteps = (args.steps ?? 0) > 0
      const emptyResult: DailyAnalysis = {
        topSummary: {
          title: isNewUser
            ? `Welcome, ${userName}!`
            : hasSteps
              ? 'Active & Clean! 🏃‍♂️'
              : 'Quiet Day? 🧊',
          content: isNewUser
            ? `Welcome to your personal Drink Better Lab! I'm your AI health coach. Snap a photo of your first drink today to start your journey toward your goal of ${userMotivation}.`
            : hasSteps
              ? `Hey ${userName}, you've hit ${args.steps?.toLocaleString()} steps but haven't logged any drinks. Snap a photo of what you're sipping to complete your report!`
              : isEarlyMorning
                ? `Good morning ${userName}! Your lab is fresh and ready. Start logging your first drink of the day whenever you're ready.`
                : `Hey ${userName}, your lab is empty! Start logging your drinks today to see your health and spending trends.`,
        },
        deepDive: {
          title: 'The Lab is Open',
          good: {
            drinkName: isNewUser ? 'Ready for Day 1' : 'Missing Data',
            reason: isNewUser
              ? `Successfully set up for: ${userFocus} (${userMotivation}).`
              : 'We need at least one log to start your daily health analysis.',
            cheer: isNewUser
              ? 'Scan your first drink! ✨'
              : 'Start by scanning your first drink!',
          },
          bad: null,
          hydrationReport: {
            status: isNewUser
              ? 'Awaiting First Log'
              : isEarlyMorning
                ? 'Just Waking up'
                : isLateNight
                  ? 'Late Night'
                  : 'Awaiting Log',
            analysis: isNewUser
              ? "Once you log, I'll calculate your hydration needs based on your weight and activity. Keep some water handy!"
              : isEarlyMorning
                ? "It's early! Hydration stats will build as you log. Don't forget your morning glass of water."
                : isLateNight
                  ? "Winding down? If you're thirsty, stick to water to avoid sleep-disrupting sugar or caffeine."
                  : hasSteps
                    ? 'You are active but your hydration log is empty. This can lead to fatigue—log your intake now!'
                    : 'The lab report updates in real-time as you log. Start your day by scanning a drink!',
          },
        },
        trend7Day: {
          title: isNewUser ? 'Your Journey Starts' : 'Weekly Reflection',
          analysis: isNewUser
            ? 'This section will show your 7-day habits once you have a few days of data. For now, focus on your first 24 hours!'
            : trendStats.logDays > 0
              ? `You've logged ${trendStats.logDays} days this week. Keeping your "Zero Days" clean like today is the fastest way to hit your goals.`
              : 'Your logs have been a bit intermittent this week. Remember, consistency is the key to understanding your triggers.',
          spendingHabit: 'No spending data available yet.',
          environmentalImpact: 'No packaging data available yet.',
        },
        mood: isNewUser || hasSteps ? 'happy' : 'neutral',
      }
      await ctx.runMutation(internal.dashboardAnalysis.saveDailyInsight, {
        userId: user._id,
        dayKey: args.dayKey,
        insight: JSON.stringify(emptyResult),
        mood: emptyResult.mood,
      })
      return emptyResult
    }

    const genAI = createGeminiClient()
    const prompt = `Analyze ${userName}'s consumption.

CURRENT LOCAL TIME: ${currentLocalTime}
CONTEXT: ${isNewUser ? 'User is BRAND NEW (Day 1/2). Be extremely welcoming and encouraging. Avoid being critical of low frequency.' : 'Regular User.'}

USER STATS:
- Primary Focus: "${userFocus}"
- End Goal (Motivation): "${userMotivation}"
- Age: ${age}
- Gender: ${user.gender || 'Unknown'}
- Weight: ${user.weight ? `${user.weight}kg` : 'Unknown'}
- Height: ${user.height ? `${user.height}cm` : 'Unknown'}

ACTIVITY:
- Total Steps Today: ${args.steps || 'Unknown'}

TODAY'S STATS:
- Total Volume: ${todayStats.totalVolume}ml
- Total Sugar: ${todayStats.totalSugar}g
- Total Caffeine: ${todayStats.totalCaffeine}mg
- Liquid Calories: ${todayStats.totalCalories} kcal
- Drink Logs: ${todayDrinks
      .map((d) => {
        const dLocal = new Date(d.timestamp - args.timezoneOffset * 60000)
        const dTime = `${String(dLocal.getUTCHours()).padStart(2, '0')}:${String(dLocal.getUTCMinutes()).padStart(2, '0')}`
        return `${d.name} logged at ${dTime} (${d.sugar}g sugar, ${d.calories} kcal, ${d.sizeValue || 0}ml)`
      })
      .join(', ')}

7-DAY TREND:
- Avg Daily Sugar: ${trendStats.avgSugar.toFixed(1)}g
- Avg Daily Calories: ${trendStats.avgCalories.toFixed(1)} kcal
- Total Spent: $${trendStats.totalSpent.toFixed(2)}
- Packaging Used: ${Object.entries(trendStats.packagingCounts)
      .map(([type, count]) => `${count}x ${type}`)
      .join(', ')}
- Consistency: ${trendStats.logDays}/7 days logged

You MUST return a JSON object with these sections:

1. topSummary:
   - title: A catchy, narrative-style title with emoji.
   - content: A 2-3 sentence QUALITATIVE narrative. Treat it like a story or a "daily pulse". Instead of "You drank 500ml", say "You started strong but the afternoon heat almost got the best of you." Connect the dots between their logs, their ${userFocus} focus, and their ${userMotivation} motivation.
2. deepDive:
   - title: A specific title reflecting today's theme (e.g. "Early Bird Energy" or "Late Night Sugar Strike").
   - good: Identify the BEST drink logged today. Give a reason and a cheer.
   - bad: Identify the WORST drink logged today. If they drank CAFFEINE within 6 hours of typical sleep time (e.g. after 4PM), flag its impact on sleep quality. Give reason, burn-off cost, and swap.
   - hydrationReport: Analyze hydration based on stats and ${args.steps || 0} steps. 
     CRITICAL: If it is early morning (Current Time: ${currentLocalTime}), be encouraging rather than critical about low intake.
     NOTE: Analyze the timing of intake too. 
   *Note: Use the user's weight/stats for more personalized burn-off and health advice.*
3. trend7Day:
   - title: Qualitative 7-day pulse.
   - analysis: General trend over the last week.
   - spendingHabit: A narrative judgment on their total spend of $${trendStats.totalSpent.toFixed(2)}. Don't just report the number; tell them what they are "buying" instead of a future (e.g. "You're drinking your down payment").
   - environmentalImpact: A "Savage Eco-Report". Look at their packaging levels (${Object.entries(
     trendStats.packagingCounts,
   )
     .map(([k, v]) => `${v} ${k}`)
     .join(
       ', ',
     )}). If they use too much plastic/aluminum, call out the "Trash Mountain" they are building. Suggest a lifestyle shift (tumblers, bulk) in a narrative way.

CRITICAL FOR TOTAL SOBRIETY:
If the motivation is "total sobriety" and an alcoholic drink is logged, do NOT just roast the calories or cost. Act as a "Protective Watchdog". Ask them if they are okay, remind them of the importance of their streak, and suggest immediate alternatives (water, soda water) to stop further intake. Be firm but supportive.
4. mood: happy, neutral, or savage.

Return ONLY valid JSON.`

    const baseSchema = zodToJsonSchema(dailyAnalysisSchema)

    const timeout = (ms: number) =>
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error(`API Timeout after ${ms}ms`)), ms),
      )

    try {
      // 🛑 UNCOMMENT THIS LINE TO TEST GEMINI DOWNTIME
      // throw new Error('INTENTIONAL TEST ERROR: Simulating Gemini API Outage')
      const response = await Promise.race([
        genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: baseSchema,
          },
        }),
        timeout(20000), // 20 seconds maximum for Gemini
      ])

      const content = response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!content) throw new Error('Gemini generation failed')

      const result = dailyAnalysisSchema.parse(JSON.parse(content))

      await ctx.runMutation(internal.dashboardAnalysis.saveDailyInsight, {
        userId: user!._id,
        dayKey: args.dayKey,
        insight: JSON.stringify(result),
        mood: result.mood,
      })

      return result
    } catch (geminiError) {
      console.warn('Gemini failed, falling back to OpenAI:', geminiError)

      try {
        const openai = createOpenAIClient()

        const completion = await Promise.race([
          openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are an AI health and lifestyle coach analyzing daily consumption. You are sometimes savage but always helpful.',
              },
              { role: 'user', content: prompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'DailyAnalysisResponse',
                schema: baseSchema as Record<string, any>,
              },
            },
          }),
          timeout(20000), // 20 seconds maximum for OpenAI fallback
        ])

        const fallbackContent = completion.choices[0]?.message?.content
        if (!fallbackContent) throw new Error('OpenAI generation failed')

        const fallbackResult = dailyAnalysisSchema.parse(
          JSON.parse(fallbackContent),
        )

        console.log(
          '✅ OpenAI successfully generated the daily insight instead of Gemini.',
        )

        await ctx.runMutation(internal.dashboardAnalysis.saveDailyInsight, {
          userId: user!._id,
          dayKey: args.dayKey,
          insight: JSON.stringify(fallbackResult),
          mood: fallbackResult.mood,
        })

        return fallbackResult
      } catch (openaiError) {
        console.error('Both Gemini and OpenAI failed:', openaiError)
        throw new Error('All AI providers are currently unavailable')
      }
    }
  },
})

// --- HELPERS ---
function calculateTodayStats(drinks: Doc<'drinks'>[]) {
  return {
    totalSugar: drinks.reduce((acc, d) => acc + (d.sugar || 0), 0),
    totalCaffeine: drinks.reduce((acc, d) => acc + (d.caffeine || 0), 0),
    totalCalories: drinks.reduce((acc, d) => acc + (d.calories || 0), 0),
    totalVolume: drinks.reduce((acc, d) => acc + (d.sizeValue || 0), 0),
    types: Array.from(new Set(drinks.map((d) => d.drinkType))),
  }
}

function calculateTrendStats(drinks: Doc<'drinks'>[]) {
  const dayKeys = Array.from(new Set(drinks.map((d) => d.dayKey)))
  const totalSugar = drinks.reduce((acc, d) => acc + (d.sugar || 0), 0)
  const totalCalories = drinks.reduce((acc, d) => acc + (d.calories || 0), 0)
  const totalSpent = drinks.reduce((acc, d) => acc + (d.price || 0), 0)
  const packagingCounts = drinks.reduce((acc: Record<string, number>, d) => {
    acc[d.packaging] = (acc[d.packaging] || 0) + 1
    return acc
  }, {})

  return {
    avgSugar: totalSugar / 7,
    avgCalories: totalCalories / 7,
    totalSpent,
    packagingCounts,
    logDays: dayKeys.length,
  }
}
