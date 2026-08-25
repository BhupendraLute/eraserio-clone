import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { checkWorkspaceAccess } from '@/lib/auth/access-control';
import { generateId } from '@/lib/utils';
import { notifyInviteReceived } from '@/lib/notifications/service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/invites - List sent invites for a workspace
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const userId = await getUserId();
    const access = await checkWorkspaceAccess(workspaceId, userId);

    if (!access.canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Auto-purge expired invites for this workspace
    void prisma.workspaceInvite
      .deleteMany({
        where: { workspaceId, expiresAt: { lt: new Date() } },
      })
      .catch(() => {});

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('[WorkspaceInvitesAPI] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/invites - Send invitation to an email
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const access = await checkWorkspaceAccess(workspaceId, userId);
    if (!access.canAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { owner: { select: { name: true, email: true } } },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const body = await req.json();
    const { email, role = 'MEMBER' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const token = generateId('inv');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Search for recipient in User table by email
    const recipientUser = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
      select: { id: true },
    });

    // Auto-purge expired invite for clean DB
    await prisma.workspaceInvite.deleteMany({
      where: {
        workspaceId,
        email: { equals: cleanEmail, mode: 'insensitive' },
        expiresAt: { lt: new Date() },
      },
    });

    // Search for an existing active invite for this workspace + email
    const existingInvite = await prisma.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
    });

    let invite;
    if (existingInvite) {
      invite = await prisma.workspaceInvite.update({
        where: { id: existingInvite.id },
        data: {
          role,
          token,
          status: 'PENDING',
          inviterId: userId ?? undefined,
          recipientId: recipientUser?.id ?? undefined,
          expiresAt,
        },
      });
    } else {
      invite = await prisma.workspaceInvite.create({
        data: {
          workspaceId,
          email: cleanEmail,
          role,
          status: 'PENDING',
          token,
          inviterId: userId ?? undefined,
          recipientId: recipientUser?.id ?? undefined,
          expiresAt,
        },
      });
    }

    // Dispatch INVITE_RECEIVED notification to user if registered
    void notifyInviteReceived(
      cleanEmail,
      workspace.name,
      role,
      workspace.owner?.name || workspace.owner?.email || 'Team Owner'
    );

    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${token}`;

    return NextResponse.json({
      invite,
      inviteUrl,
      message: `Invitation created for ${email}`,
    });
  } catch (error) {
    console.error('[WorkspaceInvitesAPI] POST Error:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/invites - Revoke an invitation
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const userId = await getUserId();
    const access = await checkWorkspaceAccess(workspaceId, userId);

    if (!access.canAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 });
    }

    await prisma.workspaceInvite.delete({
      where: { id: inviteId },
    });

    return NextResponse.json({ success: true, message: 'Invite revoked' });
  } catch (error) {
    console.error('[WorkspaceInvitesAPI] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
