export const DIV_TABS = [
  { label: "All", match: () => true },
  {
    label: "Div. 1",
    match: (name) => /div\.?\s*1/i.test(name) && !/div\.?\s*2/i.test(name),
  },
  {
    label: "Div. 2",
    match: (name) => /div\.?\s*2/i.test(name) && !/div\.?\s*1/i.test(name),
  },
  { label: "Div. 3", match: (name) => /div\.?\s*3/i.test(name) },
  { label: "Div. 4", match: (name) => /div\.?\s*4/i.test(name) },
  {
    label: "Div. 1+2",
    match: (name) => /div\.?\s*1/i.test(name) && /div\.?\s*2/i.test(name),
  },
  { label: "Educational", match: (name) => /educational/i.test(name) },
  { label: "Global", match: (name) => /global/i.test(name) },
  {
    label: "Others",
    match: (name) =>
      !/div\.?\s*[1-4]/i.test(name) &&
      !/educational/i.test(name) &&
      !/global/i.test(name),
  },
];

export const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const PAGE_SIZE = 50;

export function shortContestName(name) {
  const educationalRound = name.match(
    /educational\s+codeforces\s+round\s+#?(\d+)/i,
  );
  if (educationalRound) return `EDU ${educationalRound[1]}`;

  const globalRound = name.match(/codeforces\s+global\s+round\s+#?(\d+)/i);
  if (globalRound) return `Global ${globalRound[1]}`;

  const codeforcesRound = name.match(/codeforces\s+round\s+#?(\d+)/i);
  if (codeforcesRound) {
    const number = codeforcesRound[1];
    const isDiv1And2 = /div\.?\s*1/i.test(name) && /div\.?\s*2/i.test(name);
    const isDiv1 = /div\.?\s*1/i.test(name) && !isDiv1And2;
    const isDiv2 = /div\.?\s*2/i.test(name) && !isDiv1And2;
    const isDiv3 = /div\.?\s*3/i.test(name);
    const isDiv4 = /div\.?\s*4/i.test(name);
    const division = isDiv1And2
      ? " (1+2)"
      : isDiv1
        ? " (D1)"
        : isDiv2
          ? " (D2)"
          : isDiv3
            ? " (D3)"
            : isDiv4
              ? " (D4)"
              : "";
    return `CF ${number}${division}`;
  }

  return name.length > 22 ? `${name.slice(0, 20)}…` : name;
}

function contestGroupName(name) {
  return name
    .replace(/\(div\.?\s*[12][^)]*\)/gi, "")
    .replace(/div\.?\s*[12]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function addSharedDivisionProblems(contests) {
  const contestsByName = new Map();
  for (const contest of contests.values()) {
    const name = contestGroupName(contest.name);
    if (!contestsByName.has(name)) contestsByName.set(name, []);
    contestsByName.get(name).push(contest);
  }

  for (const group of contestsByName.values()) {
    const div1 = group.find(
      (contest) =>
        /div\.?\s*1/i.test(contest.name) && !/div\.?\s*2/i.test(contest.name),
    );
    const div2 = group.find(
      (contest) =>
        /div\.?\s*2/i.test(contest.name) && !/div\.?\s*1/i.test(contest.name),
    );
    if (
      !div1 ||
      !div2 ||
      Math.abs(div1.startTimeSeconds - div2.startTimeSeconds) > 3600
    )
      continue;

    const div2Letters = Object.keys(div2.problemList).sort();
    const div1Letters = new Set(Object.keys(div1.problemList));
    let div2OwnProblemCount = 0;
    for (const letter of div2Letters) {
      if (!div1Letters.has(letter)) div2OwnProblemCount++;
      else break;
    }
    if (div2OwnProblemCount === 0) div2OwnProblemCount = 2;

    Object.keys(div1.problemList)
      .sort()
      .forEach((div1Letter, index) => {
        const div2LetterCode = 65 + div2OwnProblemCount + index;
        if (div2LetterCode > 74) return;

        const div2Letter = String.fromCharCode(div2LetterCode);
        if (!div2.problemList[div2Letter]) {
          div2.problemList[div2Letter] = div1.problemList[div1Letter].map(
            (problem) => ({
              ...problem,
              contestId: problem.contestId,
            }),
          );
        }
      });
  }
}

export function buildContests(problems, contestNames, contestMetadata) {
  const contests = new Map();

  problems.forEach((problem) => {
    if (problem.contestId >= 100000) return;
    if (!contests.has(problem.contestId)) {
      const metadata = contestMetadata.get(problem.contestId);
      contests.set(problem.contestId, {
        id: problem.contestId,
        name:
          metadata?.name ??
          contestNames?.[problem.contestId] ??
          `Contest ${problem.contestId}`,
        startTimeSeconds: metadata?.startTimeSeconds ?? 0,
        problemList: {},
      });
    }

    const contest = contests.get(problem.contestId);
    const letter = problem.index[0];
    if (!contest.problemList[letter]) contest.problemList[letter] = [];
    if (
      !contest.problemList[letter].some((item) => item.index === problem.index)
    ) {
      contest.problemList[letter].push(problem);
      contest.problemList[letter].sort((left, right) =>
        left.index.localeCompare(right.index),
      );
    }
  });

  contestMetadata.forEach((metadata, id) => {
    if (id >= 100000) return;
    if (!contests.has(id)) {
      contests.set(id, {
        id,
        name: metadata.name,
        startTimeSeconds: metadata.startTimeSeconds,
        problemList: {},
      });
      return;
    }

    const contest = contests.get(id);
    contest.name = metadata.name;
    contest.startTimeSeconds = metadata.startTimeSeconds;
  });

  addSharedDivisionProblems(contests);

  return Array.from(contests.values()).sort((left, right) =>
    right.startTimeSeconds !== left.startTimeSeconds
      ? right.startTimeSeconds - left.startTimeSeconds
      : right.id - left.id,
  );
}
