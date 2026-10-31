import { DuplicateSlug, Unauthorized } from '../shared/errors.ts';
import { slugify } from '../shared/slug.ts';
import { membershipRepository, organizationRepository, userRepository, type UserRecord } from './repositories/index.ts';

export async function createSanctumSpace(input: {
  user: UserRecord;
  name: string;
  slug?: string;
  logoUrl?: string;
}): Promise<{ organization: Awaited<ReturnType<typeof organizationRepository.create>>; user: UserRecord }> {
  const existing = await membershipRepository.listActiveByUser(input.user.id);
  if (existing.length > 0) {
    throw Unauthorized('This account already belongs to a Sanctum Space.');
  }

  const name = input.name.trim();
  if (!name) {
    throw Unauthorized('Church name is required.');
  }

  const logoUrl = input.logoUrl?.trim() || undefined;
  if (logoUrl) {
    let parsed: URL;
    try {
      parsed = new URL(logoUrl);
    } catch {
      throw Unauthorized('Logo must be a public http or https image URL.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw Unauthorized('Logo must be a public http or https image URL.');
    }
  }

  const baseSlug = slugify(input.slug || name) || 'sanctum-space';
  const slug = await uniqueOrganizationSlug(baseSlug);

  const organization = await organizationRepository.create({
    name,
    slug,
    primaryContactName: input.user.name,
    primaryContactEmail: input.user.email,
    logoUrl,
  });
  await membershipRepository.ensureActiveOwner(organization.id, input.user.id);
  const user = (await userRepository.findById(input.user.id)) || input.user;
  return { organization, user };
}

async function uniqueOrganizationSlug(base: string): Promise<string> {
  const taken = await organizationRepository.findBySlug(base);
  if (!taken) return base;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}-${n}`;
    const exists = await organizationRepository.findBySlug(candidate);
    if (!exists) return candidate;
  }
  throw DuplicateSlug(base);
}
