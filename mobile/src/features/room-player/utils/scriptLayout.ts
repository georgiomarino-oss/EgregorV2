import type { TimedWord } from '../../../lib/api/functions';
import { groupTimedWordsIntoParagraphs } from './timedWords';

const SECTION_HEADING_PATTERN =
  /^\*\*\s*(grounding|prayer|closing)\s*\*\*\s*[:\-\u2013\u2014]?\s*/i;
const PLAIN_SECTION_HEADING_PATTERN = /^(grounding|prayer|closing)\s*[:\-\u2013\u2014]\s*/i;

export function sanitizeScriptParagraph(paragraph: string) {
  const withoutMarkdownHeadings = paragraph
    .replace(SECTION_HEADING_PATTERN, '')
    .replace(PLAIN_SECTION_HEADING_PATTERN, '')
    .replace(/\*\*/g, '');

  return withoutMarkdownHeadings.trim();
}

export function splitLongParagraph(paragraph: string, maxChars = 96) {
  if (paragraph.length <= maxChars) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length <= 1) {
    return [paragraph];
  }

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      chunks.push(sentence.trim());
    }
  }

  if (buffer) {
    chunks.push(buffer.trim());
  }

  return chunks.length > 0 ? chunks : [paragraph];
}

export function splitScriptIntoParagraphs(script: string) {
  const normalized = script.trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => sanitizeScriptParagraph(part))
    .filter((part) => part.length > 0);

  if (paragraphs.length > 1) {
    return paragraphs.flatMap((paragraph) => splitLongParagraph(paragraph));
  }

  const singleParagraph = paragraphs[0] ?? '';
  if (!singleParagraph) {
    return [];
  }

  const sentences = singleParagraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length <= 2) {
    return [singleParagraph];
  }

  const fallbackParagraphs: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= 240) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      fallbackParagraphs.push(buffer.trim());
      buffer = sentence;
    } else {
      fallbackParagraphs.push(sentence.trim());
    }
  }

  if (buffer) {
    fallbackParagraphs.push(buffer.trim());
  }

  if (fallbackParagraphs.length > 0) {
    return fallbackParagraphs.flatMap((paragraph) => splitLongParagraph(paragraph));
  }

  return splitLongParagraph(singleParagraph);
}

export function buildPreviewParagraphsFromScript(script: string, maxWordsPerParagraph = 14) {
  const normalized = script
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .map((line) => sanitizeScriptParagraph(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return [] as string[];
  }

  const words = normalized.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return [] as string[];
  }

  const pseudoTimedWords: TimedWord[] = words.map((word, index) => ({
    endSeconds: index + 0.2,
    index,
    startSeconds: index,
    word,
  }));

  return groupTimedWordsIntoParagraphs(pseudoTimedWords, maxWordsPerParagraph).map((paragraph) =>
    paragraph.words
      .map((word) => word.word)
      .join(' ')
      .trim(),
  );
}

export function resolveFallbackParagraphIndex(input: {
  elapsedMillis: number;
  paragraphCount: number;
  totalMillis: number;
}) {
  if (input.paragraphCount <= 1 || input.totalMillis <= 0) {
    return 0;
  }

  const normalizedProgress = Math.min(
    0.999999,
    Math.max(0, input.elapsedMillis / input.totalMillis),
  );
  return Math.min(input.paragraphCount - 1, Math.floor(normalizedProgress * input.paragraphCount));
}
