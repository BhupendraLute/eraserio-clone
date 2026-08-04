import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { importDocumentsSchema } from '@/lib/api-validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = importDocumentsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { documents } = parsed.data;

  try {
    const createdDocs = await prisma.$transaction(
      documents.map((doc) =>
        prisma.document.create({
          data: {
            title: doc.title || 'Untitled Document',
            ownerId: userId,
            whiteboardData: doc.whiteboardData ?? '[]',
            diagramSource: doc.diagramSource ?? '',
            docContent: doc.docContent ?? '<p></p>',
          },
          select: {
            id: true,
            title: true,
            isPublic: true,
            shareToken: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      )
    );

    return NextResponse.json({ importedCount: createdDocs.length, documents: createdDocs }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to import guest documents' }, { status: 500 });
  }
}
