export interface SequencedAction {
  step: number;
  title: string;
  description: string;
  sourceIndex: number;
}

type ActionCandidate = SequencedAction & { order: number };

function actionOrder(text: string, recommendation: string): number {
  const low = text.toLowerCase();
  const isExit = /\b(exit|sell|liquidate|reduce exposure)\b/.test(low);
  const isEntry = /\b(entry|buy|starter position|limit order)\b/.test(low);

  // A sell verdict means reduce or exit first. For other verdicts, first set up
  // the planned entry, then put risk limits in place before later monitoring.
  if (recommendation === "Sell" && isExit) return 1;
  if (recommendation !== "Sell" && isEntry && !/\b(exit|sell|liquidate)\b/.test(low)) return 1;

  // A thesis-break contingency belongs at the end of the planned sequence;
  // don't confuse its "exit if" wording with an ordinary stop-loss rule.
  if (["invalidation", "thesis breaks", "thesis invalidates", "invalidates the thesis", "exit thesis"].some((term) => low.includes(term))) return 5;

  if ([
    "stop-loss", "stop loss", "hard stop", "trailing stop", "risk protocol",
    "protect capital", "position sizing", "risk score", "exit if", "exit or reduce",
    "full position exit",
  ].some((term) => low.includes(term))) return 2;

  if (["profit-taking", "take profit", "price target", "target price", "tranche", "trim position"].some((term) => low.includes(term))) return 3;
  if (["earnings", "catalyst", "review date", "quarterly", "monitor", "compare current", "reassess", "support", "resistance"].some((term) => low.includes(term))) return 4;
  return 6;
}

function cleanAction(raw: string, sourceIndex: number): { title: string; description: string } {
  let text = String(raw ?? "").trim();
  // Older reports include priority badges in the text. Remove them so the
  // numbered sequence is the only ranking shown to the user.
  text = text.replace(/^Priority\s*\d+\s*[-:]\s*[^:]{1,70}:\s*/i, "").trim();
  text = text.replace(/^Action\s*(?:Step\s*)?\d+\s*(?:\([^)]*\)\s*)?[-:]\s*/i, "").trim();

  // Some model responses repeat the action label as if it were the instruction.
  if (/^Action\s+Step\s+\d+\s*$/i.test(text)) text = "";
  if (!text) {
    return {
      title: "Details unavailable",
      description: "The analyst did not provide a specific instruction for this step.",
    };
  }

  let title = "";
  let splitAt = -1;
  const colonAt = text.indexOf(":");
  if (colonAt > 0 && colonAt <= 90) splitAt = colonAt;
  if (splitAt < 0) {
    const clause = text.search(/[,;.!?]|\b(?:because|when|once|after|before)\b/i);
    if (clause > 0 && clause <= 90) splitAt = clause;
  }

  if (splitAt > 0) title = text.slice(0, splitAt).trim();
  if (!title) {
    const words = text.split(/\s+/);
    title = words.slice(0, 8).join(" ");
    if (words.length > 8) title += "...";
  }
  if (title.length > 76) {
    const cutoff = title.lastIndexOf(" ", 73);
    title = `${title.slice(0, cutoff > 35 ? cutoff : 73).trimEnd()}...`;
  }

  const description = text.slice(title.endsWith("...") ? title.length - 3 : title.length).replace(/^[\s,:;.!?-]+/, "").trim();
  return {
    title: title || `Action ${sourceIndex + 1}`,
    description: description || "Follow this instruction as written.",
  };
}

export function sequenceActionItems(
  actions: string[] | null | undefined,
  recommendation: string,
): SequencedAction[] {
  return (actions ?? [])
    .map((raw, sourceIndex) => {
      const text = String(raw ?? "").trim();
      return {
        ...cleanAction(text, sourceIndex),
        order: actionOrder(text, recommendation),
        sourceIndex,
      };
    })
    .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex)
    .map(({ order: _order, ...action }, index) => ({ ...action, step: index + 1 }));
}
