import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { siteEnv } from '@/lib/env';

const tags = new Set(['pages', 'announcements', 'events', 'sermons', 'leaders', 'groups', 'faqs', 'albums', 'videos']);

export async function POST(request: Request) {
  let body: { secret?: string; tag?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const secret = siteEnv().revalidateSecret;
  if (!secret || body.secret !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!body.tag || !tags.has(body.tag)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  revalidateTag(body.tag);
  return NextResponse.json({ ok: true });
}
