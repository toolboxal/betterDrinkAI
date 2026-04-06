import { v } from 'convex/values'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { createGeminiClient } from './gemini'
import { createOpenAIClient } from './openai'

const healthSchema = z.object({
  healthScore: z
    .number()
    .describe('Give a health score from 1 to 10. 1 is worst, 10 is best'),
  healthScoreReason: z
    .string()
    .describe(
      `Technical, honest 4-8 word reason for the score (e.g. "30g sugar, high acid").`,
    ),
  socialHook: z
    .string()
    .describe(
      `Pithy, context-aware observation for the community (MAX 10 WORDS). Use the provided user history to notice trends. Roast/cheer based on choices and goals.`,
    ),
})

export const analyzeDrinkHealth = action({
  args: {
    name: v.string(),
    drinkType: v.string(),
    calories: v.number(),
    sugar: v.number(),
    caffeine: v.optional(v.number()),
    isAlcoholic: v.boolean(),
    alcoholContent: v.optional(v.number()),
    sizeValue: v.optional(v.number()),
    sizeUnit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch User Information and History for Context internally
    const user = await ctx.runQuery(api.users.current)
    const history = await ctx.runQuery(api.drinks.getRecentHistory)

    const userFocus = user?.focus
      ? user.focus.replace(/_/g, ' ')
      : 'General health'
    const userMotivation = user?.motivation
      ? user.motivation.replace(/_/g, ' ')
      : 'well-being'
    const userContext = `Focus: ${userFocus}, Motivation: ${userMotivation}`

    const historyString =
      history && history.length > 0
        ? history
            .map(
              (d: any) =>
                `- ${new Date(d._creationTime).toLocaleDateString()} ${new Date(d._creationTime).toLocaleTimeString()}: ${d.name} (${d.sugar}g sugar, ${d.caffeine}mg caffeine, Alcohol: ${d.isAlcoholic ? `Yes (${d.alcoholContent ?? 0}%)` : 'No'}, Score: ${d.healthScore}/10)`,
            )
            .join('\n')
        : 'No recent history.'

    const genAI = createGeminiClient()

    const timeout = (ms: number) =>
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error(`API Timeout after ${ms}ms`)), ms),
      )

    const baseSchema = zodToJsonSchema(healthSchema)

    const prompt = `
      Analyze the healthiness of this drink based on its nutritional content and user context:
      
      Name: ${args.name}
      Type: ${args.drinkType}
      Calories: ${args.calories}
      Sugar: ${args.sugar}g
      Caffeine: ${args.caffeine ?? 0}mg
      Size: ${args.sizeValue || 'Unknown'} ${args.sizeUnit || ''}
      Alcoholic: ${args.isAlcoholic ? 'Yes' : 'No'}
      ${args.isAlcoholic ? `Alcohol Content: ${args.alcoholContent}%` : ''}
      
      USER CONTEXT: ${userContext}
      
      USER RECENT HISTORY:
      ${historyString}
      
      Instructions:
      1. Provide a health score (1-10).
      2. Provide a 'healthScoreReason' (Technical, 4-8 words).
      3. Provide a 'socialHook' (Pithy, context-aware narrative status, 5-10 words).
         Use a "savage-but-caring" tone. Look for patterns or goal alignment.
         If history is empty, treat this as their 'Origin Story'. Be welcoming and encouraging!
    `

    let analysisContent: any
    try {
      // 🛑 UNCOMMENT THIS LINE TO TEST GEMINI DOWNTIME
      // throw new Error('INTENTIONAL TEST ERROR: Simulating Gemini API Outage')
      const response = await Promise.race([
        genAI.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: baseSchema,
          },
        }),
        timeout(20000), // 20s timeout
      ])

      analysisContent = response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!analysisContent)
        throw new Error('Failed to generate health analysis via Gemini')
    } catch (geminiError) {
      console.warn(
        'Gemini Drink Analysis failed, falling back to OpenAI:',
        geminiError,
      )

      const openai = createOpenAIClient()
      const fallbackPrompt =
        prompt +
        '\n\nReturn ONLY valid JSON matching this exact schema: ' +
        JSON.stringify(baseSchema)

      const completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI health and lifestyle coach analyzing a beverage. You are sometimes savage but always helpful.',
            },
            {
              role: 'user',
              content: fallbackPrompt,
            },
          ],
          response_format: { type: 'json_object' },
        }),
        timeout(20000),
      ])

      analysisContent = completion.choices[0]?.message?.content
      if (!analysisContent)
        throw new Error('OpenAI Drink Analysis fallback failed')
      console.log('✅ OpenAI successfully re-analyzed the drink history.')
    }

    let parsedJson: any = {}
    try {
      const cleaned = analysisContent
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      parsedJson = JSON.parse(cleaned)

      // Unwrap if OpenAI wraps output
      if (parsedJson.properties && parsedJson.healthScore === undefined) {
        parsedJson = parsedJson.properties
      }
    } catch (e) {
      console.error('Failed to parse AI drink analysis output:', e)
    }

    const result = healthSchema.parse(parsedJson)
    return result
  },
})
