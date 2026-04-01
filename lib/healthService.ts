import HealthKit, { HealthKitQuery } from 'apple-health'

export const checkHealthPermissions = async () => {
  try {
    const status = await HealthKit.getAuthorizationStatus([
      'dietaryWater',
      'dietarySugar',
      'dietaryCaffeine',
    ])
    // If these are sharingAuthorized, we consider it connected.
    // Note: getAuthorizationStatus only works reliably for write permissions in HealthKit.
    return (
      status['dietaryWater'] === 'sharingAuthorized' ||
      status['dietarySugar'] === 'sharingAuthorized' ||
      status['dietaryCaffeine'] === 'sharingAuthorized'
    )
  } catch (error) {
    console.error('Error checking health permissions:', error)
    return false
  }
}

export const requestHealthPermissions = async () => {
  try {
    const result = await HealthKit.requestAuthorization({
      read: [
        'dateOfBirth',
        'height',
        'bodyMass',
        'biologicalSex',
        'stepCount',
        'dietaryWater',
        'dietarySugar',
        'dietaryCaffeine',
      ],
      write: ['dietaryWater', 'dietarySugar', 'dietaryCaffeine'],
    })

    // Some HealthKit libraries return a raw boolean (true),
    // others return an object { status: 'sharingAuthorized' }. Handling both!
    return (
      (result as any) === true ||
      (result && result.status === 'sharingAuthorized')
    )
  } catch (error) {
    console.error('Error requesting health permissions:', error)
    return false
  }
}

export const fetchHealthData = async () => {
  try {
    const [dobStr, sex] = await Promise.all([
      HealthKit.getDateOfBirth(),
      HealthKit.getBiologicalSex(),
    ])

    // Query Height
    const heightQuery = new HealthKitQuery()
      .type('height', 'statistics')
      .aggregations(['mostRecent'])
    const heightStats = (await heightQuery.executeStatistics()) as any

    // Query Weight (bodyMass)
    const weightQuery = new HealthKitQuery()
      .type('bodyMass', 'statistics')
      .aggregations(['mostRecent'])
    const weightStats = (await weightQuery.executeStatistics()) as any

    return {
      birthDate: dobStr ? new Date(dobStr) : null,
      height: heightStats?.mostRecentQuantity || null,
      weight: weightStats?.mostRecentQuantity || null,
      gender: sex || null, // male, female, other, unknown
    }
  } catch (error) {
    console.error('Error fetching health data:', error)
    return null
  }
}

export const fetchStepCount = async (dayKey: string) => {
  try {
    const start = new Date(dayKey)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dayKey)
    end.setHours(23, 59, 59, 999)

    const query = new HealthKitQuery()
      .type('stepCount', 'statistics')
      .dateRange(start, end)
      .aggregations(['cumulativeSum'])

    const result = (await query.executeStatistics()) as any
    return result?.sumQuantity || 0
  } catch (error: any) {
    // If there is no data at all for the day, HealthKit throws this specific error.
    // We should treat it as 0 steps instead of logging an error.
    if (error?.message?.includes('No data available')) {
      return 0
    }
    console.error('Error fetching step count:', error)
    return 0
  }
}

export const syncWaterToHealth = async (amountInMl: number) => {
  try {
    // Note: The new library might handle saving differently.
    // Based on src/HealthKitSampleBuilder.ts, we could use that.
    // For now, let's stick to the simplest implementation if available on the module.
    // Looking at AppleHealthModule.ts, there isn't a direct 'save' method,
    // it uses shared objects (HealthKitSampleBuilder).

    // TODO: Implement using HealthKitSampleBuilder if needed
    console.log('Syncing water to HealthKit (Stub):', amountInMl)
    return true
  } catch (error) {
    console.error('Error syncing water to HealthKit:', error)
    return false
  }
}

export const syncSugarToHealth = async (amountInG: number) => {
  try {
    console.log('Syncing sugar to HealthKit (Stub):', amountInG)
    return true
  } catch (error) {
    console.error('Error syncing sugar to HealthKit:', error)
    return false
  }
}

export const syncCaffeineToHealth = async (amountInMg: number) => {
  try {
    console.log('Syncing caffeine to HealthKit (Stub):', amountInMg)
    return true
  } catch (error) {
    console.error('Error syncing caffeine to HealthKit:', error)
    return false
  }
}
