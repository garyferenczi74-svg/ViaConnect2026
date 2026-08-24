// Safe markdown renderer for 170r educational cards.
// No new packages. No HTML passthrough. Education copy only.

import type { ReactNode } from 'react';

export interface EducationalCardMarkdownProps {
  readonly markdown: string;
  readonly className?: string;
}

interface InlineToken {
  readonly type: 'text' | 'strong' | 'em' | 'code';
  readonly value: string;
}

type Block =
  | { readonly type: 'h2' | 'h3' | 'p'; readonly text: string }
  | { readonly type: 'ul'; readonly items: readonly string[] };

export function EducationalCardMarkdown({
  markdown,
  className = 'space-y-4',
}: EducationalCardMarkdownProps) {
  const blocks = parseBlocks(markdown);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === 'h2') {
          return (
            <h3
              key={`h2-${index}`}
              className="text-[15px] font-semibold leading-snug text-white md:text-base"
            >
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.type === 'h3') {
          return (
            <h4
              key={`h3-${index}`}
              className="text-[14px] font-semibold leading-snug text-white/90"
            >
              {renderInline(block.text)}
            </h4>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul
              key={`ul-${index}`}
              className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/[0.72] md:text-[14px]"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`li-${index}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={`p-${index}`}
            className="text-[13px] leading-relaxed text-white/[0.72] md:text-[14px]"
          >
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    paragraph = [];
    if (text) blocks.push({ type: 'p', text });
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ type: 'ul', items: list });
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: h2[1].trim() });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: h3[1].trim() });
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1].trim());
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const tokens = tokenizeInline(text);
  return tokens.map((token, index) => {
    if (token.type === 'strong') {
      return (
        <strong key={`s-${index}`} className="font-semibold text-white">
          {token.value}
        </strong>
      );
    }
    if (token.type === 'em') {
      return (
        <em key={`e-${index}`} className="italic">
          {token.value}
        </em>
      );
    }
    if (token.type === 'code') {
      return (
        <code
          key={`c-${index}`}
          className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[12px] text-white/85"
        >
          {token.value}
        </code>
      );
    }
    return <span key={`t-${index}`}>{token.value}</span>;
  });
}

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  let last = 0;
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    if (match.index > last) {
      tokens.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const chunk = match[1];
    if (chunk.startsWith('**')) {
      tokens.push({ type: 'strong', value: chunk.slice(2, -2) });
    } else if (chunk.startsWith('*')) {
      tokens.push({ type: 'em', value: chunk.slice(1, -1) });
    } else {
      tokens.push({ type: 'code', value: chunk.slice(1, -1) });
    }
    last = match.index + chunk.length;
    match = pattern.exec(text);
  }
  if (last < text.length) {
    tokens.push({ type: 'text', value: text.slice(last) });
  }
  return tokens;
}
