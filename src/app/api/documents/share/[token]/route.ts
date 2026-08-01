import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * Public read-only endpoint for shared documents.
 * Only documents with isPublic=true and a matching shareToken are served.
 * Returns a sanitized payload (no ownerId / workspaceId internals).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = await prisma.document.findFirst({
      where: { shareToken: token, isPublic: true },
      select: {
        id: true,
        title: true,
        whiteboardData: true,
        diagramSource: true,
        docContent: true,
        isPublic: true,
        shareToken: true,
        updatedAt: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}
