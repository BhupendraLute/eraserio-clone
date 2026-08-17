import { prisma } from '@/lib/db/prisma';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface DocumentPermissionResult {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  role: WorkspaceRole | 'GUEST' | 'PUBLIC_READ';
  document?: {
    id: string;
    title: string;
    ownerId: string | null;
    workspaceId: string | null;
    isPublic: boolean;
    shareToken: string | null;
  };
}

/**
 * Evaluates document read/write/admin permissions for a given user.
 * Guarantees multi-tenant workspace isolation and RBAC role enforcement.
 */
export async function checkDocumentAccess(
  docId: string,
  userId: string | null
): Promise<DocumentPermissionResult> {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: {
        id: true,
        title: true,
        ownerId: true,
        workspaceId: true,
        isPublic: true,
        shareToken: true,
      },
    });

    if (!doc) {
      return { canRead: false, canWrite: false, canAdmin: false, role: 'GUEST' };
    }

    // 1. Unauthenticated / Guest Users
    if (!userId) {
      if (doc.isPublic) {
        return { canRead: true, canWrite: false, canAdmin: false, role: 'PUBLIC_READ', document: doc };
      }
      return { canRead: false, canWrite: false, canAdmin: false, role: 'GUEST', document: doc };
    }

    // 2. Direct Document Owner
    if (doc.ownerId === userId) {
      return { canRead: true, canWrite: true, canAdmin: true, role: 'OWNER', document: doc };
    }

    // 3. Workspace Membership Check
    if (doc.workspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: doc.workspaceId,
            userId,
          },
        },
        select: { role: true },
      });

      if (membership) {
        const role = membership.role as WorkspaceRole;
        const canWrite = role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
        const canAdmin = role === 'OWNER' || role === 'ADMIN';

        return {
          canRead: true,
          canWrite,
          canAdmin,
          role,
          document: doc,
        };
      }
    }

    // 4. Public document fallback for authenticated non-members
    if (doc.isPublic) {
      return { canRead: true, canWrite: false, canAdmin: false, role: 'PUBLIC_READ', document: doc };
    }

    return { canRead: false, canWrite: false, canAdmin: false, role: 'GUEST', document: doc };
  } catch (err) {
    console.error('[AccessControl] Error checking document access:', err);
    return { canRead: false, canWrite: false, canAdmin: false, role: 'GUEST' };
  }
}

/**
 * Checks workspace membership and role for a user.
 */
export async function checkWorkspaceAccess(
  workspaceId: string,
  userId: string | null
): Promise<{ canRead: boolean; canAdmin: boolean; role: WorkspaceRole | 'NONE' }> {
  if (!userId) {
    return { canRead: false, canAdmin: false, role: 'NONE' };
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) {
      return { canRead: false, canAdmin: false, role: 'NONE' };
    }

    if (workspace.ownerId === userId) {
      return { canRead: true, canAdmin: true, role: 'OWNER' };
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!member) {
      return { canRead: false, canAdmin: false, role: 'NONE' };
    }

    const role = member.role as WorkspaceRole;
    return {
      canRead: true,
      canAdmin: role === 'OWNER' || role === 'ADMIN',
      role,
    };
  } catch {
    return { canRead: false, canAdmin: false, role: 'NONE' };
  }
}
