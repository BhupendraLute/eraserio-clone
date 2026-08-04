import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { inviteMemberSchema } from '@/lib/api-validation';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace || workspace.ownerId !== userId) {
      return NextResponse.json({ error: 'Only workspace owners can invite members' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;
    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        expiresAt,
      },
    });

    const inviteUrl = `${req.nextUrl.origin}/invite/${token}`;

    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
