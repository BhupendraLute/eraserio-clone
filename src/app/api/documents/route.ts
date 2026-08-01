import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';
import { createDocumentSchema } from '@/lib/api-validation';

export const dynamic = 'force-dynamic';

const DEFAULT_WHITEBOARD_DATA = '[]';
const DEFAULT_DIAGRAM_SOURCE = `flowchart

Client [icon: user]
API Gateway
Auth Service
Database [icon: database]

Client > API Gateway: request
API Gateway > Auth Service: validate token
Auth Service > Database: check session
`;
const DEFAULT_DOC_CONTENT = '<h1 class="text-2xl font-bold mb-4">Untitled Document</h1><p></p>';

function offlineDocStub(title: string) {
  const now = new Date().toISOString();
  return {
    document: {
      id: `doc_${Date.now()}`,
      title,
      whiteboardData: DEFAULT_WHITEBOARD_DATA,
      diagramSource: DEFAULT_DIAGRAM_SOURCE,
      docContent: DEFAULT_DOC_CONTENT,
      isPublic: false,
      shareToken: null,
      createdAt: now,
      updatedAt: now,
    },
    mode: 'offline' as const,
  };
}

export async function GET() {
  const userId = await getUserId();

  // Guests see an empty, local-only document list (never other users' data)
  if (!userId) {
    return NextResponse.json({ documents: [], mode: 'offline' });
  }

  try {
    const documents = await prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        isPublic: true,
        shareToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ documents, mode: 'cloud' });
  } catch {
    return NextResponse.json({ documents: [], mode: 'offline' });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();

  const body = await req.json().catch(() => ({}));
  const parsed = createDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { title } = parsed.data;
  const whiteboardData = parsed.data.whiteboardData ?? DEFAULT_WHITEBOARD_DATA;
  const diagramSource = parsed.data.diagramSource ?? DEFAULT_DIAGRAM_SOURCE;
  const docContent = parsed.data.docContent ?? DEFAULT_DOC_CONTENT;

  // Guests create local-only documents (offline stubs, no DB write)
  if (!userId) {
    return NextResponse.json(offlineDocStub(title));
  }

  try {
    const newDoc = await prisma.document.create({
      data: {
        title,
        ownerId: userId,
        whiteboardData,
        diagramSource,
        docContent,
      },
    });

    return NextResponse.json({ document: newDoc, mode: 'cloud' }, { status: 201 });
  } catch {
    // DB unreachable — fall back to a local stub so the user is never blocked
    return NextResponse.json(offlineDocStub(title));
  }
}
