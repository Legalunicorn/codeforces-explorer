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

// Fixed column set — A through H covers all standard CF contests
const COL_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const CONTEST_COL_W = 220; // px
const PROB_COL_W    = 150; // px

// ── Single problem cell ──────────────────────────────────────────────────────
function ProbCell({ problem, done, maskRating, maskTags }) {
  const cellStyle = {
    width:           PROB_COL_W,
    minWidth:        PROB_COL_W,
    maxWidth:        PROB_COL_W,
    borderRight:     "1px solid #1e2025",
    borderBottom:    "1px solid #1e2025",
    verticalAlign:   "top",
    padding:         "6px 8px",
    backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent",
  };

  if (!problem) return <td style={cellStyle} />;

  const href =
    problem.contestId > 10000
      ? `https://codeforces.com/problemset/gymProblem/${problem.contestId}/${problem.index}`
      : `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;

  return (
    <td style={cellStyle}>
      <a href={href} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5">
        <span
          className="text-[.72rem] font-medium leading-snug group-hover:underline"
          style={{ color: done ? "#4ade80" : "#c9d1d9" }}
        >
          {problem.index}. {problem.name}
        </span>

        {/* Rating */}
        {maskRating ? (
          problem.rating ? (
            <span style={{
              display: "inline-block", width: "2rem", height: "0.55em",
              backgroundColor: "#2a2a2a", borderRadius: 3, marginTop: 2,
            }} />
          ) : null
        ) : problem.rating ? (
          <span className="text-[.63rem] font-semibold" style={{ color: ratingColor(problem.rating) }}>
            {problem.rating}
          </span>
        ) : (
          <span className="text-[.63rem] text-[#333]">N/A</span>
        )}

        {/* Tags */}
        {!maskTags && problem.tags?.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-0.5">
            {problem.tags.map((t) => (
              <span key={t} className="rounded-sm border border-[#2e3135] px-1 py-px text-[.57rem] text-[#666]">
                {t}
              </span>
            ))}
          </span>
        )}
      </a>
    </td>
  );
}

// ── One <tr> per contest ─────────────────────────────────────────────────────
function ContestRow({ contest, isSolved, maskRating, maskTags }) {
  const solvedCount = COL_LETTERS.reduce((acc, col) => {
    const p = contest.problems.get(col);
    return acc + (p && isSolved(p.contestId, p.index) ? 1 : 0);
  }, 0);

  const nameCellStyle = {
    width:        CONTEST_COL_W,
    minWidth:     CONTEST_COL_W,
    maxWidth:     CONTEST_COL_W,
    borderRight:  "1px solid #1e2025",
    borderBottom: "1px solid #1e2025",
    backgroundColor: "#0a0b0c",
    padding:      "6px 10px",
    verticalAlign: "middle",
  };

  return (
    <tr>
      <td style={nameCellStyle}>
        <a
          href={`https://codeforces.com/contest/${contest.id}`}
          target="_blank"
          rel="noreferrer"
          className="block text-[.68rem] font-semibold leading-snug text-[#999] hover:text-white hover:underline"
        >
          {contest.name}
        </a>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[.6rem] text-[#444]">#{contest.id}</span>
          {solvedCount > 0 && (
            <span className="text-[.6rem] text-[#4ade80]">
              {solvedCount}/{contest.problems.size}
            </span>
          )}
        </div>
      </td>

      {COL_LETTERS.map((col) => {
        const p    = contest.problems.get(col) ?? null;
        const done = p ? isSolved(p.contestId, p.index) : false;
        return (
          <ProbCell key={col} problem={p} done={done} maskRating={maskRating} maskTags={maskTags} />
        );
      })}
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 60;

export default function Contests() {
  const dispatch = useDispatch();
  const { problems, isLoading, errorMsg } = useSelector((store) => store.problemset);
  const { isSolved } = useViewerProblems();

  const [maskRating, setMaskRating] = useState(false);
  const [maskTags,   setMaskTags]   = useState(true);
  const [activeTab,  setActiveTab]  = useState(0);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(0);

  useEffect(() => { dispatch(fetchProblems()); }, [dispatch]);

  // Group problems by contest — skip gym contests (id >= 100000)
  const contestMap = useMemo(() => {
    const map = new Map();
    problems.forEach((p) => {
      if (p.contestId >= 100000) return; // skip gyms — they have no proper contestName
      if (!map.has(p.contestId)) {
        map.set(p.contestId, {
          name: p.contestName ?? `Contest ${p.contestId}`,
          id:   p.contestId,
          problems: new Map(),
        });
      }
      map.get(p.contestId).problems.set(p.index, p);
    });
    return map;
  }, [problems]);

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
    borderRight:  "1px solid #1e2025",
    borderBottom: "1px solid #1e2025",
    padding:      "5px 8px",
    textAlign:    "left",
    fontSize:     ".68rem",
    fontWeight:   700,
    color:        "#444",
    backgroundColor: "#0d0e10",
  };

  return (
    <div className="mt-4 sm:mx-4 lg:mx-14">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="1" variant={maskRating ? "solid" : "soft"} color={maskRating ? "amber" : "gray"}
            onClick={() => setMaskRating((v) => !v)}>
            {maskRating ? <EyeNoneIcon width={13} height={13} /> : <EyeOpenIcon width={13} height={13} />}
            {maskRating ? "Ratings hidden" : "Hide ratings"}
          </Button>
          <Button size="1" variant={maskTags ? "solid" : "soft"} color={maskTags ? "indigo" : "gray"}
            onClick={() => setMaskTags((v) => !v)}>
            {maskTags ? <EyeNoneIcon width={13} height={13} /> : <EyeOpenIcon width={13} height={13} />}
            {maskTags ? "Tags hidden" : "Hide tags"}
          </Button>
          <span className="text-xs text-[#555]">{filtered.length} contests</span>
        </div>

        <div className="flex items-center gap-1 rounded border border-[#2e3135] bg-[#111] px-2 py-1">
          <MagnifyingGlassIcon width={13} height={13} className="text-[#555]" />
          <input
            className="w-44 bg-transparent text-xs text-white outline-none placeholder:text-[#444]"
            placeholder="Search contest name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Division tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {DIV_TABS.map((tab, i) => (
          <button key={tab.label} onClick={() => setActiveTab(i)}
            className={`rounded px-3 py-1 text-xs font-semibold transition-all duration-100 ring-1 ${
              activeTab === i
                ? "bg-[#1e3a5c] text-white ring-[#2d5c8a]"
                : "bg-[#111] text-[#666] ring-[#2e3135] hover:text-[#aaa]"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Single shared table — colgroup locks widths */}
      <div className="overflow-x-auto rounded border border-[#1e2025]">
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: CONTEST_COL_W }} />
            {COL_LETTERS.map((col) => (
              <col key={col} style={{ width: PROB_COL_W }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th style={{ ...thStyle, width: CONTEST_COL_W }}>Contest</th>
              {COL_LETTERS.map((col) => (
                <th key={col} style={{ ...thStyle, width: PROB_COL_W }}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageContests.map((contest) => (
              <ContestRow
                key={contest.id}
                contest={contest}
                isSolved={isSolved}
                maskRating={maskRating}
                maskTags={maskTags}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] transition hover:border-[#555] hover:text-white disabled:opacity-30">
            ← Prev
          </button>
          <span className="text-xs text-[#555]">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] transition hover:border-[#555] hover:text-white disabled:opacity-30">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}