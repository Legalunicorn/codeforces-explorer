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

const ALL_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K", "L", "M", "N", "O","P","Q","R","S","T","U","V","W","X","Y","Z"];
const NO_COL_W      = 36;
const CONTEST_COL_W = 120;
const PROB_COL_W    = 140;
const PAGE_SIZE     = 50;

function shortName(raw) {
  const edu = raw.match(/educational\s+codeforces\s+round\s+#?(\d+)/i);
  if (edu) return `EDU ${edu[1]}`;
  const gl = raw.match(/codeforces\s+global\s+round\s+#?(\d+)/i);
  if (gl) return `Global ${gl[1]}`;
  const cf = raw.match(/codeforces\s+round\s+#?(\d+)/i);
  if (cf) {
    const n = cf[1];
    const d12 = /div\.?\s*1/i.test(raw) && /div\.?\s*2/i.test(raw);
    const d1  = /div\.?\s*1/i.test(raw) && !d12;
    const d2  = /div\.?\s*2/i.test(raw) && !d12;
    const d3  = /div\.?\s*3/i.test(raw);
    const d4  = /div\.?\s*4/i.test(raw);
    const tag = d12 ? " (1+2)" : d1 ? " (D1)" : d2 ? " (D2)" : d3 ? " (D3)" : d4 ? " (D4)" : "";
    return `CF ${n}${tag}`;
  }
  return raw.length > 22 ? raw.slice(0, 20) + "…" : raw;
}

function maxCols(pl) {
  let mx = 0;
  for (const base of Object.keys(pl)) {
    const n = base.charCodeAt(0) - 65 + 1;
    if (n > mx) mx = n;
  }
  return mx;
}

const cellBase = {
  width: PROB_COL_W, minWidth: PROB_COL_W, maxWidth: PROB_COL_W,
  borderRight: "1px solid #1e2025", borderBottom: "1px solid #1e2025",
  verticalAlign: "middle", overflow: "hidden",
};

function ProbCell({ p, done, mask }) {
  if (!p) return <td style={{ ...cellBase, padding: "7px 8px" }} />;
  const href = p.contestId > 10000
    ? `https://codeforces.com/problemset/gymProblem/${p.contestId}/${p.index}`
    : `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
  const color = done ? "#4ade80" : (!mask && p.rating) ? ratingColor(p.rating) : "#c9d1d9";
  return (
    <td style={{ ...cellBase, padding: "7px 8px", backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent" }}>
      <a href={href} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5">
        <span style={{
          color, fontSize: ".78rem", fontWeight: 500, lineHeight: "1.3",
          display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis"
        }} className="group-hover:underline">
          {p.index}. {p.name}
        </span>
        <span style={{ display: "block", height: "1em" }}>
          {!mask && p.rating && <span style={{ fontSize: ".65rem", fontWeight: 600, color: ratingColor(p.rating) }}>{p.rating}</span>}
          {mask  && p.rating && <span style={{ display: "inline-block", width: "2rem", height: "0.55em", backgroundColor: "#2a2a2a", borderRadius: 3 }} />}
        </span>
      </a>
    </td>
  );
}

function ProbsCell({ probs, isSolved, mask }) {
  if (!probs?.length) return <td style={{ ...cellBase, padding: "7px 8px" }} />;
  if (probs.length === 1) {
    const p = probs[0];
    return <ProbCell p={p} done={isSolved(p.contestId, p.index)} mask={mask} />;
  }
  return (
    <td style={{ ...cellBase, padding: 0, position: "relative" }}>
      <div style={{ display: "flex", position: "absolute", inset: 0, alignItems: "stretch" }}>
        {probs.map((p, i) => {
          const done = isSolved(p.contestId, p.index);
          const href = `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
          const color = done ? "#4ade80" : (!mask && p.rating) ? ratingColor(p.rating) : "#c9d1d9";
          return (
            <div key={p.index} style={{
              flex: "1 1 0", minWidth: 0, overflow: "hidden", padding: "7px 6px",
              borderLeft: i > 0 ? "1px solid #1e2025" : "none",
              backgroundColor: done ? "rgba(34,197,94,0.12)" : "transparent",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <a href={href} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5">
                <span style={{ color, fontSize: ".72rem", fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                  className="group-hover:underline">{p.index}. {p.name}</span>
                {!mask && p.rating && <span style={{ fontSize: ".62rem", fontWeight: 600, color: ratingColor(p.rating) }}>{p.rating}</span>}
              </a>
            </div>
          );
        })}
      </div>
    </td>
  );
}

function ContestRow({ contest, isSolved, mask, rowNo, numCols }) {
  const allProbs = Object.values(contest.problemList).flat();
  const solved = allProbs.filter((p) => isSolved(p.contestId, p.index)).length;
  return (
    <tr>
      {/* No. */}
      <td style={{
        width: NO_COL_W, minWidth: NO_COL_W, maxWidth: NO_COL_W,
        borderRight: "1px solid #1e2025", borderBottom: "1px solid #1e2025",
        backgroundColor: "#0a0b0c", padding: "7px 4px", textAlign: "center",
        fontSize: ".7rem", color: "#444", position: "sticky", left: 0, zIndex: 1,
      }}>{rowNo}</td>

      {/* Contest name cell — name on row 1, meta on row 2 */}
      <td style={{
        width: CONTEST_COL_W, minWidth: CONTEST_COL_W, maxWidth: CONTEST_COL_W,
        borderRight: "1px solid #1e2025", borderBottom: "1px solid #1e2025",
        backgroundColor: "#0a0b0c", padding: "7px 10px", verticalAlign: "top",
        position: "sticky", left: NO_COL_W, zIndex: 1,
      }}>
        <a href={`https://codeforces.com/contest/${contest.id}`} target="_blank" rel="noreferrer" className="group block">
          {/* Row 1: contest name */}
          <span className="block text-[.76rem] font-semibold leading-snug text-[#bbb] group-hover:text-white group-hover:underline transition"
            title={contest.name}>{shortName(contest.name)}</span>
          {/* Row 2: id · date · solved */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[.6rem] text-[#3a3a3a]">#{contest.id}</span>
            {contest.startTimeSeconds > 0 && (
              <span className="text-[.6rem] text-[#3a3a3a]">
                {new Date(contest.startTimeSeconds * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
              </span>
            )}
            {/* {solved > 0 && (
              <span className="text-[.6rem] font-bold text-[#4ade80]">{solved}/{allProbs.length}</span>
            )} */}
          </div>
          {solved > 0 && (
  <div className="mt-1">
    <span className="text-[.65rem] font-bold text-[#4ade80]">{solved}/{allProbs.length} solved</span>
  </div>
)}


        </a>
      </td>

      {/* Problem cells */}
      {ALL_LETTERS.slice(0, numCols).map((col) => (
        <ProbsCell key={col} probs={contest.problemList[col] ?? []} isSolved={isSolved} mask={mask} />
      ))}
    </tr>
  );
}

export default function Contests() {
  const dispatch = useDispatch();
  const { problems, contestNames, isLoading, errorMsg } = useSelector((s) => s.problemset);
  const { isSolved } = useViewerProblems();

  const [maskRating, setMaskRating] = useState(false);
  const [activeTab,  setActiveTab]  = useState(0);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(0);

  useEffect(() => { dispatch(fetchProblems()); }, [dispatch]);

  const [contestMeta, setContestMeta] = useState(new Map());
  useEffect(() => {
    fetch("https://codeforces.com/api/contest.list?gym=false")
      .then((r) => r.json())
      .then((d) => {
        if (d.status !== "OK") return;
        const m = new Map();
        d.result.forEach((c) => m.set(c.id, { name: c.name, startTimeSeconds: c.startTimeSeconds }));
        setContestMeta(m);
      })
      .catch(() => {});
  }, []);

  const allContests = useMemo(() => {
    const map = new Map();

    // Step 1: build raw map from problemset.problems
    problems.forEach((p) => {
      if (p.contestId >= 100000) return;
      if (!map.has(p.contestId)) {
        const meta = contestMeta.get(p.contestId);
        map.set(p.contestId, {
          id: p.contestId,
          name: meta?.name ?? contestNames?.[p.contestId] ?? `Contest ${p.contestId}`,
          startTimeSeconds: meta?.startTimeSeconds ?? 0,
          problemList: {},
        });
      }
      const c = map.get(p.contestId);
      const base = p.index[0];
      if (!c.problemList[base]) c.problemList[base] = [];
      if (!c.problemList[base].some((x) => x.index === p.index)) {
        c.problemList[base].push(p);
        c.problemList[base].sort((a, b) => a.index.localeCompare(b.index));
      }
    });

    // Ensure all contests from contestMeta appear
    contestMeta.forEach((meta, id) => {
      if (id >= 100000) return;
      if (!map.has(id)) {
        map.set(id, { id, name: meta.name, startTimeSeconds: meta.startTimeSeconds, problemList: {} });
      } else {
        const c = map.get(id);
        c.name = meta.name;
        c.startTimeSeconds = meta.startTimeSeconds;
      }
    });

    // Step 2: Div.1 / Div.2 shared-problem mapping.
    //
    // In a paired round, Div.2 has its own A and B (easy problems),
    // then shares C, D, E, … with Div.1's A, B, C, …
    // i.e.  Div.2[C] = Div.1[A], Div.2[D] = Div.1[B], Div.2[E] = Div.1[C], …
    //
    // The CF problemset API only returns problems under their *original* contest ID.
    // Shared problems are stored under the Div.1 contest ID, so Div.2's C/D/E/…
    // are missing from the raw map — we need to fill them in.
    //
    // Strategy:
    //   • Find how many problems Div.2 already has on its own (call it `div2Own`).
    //     These are the A/B (and occasionally A/B/C) problems exclusive to Div.2.
    //   • The Div.1 problems then fill the remaining Div.2 slots starting at
    //     letter index `div2Own` (0-based), mapped from Div.1 letter index 0.
    //   i.e. Div.2 letter (div2Own + k)  ←  Div.1 letter k,  for k = 0, 1, 2, …

    function stripDiv(name) {
      return name
        .replace(/\(div\.?\s*[12][^)]*\)/gi, "")
        .replace(/div\.?\s*[12]/gi, "")
        .replace(/\s+/g, " ").trim().toLowerCase();
    }

    const byNorm = new Map();
    for (const c of map.values()) {
      const key = stripDiv(c.name);
      if (!byNorm.has(key)) byNorm.set(key, []);
      byNorm.get(key).push(c);
    }

    for (const group of byNorm.values()) {
      const div1 = group.find((c) => /div\.?\s*1/i.test(c.name) && !/div\.?\s*2/i.test(c.name));
      const div2 = group.find((c) => /div\.?\s*2/i.test(c.name) && !/div\.?\s*1/i.test(c.name));
      if (!div1 || !div2) continue;
      if (Math.abs(div1.startTimeSeconds - div2.startTimeSeconds) > 3600) continue;

      // How many letter-slots does Div.2 already own?
      // Count consecutive letters starting from A that exist in Div.2 but NOT in Div.1.
      // (Div.1 may have A/B/C; we want only the ones exclusive to Div.2.)
      const div2Letters = Object.keys(div2.problemList).sort();
      const div1Letters = new Set(Object.keys(div1.problemList));

      // div2Own = number of leading letters in Div.2 that don't appear in Div.1 at all.
      // Usually 2 (A and B), sometimes 3.
      let div2Own = 0;
      for (const letter of div2Letters) {
        if (!div1Letters.has(letter)) div2Own++;
        else break; // stop at first shared letter slot
      }
      // Fallback: if everything overlaps (odd edge case), assume offset of 2
      if (div2Own === 0) div2Own = 2;

      // Now map Div.1[A,B,C,...] → Div.2[offset, offset+1, offset+2, ...]
      const div1Sorted = Object.keys(div1.problemList).sort(); // ["A","B","C",...]
      div1Sorted.forEach((div1Letter, k) => {
        const div2LetterCode = 65 + div2Own + k; // char code for target Div.2 slot
        if (div2LetterCode > 74) return; // don't go past J
        const div2Letter = String.fromCharCode(div2LetterCode);

        // Only fill if Div.2 doesn't already have its own problems in this slot
        if (!div2.problemList[div2Letter]) {
          div2.problemList[div2Letter] = div1.problemList[div1Letter].map((p) => ({
            ...p,
            // Keep original Div.1 contestId so CF links work correctly;
            // isSolved uses the handle's submission data which records the actual contestId
            contestId: p.contestId,
          }));
        }
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      b.startTimeSeconds !== a.startTimeSeconds ? b.startTimeSeconds - a.startTimeSeconds : b.id - a.id
    );
  }, [problems, contestNames, contestMeta]);

  const filtered = useMemo(() => {
    const fn = DIV_TABS[activeTab].match;
    const q = search.trim().toLowerCase();
    return allContests.filter((c) => {
      if (!fn(c.name)) return false;
      if (q && !c.name.toLowerCase().includes(q) && !String(c.id).includes(q)) return false;
      return true;
    });
  }, [allContests, activeTab, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageContests = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page],
  );
  useEffect(() => { setPage(0); }, [activeTab, search]);

  // const numCols = useMemo(
  //   () => Math.max(6, ...pageContests.map((c) => maxCols(c.problemList))),
  //   [pageContests],
  // );
  const numCols = 26;

  if (isLoading) return <CenteredLoader />;
  if (errorMsg)  return <ErrorPage text={errorMsg} />;

  const thBase = {
    borderRight: "1px solid #1e2025", borderBottom: "1px solid #1e2025",
    padding: "5px 8px", textAlign: "left", fontSize: ".72rem",
    fontWeight: 700, color: "#555", backgroundColor: "#0d0e10", whiteSpace: "nowrap",
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
          <span className="text-xs text-[#555]">{filtered.length} contests</span>
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
              activeTab === i ? "bg-[#1e3a5c] text-white ring-[#2d5c8a]" : "bg-[#111] text-[#666] ring-[#2e3135] hover:text-[#aaa]"
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
          borderCollapse: "collapse", tableLayout: "fixed",
          minWidth: NO_COL_W + CONTEST_COL_W + numCols * PROB_COL_W
        }}>
          <colgroup>
            <col style={{ width: NO_COL_W }}/>
            <col style={{ width: CONTEST_COL_W }}/>
            {ALL_LETTERS.slice(0, numCols).map((col) => <col key={col} style={{ width: PROB_COL_W }}/>)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...thBase, position: "sticky", left: 0, zIndex: 2, width: NO_COL_W, textAlign: "center" }}>No.</th>
              <th style={{ ...thBase, position: "sticky", left: NO_COL_W, zIndex: 2, width: CONTEST_COL_W }}>Contest</th>
              {ALL_LETTERS.slice(0, numCols).map((col) => <th key={col} style={thBase}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageContests.length === 0
              ? <tr><td colSpan={numCols+2} style={{ padding: "32px", textAlign: "center", color: "#444", fontSize: ".85rem" }}>No contests found</td></tr>
              : pageContests.map((contest, i) => (
                  <ContestRow key={contest.id} contest={contest} isSolved={isSolved}
                    mask={maskRating} rowNo={page * PAGE_SIZE + i + 1} numCols={numCols} />
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}