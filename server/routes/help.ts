import type { Request, Response } from 'express';
import { Unauthorized } from '../../shared/errors.ts';
import { resolveActorFromRequest } from '../clerkAuth.ts';
import { sendError } from '../http.ts';
import { generateHelpReply, isHelpAssistantAvailable } from '../services/helpAssistantService.ts';
import { organizationRepository } from '../repositories/index.ts';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

export async function helpChatHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!isHelpAssistantAvailable()) {
      res.status(503).json({
        error: 'HELP_ASSISTANT_UNAVAILABLE',
        message: 'Help assistant is not configured. Add GEMINI_API_KEY to enable it.',
      });
      return;
    }

    const actor = await resolveActorFromRequest(req);
    if (!actor.userId || !actor.organizationId || !actor.orgRole) {
      throw Unauthorized('Sign in to use the help assistant.');
    }

    if (actor.orgRole !== 'OWNER' && actor.orgRole !== 'ADMIN') {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only Owners and Admins can use the help assistant.',
      });
      return;
    }

    if (!checkRateLimit(actor.userId)) {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many help requests. Please wait an hour and try again.',
      });
      return;
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message || message.length > 2000) {
      res.status(400).json({
        error: 'INVALID_MESSAGE',
        message: 'Enter a question up to 2000 characters.',
      });
      return;
    }

    const pageContext =
      typeof req.body?.pageContext === 'string' ? req.body.pageContext.slice(0, 200) : undefined;
    const history = Array.isArray(req.body?.history)
      ? req.body.history
          .filter(
            (item: unknown): item is { role: 'user' | 'assistant'; content: string } =>
              Boolean(
                item &&
                  typeof item === 'object' &&
                  'role' in item &&
                  'content' in item &&
                  (item.role === 'user' || item.role === 'assistant') &&
                  typeof item.content === 'string'
              )
          )
          .slice(-8)
      : [];

    const organization = await organizationRepository.findById(actor.organizationId);

    const reply = await generateHelpReply({
      message,
      pageContext,
      userRole: actor.orgRole,
      organizationName: organization?.name ?? null,
      history,
    });

    res.json({ reply });
  } catch (error) {
    sendError(res, error);
  }
}
