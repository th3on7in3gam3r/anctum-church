/**
 * Every staff church-records request passes here first. It checks that the church has the
 * feature switched on and that the person's role grants the area at the needed level.
 * Reading needs View, changing needs Edit. Handlers still run their own record checks.
 */
import type { NextFunction, Request, Response } from 'express';
import { FeatureOff, Unauthorized } from '../../shared/errors.ts';
import {
  ACCESS_LEVEL_LABELS,
  AREAS,
  featureDefinition,
  hasAreaLevel,
  type AccessArea,
  type AccessLevel,
  type FeatureKey,
} from '../../shared/churchSetup.ts';
import { resolveActorFromRequest } from '../clerkAuth.ts';
import { sendError } from '../http.ts';

interface AreaRule {
  prefix: string;
  feature: FeatureKey;
  area: AccessArea;
  /** Group leaders may change their own group with View; the handler checks the rest. */
  leaderEditable?: boolean;
}

/** Longest prefix wins, so specific paths sit above general ones. */
export const CMS_AREA_RULES: readonly AreaRule[] = [
  { prefix: '/api/cms/members', feature: 'members', area: 'people' },
  { prefix: '/api/cms/households', feature: 'members', area: 'people' },
  { prefix: '/api/cms/groups', feature: 'members', area: 'people', leaderEditable: true },
  { prefix: '/api/cms/visitors', feature: 'visitors', area: 'people' },
  { prefix: '/api/cms/events', feature: 'events', area: 'events' },
  { prefix: '/api/cms/sermons', feature: 'sermons', area: 'media' },
  { prefix: '/api/cms/youtube', feature: 'sermons', area: 'media' },
  { prefix: '/api/cms/gallery', feature: 'gallery', area: 'media' },
  { prefix: '/api/cms/announcements', feature: 'announcements', area: 'communication' },
  { prefix: '/api/cms/pages', feature: 'website', area: 'website' },
  { prefix: '/api/cms/faqs', feature: 'website', area: 'website' },
  { prefix: '/api/cms/leaders', feature: 'website', area: 'website' },
];

export function ruleForPath(path: string): AreaRule | null {
  let best: AreaRule | null = null;
  for (const rule of CMS_AREA_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      if (!best || rule.prefix.length > best.prefix.length) best = rule;
    }
  }
  return best;
}

export function levelNeeded(method: string, rule: AreaRule): AccessLevel {
  if (method === 'GET' || method === 'HEAD') return 1;
  return rule.leaderEditable ? 1 : 2;
}

export async function cmsAreaGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const path = req.baseUrl + req.path;
    const rule = ruleForPath(path);
    if (!rule) {
      throw Unauthorized('This church record is not available.');
    }
    const actor = await resolveActorFromRequest(req);
    if (!actor.userId || !actor.organizationId || !actor.orgRole) {
      throw Unauthorized('Sign in with a church staff account.');
    }
    if (actor.features && !actor.features[rule.feature]) {
      throw FeatureOff(featureDefinition(rule.feature).label);
    }
    // Churches always have roles once setup has run; fall back to the original checks if not.
    if (actor.access) {
      const needed = levelNeeded(req.method, rule);
      if (!hasAreaLevel(actor.access, rule.area, needed)) {
        const areaLabel = AREAS.find((area) => area.key === rule.area)?.label || rule.area;
        throw Unauthorized(`Your role (${actor.access.roleName}) needs ${ACCESS_LEVEL_LABELS[needed]} access to ${areaLabel}.`);
      }
    }
    next();
  } catch (error) {
    sendError(res, error);
  }
}
