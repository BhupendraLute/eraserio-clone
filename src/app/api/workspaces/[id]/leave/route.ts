import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { checkWorkspaceAccess } from '@/lib/auth/access-control';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  try {
    const access = await checkWorkspaceAccess(workspaceId, userId);
    if (!access.canRead) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 404 });
    }

    if (access.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Workspace owners cannot leave their own workspace. Transfer ownership or delete the workspace instead.' },
        { status: 400 }
      );
    }

    // Remove the user from workspace members
    await prisma.workspaceMember.deleteMany({
      where: {
        workspaceId,
        userId,
      },
    });

    return NextResponse.json({ success: true, message: 'Successfully left the workspace' });
  } catch {
    return NextResponse.json({ error: 'Failed to leave workspace' }, { status: 500 });
  }
}
