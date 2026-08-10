import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * AI provider configuration for Architecta AI.
 *
 * Points at an OpenAI-compatible endpoint — by default OpenCode Zen
 * (https://opencode.ai/zen/v1) running the free `big-pickle` model. Every
 * value can be overridden with environment variables, so swapping in another
 * OpenAI-compatible provider (e.g. plain OpenAI via
 * AI_BASE_URL=https://api.openai.com/v1 + an OPENAI_API_KEY) needs no code
 * changes.
 */
export const AI_BASE_URL =
  process.env.AI_BASE_URL ?? process.env.OPENCODE_ZEN_BASE_URL ?? 'https://opencode.ai/zen/v1';

export const AI_API_KEY =
  process.env.AI_API_KEY ??
  process.env.OPENCODE_ZEN_API_KEY ??
  process.env.OPENCODE_API_KEY ??
  process.env.OPENAI_API_KEY;

export const AI_MODEL = process.env.AI_MODEL ?? 'big-pickle';

export const AI_PROVIDER_NAME = process.env.AI_PROVIDER_NAME ?? 'opencode-zen';

export function isAiConfigured(): boolean {
  return Boolean(AI_API_KEY);
}

/** Lazily builds the language model so an unset key never crashes imports. */
export function getAiModel() {
  return createOpenAICompatible({
    name: AI_PROVIDER_NAME,
    baseURL: AI_BASE_URL,
    apiKey: AI_API_KEY,
  })(AI_MODEL);
}
