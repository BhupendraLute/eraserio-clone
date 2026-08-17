import { NextRequest } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { roomManager } from '@/lib/collaboration/room-manager';
import { getCollaboratorColor } from '@/lib/collaboration/types';
import { checkDocumentAccess } from '@/lib/auth/access-control';
import type { CollaboratorPresence } from '@/lib/collaboration/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  if (!documentId) {
    return new Response('Document ID is required', { status: 400 });
  }

  const searchParams = req.nextUrl.searchParams;
  const guestId = searchParams.get('userId');
  const guestName = searchParams.get('userName');
  const guestImage = searchParams.get('userImage') ?? undefined;

  const authUserId = await getUserId();

  // Validate Document Access Permissions
  const access = await checkDocumentAccess(documentId, authUserId);
  if (!access.canRead) {
    return new Response('Forbidden: Access denied to document', { status: 403 });
  }

  const userId = authUserId || guestId || `guest_${Math.random().toString(36).slice(2, 8)}`;
  const userName = guestName || (authUserId ? 'Authenticated User' : `Guest ${userId.slice(-4)}`);
  const userColor = getCollaboratorColor(userId);

  const userPresence: CollaboratorPresence = {
    id: userId,
    name: userName,
    image: guestImage,
    color: userColor,
    cursor: null,
    selectedElementIds: [],
    lastActive: Date.now(),
  };

  const clientId = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const room = roomManager.getOrCreateRoom(documentId);

  const stream = new ReadableStream({
    start(controller) {
      room.addClient(clientId, userPresence, controller);

      req.signal.addEventListener('abort', () => {
        room.removeClient(clientId);
        roomManager.removeRoomIfEmpty(documentId);
      });
    },
    cancel() {
      room.removeClient(clientId);
      roomManager.removeRoomIfEmpty(documentId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
