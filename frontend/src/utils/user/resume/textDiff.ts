export interface DiffToken {
  text: string;
  changed: boolean;
}

export function computeWordDiff(before: string, after: string): { before: DiffToken[]; after: DiffToken[] } {
  const beforeWords = tokenize(before);
  const afterWords = tokenize(after);

  const lcs = longestCommonSubsequence(beforeWords, afterWords);
  const beforeTokens = markDiff(beforeWords, lcs);
  const afterTokens = markDiff(afterWords, lcs);

  return { before: beforeTokens, after: afterTokens };
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean);
}

function longestCommonSubsequence(a: string[], b: string[]): Set<string> {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const common = new Set<string>();
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      common.add(`${i - 1}:${a[i - 1]}`);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return common;
}

function markDiff(words: string[], lcs: Set<string>): DiffToken[] {
  const usedKeys = new Set<string>();
  return words.map((word, idx) => {
    const key = `${idx}:${word}`;
    const inLcs = lcs.has(key) && !usedKeys.has(key);
    if (inLcs) usedKeys.add(key);
    const isSpace = /^\s+$/.test(word);
    return { text: word, changed: !inLcs && !isSpace };
  });
}
