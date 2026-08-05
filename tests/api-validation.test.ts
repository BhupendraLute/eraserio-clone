import { describe, expect, it } from 'vitest';
import {
  updateProfileSchema,
  aiChatSchema,
  MAX_NAME_LENGTH,
  MAX_IMAGE_URL_LENGTH,
  MAX_AI_MESSAGE_LENGTH,
  MAX_AI_MESSAGES,
} from '@/lib/api-validation';

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

describe('aiChatSchema', () => {
  it('accepts a prompt with optional canvas DSL context', () => {
    const result = aiChatSchema.safeParse({
      messages: [{ role: 'user', content: 'Add a Redis cache' }],
      canvasDsl: 'flowchart\nA > B',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.canvasDsl).toBe('flowchart\nA > B');
    }
  });

  it('accepts an assistant message in history', () => {
    const result = aiChatSchema.safeParse({
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown roles', () => {
    const result = aiChatSchema.safeParse({ messages: [{ role: 'system', content: 'x' }] });
    expect(result.success).toBe(false);
  });

  it('rejects an empty messages array', () => {
    expect(aiChatSchema.safeParse({ messages: [] }).success).toBe(false);
  });

  it('rejects an empty message', () => {
    const result = aiChatSchema.safeParse({ messages: [{ role: 'user', content: '   ' }] });
    expect(result.success).toBe(false);
  });

  it('rejects messages longer than the maximum', () => {
    const result = aiChatSchema.safeParse({
      messages: [{ role: 'user', content: 'a'.repeat(MAX_AI_MESSAGE_LENGTH + 1) }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than the maximum number of messages', () => {
    const messages = Array.from({ length: MAX_AI_MESSAGES + 1 }, () => ({
      role: 'user' as const,
      content: 'hi',
    }));
    expect(aiChatSchema.safeParse({ messages }).success).toBe(false);
  });
});
