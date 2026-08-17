import { prisma } from '@/lib/db/prisma';

/**
 * Ensures that the given user has at least one owned Personal Workspace.
 * If the user does not have any owned workspace, creates and persists a default
 * Personal Workspace with the user as the OWNER.
 */
export async function ensurePersonalWorkspace(userId: string) {
  try {
    const ownedWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true,
            members: true,
          },
        },
      },
    });

    if (ownedWorkspace) {
      return ownedWorkspace;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const defaultWorkspaceName = user?.name ? `${user.name} (Personal)` : 'Personal Workspace';

    const created = await prisma.workspace.create({
      data: {
        name: defaultWorkspaceName,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true,
            members: true,
          },
        },
      },
    });

    return created;
  } catch (error) {
    console.error('[ensurePersonalWorkspace] Error provisioning default workspace:', error);
    return null;
  }
}
