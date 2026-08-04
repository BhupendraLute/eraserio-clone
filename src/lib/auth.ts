import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db/prisma';

/**
 * NextAuth.js (v4) configuration for Architecta.
 *
 * - JWT session strategy: stateless - no DB session lookup per request, ideal
 *   for serverless (Neon) deployments and lower latency.
 * - Prisma adapter persists User/Account rows so OAuth identities are linked.
 * - Providers are only registered when their env vars are present, so the UI
 *   (via `getProviders()`) automatically hides unconfigured providers.
 */
const providers: NextAuthOptions['providers'] = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Persist the DB user id into the JWT on sign-in
      if (user) {
        token.id = user.id;
      }
      // Re-fetch the user's profile after an explicit session update (e.g. after
      // editing the display name / avatar in Profile Settings) so the refreshed
      // session reflects the latest DB values.
      if (trigger === 'update' && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { name: true, email: true, image: true },
          });
          if (dbUser) {
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
          }
        } catch {
          // DB unreachable — keep the existing token values so sessions keep working
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the user id to the client session
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id;
      }
      return session;
    },
  },
};
