import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        workspaces: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            whiteboardData: true,
            diagramSource: true,
            docContent: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const payload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        preferences: user.preferences ? JSON.parse(user.preferences) : null,
        createdAt: user.createdAt,
      },
      workspaces: user.workspaces,
      documentsCount: user.documents.length,
      documents: user.documents,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="eraser-user-data-${user.id}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to export user data' }, { status: 500 });
  }
}
