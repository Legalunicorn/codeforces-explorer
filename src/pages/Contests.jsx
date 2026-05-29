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

const ALL_LETTERS   = ["A","B","C","D","E","F","G","H","I","J"];
const NO_COL_W      = 44;
const CONTEST_COL_W = 260;
const PROB_COL_W    = 190;
const PAGE_SIZE     = 50;

// ── localStorage cache ────────────────────────────────────────────────────────
const CACHE_KEY = "cfe-standings-v8";
const CACHE_TTL = 24 * 60 * 60 * 1000;

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
  } catch {}
}

// ── Semaphore ─────────────────────────────────────────────────────────────────
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
const sem = makeSemaphore(3);

// ── Fetch a single contest's full problem list via contest.standings ──────────
async function fetchStandingsProblems(contestId) {
  const res = await fetch(
    `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1&showUnofficial=false`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(data.comment ?? "CF API error");
  return (data.result.problems ?? []).map((p) => ({
    name:      p.name,
    index:     p.index,
    rating:    p.rating ?? undefined,
    tags:      p.tags ?? [],
    contestId: p.contestId ?? contestId,
  }));
}

// ── Build Record<baseLetter, Problem[]> ───────────────────────────────────────
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

function getMxInd(problemList) {
  let mx = 0;
  for (const base of Object.keys(problemList)) {
    const n = base.charCodeAt(0) - 65 + 1;
    if (n > mx) mx = n;
  }
  return mx;
}

// ── Coupled round detection ───────────────────────────────────────────────────
// More robust detection using both name matching and problem overlap analysis
function makeCoupledMap(allContests) {
  const coupled = new Map();
  
  // Method 1: Name-based detection (improved)
  const normalize = (name) =>
    name.replace(/div\.?\s*[12]/gi, "DIVX")
        .replace(/codeforces\s*round/gi, "CFR")
        .replace(/\s*\(.*?\)\s*/g, "") // Remove parenthetical notes
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();

  const byNorm = new Map();
  for (const c of allContests) {
    const norm = normalize(c.name);
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm).push(c);
  }

  for (const group of byNorm.values()) {
    if (group.length !== 2) continue;
    const [a, b] = group;
    const aDiv1 = /div\.?\s*1/i.test(a.name) && !/div\.?\s*2/i.test(a.name);
    const aDiv2 = /div\.?\s*2/i.test(a.name) && !/div\.?\s*1/i.test(a.name);
    const bDiv1 = /div\.?\s*1/i.test(b.name) && !/div\.?\s*2/i.test(b.name);
    const bDiv2 = /div\.?\s*2/i.test(b.name) && !/div\.?\s*1/i.test(b.name);
    
    if ((aDiv1 && bDiv2) || (aDiv2 && bDiv1)) {
      coupled.set(a.id, b.id);
      coupled.set(b.id, a.id);
    }
  }

  // Method 2: Temporal proximity + problem overlap detection
  // Some coupled rounds might have different names (e.g., "Codeforces Round #123 (Div. 1)" vs "Codeforces Round #123 (Div. 2)")
  const sorted = [...allContests].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
  
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      
      // Skip if already coupled or time difference too large
      if (coupled.has(a.id) || coupled.has(b.id)) continue;
      if (Math.abs(a.startTimeSeconds - b.startTimeSeconds) > 86400) break; // 24 hours max
      
      // Check for problem overlap (same letter problems with same names)
      const aProbs = Object.values(a.problemList).flat();
      const bProbs = Object.values(b.problemList).flat();
      
      if (aProbs.length === 0 || bProbs.length === 0) continue;
      
      const aNames = new Set(aProbs.map(p => p.name.toLowerCase().trim()));
      const bNames = new Set(bProbs.map(p => p.name.toLowerCase().trim()));
      
      let overlapCount = 0;
      for (const name of aNames) {
        if (bNames.has(name)) overlapCount++;
      }
      
      // If significant overlap and one is Div.1 and other is Div.2
      const aDiv1 = /div\.?\s*1/i.test(a.name) && !/div\.?\s*2/i.test(a.name);
      const aDiv2 = /div\.?\s*2/i.test(a.name) && !/div\.?\s*1/i.test(a.name);
      const bDiv1 = /div\.?\s*1/i.test(b.name) && !/div\.?\s*2/i.test(b.name);
      const bDiv2 = /div\.?\s*2/i.test(b.name) && !/div\.?\s*1/i.test(b.name);
      
      if (overlapCount >= Math.min(3, Math.min(aProbs.length, bProbs.length))) {
        if ((aDiv1 && bDiv2) || (aDiv2 && bDiv1)) {
          coupled.set(a.id, b.id);
          coupled.set(b.id, a.id);
        }
      }
    }
  }

  return coupled;
}

// ── Cell styles ───────────────────────────────────────────────────────────────
const cellBase = {
  width: PROB_COL_W, minWidth: PROB_COL_W, maxWidth: PROB_COL_W,
  borderRight: "1px solid #1e2025", borderBottom: "1px solid #1e2025",
  verticalAlign: "middle", overflow: "hidden",
};

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

function HalfProb({ problem, done, maskRating, borderLeft }) {
  const style = {
    flex:"1 1 0", 
    minWidth:0, 
    overflow:"hidden", 
    padding:"9px 8px",
    borderLeft: borderLeft ? "1px solid #1e2025" : "none",
    backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
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

function ProbsCell({ problems, isSolved, maskRating }) {
  if (!problems || problems.length === 0) {
    return <td style={{ ...cellBase, padding:"9px 11px" }} />;
  }
  if (problems.length === 1) {
    const p = problems[0];
    return <ProbCell problem={p} done={isSolved(p.contestId, p.index)} maskRating={maskRating} />;
  }
  return (
    <td style={{ ...cellBase, padding:0, position: "relative" }}>
      <div style={{ 
        display:"flex", 
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems:"stretch"
      }}>
        {problems.map((p, i) => (
          <HalfProb key={p.index} problem={p} done={isSolved(p.contestId, p.index)}
            maskRating={maskRating} borderLeft={i > 0} />
        ))}
      </div>
    </td>
  );
}

function ContestRow({ contest, isSolved, maskRating, rowNo, numCols }) {
  const allProbs = Object.values(contest.problemList).flat();
  const solved   = allProbs.filter((p) => isSolved(p.contestId, p.index)).length;
  const total    = allProbs.length;

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
        <ProbsCell key={col} problems={contest.problemList[col] ?? []}
          isSolved={isSolved} maskRating={maskRating} />
      ))}
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Contests() {
  const dispatch = useDispatch();
  const { problems, contestNames, isLoading, errorMsg } = useSelector((s) => s.problemset);
  const { isSolved } = useViewerProblems();

  const [maskRating,       setMaskRating]      = useState(false);
  const [activeTab,        setActiveTab]        = useState(0);
  const [search,           setSearch]           = useState("");
  const [page,             setPage]             = useState(0);
  const [loadingStandings, setLoadingStandings] = useState(false);

  const [cache, setCache] = useState(() => loadCache());

  const inFlight = useRef(new Set());

  useEffect(() => { dispatch(fetchProblems()); }, [dispatch]);

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
      const c = map.get(p.contestId);
      const base = p.index.charAt(0);
      if (!c.problemList[base]) c.problemList[base] = [];
      if (!c.problemList[base].some((x) => x.index === p.index)) {
        c.problemList[base].push(p);
        c.problemList[base].sort((a, b) => a.index.localeCompare(b.index));
      }
    });

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

  const allContests = useMemo(
    () => Array.from(baseMap.values()).sort((a, b) =>
      b.startTimeSeconds !== a.startTimeSeconds
        ? b.startTimeSeconds - a.startTimeSeconds
        : b.id - a.id
    ),
    [baseMap],
  );

  const coupledMap = useMemo(() => makeCoupledMap(allContests), [allContests]);

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

  // ── Standings fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (pageContests.length === 0) return;

    const now = Date.now();

    // For each contest, also fetch its coupled sibling's standings
    const candidates = new Set();
    for (const c of pageContests) {
      candidates.add(c.id);
      const sib = coupledMap.get(c.id);
      if (sib != null) candidates.add(sib);
    }

    const toFetch = Array.from(candidates).filter((id) => {
      if (inFlight.current.has(id)) return false;
      const entry = cache[id];
      if (!entry) return true;
      if (now - entry.ts > CACHE_TTL) return true;
      return false;
    });

    if (toFetch.length === 0) return;

    toFetch.forEach((id) => inFlight.current.add(id));
    setLoadingStandings(true);

    Promise.allSettled(
      toFetch.map((id) =>
        sem(() => fetchStandingsProblems(id).then((probs) => ({ id, probs })))
      )
    ).then((results) => {
      const now2 = Date.now();
      setCache((prev) => {
        const next = { ...prev };
        results.forEach((r, i) => {
          const id = toFetch[i];
          inFlight.current.delete(id);
          if (r.status === "fulfilled") {
            next[id] = { pl: buildProblemList(r.value.probs), ts: now2 };
          }
        });
        saveCache(next);
        return next;
      });
      setLoadingStandings(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageContests, coupledMap]);

  // ── Merge problem lists ───────────────────────────────────────────────────────
  const mergedPage = useMemo(() => {
    return pageContests.map((contest) => {
      const siblingId = coupledMap.get(contest.id) ?? null;
      const ownCached = cache[contest.id];
      const siblingCached = siblingId != null ? cache[siblingId] : null;

      const merged = {};

      // Collect all base letters from all sources
      const keys = new Set([
        ...Object.keys(contest.problemList),
        ...(ownCached?.pl     ? Object.keys(ownCached.pl)     : []),
        ...(siblingCached?.pl ? Object.keys(siblingCached.pl) : []),
      ]);

      for (const base of keys) {
        const fromPS      = contest.problemList[base]  ?? [];
        const fromStan    = ownCached?.pl?.[base]      ?? [];
        const fromSibling = siblingCached?.pl?.[base]  ?? [];

        const byIndex = new Map();
        
        // Priority: problemset (has ratings) > own standings > sibling standings
        // But we want to include ALL problems, not just common ones
        fromSibling.forEach((p) => byIndex.set(p.index, p));
        fromStan.forEach((p)    => byIndex.set(p.index, p));
        fromPS.forEach((p)      => byIndex.set(p.index, p));

        const arr = Array.from(byIndex.values())
          .sort((a, b) => a.index.localeCompare(b.index));
        if (arr.length) merged[base] = arr;
      }

      return { ...contest, problemList: merged, mxInd: getMxInd(merged) };
    });
  }, [pageContests, cache, coupledMap]);

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
              <ContestRow key={contest.id} contest={contest} isSolved={isSolved}
                maskRating={maskRating} rowNo={page * PAGE_SIZE + i + 1} numCols={numCols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}