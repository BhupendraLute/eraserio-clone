import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const isPublic = body.isPublic ?? true;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        shareToken: `share_${id}`,
        isPublic,
        shareUrl: `/share/share_${id}`,
        mode: 'offline',
      });
    }

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let shareToken = existing.shareToken;
    if (isPublic && !shareToken) {
      shareToken = generateId('share');
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        isPublic,
        shareToken: isPublic ? shareToken : null,
      },
    });

    return NextResponse.json({
      documentId: updated.id,
      isPublic: updated.isPublic,
      shareToken: updated.shareToken,
      shareUrl: updated.shareToken ? `/share/${updated.shareToken}` : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update share status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
