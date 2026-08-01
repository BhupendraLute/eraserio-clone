import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database unconfigured' }, { status: 404 });
    }

    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: 'Offline mode save acknowledged' });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (typeof body.title === 'string') dataToUpdate.title = body.title;
    if (body.whiteboardData !== undefined) {
      dataToUpdate.whiteboardData =
        typeof body.whiteboardData === 'string'
          ? body.whiteboardData
          : JSON.stringify(body.whiteboardData);
    }
    if (typeof body.diagramSource === 'string') dataToUpdate.diagramSource = body.diagramSource;
    if (typeof body.docContent === 'string') dataToUpdate.docContent = body.docContent;

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ document: updatedDoc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, mode: 'offline' });
    }

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
