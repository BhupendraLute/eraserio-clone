import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

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

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ documents: [], mode: 'offline' });
    }

    const documents = await prisma.document.findMany({
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch documents';
    return NextResponse.json({ error: message, mode: 'offline' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || 'Untitled Document';
    const whiteboardData = body.whiteboardData || DEFAULT_WHITEBOARD_DATA;
    const diagramSource = body.diagramSource || DEFAULT_DIAGRAM_SOURCE;
    const docContent = body.docContent || DEFAULT_DOC_CONTENT;

    if (!process.env.DATABASE_URL) {
      // In offline / unconfigured DB mode, return a client-usable ID stub
      return NextResponse.json({
        document: {
          id: `doc_${Date.now()}`,
          title,
          whiteboardData,
          diagramSource,
          docContent,
          isPublic: false,
          shareToken: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        mode: 'offline',
      });
    }

    const newDoc = await prisma.document.create({
      data: {
        title,
        whiteboardData: typeof whiteboardData === 'string' ? whiteboardData : JSON.stringify(whiteboardData),
        diagramSource,
        docContent,
      },
    });

    return NextResponse.json({ document: newDoc, mode: 'cloud' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
