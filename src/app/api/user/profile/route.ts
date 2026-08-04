import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { updateProfileSchema } from '@/lib/api-validation';

export const dynamic = 'force-dynamic';

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  preferences: true,
  createdAt: true,
  // Earliest-linked identity (cuid ids sort by creation time) is the primary
  // sign-in provider, so multi-provider users get a stable label.
  accounts: { select: { provider: true }, take: 1, orderBy: { id: 'asc' } },
} as const;

function toProfile(user: {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  preferences: string | null;
  createdAt: Date;
  accounts: { provider: string }[];
}) {
  let parsedPreferences = null;
  if (user.preferences) {
    try {
      parsedPreferences = JSON.parse(user.preferences);
    } catch {
      // fallback
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    preferences: parsedPreferences,
    provider: user.accounts[0]?.provider ?? 'unknown',
    memberSince: user.createdAt.toISOString(),
  };
}

/** Returns the authenticated user's own profile (name, email, avatar, provider). */
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: toProfile(user) });
  } catch {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

/** Updates the authenticated user's display name and/or avatar image. */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data: { name?: string; image?: string | null; preferences?: string } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.image !== undefined) data.image = parsed.data.image || null;
  if (body.preferences !== undefined) {
    data.preferences = typeof body.preferences === 'string' ? body.preferences : JSON.stringify(body.preferences);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });

    return NextResponse.json({ profile: toProfile(user) });
  } catch (e) {
    // The session references a user that no longer exists
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: unknown }).code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
