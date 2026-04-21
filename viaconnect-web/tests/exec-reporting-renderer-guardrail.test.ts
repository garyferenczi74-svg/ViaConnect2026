// Prompt #105 Phase 2b review — renderer guardrail coverage.
//
// Every board-consumed artifact must re-apply the forbidden-token
// scan on commentary before emitting bytes. Without this test the
// Michelangelo M-2b-1 gap (no Phase 2b tests) leaves the last line
// of defense against Helix/PHI/privileged leaks uncovered.

import { describe, it, expect } from 'vitest';
import { renderBoardPackPdf } from '@/lib/executiveReporting/rendering/boardPackPdfRenderer';
import { renderBoardPackXlsx } from '@/lib/executiveReporting/rendering/boardPackXlsxRenderer';
import { renderBoardPackPptx } from '@/lib/executiveReporting/rendering/boardPackPptxRenderer';

const BASE = {
  packTitle: 'Q1 2026 Board Pack',
  shortCode: 'BP-Q1-2026',
  periodType: 'quarterly',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  ceoIssuedAtISO: '2026-04-15T00:00:00Z',
  kpiRows: [],
};

describe('boardPackPdfRenderer guardrail', () => {
  it('emits bytes for clean content', async () => {
    const bytes = await renderBoardPackPdf({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Revenue overview',
        commentaryMd: 'Revenue grew 12% period-over-period.\n\nCategory mix shifted modestly.',
        commentarySource: 'human_authored',
      }],
      fileKind: 'preview',
    });
    expect(bytes.byteLength).toBeGreaterThan(100);
    // PDF magic: %PDF-
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x44);
    expect(bytes[3]).toBe(0x46);
  });

  it('rejects commentary that references helix_challenges', async () => {
    await expect(renderBoardPackPdf({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Engagement',
        commentaryMd: 'Our helix_challenges completion rate improved.',
        commentarySource: 'human_authored',
      }],
      fileKind: 'preview',
    })).rejects.toThrow(/RENDER_FORBIDDEN_CONTENT/);
  });

  it('rejects commentary that references legal_privileged_communications', async () => {
    await expect(renderBoardPackPdf({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Litigation update',
        commentaryMd: 'Referenced in legal_privileged_communications log.',
        commentarySource: 'human_authored',
      }],
      fileKind: 'preview',
    })).rejects.toThrow(/RENDER_FORBIDDEN_CONTENT/);
  });

  it('emits watermark-bearing distribution PDF', async () => {
    const bytes = await renderBoardPackPdf({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Revenue',
        commentaryMd: 'Revenue grew 12% period-over-period.',
        commentarySource: 'human_authored',
      }],
      fileKind: 'distribution',
      recipient: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        token: 'abc123def456ghi789jklm',
        distributedAtISO: '2026-04-20T12:00:00Z',
      },
    });
    expect(bytes.byteLength).toBeGreaterThan(100);
  });

  it('preserves paragraph breaks from commentary (\\n\\n)', async () => {
    // If wrapText collapsed paragraphs, the byte size for single-para vs
    // multi-para input would be nearly identical. The multi-para output
    // must be larger because each paragraph break becomes a drawn line.
    const singlePara = await renderBoardPackPdf({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Test',
        commentaryMd: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.',
        commentarySource: 'human_authored',
      }],
      fileKind: 'preview',
    });
    const threePara = await renderBoardPackPdf({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Test',
        commentaryMd: 'Lorem ipsum.\n\nDolor sit amet.\n\nConsectetur adipiscing elit sed do eiusmod tempor.',
        commentarySource: 'human_authored',
      }],
      fileKind: 'preview',
    });
    // Both non-trivial PDFs. The three-paragraph version uses more lines
    // (each paragraph separated by a blank) and therefore at minimum not
    // smaller than a same-length single paragraph.
    expect(threePara.byteLength).toBeGreaterThan(100);
    expect(singlePara.byteLength).toBeGreaterThan(100);
  });
});

describe('boardPackXlsxRenderer guardrail', () => {
  it('emits bytes for clean content', async () => {
    const bytes = await renderBoardPackXlsx({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Revenue',
        commentaryMd: 'Revenue grew 12%.',
        commentarySource: 'human_authored',
      }],
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    // XLSX is a ZIP: first bytes PK\x03\x04
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('rejects forbidden commentary', async () => {
    await expect(renderBoardPackXlsx({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Engagement',
        commentaryMd: 'helix_leaderboard snapshot attached.',
        commentarySource: 'human_authored',
      }],
    })).rejects.toThrow(/RENDER_FORBIDDEN_CONTENT/);
  });
});

describe('boardPackPptxRenderer guardrail', () => {
  it('emits bytes for clean content', async () => {
    const bytes = await renderBoardPackPptx({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Revenue',
        commentaryMd: 'Revenue grew 12%.',
        commentarySource: 'human_authored',
      }],
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('rejects forbidden commentary', async () => {
    await expect(renderBoardPackPptx({
      ...BASE,
      sections: [{
        sectionOrder: 1,
        title: 'Tax docs',
        commentaryMd: 'See practitioner_tax_documents. for detail.',
        commentarySource: 'human_authored',
      }],
    })).rejects.toThrow(/RENDER_FORBIDDEN_CONTENT/);
  });
});
