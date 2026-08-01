import { z } from 'zod';

/** Max serialized payload sizes (bytes) to protect the DB from abuse. */
export const MAX_WHITEBOARD_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_DIAGRAM_BYTES = 512 * 1024; // 512 KB
export const MAX_DOC_BYTES = 512 * 1024; // 512 KB
export const MAX_TITLE_LENGTH = 200;

const jsonString = (maxBytes: number) =>
  z
    .union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())])
    .transform((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
    .refine((s) => Buffer.byteLength(s, 'utf8') <= maxBytes, {
      message: 'Payload exceeds maximum allowed size',
    });

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).default('Untitled Document'),
  whiteboardData: jsonString(MAX_WHITEBOARD_BYTES).optional(),
  diagramSource: jsonString(MAX_DIAGRAM_BYTES).optional(),
  docContent: jsonString(MAX_DOC_BYTES).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).optional(),
  whiteboardData: jsonString(MAX_WHITEBOARD_BYTES).optional(),
  diagramSource: jsonString(MAX_DIAGRAM_BYTES).optional(),
  docContent: jsonString(MAX_DOC_BYTES).optional(),
});

export const shareDocumentSchema = z.object({
  isPublic: z.boolean().default(true),
});
