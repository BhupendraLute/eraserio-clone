import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createRateLimiter } from '@/lib/ai/rate-limit';

export const dynamic = 'force-dynamic';

const shareRateLimiter = createRateLimiter({ max: 40, windowMs: 60_000 });

/**
 * Public read-only endpoint for shared documents.
 * Only documents with isPublic=true and a matching shareToken are served.
 * Returns a sanitized payload (no ownerId / workspaceId internals).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
    const rate = shareRateLimiter(`share:${ip}:${token.slice(0, 8)}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many share requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

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
