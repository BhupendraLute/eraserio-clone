import { describe, expect, it } from 'vitest';
import { updateProfileSchema, MAX_NAME_LENGTH, MAX_IMAGE_URL_LENGTH } from '@/lib/api-validation';

describe('updateProfileSchema', () => {
  it('accepts a trimmed display name', () => {
    const result = updateProfileSchema.safeParse({ name: '  Ada Lovelace  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Ada Lovelace');
    }
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(updateProfileSchema.safeParse({ name: '' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects names longer than the maximum', () => {
    expect(updateProfileSchema.safeParse({ name: 'a'.repeat(MAX_NAME_LENGTH + 1) }).success).toBe(
      false
    );
    expect(updateProfileSchema.safeParse({ name: 'a'.repeat(MAX_NAME_LENGTH) }).success).toBe(true);
  });

  it('accepts a valid http(s) avatar URL', () => {
    const result = updateProfileSchema.safeParse({ image: 'https://example.com/avatar.png' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed avatar URL', () => {
    const result = updateProfileSchema.safeParse({ image: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts an empty string to clear the avatar', () => {
    const result = updateProfileSchema.safeParse({ image: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image).toBe('');
    }
  });

  it('rejects avatar URLs longer than the maximum', () => {
    const long = `https://example.com/${'a'.repeat(MAX_IMAGE_URL_LENGTH)}`;
    expect(updateProfileSchema.safeParse({ image: long }).success).toBe(false);
  });

  it('treats omitted fields as untouched', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeUndefined();
      expect(result.data.image).toBeUndefined();
    }
  });
});
