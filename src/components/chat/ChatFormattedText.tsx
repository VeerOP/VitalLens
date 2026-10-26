import React from 'react';
import { Info, ShieldAlert } from 'lucide-react';

interface ChatFormattedTextProps {
  text: string;
  isUser?: boolean;
}

/**
 * Safely parse inline markdown:
 * - **bold** or __bold__ -> <strong>
 * - *italic* or _italic_ -> <em>
 * - `code` -> <code>
 * - Strips any orphan or dangling ** so literal asterisks never display
 */
function parseInlineContent(rawText: string, isUser: boolean): React.ReactNode[] {
  // Strip any lingering double asterisks that have no pair
  let sanitized = rawText;

  // Regex to match bold (**text** or __text__), code (`code`), or italic (*text*)
  const tokenRegex = /(\*\*|__)(.*?)\1|(`)(.*?)\3|(?<!\*)\*(?!\*)(.*?)(?<!\*)\*/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(sanitized)) !== null) {
    const matchIndex = match.index;

    // Push preceding plain text
    if (matchIndex > lastIndex) {
      const plain = sanitized.substring(lastIndex, matchIndex).replace(/\*\*/g, '');
      if (plain) nodes.push(plain);
    }

    if (match[1]) {
      // Bold: match[2]
      const boldText = match[2].replace(/\*\*/g, '').trim();
      nodes.push(
        <strong
          key={`b-${matchIndex}`}
          className={
            isUser
              ? 'font-bold text-white tracking-tight'
              : 'font-bold text-[var(--text-primary)]'
          }
        >
          {boldText}
        </strong>
      );
    } else if (match[3]) {
      // Code: match[4]
      const codeText = match[4];
      nodes.push(
        <code
          key={`c-${matchIndex}`}
          className={`font-mono text-[11px] px-1 py-0.5 rounded ${
            isUser
              ? 'bg-white/20 text-white'
              : 'bg-[var(--bg-surface-subtle)] text-[var(--teal-primary)] border border-[var(--border-color)]'
          }`}
        >
          {codeText}
        </code>
      );
    } else if (match[5]) {
      // Italic: match[5]
      const italicText = match[5].replace(/\*\*/g, '').trim();
      nodes.push(
        <em key={`i-${matchIndex}`} className="italic opacity-90">
          {italicText}
        </em>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Push remaining text
  if (lastIndex < sanitized.length) {
    const trailing = sanitized.substring(lastIndex).replace(/\*\*/g, '');
    if (trailing) nodes.push(trailing);
  }

  // Fallback: if nothing parsed but text exists, return text with ** stripped
  if (nodes.length === 0 && sanitized) {
    return [sanitized.replace(/\*\*/g, '')];
  }

  return nodes;
}

/**
 * Mobile-first Clinical Markdown Renderer:
 * - Renders headers (### Title) with clinical typography
 * - Formats bullet lists (- Item) with crisp bullet indicators (no raw dashes/asterisks)
 * - Formats numbered lists (1. Item) with numeric pills
 * - Formats callouts (> [!NOTE] or > Note) into clinical note cards
 * - Ensures raw ** or markdown punctuation never leaks to user
 */
export const ChatFormattedText: React.FC<ChatFormattedTextProps> = ({ text, isUser = false }) => {
  if (!text) return null;

  // Split into lines while normalizing line endings
  const rawLines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];

  let currentBulletList: string[] = [];
  let currentNumberedList: string[] = [];
  let blockKey = 0;

  const flushBulletList = () => {
    if (currentBulletList.length > 0) {
      const items = [...currentBulletList];
      currentBulletList = [];
      blocks.push(
        <div key={`bl-${blockKey++}`} className="space-y-1.5 my-1.5 pl-0.5">
          {items.map((itemText, i) => (
            <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isUser ? 'bg-white/80' : 'bg-[var(--teal-primary)]'
                }`}
              />
              <div className="flex-1 min-w-0">
                {parseInlineContent(itemText, isUser)}
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  const flushNumberedList = () => {
    if (currentNumberedList.length > 0) {
      const items = [...currentNumberedList];
      currentNumberedList = [];
      blocks.push(
        <div key={`nl-${blockKey++}`} className="space-y-1.5 my-1.5 pl-0.5">
          {items.map((itemText, i) => (
            <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                  isUser
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--teal-subtle)] text-[var(--teal-primary)]'
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                {parseInlineContent(itemText, isUser)}
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Empty line separates blocks
    if (!line) {
      flushBulletList();
      flushNumberedList();
      continue;
    }

    // 1. Heading check: ### Title or ## Title or # Title
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch) {
      flushBulletList();
      flushNumberedList();
      const title = headerMatch[1].replace(/\*\*/g, '').trim();
      blocks.push(
        <div
          key={`h-${blockKey++}`}
          className={`font-bold text-xs tracking-tight pt-1 pb-0.5 border-b border-[var(--border-color)]/50 ${
            isUser ? 'text-white border-white/20' : 'text-[var(--teal-primary)]'
          }`}
        >
          {title}
        </div>
      );
      continue;
    }

    // 2. Callout / Blockquote: > [!NOTE] or > text
    if (line.startsWith('>')) {
      flushBulletList();
      flushNumberedList();
      let calloutText = line.replace(/^>\s*/, '').replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '').trim();
      const isAlert = /alert|warning|emergency|caution/i.test(line);

      blocks.push(
        <div
          key={`callout-${blockKey++}`}
          className={`my-1.5 p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2 ${
            isAlert
              ? 'bg-[var(--status-caution-bg)] border-[var(--status-caution)]/30 text-[var(--status-caution)]'
              : isUser
              ? 'bg-white/10 border-white/20 text-white/95'
              : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)]'
          }`}
        >
          {isAlert ? (
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--status-caution)]" />
          ) : (
            <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isUser ? 'text-white' : 'text-[var(--teal-primary)]'}`} />
          )}
          <div className="flex-1 min-w-0">
            {parseInlineContent(calloutText, isUser)}
          </div>
        </div>
      );
      continue;
    }

    // 3. Bullet list item: - Item or * Item
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushNumberedList();
      currentBulletList.push(bulletMatch[1]);
      continue;
    }

    // 4. Numbered list item: 1. Item
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushBulletList();
      currentNumberedList.push(numberedMatch[1]);
      continue;
    }

    // 5. Standard paragraph line
    flushBulletList();
    flushNumberedList();

    blocks.push(
      <p
        key={`p-${blockKey++}`}
        className={`leading-relaxed text-xs ${
          isUser ? 'text-white' : 'text-[var(--text-primary)]'
        }`}
      >
        {parseInlineContent(line, isUser)}
      </p>
    );
  }

  flushBulletList();
  flushNumberedList();

  return <div className="space-y-1.5">{blocks}</div>;
};
