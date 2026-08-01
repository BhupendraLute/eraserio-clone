import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Returns the authenticated user id, or null when the request is unauthenticated
 * (guest / offline mode).
 */
export async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
  } catch {
    // If auth is not configured (e.g. missing NEXTAUTH_SECRET), treat as guest
    return null;
  }
}
