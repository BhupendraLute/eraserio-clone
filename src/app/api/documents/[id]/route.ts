import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { updateDocumentSchema } from '@/lib/api-validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    const doc = await prisma.document.findUnique({ where: { id } });

    // Guests / non-owners can only read documents that are explicitly public
    if (!doc || doc.ownerId !== userId) {
      if (!doc?.isPublic) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      // Public read: return a sanitized payload (no owner/workspace internals)
      return NextResponse.json({
        document: {
          id: doc.id,
          title: doc.title,
          whiteboardData: doc.whiteboardData,
          diagramSource: doc.diagramSource,
          docContent: doc.docContent,
          isPublic: doc.isPublic,
          shareToken: doc.shareToken,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      });
    }

    return NextResponse.json({ document: doc });
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    // Guests cannot modify cloud documents — acknowledge locally instead
    if (!userId) {
      return NextResponse.json({ message: 'Offline mode save acknowledged', mode: 'offline' });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) dataToUpdate.title = parsed.data.title;
    if (parsed.data.whiteboardData !== undefined) dataToUpdate.whiteboardData = parsed.data.whiteboardData;
    if (parsed.data.diagramSource !== undefined) dataToUpdate.diagramSource = parsed.data.diagramSource;
    if (parsed.data.docContent !== undefined) dataToUpdate.docContent = parsed.data.docContent;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ document: updatedDoc });
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    // Guests cannot delete cloud documents
    if (!userId) {
      return NextResponse.json({ success: true, mode: 'offline' });
    }

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true, mode: 'offline' });
  }
}
