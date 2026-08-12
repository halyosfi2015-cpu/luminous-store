import 'server-only'
import { getSetting } from '@/src/lib/site-settings'

export type AIFeatureSettings = {
  recommendations: boolean
  personalization: boolean
  purchaseIntent: boolean
  aiInsights: boolean
  confidenceThreshold: number
}

const DEFAULTS: AIFeatureSettings = {
  recommendations: true,
  personalization: true,
  purchaseIntent: true,
  aiInsights: true,
  confidenceThreshold: 0.7,
}

const KEYS: Record<keyof AIFeatureSettings, string> = {
  recommendations: 'ai.recommendations.enabled',
  personalization: 'ai.personalization.enabled',
  purchaseIntent: 'ai.purchase_intent.enabled',
  aiInsights: 'ai.insights.enabled',
  confidenceThreshold: 'ai.confidence_threshold',
}

export async function getAIEnabledSettings(): Promise<AIFeatureSettings> {
  const [recommendations, personalization, purchaseIntent, aiInsights, confidenceThreshold] =
    await Promise.all([
      getSetting<boolean>(KEYS.recommendations, DEFAULTS.recommendations),
      getSetting<boolean>(KEYS.personalization, DEFAULTS.personalization),
      getSetting<boolean>(KEYS.purchaseIntent, DEFAULTS.purchaseIntent),
      getSetting<boolean>(KEYS.aiInsights, DEFAULTS.aiInsights),
      getSetting<number>(KEYS.confidenceThreshold, DEFAULTS.confidenceThreshold),
    ])

  return {
    recommendations,
    personalization,
    purchaseIntent,
    aiInsights,
    confidenceThreshold:
      Number.isFinite(confidenceThreshold) ? confidenceThreshold : DEFAULTS.confidenceThreshold,
  }
}