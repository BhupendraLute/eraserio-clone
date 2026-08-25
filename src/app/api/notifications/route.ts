import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserId } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// GET /api/notifications - Get unread & recent notifications for user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? (await getUserId());

    if (!userId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Auto-clean notifications older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    void prisma.notification
      .deleteMany({
        where: { userId, createdAt: { lt: thirtyDaysAgo } },
      })
      .catch(() => {});

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[NotificationsAPI] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notification(s) as read
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? (await getUserId());

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, all } = body;

    if (all) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification id or all is required' }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    return NextResponse.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[NotificationsAPI] PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications - Clear notification(s)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? (await getUserId());

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      await prisma.notification.deleteMany({
        where: { userId },
      });
      return NextResponse.json({ success: true, message: 'All notifications cleared' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification id is required' }, { status: 400 });
    }

    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('[NotificationsAPI] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
