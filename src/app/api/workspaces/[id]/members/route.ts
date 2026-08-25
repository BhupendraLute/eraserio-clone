import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { checkWorkspaceAccess } from '@/lib/auth/access-control';
import { notifyRoleUpdated } from '@/lib/notifications/service';

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
          where: { workspaceId, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    return NextResponse.json({
      members,
      invites,
      currentUserRole: access.role,
      canAdmin: access.canAdmin,
    });
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
    const { targetUserId, newRole, memberId } = body;
    const targetId = targetUserId || memberId;

    if (!targetId || !['ADMIN', 'MEMBER', 'VIEWER'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid member role parameters' }, { status: 400 });
    }

    let updated;
    if (targetUserId) {
      updated = await prisma.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: targetUserId,
          },
        },
        data: { role: newRole },
      });
    } else {
      updated = await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { role: newRole },
      });
    }

    // Fetch workspace name to dispatch role updated notification
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    if (workspace && updated.userId) {
      void notifyRoleUpdated(updated.userId, workspace.name, newRole);
    }

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
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: workspaceId } = await params;

  const access = await checkWorkspaceAccess(workspaceId, userId);
  const searchParams = req.nextUrl.searchParams;
  const targetUserId = searchParams.get('userId');
  const memberId = searchParams.get('memberId');

  if (!targetUserId && !memberId) {
    return NextResponse.json({ error: 'Target userId or memberId required' }, { status: 400 });
  }

  const isSelfRemoval = targetUserId === userId;

  if (!access.canAdmin && !isSelfRemoval) {
    return NextResponse.json({ error: 'Forbidden: Only owners and admins can remove other members' }, { status: 403 });
  }

  if (isSelfRemoval && access.role === 'OWNER') {
    return NextResponse.json({ error: 'Workspace owners cannot leave their own workspace. Transfer ownership or delete the workspace.' }, { status: 400 });
  }

  try {
    if (targetUserId) {
      await prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: targetUserId,
          },
        },
      });
    } else if (memberId) {
      await prisma.workspaceMember.delete({
        where: { id: memberId },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
