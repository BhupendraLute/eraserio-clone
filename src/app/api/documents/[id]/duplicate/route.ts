import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.document.findUnique({ where: { id } });

    if (!existing || existing.ownerId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const copyTitle = existing.title.endsWith('(Copy)')
      ? existing.title
      : `${existing.title} (Copy)`;

    const duplicated = await prisma.document.create({
      data: {
        title: copyTitle,
        ownerId: userId,
        workspaceId: existing.workspaceId,
        whiteboardData: existing.whiteboardData,
        diagramSource: existing.diagramSource,
        docContent: existing.docContent,
        isPublic: false,
      },
      select: {
        id: true,
        title: true,
        isPublic: true,
        shareToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ document: duplicated }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to duplicate document' }, { status: 500 });
  }
}
