import { describe, it, expect } from 'vitest';
import { checkDocumentAccess, checkWorkspaceAccess } from '@/lib/auth/access-control';

describe('Multi-Tenant Access Control & RBAC Tests', () => {
  describe('checkDocumentAccess', () => {
    it('returns unauthenticated guest result for non-existent documents', async () => {
      const access = await checkDocumentAccess('non_existent_doc_id', null);

      expect(access.canRead).toBe(false);
      expect(access.canWrite).toBe(false);
      expect(access.canAdmin).toBe(false);
      expect(access.role).toBe('GUEST');
    });

    it('denies access to non-members for private documents', async () => {
      const access = await checkDocumentAccess('private_doc_123', 'unrelated_user_456');

      expect(access.canRead).toBe(false);
      expect(access.canWrite).toBe(false);
      expect(access.canAdmin).toBe(false);
    });
  });

  describe('checkWorkspaceAccess', () => {
    it('denies workspace access to unauthenticated guest users', async () => {
      const access = await checkWorkspaceAccess('workspace_789', null);

      expect(access.canRead).toBe(false);
      expect(access.canAdmin).toBe(false);
      expect(access.role).toBe('NONE');
    });
  });
});
