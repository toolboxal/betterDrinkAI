import { internalMutation } from './_generated/server'

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rooms = [
      {
        name: 'Soda-Free Squad',
        description: 'Quitting the fizz together. Share your sugar-free wins!',
        icon: '🥤',
        slug: 'soda-free',
      },
      {
        name: 'Zero Alcohol',
        description:
          'Support for those staying clear-headed and hangover-free.',
        icon: '🍺',
        slug: 'alcohol-free',
      },
      {
        name: 'Caffeine Control',
        description: 'Taming the jitters. Because you should sleep eventually.',
        icon: '⚡️',
        slug: 'caffeine-control',
      },
      {
        name: 'Hydro Homies',
        description: 'Water is life. Log your hydration and stay wet.',
        icon: '🌊',
        slug: 'hydration',
      },
    ]

    for (const room of rooms) {
      const existing = await ctx.db
        .query('rooms')
        .withIndex('bySlug', (q) => q.eq('slug', room.slug))
        .unique()

      if (!existing) {
        await ctx.db.insert('rooms', room)
      }
    }
  },
})
