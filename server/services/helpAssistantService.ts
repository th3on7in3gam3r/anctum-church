import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey, isGeminiConfigured } from '../env.ts';
import { selectRelevantKnowledge } from '../knowledge/helpKnowledge.ts';

export interface HelpChatInput {
  message: string;
  pageContext?: string;
  userRole?: string | null;
  organizationName?: string | null;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const SYSTEM_PROMPT = `You are Sanctum Live Help Assistant — an expert guide for church pastors and Admins using the Sanctum Live prayer platform.

Rules:
- Answer ONLY about Sanctum Live features, setup, and troubleshooting.
- Give clear numbered steps when explaining how to do something.
- Distinguish Admin (room operator) from sermon leader (named per session).
- Congregants join via public /join links; pastors lead from Control Room.
- When the pastor opens the floor, congregants hold to speak (tap again to stop). One person speaks at a time.
- If you do not know, say so and suggest checking Settings or the Pastor walkthrough.
- Never invent features that are not in the knowledge base.
- Keep answers concise but complete (2–8 short paragraphs or a numbered list).
- Do not expose API keys, secrets, or internal code.`;

export function isHelpAssistantAvailable(): boolean {
  return isGeminiConfigured();
}

export async function generateHelpReply(input: HelpChatInput): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error('HELP_ASSISTANT_UNAVAILABLE');
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('HELP_ASSISTANT_UNAVAILABLE');
  }

  const knowledge = selectRelevantKnowledge(input.message);
  const contextLines = [
    input.userRole ? `User role: ${input.userRole}` : null,
    input.organizationName ? `Organization: ${input.organizationName}` : null,
    input.pageContext ? `Current page: ${input.pageContext}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const historyText =
    input.history && input.history.length > 0
      ? `\n\nRecent conversation:\n${input.history
          .slice(-6)
          .map((turn) => `${turn.role}: ${turn.content}`)
          .join('\n')}`
      : '';

  const prompt = `${SYSTEM_PROMPT}

${contextLines ? `Context:\n${contextLines}\n` : ''}
Knowledge base:
${knowledge}
${historyText}

User question: ${input.message}`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('EMPTY_HELP_RESPONSE');
  }
  return text;
}
