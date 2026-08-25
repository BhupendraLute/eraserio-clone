import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserId } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { notifyInviteAccepted } from '@/lib/notifications/service';

// GET /api/workspaces/invites/pending - List pending invites for current user email
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paramEmail = searchParams.get('email');

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? (await getUserId());
    let userEmail = session?.user?.email ?? paramEmail;

    // Look up email by userId if session doesn't contain email directly
    if (!userEmail && userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (user?.email) {
          userEmail = user.email;
        }
      } catch {
        // silent catch
      }
    }

    if (!userEmail) {
      return NextResponse.json({ invites: [] });
    }

    const cleanEmail = userEmail.trim().toLowerCase();

    // Auto-purge expired invites for clean DB
    void prisma.workspaceInvite
      .deleteMany({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
          expiresAt: { lt: new Date() },
        },
      })
      .catch(() => {});

    // Query pending invites by email (case-insensitive)
    const invites = await prisma.workspaceInvite.findMany({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('[PendingInvitesAPI] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending invites' }, { status: 500 });
  }
}

// POST /api/workspaces/invites/pending - Accept or Decline an invite
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? (await getUserId());

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { token, action } = body; // action: 'accept' | 'decline'

    if (!token || !action) {
      return NextResponse.json({ error: 'Token and action are required' }, { status: 400 });
    }

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invite || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite token expired or invalid' }, { status: 404 });
    }

    if (action === 'accept') {
      // Execute atomic transaction: upsert member + set status ACCEPTED
      await prisma.$transaction([
        prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId,
            },
          },
          update: { role: invite.role },
          create: {
            workspaceId: invite.workspaceId,
            userId,
            role: invite.role,
          },
        }),
        prisma.workspaceInvite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED' },
        }),
      ]);

      // Dispatch notification to inviter or workspace owner
      const targetNotifyUserId = invite.inviterId || invite.workspace.ownerId;
      if (targetNotifyUserId && targetNotifyUserId !== userId) {
        const memberUser = session?.user;
        void notifyInviteAccepted(
          targetNotifyUserId,
          invite.workspace.name,
          memberUser?.email || invite.email,
          memberUser?.name
        );
      }

      return NextResponse.json({
        success: true,
        message: `Joined ${invite.workspace.name} as ${invite.role}`,
        workspaceId: invite.workspaceId,
      });
    } else if (action === 'decline') {
      // Permanently delete declined invite for clean database
      await prisma.workspaceInvite.delete({ where: { id: invite.id } });
      return NextResponse.json({ success: true, message: 'Invitation declined' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[PendingInvitesAPI] POST Error:', error);
    return NextResponse.json({ error: 'Failed to process invitation' }, { status: 500 });
  }
}
