import { NextRequest, NextResponse } from 'next/server';
import { roomManager } from '@/lib/collaboration/room-manager';
import { getUserId } from '@/lib/auth/session';
import { checkDocumentAccess } from '@/lib/auth/access-control';
import type { CollaborationMessage } from '@/lib/collaboration/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  if (!documentId) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
  }

  const userId = await getUserId();
  const access = await checkDocumentAccess(documentId, userId);

  if (!access.canRead) {
    return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
  }

  try {
    const message: CollaborationMessage = await req.json();
    if (!message || !message.type || !message.senderId) {
      return NextResponse.json({ error: 'Invalid collaboration payload' }, { status: 400 });
    }

    // Viewers cannot publish whiteboard or diagram modifications
    if (!access.canWrite && (message.type === 'WHITEBOARD_UPDATE' || message.type === 'DIAGRAM_UPDATE')) {
      return NextResponse.json({ error: 'Forbidden: View-only users cannot edit content' }, { status: 403 });
    }

    const room = roomManager.getRoom(documentId);
    if (!room) {
      return NextResponse.json({ status: 'ok', activeClients: 0 });
    }

    message.documentId = documentId;
    message.timestamp = Date.now();

    // Broadcast to room
    room.broadcast(message);

    return NextResponse.json({ status: 'ok', activeClients: room.connections.size });
  } catch (err) {
    console.error('[PublishRoute] Error handling broadcast message:', err);
    return NextResponse.json({ error: 'Failed to publish event' }, { status: 500 });
  }
}
