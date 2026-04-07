import type { AIProvider } from './provider.interface'
import { OpenAIProvider } from './openai.provider'

export type SupportedAIProvider = 'openai' | 'claude' | 'gemini'

/**
 * Factory function that returns the appropriate AI provider implementation.
 * Defaults to 'openai'. Extensible for future providers.
 *
 * @param providerName - The name of the AI provider to use
 * @param userId - The user ID for rate limiting (defaults to 'anonymous')
 */
export function getAIProvider(
  providerName: SupportedAIProvider = 'openai',
  userId = 'anonymous'
): AIProvider {
  switch (providerName) {
    case 'openai':
      return new OpenAIProvider(userId)

    case 'claude':
      // Future: return new ClaudeProvider(userId)
      console.warn('Claude provider not yet implemented, falling back to OpenAI')
      return new OpenAIProvider(userId)

    case 'gemini':
      // Future: return new GeminiProvider(userId)
      console.warn('Gemini provider not yet implemented, falling back to OpenAI')
      return new OpenAIProvider(userId)

    default:
      return new OpenAIProvider(userId)
  }
}

/**
 * Get the default configured AI provider from environment.
 * Reads AI_PROVIDER env var, defaults to 'openai'.
 */
export function getDefaultAIProvider(userId = 'anonymous'): AIProvider {
  const providerName = (process.env.AI_PROVIDER ?? 'openai') as SupportedAIProvider
  return getAIProvider(providerName, userId)
}
