import React, { createContext, useContext, useEffect, useState } from 'react'
import Purchases, { CustomerInfo } from 'react-native-purchases'

interface SubscriptionContextType {
  isPro: boolean
  isLoading: boolean
  customerInfo: CustomerInfo | null
  checkSyncStatus: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
)

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isPro, setIsPro] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)

  const updateStatus = (info: CustomerInfo) => {
    const premiumActive = typeof info.entitlements.active['pro'] !== 'undefined'
    setIsPro(premiumActive)
    setCustomerInfo(info)
    setIsLoading(false)
  }

  const checkSyncStatus = async () => {
    try {
      const info = await Purchases.getCustomerInfo()
      updateStatus(info)
    } catch (e) {
      console.error('Failed to fetch customer info', e)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial check
    checkSyncStatus()

    // Listen for updates (purchases, restores, etc.)
    const listener = (info: CustomerInfo) => {
      updateStatus(info)
    }

    Purchases.addCustomerInfoUpdateListener(listener)

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener)
    }
  }, [])

  return (
    <SubscriptionContext.Provider
      value={{ isPro, isLoading, customerInfo, checkSyncStatus }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider',
    )
  }
  return context
}
