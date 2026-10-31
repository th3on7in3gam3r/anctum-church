import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { DatabaseUnavailable, RateLimited, Unauthorized, ValidationError } from '../../shared/errors.ts';
import { DEMO_MEMBER_PERSONAS, DEMO_ORG_SLUG, DEMO_PERSONAS, demoTokenFor, isDemoMode, seedDemoChurch, userIdFromDemoToken } from '../demo.ts';
import { sendError } from '../http.ts';
import { getPrisma } from '../prisma.ts';

let lastReset = 0;

async function memberPersonaList(prisma: NonNullable<ReturnType<typeof getPrisma>>) {
  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_MEMBER_PERSONAS.map((persona) => persona.email) } },
    select: { email: true, name: true },
  });
  const names = new Map(users.map((user: { email: string; name: string }) => [user.email, user.name]));
  return DEMO_MEMBER_PERSONAS.map((persona) => ({
    key: persona.key,
    name: names.get(persona.email) || 'Church member',
    roleName: 'Member',
    description: persona.description,
  }));
}

function requireDemo() {
  if (!isDemoMode()) throw Unauthorized('Demo mode is off.');
  const prisma = getPrisma();
  if (!prisma) throw DatabaseUnavailable();
  return prisma;
}

export function registerDemoRoutes(app: Express): void {
  app.get('/api/demo', async (_req: Request, res: Response) => {
    if (!isDemoMode()) {
      res.json({ enabled: false, personas: [] });
      return;
    }
    try {
      const prisma = requireDemo();
      const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG }, select: { name: true } });
      const roles = await prisma.churchRole.findMany({
        where: { organization: { slug: DEMO_ORG_SLUG } },
        select: { key: true, name: true },
      });
      const roleName = new Map(roles.map((role: { key: string; name: string }) => [role.key, role.name]));
      res.json({
        enabled: true,
        churchName: org?.name || null,
        personas: DEMO_PERSONAS.map((persona) => ({
          key: persona.key,
          name: persona.name,
          roleName: roleName.get(persona.key) || persona.key,
          description: persona.description,
        })),
        members: await memberPersonaList(prisma),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/demo/login', async (req: Request, res: Response) => {
    try {
      const prisma = requireDemo();
      const parsed = z.object({ persona: z.string() }).safeParse(req.body ?? {});
      const persona = parsed.success
        ? DEMO_PERSONAS.find((item) => item.key === parsed.data.persona) || DEMO_MEMBER_PERSONAS.find((item) => item.key === parsed.data.persona)
        : null;
      if (!persona) throw new ValidationError({ persona: 'Pick who to sign in as.' });
      let user = await prisma.user.findUnique({ where: { email: persona.email }, select: { id: true } });
      if (!user) {
        await seedDemoChurch(prisma);
        user = await prisma.user.findUnique({ where: { email: persona.email }, select: { id: true } });
      }
      if (!user) throw Unauthorized('The demo church is not ready. Try again.');
      res.json({ token: demoTokenFor(user.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/demo/reset', async (req: Request, res: Response) => {
    try {
      const prisma = requireDemo();
      const header = req.headers.authorization;
      const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!userIdFromDemoToken(token)) throw Unauthorized('Sign in to the demo first.');
      if (Date.now() - lastReset < 30_000) throw RateLimited('The demo was just reset. Try again in a moment.');
      lastReset = Date.now();
      await seedDemoChurch(prisma);
      res.json({ reset: true });
    } catch (error) {
      sendError(res, error);
    }
  });
}
