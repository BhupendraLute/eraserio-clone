import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { shareDocumentSchema } from '@/lib/api-validation';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    // Sharing requires an authenticated owner
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = shareDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const isPublic = parsed.data.isPublic;

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let shareToken = existing.shareToken;
    if (isPublic && !shareToken) {
      // Cryptographically-secure, unguessable share token
      shareToken = randomBytes(24).toString('base64url');
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
