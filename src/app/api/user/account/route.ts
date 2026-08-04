import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const confirmation = body.confirmation;

  if (confirmation !== 'DELETE') {
    return NextResponse.json(
      { error: 'Confirmation mismatch. Type DELETE to confirm.' },
      { status: 400 }
    );
  }

  try {
    // Delete user (Cascades to accounts, sessions, workspaces, documents)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'Account permanently deleted' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
