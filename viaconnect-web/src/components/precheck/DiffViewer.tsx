"use client";

// Token-level unified diff. Keeps the signal simple: red-strikethrough for
// removed, green for added. Accessible: each addition/removal carries an
// aria-label so screen readers announce the change.
function diffTokens(a: string, b: string): Array<{ kind: "same" | "remove" | "insert"; text: string }> {
  const aTokens = a.split(/(\s+)/);
  const bTokens = b.split(/(\s+)/);
  // Classic LCS-based diff, bounded O(n*m). Kept bounded by our 20 000 char cap.
  const m = aTokens.length, n = bTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = aTokens[i] === bTokens[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: Array<{ kind: "same" | "remove" | "insert"; text: string }> = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (aTokens[i] === bTokens[j]) {
      out.push({ kind: "same", text: aTokens[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "remove", text: aTokens[i] });
      i++;
    } else {
      out.push({ kind: "insert", text: bTokens[j] });
      j++;
    }
  }
  while (i < m) out.push({ kind: "remove", text: aTokens[i++] });
  while (j < n) out.push({ kind: "insert", text: bTokens[j++] });
  return out;
}

export default function DiffViewer({ original, proposed }: { original: string; proposed: string }) {
  const tokens = diffTokens(original, proposed);
  return (
    <pre className="text-xs text-white/80 whitespace-pre-wrap font-sans">
      {tokens.map((t, idx) => {
        if (t.kind === "same") return <span key={idx}>{t.text}</span>;
        if (t.kind === "remove")
          return (
            <span
              key={idx}
              className="line-through text-red-300/80 bg-red-500/10 rounded px-0.5"
              aria-label={`removed: ${t.text}`}
            >
              {t.text}
            </span>
          );
        return (
          <span
            key={idx}
            className="text-emerald-300 bg-emerald-500/10 rounded px-0.5"
            aria-label={`added: ${t.text}`}
          >
            {t.text}
          </span>
        );
      })}
    </pre>
  );
}
