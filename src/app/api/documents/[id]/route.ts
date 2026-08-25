import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { updateDocumentSchema } from '@/lib/api-validation';
import { checkDocumentAccess } from '@/lib/auth/access-control';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    const access = await checkDocumentAccess(id, userId);

    if (!access.canRead) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Public / Viewer Read: Return sanitized document payload
    if (!access.canWrite && access.role === 'PUBLIC_READ') {
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
          role: access.role,
        },
      });
    }

    return NextResponse.json({ document: { ...doc, role: access.role } });
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

    if (!userId) {
      return NextResponse.json(
        { message: 'Offline mode — not saved to cloud', mode: 'offline', saved: false },
        { status: 202 }
      );
    }

    const access = await checkDocumentAccess(id, userId);
    if (!access.canWrite) {
      return NextResponse.json({ error: 'Forbidden: View-only permissions' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
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

    if (!userId) {
      return NextResponse.json({ success: true, mode: 'offline' });
    }

    const access = await checkDocumentAccess(id, userId);
    if (!access.canAdmin && access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
