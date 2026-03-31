import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal'
import { expo } from '@better-auth/expo'
import { components } from './_generated/api'
import { DataModel } from './_generated/dataModel'
import { query } from './_generated/server'
import authConfig from './auth.config'

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [
      'betterdrinkai://',
      'betterdrinkai://*', // Development mode - Expo's exp:// scheme with local IP ranges
      ...(process.env.NODE_ENV === 'development'
        ? [
            'exp://', // Trust all Expo URLs (prefix matching)
            'exp://**', // Trust all Expo URLs (wildcard matching)
            'exp://[IP_ADDRESS]/*', // Trust [IP_ADDRESS] IP range with any port and path
          ]
        : []),
    ],
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
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
