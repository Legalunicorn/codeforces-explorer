import { ratingColor } from "../../utils/ratingColor";
import { ALL_LETTERS, shortContestName } from "../../utils/contests";

const NO_COLUMN_WIDTH = 36;
const CONTEST_COLUMN_WIDTH = 120;
const PROBLEM_COLUMN_WIDTH = 140;

const cellBase = {
  width: PROBLEM_COLUMN_WIDTH,
  minWidth: PROBLEM_COLUMN_WIDTH,
  maxWidth: PROBLEM_COLUMN_WIDTH,
  borderRight: "1px solid #1e2025",
  borderBottom: "1px solid #1e2025",
  verticalAlign: "middle",
  overflow: "hidden",
};

function ProblemCell({ problem, isSolved, maskRatings }) {
  if (!problem) return <td style={{ ...cellBase, padding: "7px 8px" }} />;

  const href =
    problem.contestId > 10000
      ? `https://codeforces.com/problemset/gymProblem/${problem.contestId}/${problem.index}`
      : `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  const solved = isSolved(problem.contestId, problem.index);
  const color = solved
    ? "#4ade80"
    : !maskRatings && problem.rating
      ? ratingColor(problem.rating)
      : "#c9d1d9";

  return (
    <td
      style={{
        ...cellBase,
        padding: "7px 8px",
        backgroundColor: solved ? "rgba(34,197,94,0.12)" : "transparent",
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group flex flex-col gap-0.5"
      >
        <span
          style={{
            color,
            fontSize: ".78rem",
            fontWeight: 500,
            lineHeight: "1.3",
            display: "block",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          className="group-hover:underline"
        >
          {problem.index}. {problem.name}
        </span>
        <span style={{ display: "block", height: "1em" }}>
          {!maskRatings && problem.rating && (
            <span
              style={{
                fontSize: ".65rem",
                fontWeight: 600,
                color: ratingColor(problem.rating),
              }}
            >
              {problem.rating}
            </span>
          )}
          {maskRatings && problem.rating && (
            <span
              style={{
                display: "inline-block",
                width: "2rem",
                height: "0.55em",
                backgroundColor: "#2a2a2a",
                borderRadius: 3,
              }}
            />
          )}
        </span>
      </a>
    </td>
  );
}

function ProblemsCell({ problems, isSolved, maskRatings }) {
  if (!problems?.length)
    return <td style={{ ...cellBase, padding: "7px 8px" }} />;
  if (problems.length === 1)
    return (
      <ProblemCell
        problem={problems[0]}
        isSolved={isSolved}
        maskRatings={maskRatings}
      />
    );

  return (
    <td style={{ ...cellBase, padding: 0, position: "relative" }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          alignItems: "stretch",
        }}
      >
        {problems.map((problem, index) => {
          const solved = isSolved(problem.contestId, problem.index);
          const color = solved
            ? "#4ade80"
            : !maskRatings && problem.rating
              ? ratingColor(problem.rating)
              : "#c9d1d9";
          return (
            <div
              key={problem.index}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                overflow: "hidden",
                padding: "7px 6px",
                borderLeft: index > 0 ? "1px solid #1e2025" : "none",
                backgroundColor: solved
                  ? "rgba(34,197,94,0.12)"
                  : "transparent",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <a
                href={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col gap-0.5"
              >
                <span
                  style={{
                    color,
                    fontSize: ".72rem",
                    fontWeight: 500,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                  className="group-hover:underline"
                >
                  {problem.index}. {problem.name}
                </span>
                {!maskRatings && problem.rating && (
                  <span
                    style={{
                      fontSize: ".62rem",
                      fontWeight: 600,
                      color: ratingColor(problem.rating),
                    }}
                  >
                    {problem.rating}
                  </span>
                )}
              </a>
            </div>
          );
        })}
      </div>
    </td>
  );
}

function ContestRow({
  contest,
  isSolved,
  maskRatings,
  rowNumber,
  columnCount,
}) {
  const problems = Object.values(contest.problemList).flat();
  const solvedCount = problems.filter((problem) =>
    isSolved(problem.contestId, problem.index),
  ).length;

  return (
    <tr>
      <td
        style={{
          width: NO_COLUMN_WIDTH,
          minWidth: NO_COLUMN_WIDTH,
          maxWidth: NO_COLUMN_WIDTH,
          borderRight: "1px solid #1e2025",
          borderBottom: "1px solid #1e2025",
          backgroundColor: "#0a0b0c",
          padding: "7px 4px",
          textAlign: "center",
          fontSize: ".7rem",
          color: "#444",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        {rowNumber}
      </td>
      <td
        style={{
          width: CONTEST_COLUMN_WIDTH,
          minWidth: CONTEST_COLUMN_WIDTH,
          maxWidth: CONTEST_COLUMN_WIDTH,
          borderRight: "1px solid #1e2025",
          borderBottom: "1px solid #1e2025",
          backgroundColor: "#0a0b0c",
          padding: "7px 10px",
          verticalAlign: "top",
          position: "sticky",
          left: NO_COLUMN_WIDTH,
          zIndex: 1,
        }}
      >
        <a
          href={`https://codeforces.com/contest/${contest.id}`}
          target="_blank"
          rel="noreferrer"
          className="group block"
        >
          <span
            className="block text-[.76rem] font-semibold leading-snug text-[#bbb] transition group-hover:text-white group-hover:underline"
            title={contest.name}
          >
            {shortContestName(contest.name)}
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[.6rem] text-[#3a3a3a]">#{contest.id}</span>
            {contest.startTimeSeconds > 0 && (
              <span className="text-[.6rem] text-[#3a3a3a]">
                {new Date(contest.startTimeSeconds * 1000).toLocaleDateString(
                  "en-US",
                  { year: "numeric", month: "short" },
                )}
              </span>
            )}
          </div>
          {solvedCount > 0 && (
            <div className="mt-1">
              <span className="text-[.65rem] font-bold text-[#4ade80]">
                {solvedCount}/{problems.length} solved
              </span>
            </div>
          )}
        </a>
      </td>
      {ALL_LETTERS.slice(0, columnCount).map((letter) => (
        <ProblemsCell
          key={letter}
          problems={contest.problemList[letter] ?? []}
          isSolved={isSolved}
          maskRatings={maskRatings}
        />
      ))}
    </tr>
  );
}

export default function ContestTable({
  contests,
  isSolved,
  maskRatings,
  page,
  pageSize,
}) {
  const columnCount = 26;
  const headerCellStyle = {
    borderRight: "1px solid #1e2025",
    borderBottom: "1px solid #1e2025",
    padding: "5px 8px",
    textAlign: "left",
    fontSize: ".72rem",
    fontWeight: 700,
    color: "#555",
    backgroundColor: "#0d0e10",
    whiteSpace: "nowrap",
  };

  return (
    <div className="overflow-x-auto rounded border border-[#1e2025]">
      <table
        style={{
          borderCollapse: "collapse",
          tableLayout: "fixed",
          minWidth:
            NO_COLUMN_WIDTH +
            CONTEST_COLUMN_WIDTH +
            columnCount * PROBLEM_COLUMN_WIDTH,
        }}
      >
        <colgroup>
          <col style={{ width: NO_COLUMN_WIDTH }} />
          <col style={{ width: CONTEST_COLUMN_WIDTH }} />
          {ALL_LETTERS.slice(0, columnCount).map((letter) => (
            <col key={letter} style={{ width: PROBLEM_COLUMN_WIDTH }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              style={{
                ...headerCellStyle,
                position: "sticky",
                left: 0,
                zIndex: 2,
                width: NO_COLUMN_WIDTH,
                textAlign: "center",
              }}
            >
              No.
            </th>
            <th
              style={{
                ...headerCellStyle,
                position: "sticky",
                left: NO_COLUMN_WIDTH,
                zIndex: 2,
                width: CONTEST_COLUMN_WIDTH,
              }}
            >
              Contest
            </th>
            {ALL_LETTERS.slice(0, columnCount).map((letter) => (
              <th key={letter} style={headerCellStyle}>
                {letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contests.length === 0 ? (
            <tr>
              <td
                colSpan={columnCount + 2}
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#444",
                  fontSize: ".85rem",
                }}
              >
                No contests found
              </td>
            </tr>
          ) : (
            contests.map((contest, index) => (
              <ContestRow
                key={contest.id}
                contest={contest}
                isSolved={isSolved}
                maskRatings={maskRatings}
                rowNumber={page * pageSize + index + 1}
                columnCount={columnCount}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
