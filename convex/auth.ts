import { expo } from '@better-auth/expo'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import { components } from './_generated/api'
import { DataModel } from './_generated/dataModel'
import { query } from './_generated/server'
import authConfig from './auth.config'

import { internal } from './_generated/api'

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
    ],
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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
