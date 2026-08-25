import type { CollaboratorPresence, CollaborationMessage } from './types';

interface ClientConnection {
  clientId: string;
  user: CollaboratorPresence;
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  lastPing: number;
}

class DocumentRoom {
  public documentId: string;
  public connections: Map<string, ClientConnection> = new Map();
  public presenceMap: Map<string, CollaboratorPresence> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(documentId: string) {
    this.documentId = documentId;
    // Periodic heartbeat & stale presence check every 15s
    this.cleanupTimer = setInterval(() => this.purgeStaleConnections(), 15000);
  }

  public addClient(
    clientId: string,
    user: CollaboratorPresence,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): void {
    const encoder = new TextEncoder();
    const conn: ClientConnection = {
      clientId,
      user,
      controller,
      encoder,
      lastPing: Date.now(),
    };

    this.connections.set(clientId, conn);
    this.presenceMap.set(user.id, user);

    // Send initial presence snapshot to new client
    const snapshotMsg: CollaborationMessage = {
      type: 'PRESENCE_SNAPSHOT',
      senderId: 'system',
      documentId: this.documentId,
      timestamp: Date.now(),
      collaborators: Array.from(this.presenceMap.values()),
    };
    this.sendToClient(conn, snapshotMsg);

    // Broadcast USER_JOINED to existing clients
    const joinMsg: CollaborationMessage = {
      type: 'USER_JOINED',
      senderId: user.id,
      documentId: this.documentId,
      timestamp: Date.now(),
      user,
    };
    this.broadcast(joinMsg, clientId);
  }

  public removeClient(clientId: string): void {
    const conn = this.connections.get(clientId);
    if (!conn) return;

    const userId = conn.user.id;
    this.connections.delete(clientId);

    // Check if user has any other active connections in this room
    let userHasOtherConns = false;
    for (const c of this.connections.values()) {
      if (c.user.id === userId) {
        userHasOtherConns = true;
        break;
      }
    }

    if (!userHasOtherConns) {
      this.presenceMap.delete(userId);
      const leftMsg: CollaborationMessage = {
        type: 'USER_LEFT',
        senderId: userId,
        documentId: this.documentId,
        timestamp: Date.now(),
        userId,
      };
      this.broadcast(leftMsg);
    }

    if (this.connections.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  public broadcast(message: CollaborationMessage, excludeClientId?: string): void {
    // Update internal presence map if cursor / selection / presence message
    if (message.type === 'CURSOR_MOVE' || message.type === 'SELECTION_CHANGE') {
      const presence = this.presenceMap.get(message.senderId);
      if (presence) {
        if (message.type === 'CURSOR_MOVE') {
          presence.cursor = message.cursor;
        } else if (message.type === 'SELECTION_CHANGE') {
          presence.selectedElementIds = message.selectedElementIds;
        }
        presence.lastActive = Date.now();
      }
    }

    const payload = `data: ${JSON.stringify(message)}\n\n`;

    for (const [cid, conn] of this.connections.entries()) {
      if (excludeClientId && cid === excludeClientId) continue;
      try {
        conn.controller.enqueue(conn.encoder.encode(payload));
      } catch (err) {
        // Stream closed unexpectedly
        console.warn(`[RoomManager] Failed to write to client ${cid}:`, err);
        this.removeClient(cid);
      }
    }
  }

  private sendToClient(conn: ClientConnection, message: CollaborationMessage): void {
    try {
      const payload = `data: ${JSON.stringify(message)}\n\n`;
      conn.controller.enqueue(conn.encoder.encode(payload));
    } catch (err) {
      console.warn(`[RoomManager] Failed to send to client ${conn.clientId}:`, err);
    }
  }

  private purgeStaleConnections(): void {
    const now = Date.now();
    const timeout = 45000; // 45 seconds timeout

    for (const [cid, conn] of this.connections.entries()) {
      if (now - conn.user.lastActive > timeout) {
        this.removeClient(cid);
      } else {
        // Enqueue lightweight 2-byte SSE comment keep-alive ping (":\n\n")
        try {
          conn.controller.enqueue(conn.encoder.encode(':\n\n'));
        } catch {
          this.removeClient(cid);
        }
      }
    }
  }

  public getActiveCollaborators(): CollaboratorPresence[] {
    return Array.from(this.presenceMap.values());
  }
}

class RoomManager {
  private rooms: Map<string, DocumentRoom> = new Map();

  public getOrCreateRoom(documentId: string): DocumentRoom {
    let room = this.rooms.get(documentId);
    if (!room) {
      room = new DocumentRoom(documentId);
      this.rooms.set(documentId, room);
    }
    return room;
  }

  public getRoom(documentId: string): DocumentRoom | undefined {
    return this.rooms.get(documentId);
  }

  public removeRoomIfEmpty(documentId: string): void {
    const room = this.rooms.get(documentId);
    if (room && room.connections.size === 0) {
      this.rooms.delete(documentId);
    }
  }
}

// Global singleton instance across Next.js API reloads in dev
const globalForRoomManager = globalThis as unknown as {
  roomManager?: RoomManager;
};

export const roomManager = globalForRoomManager.roomManager ?? new RoomManager();

if (process.env.NODE_ENV !== 'production') {
  globalForRoomManager.roomManager = roomManager;
}
