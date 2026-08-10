import { describe, expect, it } from 'vitest';
import { convertDslToWhiteboardElements } from '@/lib/whiteboard/convert-dsl-to-whiteboard';
import type { ArrowElement } from '@/lib/whiteboard/whiteboard-types';

describe('convertDslToWhiteboardElements', () => {
  it('returns empty array for empty string', () => {
    expect(convertDslToWhiteboardElements('')).toEqual([]);
    expect(convertDslToWhiteboardElements('   ')).toEqual([]);
  });

  it('converts a flowchart DSL into Whiteboard shapes and arrow connectors', () => {
    const dsl = `flowchart

Client [icon: user]
API Gateway [icon: cloud]
Database [icon: database]

Client > API Gateway: request
API Gateway > Database: query
`;

    const elements = convertDslToWhiteboardElements(dsl, { originX: 100, originY: 100 });
    expect(elements.length).toBeGreaterThan(0);

    const cloudNodes = elements.filter((el) => el.type === 'cloud');
    expect(cloudNodes.length).toBe(3);

    const arrows = elements.filter((el) => el.type === 'arrow') as ArrowElement[];
    expect(arrows.length).toBe(2);

    // Verify connectors link the generated shape IDs
    const arrow1 = arrows.find((a) => a.label === 'request');
    expect(arrow1).toBeDefined();
    if (arrow1 && arrow1.type === 'arrow') {
      expect(arrow1.fromElementId).toBeDefined();
      expect(arrow1.toElementId).toBeDefined();
    }
  });

  it('converts a sequence diagram DSL into actor boxes, lifelines, and message arrows', () => {
    const dsl = `sequence-diagram

Client > Server: HTTP GET
Server --> Client: 200 OK
`;

    const elements = convertDslToWhiteboardElements(dsl, { originX: 50, originY: 50 });
    expect(elements.length).toBeGreaterThan(0);

    const rects = elements.filter((el) => el.type === 'rectangle');
    expect(rects.length).toBe(4); // 2 top actors + 2 bottom actors

    const lines = elements.filter((el) => el.type === 'line');
    expect(lines.length).toBe(2); // 2 actor lifelines

    const arrows = elements.filter((el) => el.type === 'arrow');
    expect(arrows.length).toBe(2); // 2 messages
  });
});
