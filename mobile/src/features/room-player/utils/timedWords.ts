import type { TimedWord } from '../../../lib/api/functions';

export interface TimedWordParagraph {
  endIndex: number;
  startIndex: number;
  words: TimedWord[];
}

export function normalizeTimedWords(words: TimedWord[] | null | undefined): TimedWord[] {
  return (words ?? [])
    .filter(
      (word) =>
        typeof word?.word === 'string' &&
        Number.isFinite(word?.startSeconds) &&
        Number.isFinite(word?.endSeconds),
    )
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .map((word, index) => ({
      ...word,
      endSeconds: Math.max(word.startSeconds, word.endSeconds),
      index,
      startSeconds: Math.max(0, word.startSeconds),
      word: word.word.trim(),
    }))
    .filter((word) => word.word.length > 0);
}

export function groupTimedWordsIntoParagraphs(
  words: TimedWord[],
  maxWordsPerParagraph = 14,
): TimedWordParagraph[] {
  if (words.length === 0) {
    return [];
  }

  const paragraphs: TimedWordParagraph[] = [];
  let current: TimedWord[] = [];

  const flush = () => {
    if (current.length === 0) {
      return;
    }

    paragraphs.push({
      endIndex: current[current.length - 1]?.index ?? 0,
      startIndex: current[0]?.index ?? 0,
      words: current,
    });
    current = [];
  };

  words.forEach((word) => {
    current.push(word);

    const hasSentenceEnding = /[.!?]["']?$/.test(word.word);
    const reachedMax = current.length >= maxWordsPerParagraph;
    const shouldBreak = reachedMax || (hasSentenceEnding && current.length >= 10);

    if (shouldBreak) {
      flush();
    }
  });

  flush();
  return paragraphs;
}

export function findActiveTimedWordIndex(words: TimedWord[], elapsedMillis: number) {
  if (words.length === 0) {
    return -1;
  }

  const elapsedSeconds = elapsedMillis / 1000;
  const first = words[0];
  const last = words[words.length - 1];

  if (elapsedSeconds <= (first?.startSeconds ?? 0)) {
    return first?.index ?? 0;
  }

  if (elapsedSeconds >= (last?.endSeconds ?? 0)) {
    return last?.index ?? words.length - 1;
  }

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (!word) {
      continue;
    }

    if (elapsedSeconds >= word.startSeconds && elapsedSeconds <= word.endSeconds) {
      return word.index;
    }

    const next = words[index + 1];
    if (next && elapsedSeconds > word.endSeconds && elapsedSeconds < next.startSeconds) {
      return next.index;
    }
  }

  return last?.index ?? words.length - 1;
}

export function findActiveTimedParagraph(
  paragraphs: TimedWordParagraph[],
  activeTimedWordIndex: number,
): TimedWordParagraph | null {
  if (paragraphs.length === 0) {
    return null;
  }

  if (activeTimedWordIndex < 0) {
    return paragraphs[0] ?? null;
  }

  return (
    paragraphs.find(
      (paragraph) =>
        activeTimedWordIndex >= paragraph.startIndex && activeTimedWordIndex <= paragraph.endIndex,
    ) ??
    paragraphs[paragraphs.length - 1] ??
    null
  );
}
