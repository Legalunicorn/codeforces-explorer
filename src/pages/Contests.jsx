// src/pages/Contests.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProblems } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";
import CenteredLoader from "../ui/CenteredLoader";
import ErrorPage from "./ErrorPage";
import { ratingColor } from "../utils/ratingColor";
import { Button } from "@radix-ui/themes";
import { EyeNoneIcon, EyeOpenIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";

// ── Division tab matchers ─────────────────────────────────────────────────────
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
      !/div\.?\s*[1-4]/i.test(n) && !/educational/i.test(n) && !/global/i.test(n) },
];

// All possible column letters — we only render as many as the page's max
const ALL_LETTERS = ["A","B","C","D","E","F","G","H","I","J"];
const NO_COL_W      = 44;
const CONTEST_COL_W = 260;
const PROB_COL_W    = 190;
const PAGE_SIZE     = 50;

// ── localStorage cache ────────────────────────────────────────────────────────
const CACHE_KEY = "cfe-standings-v3";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); }
  catch { return {}; }
}
function saveCache(cache) {
  try {
    const now    = Date.now();
    const pruned = {};
    for (const [id, entry] of Object.entries(cache)) {
      if (now - entry.ts < CACHE_TTL) pruned[id] = entry;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
  } catch { /* quota exceeded — ignore */ }
}

// ── Semaphore — max N concurrent CF API requests ──────────────────────────────
function makeSemaphore(n) {
  let running = 0;
  const queue = [];
  return (fn) => new Promise((resolve, reject) => {
    const run = () => {
      running++;
      Promise.resolve().then(fn).then(
        (v) => { running--; if (queue.length) queue.shift()(); resolve(v); },
        (e) => { running--; if (queue.length) queue.shift()(); reject(e); },
      );
    };
    running < n ? run() : queue.push(run);
  });
}
const sem = makeSemaphore(5);

// ── Fetch a single contest's problem list via contest.standings ───────────────
async function fetchStandingsProblems(contestId) {
  const res  = await fetch(
    `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1&showUnofficial=false`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(data.comment ?? "CF error");
  return (data.result.problems ?? []).map((p) => ({
    name: p.name, index: p.index, rating: p.points ?? undefined,
    tags: p.tags ?? [], contestId,
  }));
}

// ── Build Record<baseLetter, Problem[]> from a flat problem array ─────────────
// Mirrors cftracker's Contest.addProblem:
//   "C1", "C2"  →  { C: [probC1, probC2] }
//   "A"         →  { A: [probA] }
function buildProblemList(probs) {
  const pl = {};
  for (const p of probs) {
    const base = p.index.charAt(0);
    if (!pl[base]) pl[base] = [];
    if (!pl[base].some((x) => x.index === p.index)) {
      pl[base].push(p);
      pl[base].sort((a, b) => a.index.localeCompare(b.index));
    }
  }
  return pl;
}

// ── mxInd: highest column index (A=1, B=2 …) in a problemList ────────────────
function getMxInd(problemList) {
  let mx = 0;
  for (const base of Object.keys(problemList)) {
    const n = base.charCodeAt(0) - 65 + 1;
    if (n > mx) mx = n;
  }
  return mx;
}

// ── Shared cell style ─────────────────────────────────────────────────────────
const cellBase = {
  width: PROB_COL_W, minWidth: PROB_COL_W, maxWidth: PROB_COL_W,
  borderRight: "1px solid #1e2025", borderBottom: "1px solid #1e2025",
  verticalAlign: "middle", overflow: "hidden",
};

// ── ProbCell: a single problem in its own <td> ────────────────────────────────
function ProbCell({ problem, done, maskRating }) {
  const style = { ...cellBase, padding: "9px 11px", backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent" };
  if (!problem) return <td style={style} />;

  const href = problem.contestId > 10000
    ? `https://codeforces.com/problemset/gymProblem/${problem.contestId}/${problem.index}`
    : `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  const color = done ? "#4ade80" : (!maskRating && problem.rating) ? ratingColor(problem.rating) : "#c9d1d9";

  return (
    <td style={style}>
      <a href={href} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5">
        <span style={{ color, fontSize:".82rem", fontWeight:500, lineHeight:"1.3",
          display:"block", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}
          className="group-hover:underline">
          {problem.index}. {problem.name}
        </span>
        <span style={{ display:"block", height:"1.1em", lineHeight:"1.1em" }}>
          {maskRating
            ? problem.rating
                ? <span style={{ display:"inline-block", width:"2.2rem", height:"0.6em", backgroundColor:"#2a2a2a", borderRadius:3, verticalAlign:"middle" }} />
                : <span style={{ visibility:"hidden", fontSize:".7rem" }}>—</span>
            : problem.rating
                ? <span style={{ fontSize:".7rem", fontWeight:600, color:ratingColor(problem.rating) }}>{problem.rating}</span>
                : <span style={{ fontSize:".7rem", color:"#2a2a2a" }}>—</span>
          }
        </span>
      </a>
    </td>
  );
}

// ── HalfProb: one slice inside a split cell (C1 / C2) ────────────────────────
function HalfProb({ problem, done, maskRating, borderLeft }) {
  const style = {
    flex:"1 1 0", minWidth:0, overflow:"hidden", padding:"8px",
    borderLeft: borderLeft ? "1px solid #1e2025" : "none",
    backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent",
  };
  if (!problem) return <div style={style} />;

  const href = problem.contestId > 10000
    ? `https://codeforces.com/problemset/gymProblem/${problem.contestId}/${problem.index}`
    : `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  const color = done ? "#4ade80" : (!maskRating && problem.rating) ? ratingColor(problem.rating) : "#c9d1d9";

  return (
    <div style={style}>
      <a href={href} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5">
        <span style={{ color, fontSize:".75rem", fontWeight:500, lineHeight:"1.3",
          display:"block", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}
          className="group-hover:underline">
          {problem.index}. {problem.name}
        </span>
        <span style={{ display:"block", height:"1.1em", lineHeight:"1.1em" }}>
          {maskRating
            ? problem.rating
                ? <span style={{ display:"inline-block", width:"1.6rem", height:"0.6em", backgroundColor:"#2a2a2a", borderRadius:3, verticalAlign:"middle" }} />
                : <span style={{ visibility:"hidden", fontSize:".65rem" }}>—</span>
            : problem.rating
                ? <span style={{ fontSize:".65rem", fontWeight:600, color:ratingColor(problem.rating) }}>{problem.rating}</span>
                : <span style={{ fontSize:".65rem", color:"#2a2a2a" }}>—</span>
          }
        </span>
      </a>
    </div>
  );
}

// ── ProbsCell: renders one column's worth of problems ─────────────────────────
// Mirrors cftracker's ProblemListCell:
//   length 0 → empty td
//   length 1 → full-width ProbCell
//   length 2-3 → side-by-side HalfProb slices
function ProbsCell({ problems, isSolved, maskRating }) {
  if (!problems || problems.length === 0) {
    return <td style={{ ...cellBase, padding:"9px 11px" }} />;
  }
  if (problems.length === 1) {
    const p = problems[0];
    return <ProbCell problem={p} done={isSolved(p.contestId, p.index)} maskRating={maskRating} />;
  }
  return (
    <td style={{ ...cellBase, padding:0 }}>
      <div style={{ display:"flex", alignItems:"stretch", height:"100%" }}>
        {problems.map((p, i) => (
          <HalfProb
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

// ── ContestRow ────────────────────────────────────────────────────────────────
function ContestRow({ contest, isSolved, maskRating, rowNo, numCols }) {
  const allProbs  = Object.values(contest.problemList).flat();
  const solved    = allProbs.filter((p) => isSolved(p.contestId, p.index)).length;
  const total     = allProbs.length;

  const noStyle = {
    width:NO_COL_W, minWidth:NO_COL_W, maxWidth:NO_COL_W,
    borderRight:"1px solid #1e2025", borderBottom:"1px solid #1e2025",
    backgroundColor:"#0a0b0c", padding:"9px 6px", verticalAlign:"middle",
    textAlign:"center", fontSize:".7rem", color:"#444",
    position:"sticky", left:0, zIndex:1,
  };
  const nameStyle = {
    width:CONTEST_COL_W, minWidth:CONTEST_COL_W, maxWidth:CONTEST_COL_W,
    borderRight:"1px solid #1e2025", borderBottom:"1px solid #1e2025",
    backgroundColor:"#0a0b0c", padding:"9px 12px", verticalAlign:"middle",
    position:"sticky", left:NO_COL_W, zIndex:1,
  };

  return (
    <tr>
      <td style={noStyle}>{rowNo}</td>
      <td style={nameStyle}>
        <a href={`https://codeforces.com/contest/${contest.id}`}
          target="_blank" rel="noreferrer" className="group block">
          <span className="block text-[.8rem] font-semibold leading-snug text-[#bbb] group-hover:text-white group-hover:underline transition">
            {contest.name}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[.65rem] text-[#444]">#{contest.id}</span>
            {contest.startTimeSeconds > 0 && (
              <span className="text-[.65rem] text-[#3a3a3a]">
                {new Date(contest.startTimeSeconds * 1000).toLocaleDateString("en-US",
                  { year:"numeric", month:"short", day:"numeric" })}
              </span>
            )}
            {solved > 0 && (
              <span className="text-[.65rem] font-semibold text-[#4ade80]">
                {solved}/{total} solved
              </span>
            )}
          </div>
        </a>
      </td>

      {ALL_LETTERS.slice(0, numCols).map((col) => (
        <ProbsCell
          key={col}
          problems={contest.problemList[col] ?? []}
          isSolved={isSolved}
          maskRating={maskRating}
        />
      ))}
    </tr>
  );
}

// ── Page component ────────────────────────────────────────────────────────────
export default function Contests() {
  const dispatch = useDispatch();
  const { problems, contestNames, isLoading, errorMsg } = useSelector((s) => s.problemset);
  const { isSolved } = useViewerProblems();

  const [maskRating,       setMaskRating]       = useState(false);
  const [activeTab,        setActiveTab]         = useState(0);
  const [search,           setSearch]            = useState("");
  const [page,             setPage]              = useState(0);
  const [loadingStandings, setLoadingStandings]  = useState(false);

  // Standings cache — seeded from localStorage so it survives reloads
  const [cache, setCache] = useState(() => loadCache());
  // IDs we've already attempted (or have cached) — avoid re-fetching
  const attempted = useRef(new Set(Object.keys(loadCache()).map(Number)));

  useEffect(() => { dispatch(fetchProblems()); }, [dispatch]);

  // Fetch contest.list for authoritative names + start dates
  const [contestMeta, setContestMeta] = useState(new Map());
  useEffect(() => {
    fetch("https://codeforces.com/api/contest.list?gym=false")
      .then((r) => r.json())
      .then((data) => {
        if (data.status !== "OK") return;
        const m = new Map();
        data.result.forEach((c) => m.set(c.id, { name: c.name, startTimeSeconds: c.startTimeSeconds }));
        setContestMeta(m);
      })
      .catch(() => {});
  }, []);

  // ── Build base contest map from problemset.problems ───────────────────────
  const baseMap = useMemo(() => {
    const map = new Map();

    problems.forEach((p) => {
      if (p.contestId >= 100000) return;
      if (!map.has(p.contestId)) {
        const meta = contestMeta.get(p.contestId);
        map.set(p.contestId, {
          id:               p.contestId,
          name:             meta?.name ?? contestNames?.[p.contestId] ?? p.contestName ?? `Contest ${p.contestId}`,
          startTimeSeconds: meta?.startTimeSeconds ?? 0,
          problemList:      {},
        });
      }
      const c    = map.get(p.contestId);
      const base = p.index.charAt(0); // "C1" → "C"
      if (!c.problemList[base]) c.problemList[base] = [];
      if (!c.problemList[base].some((x) => x.index === p.index)) {
        c.problemList[base].push(p);
        c.problemList[base].sort((a, b) => a.index.localeCompare(b.index));
      }
    });

    // Patch from contest.list (authoritative names + dates) + add missing contests
    contestMeta.forEach((meta, id) => {
      if (id >= 100000) return;
      if (!map.has(id)) {
        map.set(id, { id, name: meta.name, startTimeSeconds: meta.startTimeSeconds, problemList: {} });
      } else {
        const c = map.get(id);
        c.name             = meta.name;
        c.startTimeSeconds = meta.startTimeSeconds;
      }
    });

    return map;
  }, [problems, contestNames, contestMeta]);

  // Sorted newest-first by start date, fall back to contestId
  const allContests = useMemo(
    () => Array.from(baseMap.values()).sort((a, b) =>
      b.startTimeSeconds !== a.startTimeSeconds
        ? b.startTimeSeconds - a.startTimeSeconds
        : b.id - a.id
    ),
    [baseMap],
  );

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const fn = DIV_TABS[activeTab].match;
    const q  = search.trim().toLowerCase();
    return allContests.filter((c) => {
      if (!fn(c.name)) return false;
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

  // ── Fetch standings for contests on the current page ──────────────────────
  useEffect(() => {
    if (pageContests.length === 0) return;
    const toFetch = pageContests.map((c) => c.id).filter((id) => !attempted.current.has(id));
    if (toFetch.length === 0) return;

    toFetch.forEach((id) => attempted.current.add(id));
    setLoadingStandings(true);
    const now = Date.now();

    Promise.allSettled(
      toFetch.map((id) => sem(() => fetchStandingsProblems(id).then((probs) => ({ id, probs }))))
    ).then((results) => {
      setCache((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.status === "fulfilled") {
            const { id, probs } = r.value;
            next[id] = { pl: buildProblemList(probs), ts: now };
          }
        }
        saveCache(next);
        return next;
      });
      setLoadingStandings(false);
    });
  }, [pageContests]);

  // ── Merge problemset data + standings data ────────────────────────────────
  // problemset.problems has ratings but may be missing problems.
  // standings has every problem but rarely has ratings.
  // → Keep problemset entry when both exist, add standings entry when missing.
  const mergedPage = useMemo(() => {
    return pageContests.map((contest) => {
      const cached = cache[contest.id];
      if (!cached?.pl) return { ...contest, mxInd: getMxInd(contest.problemList) };

      const merged = {};
      const keys   = new Set([...Object.keys(contest.problemList), ...Object.keys(cached.pl)]);
      for (const base of keys) {
        const fromPS   = contest.problemList[base] ?? [];
        const fromStan = cached.pl[base] ?? [];
        const byIndex  = new Map();
        fromPS.forEach((p) => byIndex.set(p.index, p));      // problemset wins (has rating)
        fromStan.forEach((p) => { if (!byIndex.has(p.index)) byIndex.set(p.index, p); }); // fill gaps
        const arr = Array.from(byIndex.values()).sort((a, b) => a.index.localeCompare(b.index));
        if (arr.length) merged[base] = arr;
      }
      return { ...contest, problemList: merged, mxInd: getMxInd(merged) };
    });
  }, [pageContests, cache]);

  // How many columns to actually render — at least 8, up to the page max
  const numCols = useMemo(
    () => Math.max(8, ...mergedPage.map((c) => c.mxInd)),
    [mergedPage],
  );

  if (isLoading) return <CenteredLoader />;
  if (errorMsg)  return <ErrorPage text={errorMsg} />;

  const thBase = {
    borderRight:"1px solid #1e2025", borderBottom:"1px solid #1e2025",
    padding:"6px 11px", textAlign:"left", fontSize:".75rem",
    fontWeight:700, color:"#555", backgroundColor:"#0d0e10", whiteSpace:"nowrap",
  };

  return (
    <div className="mt-4 sm:mx-4 lg:mx-14">
      {/* ── Controls ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="1" variant={maskRating ? "solid" : "soft"} color={maskRating ? "amber" : "gray"}
            onClick={() => setMaskRating((v) => !v)}>
            {maskRating ? <EyeNoneIcon width={13} height={13}/> : <EyeOpenIcon width={13} height={13}/>}
            {maskRating ? "Ratings hidden" : "Hide ratings"}
          </Button>
          <span className="text-xs text-[#555]">
            {filtered.length} contests
            {loadingStandings && <span className="ml-2 text-[#444]">· loading problems…</span>}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded border border-[#2e3135] bg-[#111] px-2 py-1">
          <MagnifyingGlassIcon width={13} height={13} className="text-[#555]"/>
          <input className="w-48 bg-transparent text-xs text-white outline-none placeholder:text-[#444]"
            placeholder="Search contest name or ID…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Division tabs ── */}
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p-1))} disabled={page === 0}
            className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] hover:border-[#555] hover:text-white disabled:opacity-30 transition">
            ← Prev
          </button>
          <span className="text-xs text-[#555]">{page+1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages-1, p+1))} disabled={page === totalPages-1}
            className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] hover:border-[#555] hover:text-white disabled:opacity-30 transition">
            Next →
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded border border-[#1e2025]">
        <table style={{
          borderCollapse:"collapse", tableLayout:"fixed",
          minWidth: NO_COL_W + CONTEST_COL_W + numCols * PROB_COL_W,
        }}>
          <colgroup>
            <col style={{ width:NO_COL_W }}/>
            <col style={{ width:CONTEST_COL_W }}/>
            {ALL_LETTERS.slice(0, numCols).map((col) => (
              <col key={col} style={{ width:PROB_COL_W }}/>
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...thBase, position:"sticky", left:0, zIndex:2, width:NO_COL_W, minWidth:NO_COL_W, textAlign:"center" }}>No.</th>
              <th style={{ ...thBase, position:"sticky", left:NO_COL_W, zIndex:2, width:CONTEST_COL_W, minWidth:CONTEST_COL_W }}>Contest</th>
              {ALL_LETTERS.slice(0, numCols).map((col) => (
                <th key={col} style={thBase}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mergedPage.length === 0 ? (
              <tr>
                <td colSpan={numCols + 2}
                  style={{ padding:"32px", textAlign:"center", color:"#444", fontSize:".85rem" }}>
                  No contests found
                </td>
              </tr>
            ) : mergedPage.map((contest, i) => (
              <ContestRow
                key={contest.id}
                contest={contest}
                isSolved={isSolved}
                maskRating={maskRating}
                rowNo={page * PAGE_SIZE + i + 1}
                numCols={numCols}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}