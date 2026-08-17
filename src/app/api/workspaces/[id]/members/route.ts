import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { checkWorkspaceAccess } from '@/lib/auth/access-control';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: workspaceId } = await params;

  const access = await checkWorkspaceAccess(workspaceId, userId);
  if (!access.canRead) {
    return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
  }

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const invites = access.canAdmin
      ? await prisma.workspaceInvite.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    return NextResponse.json({ members, invites, currentUserRole: access.role });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: workspaceId } = await params;

  const access = await checkWorkspaceAccess(workspaceId, userId);
  if (!access.canAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only owners and admins can update member roles' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { targetUserId, newRole } = body;

    if (!targetUserId || !['ADMIN', 'MEMBER', 'VIEWER'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid member role parameters' }, { status: 400 });
    }

    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
      data: { role: newRole },
    });

    return NextResponse.json({ member: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: workspaceId } = await params;

  const access = await checkWorkspaceAccess(workspaceId, userId);
  if (!access.canAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only owners and admins can remove members' }, { status: 403 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target userId required' }, { status: 400 });
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
