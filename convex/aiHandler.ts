import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { type Doc, type Id } from './_generated/dataModel'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { v, ConvexError } from 'convex/values'

type Drink = Doc<'drinks'>

type DrinkForCreation = Omit<
  Drink,
  '_id' | '_creationTime' | 'imageId' | 'userId'
>

// Schema for content moderation
const moderationSchema = z.object({
  isDrink: z
    .boolean()
    .describe(
      'Whether the image contains a beverage/drink (true) or something else like food, car, person, etc. (false). Drink can also include being in a sachet/tea bag or powder form.',
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Confidence level from 0 to 1 that this assessment is correct. 0 is least confident, 1 is most confident',
    ),
  reason: z
    .string()
    .describe(
      'Very brief explanation of what is in the image and why it is or is not a drink',
    ),
  suggestion: z
    .string()
    .describe(
      'Only if it is a drink, give brief advice on how to improve the photo. Eg. better angle, better lighting, move back, turn object around etc.',
    ),
})

const drinkSchema = z.object({
  // Add descriptions to help the AI understand the fields
  drinkType: z
    .string()
    .describe('Type of the drink, e.g., soda, coffee, juice'),
  name: z.string().describe('Brand and name of the drink'),
  calories: z.number().describe('Calories per serving'),
  sugar: z.number().describe('Grams of sugar per serving'),
  sizeValue: z
    .optional(z.number())
    .describe(
      'The volume of the drink in ml. If in sachet, use 100ml as default',
    ),
  sizeUnit: z
    .optional(z.string())
    .describe(
      "The unit of volume, must be 'ml'. If in sachet, use 100ml as default",
    ),
  packaging: z
    .string()
    .describe(
      'What is the packaging? limit to these options: sachet, can, plastic bottle, glass bottle, plastic cup, paper cup, ceramic/glass cup,carton ,pouch, tumbler',
    ),
  price: z.number().describe('Price of the drink'),
  caffeine: z.number().describe('Milligrams of caffeine per serving'),
  isAlcoholic: z.boolean(),
  alcoholContent: z
    .optional(z.number())
    .describe('Alcohol by volume (ABV) percentage'),
  healthScore: z
    .number()
    .describe('Give a health score from 1 to 10. 1 is worst, 10 is best'),
  healthScoreReason: z
    .string()
    .describe(
      `Technical, honest reason for the score (e.g. "30g sugar, high acid").`,
    ),
  socialHook: z
    .string()
    .describe(
      `Brutally honest, context-aware observation for the community feed. Mention trends if applicable (e.g. "Alex is on their 3rd soda today"). "Savage-but-caring" tone.`,
    ),
  timestamp: z.number().optional(),
  dayKey: z.string().optional(),
})

import { createGeminiClient } from './gemini'
import { createOpenAIClient } from './openai'

// ...

// Initialize the Google AI client
const genAI = createGeminiClient()

export const aiHandler = action({
  args: {
    imageBase64: v.string(),
    localDayKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Check if user is authenticated
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new ConvexError({ error: 'Unauthorized', message: 'Unauthorized' })
    }

    try {
      // 1. Get the image data from the request body
      const { imageBase64, localDayKey } = args
      if (!imageBase64) {
        throw new ConvexError({ error: 'Image data is required', message: 'Image data is required' })
      }

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg',
        },
      }

    const moderationBaseSchema = zodToJsonSchema(moderationSchema)
    const drinkBaseSchema = zodToJsonSchema(drinkSchema)

    const timeout = (ms: number) =>
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error(`API Timeout after ${ms}ms`)), ms),
      )

    // 2. First, validate if the image contains a drink (content moderation)
    const moderationPrompt =
      'Analyze this image and determine if it contains a beverage/drink. Consider items like soda, juice, coffee, tea, water, energy drinks, alcoholic beverages, etc. as drinks. Do NOT consider food items, dishes, cars, people, or other non-beverage items as drinks.'

    let moderationText: any
    try {
      // 🛑 UNCOMMENT THIS LINE TO TEST GEMINI DOWNTIME
      // throw new Error('INTENTIONAL TEST ERROR: Simulating Gemini API Outage')
      const moderationResponse = await Promise.race([
        genAI.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [{ text: moderationPrompt }, imagePart],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: moderationBaseSchema,
          },
        }),
        timeout(20000), // 20 seconds maximum
      ])

      try {
        moderationText = moderationResponse.text
      } catch {
        moderationText =
          moderationResponse.candidates?.[0]?.content?.parts?.[0]?.text
      }

      if (!moderationText) throw new Error('No content in moderation response')
    } catch (geminiError) {
      console.warn(
        'Gemini Moderation failed, falling back to OpenAI:',
        geminiError,
      )
      const openai = createOpenAIClient()

      const completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI content moderator. Evaluate if the image contains a beverage. Return ONLY valid JSON matching this exact schema: ' +
                JSON.stringify(moderationBaseSchema),
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: moderationPrompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
        timeout(20000),
      ])

      moderationText = completion.choices[0]?.message?.content
      if (!moderationText)
        throw new Error('OpenAI Moderation generation failed')

      console.log('✅ OpenAI successfully generated the moderation result.')
    }

    let moderationData: any = {}
    if (typeof moderationText === 'string') {
      try {
        const cleaned = moderationText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
        moderationData = JSON.parse(cleaned)

        // Unwrap schema if OpenAI accidentally returned nested roots
        if (moderationData.properties && moderationData.isDrink === undefined) {
          moderationData = moderationData.properties
        }
      } catch (e) {
        console.error('Failed to parse Moderation AI output:', e)
      }
    } else {
      moderationData = moderationText
    }

    // Validate with Zod
    const moderation = moderationSchema.parse(moderationData)
    console.log('Moderation result: ', moderation)

    // 3. Check if image is a drink with sufficient confidence
    if (!moderation.isDrink) {
      if (moderation.confidence < 0.5) {
        throw new ConvexError({
          error: 'unclear_image',
          message: 'The image is unclear or blurry.',
          reason: moderation.reason,
          confidence: moderation.confidence,
          suggestion: moderation.suggestion,
        })
      }
      throw new ConvexError({
        error: 'not_a_drink',
        message: 'The image does not appear to contain a beverage.',
        reason: moderation.reason,
        confidence: moderation.confidence,
        suggestion: moderation.suggestion,
      })
    } else if (moderation.confidence < 0.8) {
      throw new ConvexError({
        error: 'low_confidence',
        message: 'We are not confident enough that this is a drink. Please take a clearer photo.',
        reason: moderation.reason,
        confidence: moderation.confidence,
        suggestion: moderation.suggestion,
      })
    }

    // 4. Fetch User Information and History for Context
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
      history.length > 0
        ? history
            .map(
              (d: any) =>
                `- ${new Date(d._creationTime).toLocaleDateString()} ${new Date(d._creationTime).toLocaleTimeString()}: ${d.name} (${d.sugar}g sugar, ${d.caffeine}mg caffeine, Alcohol: ${d.isAlcoholic ? `Yes (${d.alcoholContent ?? 0}%)` : 'No'}, Score: ${d.healthScore}/10)`,
            )
            .join('\n')
        : 'No recent history.'

    // 5. If validated, extract drink details
    const extractionPrompt = `
      Extract all available information about this drink from the image.
      
      USER CONTEXT: ${userContext}
      
      USER RECENT HISTORY (Last 5 drinks):
      ${historyString}
      
      Your job is to provide a pithy, context-aware 'socialHook' for the community (MAX 10 WORDS).
      Look for patterns: 
      - Is the user improving compared to their goal? 
      - Are they stuck in a negative loop? 
      - Are they breaking a hard-earned streak?
      - If history is empty, treat this as their 'Origin Story'. Be welcoming and encouraging!
      
      The 'socialHook' should be a punchy narrative status of their current vibe. 
      BE BRIEF (5-10 words). Use a "savage-but-caring" tone.
    `

    let extractionContent: any
    try {
      // 🛑 UNCOMMENT THIS LINE TO TEST GEMINI DOWNTIME
      // throw new Error('INTENTIONAL TEST ERROR: Simulating Gemini API Outage')
      const extractionResponse = await Promise.race([
        genAI.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [{ text: extractionPrompt }, imagePart],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: drinkBaseSchema,
          },
        }),
        timeout(25000), // 25 seconds for extraction
      ])

      extractionContent =
        extractionResponse.candidates?.[0]?.content?.parts?.[0]?.text
      if (!extractionContent)
        throw new Error('No content in extraction response')
    } catch (geminiError) {
      console.warn(
        'Gemini Extraction failed, falling back to OpenAI:',
        geminiError,
      )
      const openai = createOpenAIClient()

      const completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI health and lifestyle coach analyzing a beverage image. Return ONLY valid JSON matching this exact schema: ' +
                JSON.stringify(drinkBaseSchema),
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: extractionPrompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
        timeout(25000),
      ])

      extractionContent = completion.choices[0]?.message?.content
      if (!extractionContent)
        throw new Error('OpenAI Extraction generation failed')

      console.log('✅ OpenAI successfully extracted the drink info.')
    }

    let parsedJson: any = {}
    try {
      // Strip markdown code blocks if the LLM ignores json_object format rules
      const cleaned = extractionContent
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      parsedJson = JSON.parse(cleaned)
      console.log('Raw AI Output:', JSON.stringify(parsedJson, null, 2))

      // If OpenAI accidentally wraps the output in the schema's root format, unwrap it:
      if (parsedJson.properties && !parsedJson.drinkType) {
        parsedJson = parsedJson.properties
      }
    } catch (e) {
      console.error('Failed to parse AI output as JSON:', e)
    }

    const result = drinkSchema.parse(parsedJson)

    console.log(result)

    let storageId: Id<'_storage'>

    // convert and store image to Convex storage
    try {
      // Convert base64 to Uint8Array (browser-compatible)
      const binaryString = atob(imageBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      storageId = await ctx.storage.store(blob)
      console.log('Image stored in Convex with ID:', storageId)
    } catch (storageError) {
      console.error('Error storing image in Convex:', storageError)
      throw new Error('Failed to store image in Convex')
    }

    let newDrink

    try {
      const now = Date.now()
      const dayKey = localDayKey || new Date(now).toISOString().split('T')[0]
      newDrink = await ctx.runMutation(api.drinks.createNewDrink, {
        drink: {
          ...result,
          imageId: storageId,
          price: result.price ?? 0,
          caffeine: result.caffeine ?? 0,
          timestamp: now,
          dayKey: dayKey,
        },
      })
    } catch (mutationError) {
      console.error(
        'Error running mutation to create new drink:',
        mutationError,
      )
      throw new Error('Failed to create new drink in database')
    }

    // 5. Return the structured data
    return newDrink
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    console.error('Error in AI API route:', error)
    throw new ConvexError({ error: 'An internal error occurred', message: 'An internal error occurred' })
  }
}
})
