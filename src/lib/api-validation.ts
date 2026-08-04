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

/** Max display name length for user profiles. */
export const MAX_NAME_LENGTH = 80;
/** Max avatar URL length for user profiles. */
export const MAX_IMAGE_URL_LENGTH = 500;

/**
 * Validates profile edits (Profile Settings page). `image` may be an empty
 * string to clear the avatar, a valid http(s) URL, or omitted to leave it
 * untouched.
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(MAX_NAME_LENGTH, `Display name must be ${MAX_NAME_LENGTH} characters or fewer`)
    .optional(),
  image: z
    .union([
      z.literal(''),
      z
        .url('Avatar URL must be a valid URL')
        .trim()
        .max(MAX_IMAGE_URL_LENGTH, `Avatar URL must be ${MAX_IMAGE_URL_LENGTH} characters or fewer`),
    ])
    .optional(),
});

export const userPreferencesSchema = z.object({
  gridStyle: z.enum(['dots', 'grid', 'plain']).optional(),
  defaultExportFormat: z.enum(['png', 'svg', 'pdf']).optional(),
  exportScale: z.number().min(1).max(3).optional(),
  codeKeymap: z.enum(['default', 'vim']).optional(),
});

export const importDocumentsSchema = z.object({
  documents: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).default('Untitled Document'),
      whiteboardData: jsonString(MAX_WHITEBOARD_BYTES).optional(),
      diagramSource: jsonString(MAX_DIAGRAM_BYTES).optional(),
      docContent: jsonString(MAX_DOC_BYTES).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
  ).min(1, 'At least one document is required for import'),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(100),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});
