// src/pages/Contests.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProblems } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";
import CenteredLoader from "../ui/CenteredLoader";
import ErrorPage from "./ErrorPage";
import { ratingColor } from "../utils/ratingColor";
import { Button } from "@radix-ui/themes";
import { EyeNoneIcon, EyeOpenIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";

// ── Division tab matchers ────────────────────────────────────────────────────
const DIV_TABS = [
  { label: "All",         match: () => true },
  { label: "Div. 1",      match: (n) => /div\.?\s*1/i.test(n) && !/div\.?\s*2/i.test(n) },
  { label: "Div. 2",      match: (n) => /div\.?\s*2/i.test(n) && !/div\.?\s*1/i.test(n) },
  { label: "Div. 3",      match: (n) => /div\.?\s*3/i.test(n) },
  { label: "Div. 4",      match: (n) => /div\.?\s*4/i.test(n) },
  { label: "Div. 1+2",    match: (n) => /div\.?\s*1/i.test(n) && /div\.?\s*2/i.test(n) },
  { label: "Educational", match: (n) => /educational/i.test(n) },
  { label: "Global",      match: (n) => /global/i.test(n) },
  { label: "Others",      match: (n) =>
      !/div\.?\s*[1-4]/i.test(n) &&
      !/educational/i.test(n) &&
      !/global/i.test(n) },
];

const NO_COL_W      = 44;
const CONTEST_COL_W = 260;
const PROB_COL_W    = 190;
const COL_LETTERS   = ["A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Collect numbered sub-problems for a base letter.
 * e.g. col="C" → looks up C1, C2, C3... until a gap.
 */
function getSubProblems(problems, col) {
  const subs = [];
  for (let n = 1; n <= 4; n++) {
    const p = problems.get(col + n);
    if (!p) break;
    subs.push(p);
  }
  return subs;
}

// ── Shared cell border/size style ────────────────────────────────────────────
const probCellBase = {
  width:        PROB_COL_W,
  minWidth:     PROB_COL_W,
  maxWidth:     PROB_COL_W,
  borderRight:  "1px solid #1e2025",
  borderBottom: "1px solid #1e2025",
  verticalAlign: "middle",
  overflow:     "hidden",
};

// ── Single problem cell ──────────────────────────────────────────────────────
function ProbCell({ problem, done, maskRating }) {
  const cellStyle = {
    ...probCellBase,
    padding:         "9px 11px",
    backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent",
  };

  if (!problem) return <td style={cellStyle} />;

  const href =
    problem.contestId > 10000
      ? `https://codeforces.com/problemset/gymProblem/${problem.contestId}/${problem.index}`
      : `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;

  const titleColor = done
    ? "#4ade80"
    : !maskRating && problem.rating
      ? ratingColor(problem.rating)
      : "#c9d1d9";

  return (
    <td style={cellStyle}>
      <a href={href} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5">
        {/* Name — truncate with ellipsis */}
        <span
          style={{
            color:        titleColor,
            fontSize:     ".82rem",
            fontWeight:   500,
            lineHeight:   "1.3",
            display:      "block",
            overflow:     "hidden",
            whiteSpace:   "nowrap",
            textOverflow: "ellipsis",
          }}
          className="group-hover:underline"
        >
          {problem.index}. {problem.name}
        </span>

        {/* Rating row — fixed height to prevent row-height jitter */}
        <span style={{ display: "block", height: "1.1em", lineHeight: "1.1em" }}>
          {maskRating ? (
            problem.rating ? (
              <span style={{
                display: "inline-block", width: "2.2rem", height: "0.6em",
                backgroundColor: "#2a2a2a", borderRadius: 3, verticalAlign: "middle",
              }} />
            ) : (
              <span style={{ visibility: "hidden", fontSize: ".7rem" }}>—</span>
            )
          ) : problem.rating ? (
            <span style={{ fontSize: ".7rem", fontWeight: 600, color: ratingColor(problem.rating) }}>
              {problem.rating}
            </span>
          ) : (
            <span style={{ fontSize: ".7rem", color: "#2a2a2a" }}>—</span>
          )}
        </span>
      </a>
    </td>
  );
}

// ── Content for one half of a split cell (C1 / C2 etc.) ─────────────────────
function HalfProbContent({ problem, done, maskRating, borderLeft }) {
  const style = {
    flex:            "1 1 0",
    minWidth:        0,           // allows flex children to shrink below content size
    overflow:        "hidden",
    padding:         "8px 8px",
    borderLeft:      borderLeft ? "1px solid #1e2025" : "none",
    backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent",
  };

  if (!problem) return <div style={style} />;

  const href =
    problem.contestId > 10000
      ? `https://codeforces.com/problemset/gymProblem/${problem.contestId}/${problem.index}`
      : `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;

  const titleColor = done
    ? "#4ade80"
    : !maskRating && problem.rating
      ? ratingColor(problem.rating)
      : "#c9d1d9";

  return (
    <div style={style}>
      <a href={href} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5">
        {/* Name — smaller font, aggressive truncation */}
        <span
          style={{
            color:        titleColor,
            fontSize:     ".75rem",
            fontWeight:   500,
            lineHeight:   "1.3",
            display:      "block",
            overflow:     "hidden",
            whiteSpace:   "nowrap",
            textOverflow: "ellipsis",
          }}
          className="group-hover:underline"
        >
          {problem.index}. {problem.name}
        </span>

        {/* Rating row */}
        <span style={{ display: "block", height: "1.1em", lineHeight: "1.1em" }}>
          {maskRating ? (
            problem.rating ? (
              <span style={{
                display: "inline-block", width: "1.6rem", height: "0.6em",
                backgroundColor: "#2a2a2a", borderRadius: 3, verticalAlign: "middle",
              }} />
            ) : (
              <span style={{ visibility: "hidden", fontSize: ".65rem" }}>—</span>
            )
          ) : problem.rating ? (
            <span style={{ fontSize: ".65rem", fontWeight: 600, color: ratingColor(problem.rating) }}>
              {problem.rating}
            </span>
          ) : (
            <span style={{ fontSize: ".65rem", color: "#2a2a2a" }}>—</span>
          )}
        </span>
      </a>
    </div>
  );
}

// ── One <tr> per contest ─────────────────────────────────────────────────────
function ContestRow({ contest, isSolved, maskRating, rowNo }) {
  // Count solved — includes both direct problems and sub-problems (C1, C2…)
  const solvedCount = COL_LETTERS.reduce((acc, col) => {
    const direct = contest.problems.get(col);
    if (direct) return acc + (isSolved(direct.contestId, direct.index) ? 1 : 0);
    const subs = getSubProblems(contest.problems, col);
    return acc + subs.filter((p) => isSolved(p.contestId, p.index)).length;
  }, 0);

  const noCellStyle = {
    width:           NO_COL_W,
    minWidth:        NO_COL_W,
    maxWidth:        NO_COL_W,
    borderRight:     "1px solid #1e2025",
    borderBottom:    "1px solid #1e2025",
    backgroundColor: "#0a0b0c",
    padding:         "9px 6px",
    verticalAlign:   "middle",
    textAlign:       "center",
    fontSize:        ".7rem",
    color:           "#444",
    position:        "sticky",
    left:            0,
    zIndex:          1,
  };

  const nameCellStyle = {
    width:           CONTEST_COL_W,
    minWidth:        CONTEST_COL_W,
    maxWidth:        CONTEST_COL_W,
    borderRight:     "1px solid #1e2025",
    borderBottom:    "1px solid #1e2025",
    backgroundColor: "#0a0b0c",
    padding:         "9px 12px",
    verticalAlign:   "middle",
    position:        "sticky",
    left:            NO_COL_W,
    zIndex:          1,
  };

  return (
    <tr>
      <td style={noCellStyle}>{rowNo}</td>
      <td style={nameCellStyle}>
        <a
          href={`https://codeforces.com/contest/${contest.id}`}
          target="_blank"
          rel="noreferrer"
          className="group block"
        >
          <span className="block text-[.8rem] font-semibold leading-snug text-[#bbb] transition group-hover:text-white group-hover:underline">
            {contest.name}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[.65rem] text-[#444]">#{contest.id}</span>
            {solvedCount > 0 && (
              <span className="text-[.65rem] font-semibold text-[#4ade80]">
                {solvedCount}/{contest.problems.size} solved
              </span>
            )}
          </div>
        </a>
      </td>

      {COL_LETTERS.map((col) => {
        // ── Case 1: direct problem (e.g. "C") ──────────────────────────────
        const direct = contest.problems.get(col);
        if (direct) {
          return (
            <ProbCell
              key={col}
              problem={direct}
              done={isSolved(direct.contestId, direct.index)}
              maskRating={maskRating}
            />
          );
        }

        // ── Case 2: numbered sub-problems (e.g. "C1", "C2") ───────────────
        const subs = getSubProblems(contest.problems, col);
        if (subs.length > 0) {
          return (
            <td
              key={col}
              style={{
                ...probCellBase,
                padding: 0,
              }}
            >
              {/* flex row — each sub-problem gets an equal slice of the cell */}
              <div style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
                {subs.map((p, i) => (
                  <HalfProbContent
                    key={p.index}
                    problem={p}
                    done={isSolved(p.contestId, p.index)}
                    maskRating={maskRating}
                    borderLeft={i > 0}
                  />
                ))}
              </div>
            </td>
          );
        }

        // ── Case 3: no problem for this column ─────────────────────────────
        return <ProbCell key={col} problem={null} done={false} maskRating={maskRating} />;
      })}
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

export default function Contests() {
  const dispatch = useDispatch();
  const { problems, contestNames, isLoading, errorMsg } = useSelector((store) => store.problemset);
  const { isSolved } = useViewerProblems();

  const [maskRating, setMaskRating] = useState(false);
  const [activeTab,  setActiveTab]  = useState(0);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(0);

  useEffect(() => { dispatch(fetchProblems()); }, [dispatch]);

  const contestMap = useMemo(() => {
    const map = new Map();
    problems.forEach((p) => {
      if (p.contestId >= 100000) return;
      if (!map.has(p.contestId)) {
        const name =
          contestNames?.[p.contestId] ||
          p.contestName ||
          `Contest ${p.contestId}`;
        map.set(p.contestId, { name, id: p.contestId, problems: new Map() });
      }
      map.get(p.contestId).problems.set(p.index, p);
    });
    return map;
  }, [problems, contestNames]);

  const allContests = useMemo(
    () => Array.from(contestMap.values()).sort((a, b) => b.id - a.id),
    [contestMap],
  );

  const filtered = useMemo(() => {
    const tabFn = DIV_TABS[activeTab].match;
    const q     = search.trim().toLowerCase();
    return allContests.filter((c) => {
      if (!tabFn(c.name)) return false;
      if (q && !c.name.toLowerCase().includes(q) && !String(c.id).includes(q)) return false;
      return true;
    });
  }, [allContests, activeTab, search]);

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const pageContests = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => { setPage(0); }, [activeTab, search]);

  if (isLoading) return <CenteredLoader />;
  if (errorMsg)  return <ErrorPage text={errorMsg} />;

  const thStyle = {
    borderRight:     "1px solid #1e2025",
    borderBottom:    "1px solid #1e2025",
    padding:         "6px 11px",
    textAlign:       "left",
    fontSize:        ".75rem",
    fontWeight:      700,
    color:           "#555",
    backgroundColor: "#0d0e10",
    whiteSpace:      "nowrap",
  };

  const stickyThStyle = {
    ...thStyle,
    position: "sticky",
    left:     0,
    zIndex:   2,
    width:    CONTEST_COL_W,
    minWidth: CONTEST_COL_W,
  };

  return (
    <div className="mt-4 sm:mx-4 lg:mx-14">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="1"
            variant={maskRating ? "solid" : "soft"}
            color={maskRating ? "amber" : "gray"}
            onClick={() => setMaskRating((v) => !v)}
          >
            {maskRating ? <EyeNoneIcon width={13} height={13} /> : <EyeOpenIcon width={13} height={13} />}
            {maskRating ? "Ratings hidden" : "Hide ratings"}
          </Button>
          <span className="text-xs text-[#555]">{filtered.length} contests</span>
        </div>

        <div className="flex items-center gap-1 rounded border border-[#2e3135] bg-[#111] px-2 py-1">
          <MagnifyingGlassIcon width={13} height={13} className="text-[#555]" />
          <input
            className="w-48 bg-transparent text-xs text-white outline-none placeholder:text-[#444]"
            placeholder="Search contest name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Division tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {DIV_TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`rounded px-3 py-1 text-xs font-semibold transition-all duration-100 ring-1 ${
              activeTab === i
                ? "bg-[#1e3a5c] text-white ring-[#2d5c8a]"
                : "bg-[#111] text-[#666] ring-[#2e3135] hover:text-[#aaa]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] transition hover:border-[#555] hover:text-white disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-xs text-[#555]">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] transition hover:border-[#555] hover:text-white disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded border border-[#1e2025]">
        <table
          style={{
            borderCollapse: "collapse",
            tableLayout:    "fixed",
            minWidth:       NO_COL_W + CONTEST_COL_W + COL_LETTERS.length * PROB_COL_W,
          }}
        >
          <colgroup>
            <col style={{ width: NO_COL_W }} />
            <col style={{ width: CONTEST_COL_W }} />
            {COL_LETTERS.map((col) => (
              <col key={col} style={{ width: PROB_COL_W }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...stickyThStyle, width: NO_COL_W, minWidth: NO_COL_W, left: 0, textAlign: "center" }}>
                No.
              </th>
              <th style={{ ...stickyThStyle, width: CONTEST_COL_W, minWidth: CONTEST_COL_W, left: NO_COL_W }}>
                Contest
              </th>
              {COL_LETTERS.map((col) => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageContests.length === 0 ? (
              <tr>
                <td
                  colSpan={COL_LETTERS.length + 2}
                  style={{ padding: "32px", textAlign: "center", color: "#444", fontSize: ".85rem" }}
                >
                  No contests found
                </td>
              </tr>
            ) : (
              pageContests.map((contest, index) => (
                <ContestRow
                  key={contest.id}
                  contest={contest}
                  isSolved={isSolved}
                  maskRating={maskRating}
                  rowNo={page * PAGE_SIZE + index + 1}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}