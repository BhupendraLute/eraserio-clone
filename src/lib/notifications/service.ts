import { prisma } from '@/lib/db/prisma';

export type NotificationType =
  | 'INVITE_RECEIVED'
  | 'INVITE_ACCEPTED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REMOVED'
  | 'ROLE_UPDATED'
  | 'DOCUMENT_SHARED';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Creates a notification record for a recipient user.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    return null;
  }
}

/**
 * Dispatches INVITE_RECEIVED notification to a user matching the invited email.
 */
export async function notifyInviteReceived(
  invitedEmail: string,
  workspaceName: string,
  role: string,
  inviterName?: string | null
) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: invitedEmail.trim().toLowerCase(), mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (!user) return null;

    const sender = inviterName ? inviterName : 'A team admin';

    return await createNotification({
      userId: user.id,
      type: 'INVITE_RECEIVED',
      title: 'Workspace Invitation Received',
      message: `${sender} invited you to join ${workspaceName} as ${role}`,
      link: '/dashboard',
      metadata: { workspaceName, role, inviterName },
    });
  } catch (error) {
    console.error('[NotificationService] Error notifying invite received:', error);
    return null;
  }
}

/**
 * Dispatches INVITE_ACCEPTED notification to workspace owner/inviter when a recipient accepts.
 */
export async function notifyInviteAccepted(
  inviterOrOwnerId: string,
  workspaceName: string,
  memberEmail: string,
  memberName?: string | null
) {
  try {
    const name = memberName || memberEmail;

    return await createNotification({
      userId: inviterOrOwnerId,
      type: 'INVITE_ACCEPTED',
      title: 'Invitation Accepted!',
      message: `${name} accepted your invitation and joined ${workspaceName}`,
      link: '/dashboard/team',
      metadata: { workspaceName, memberEmail, memberName },
    });
  } catch (error) {
    console.error('[NotificationService] Error notifying invite accepted:', error);
    return null;
  }
}

/**
 * Dispatches ROLE_UPDATED notification to member.
 */
export async function notifyRoleUpdated(
  userId: string,
  workspaceName: string,
  newRole: string
) {
  try {
    return await createNotification({
      userId,
      type: 'ROLE_UPDATED',
      title: 'Workspace Role Updated',
      message: `Your access role in ${workspaceName} has been updated to ${newRole}`,
      link: '/dashboard/team',
      metadata: { workspaceName, newRole },
    });
  } catch (error) {
    console.error('[NotificationService] Error notifying role updated:', error);
    return null;
  }
}
