export interface DiffToken {
  text: string;
  changed: boolean;
}

export function computeWordDiff(before: string, after: string): { before: DiffToken[]; after: DiffToken[] } {
  const beforeWords = tokenize(before);
  const afterWords = tokenize(after);

  const { aIndices, bIndices } = longestCommonSubsequence(beforeWords, afterWords);

  const beforeTokens = beforeWords.map((word, idx) => ({
    text: word,
    changed: !aIndices.has(idx) && !/^\s+$/.test(word),
  }));
  const afterTokens = afterWords.map((word, idx) => ({
    text: word,
    changed: !bIndices.has(idx) && !/^\s+$/.test(word),
  }));

  return { before: beforeTokens, after: afterTokens };
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean);
}

function longestCommonSubsequence(a: string[], b: string[]): { aIndices: Set<number>; bIndices: Set<number> } {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const aIndices = new Set<number>();
  const bIndices = new Set<number>();
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      aIndices.add(i - 1);
      bIndices.add(j - 1);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return { aIndices, bIndices };
}
