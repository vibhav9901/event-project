import { GoogleGenAI } from '@google/genai';
import type { GeminiClient } from './gemini';

/** The only file that imports the Gemini SDK. The key never leaves the server. */
export function createGeminiClient(apiKey: string): GeminiClient {
  return new GoogleGenAI({ apiKey });
}
