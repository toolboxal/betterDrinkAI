import { expo } from '@better-auth/expo'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import { importPKCS8, SignJWT } from 'jose'
import { components } from './_generated/api'
import { DataModel } from './_generated/dataModel'
import { action, query } from './_generated/server'
import authConfig from './auth.config'

import { internal } from './_generated/api'

// Generate the client secret JWT required for 'Sign in with Apple'.
async function generateAppleClientSecret(
  clientId: string,
  teamId: string,
  keyId: string,
  privateKey: string,
) {
  const key = await importPKCS8(privateKey, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key)
}

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent: ReturnType<typeof createClient<DataModel>> =
  createClient<DataModel>(components.betterAuth, {
    triggers: {
      user: {
        onCreate: async (ctx, user) => {
          await ctx.db.insert('users', {
            name: user.name,
            email: user.email,
            image: user.image ?? undefined,
            betterAuthId: user._id,
          })
        },
        onUpdate: async (ctx, newDoc, oldDoc) => {
          const existing = await ctx.db
            .query('users')
            .withIndex('by_better_auth_id', (q) =>
              q.eq('betterAuthId', oldDoc._id),
            )
            .unique()
          if (existing) {
            await ctx.db.patch(existing._id, {
              email: newDoc.email,
            })
          }
        },
        onDelete: async (ctx, doc) => {
          const existing = await ctx.db
            .query('users')
            .withIndex('by_better_auth_id', (q) =>
              q.eq('betterAuthId', doc._id),
            )
            .unique()
          if (existing) {
            await ctx.db.delete(existing._id)
          }
        },
      },
    },
    authFunctions: internal.authTriggers,
  })

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    // Better Auth needs a base URL to handle redirects correctly.
    // In Convex, this is the site URL plus the route prefix.
    baseURL:
      (process.env.CONVEX_SITE_URL ||
        'https://' + process.env.CONVEX_DEPLOYMENT + '.convex.site') +
      '/api/auth',
    trustedOrigins: [
      'betterdrinkai://',
      'betterdrinkai://*',
      'exp://',
      'exp://*',
      'exp://**',
      'exp://localhost:*',
      'exp://127.0.0.1:*',
      'exp://192.168.*', // Trust common local network IP range
      'exp://192.168.*:*',
      // The Better Auth Expo plugin uses these schemes during development
      'https://appleid.apple.com',
    ],
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    // emailAndPassword: {
    //   enabled: true,
    //   requireEmailVerification: false,
    // },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID as string,
        clientSecret: process.env.APPLE_CLIENT_SECRET as string,
        // Important for iOS native sign-in verification
        appBundleIdentifier: (process.env.APPLE_APP_BUNDLE_IDENTIFIER ||
          process.env.APPLE_CLIENT_ID) as string,
      },
    },
    plugins: [
      // The Expo and Convex plugins are required
      expo(),
      convex({ authConfig }),
    ],
  })
}
// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
})

/**
 * Run this action once from the Convex dashboard or CLI to generate a client secret
 * valid for 180 days. Then save it to your Convex environment variables as
 * APPLE_CLIENT_SECRET.
 *
 * Example: npx convex run auth:getAppleClientSecret
 */
export const getAppleClientSecret = action({
  args: {},
  handler: async () => {
    return await generateAppleClientSecret(
      process.env.APPLE_CLIENT_ID!,
      process.env.APPLE_TEAM_ID!,
      process.env.APPLE_KEY_ID!,
      process.env.APPLE_PRIVATE_KEY!,
    )
  },
})
