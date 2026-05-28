// src/pages/Problemset.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProblems } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";
import CenteredLoader from "../ui/CenteredLoader";
import ErrorPage from "./ErrorPage";
import Pagination from "../components/Pagination";
import FilterModal from "../components/FilterModal";
import { Code, Link, Table, Button, DropdownMenu } from "@radix-ui/themes";
import { ratingColor } from "../utils/ratingColor";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChartIcon,
  EyeNoneIcon,
  EyeOpenIcon,
} from "@radix-ui/react-icons";

// Fixed-width censored pill — keeps column width identical whether tags shown or hidden
function CensoredTag() {
  return (
    <span
      style={{
        display:         "inline-block",
        width:           "4rem",
        height:          "1.1em",
        backgroundColor: "#2a2a2a",
        borderRadius:    "3px",
        border:          "0.3px solid #363a3f",
        margin:          "0 2px",
        verticalAlign:   "middle",
      }}
    />
  );
}

// Column widths — fixed so nothing ever shifts
const COL = {
  no:      36,
  check:   32,
  problem: 340,
  id:      90,
  rating:  80,
  solved:  80,
  tags:    420, // always present; content masked or revealed
};

export default function Problemset() {
  const dispatch = useDispatch();
  const { problems, isLoading, errorMsg, filters } = useSelector(
    (store) => store.problemset,
  );
  const { isSolved } = useViewerProblems();
  const [maskRating, setMaskRating] = useState(false);
  const [maskTags,   setMaskTags]   = useState(true);

  useEffect(() => {
    dispatch(fetchProblems());
  }, [dispatch]);

  const [sortField, setSortField] = useState(null);
  const [sortDir,   setSortDir]   = useState("default");
  const [orderDir,  setOrderDir]  = useState("asc");

  function setSort(field, dir) {
    setSortField(field);
    setSortDir(dir);
  }

  function setOrder(dir) {
    setOrderDir(dir);
    setSortField(null);
    setSortDir("default");
  }

  const filtered = useMemo(() => {
    return problems.filter((p) => {
      if (filters.hideUnrated && !p.rating) return false;
      if (p.rating) {
        if (p.rating < filters.minRating || p.rating > filters.maxRating) return false;
      }
      if (filters.tags !== null) {
        if (!p.tags.some((t) => filters.tags.includes(t))) return false;
      }
      if (filters.solveStatus === "solved"   && !isSolved(p.contestId, p.index)) return false;
      if (filters.solveStatus === "unsolved" &&  isSolved(p.contestId, p.index)) return false;
      return true;
    });
  }, [problems, filters, isSolved]);

  const sorted = useMemo(() => {
    let list = [...filtered];
    if (sortField && sortDir !== "default") {
      list.sort((a, b) => {
        const av = a[sortField] ?? 0;
        const bv = b[sortField] ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      });
    } else {
      if (orderDir === "desc") list.reverse();
    }
    return list;
  }, [filtered, sortField, sortDir, orderDir]);

  const [pageSize, setPageSize] = useState(100);
  const [pageNo,   setPageNo]   = useState(0);
  const [page,     setPage]     = useState([]);

  useEffect(() => { setPageNo(0); }, [filters]);
  useEffect(() => {
    setPage(sorted.slice(pageNo * pageSize, pageNo * pageSize + pageSize));
  }, [sorted, pageNo, pageSize]);

  if (isLoading) return <CenteredLoader />;
  if (errorMsg)  return <ErrorPage text={errorMsg} />;

  function SortIcon({ field }) {
    if (sortField !== field || sortDir === "default")
      return <span className="ml-1 text-[#444]">↕</span>;
    return sortDir === "asc"
      ? <ArrowUpIcon className="ml-1 inline" />
      : <ArrowDownIcon className="ml-1 inline" />;
  }

  function SortDropdownContent({ field }) {
    return (
      <DropdownMenu.Content size="1">
        <DropdownMenu.Item shortcut={<BarChartIcon />} onClick={() => setSort(field, "default")}>Default</DropdownMenu.Item>
        <DropdownMenu.Item shortcut={<ArrowDownIcon />} onClick={() => setSort(field, "asc")}>Ascending</DropdownMenu.Item>
        <DropdownMenu.Item shortcut={<ArrowUpIcon />}  onClick={() => setSort(field, "desc")}>Descending</DropdownMenu.Item>
      </DropdownMenu.Content>
    );
  }

  return (
    <div className="mt-6 sm:mx-4 lg:mx-14">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <FilterModal filteredCount={filtered.length} totalCount={problems.length} />

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

          <span className="text-xs text-[#666]">
            {filtered.length.toLocaleString()} problems
          </span>
        </div>
        <Pagination
          arraySize={sorted.length}
          pageSize={pageSize}
          setPageSize={setPageSize}
          pageNo={pageNo}
          setPageNo={setPageNo}
          page={page}
          setPage={setPage}
          position="relative"
        />
      </div>

      {/*
        overflow-x-auto so the table can scroll horizontally on narrow screens
        without collapsing columns. tableLayout:fixed + colgroup locks every
        column width, so toggling tags never nudges Rating / Solved.
      */}
      <div className="overflow-x-auto">
        <table
          style={{
            borderCollapse: "collapse",
            tableLayout:    "fixed",
            width:          "100%",
            minWidth:       Object.values(COL).reduce((a, b) => a + b, 0),
          }}
        >
          <colgroup>
            <col style={{ width: COL.no }} />
            <col style={{ width: COL.check }} />
            <col style={{ width: COL.problem }} />
            <col style={{ width: COL.id }} />
            <col style={{ width: COL.rating }} />
            <col style={{ width: COL.solved }} />
            <col style={{ width: COL.tags }} />
          </colgroup>

          {/* ── Header ── */}
          <thead>
            <tr style={{ color: "#cccccc", borderBottom: "1px solid #363a3f" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: ".8rem" }}>No.</th>
              <th style={{ padding: "6px 4px", textAlign: "left", fontWeight: 600, fontSize: ".8rem" }} title="Already solved by you">✓</th>
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: ".8rem" }}>Problem</th>

              {/* ID */}
              <th style={{ padding: "6px 4px", textAlign: "left" }}>
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger>
                    <Button size="1" variant="soft" color="gray">ID <DropdownMenu.TriggerIcon /></Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content size="1">
                    <DropdownMenu.Item shortcut={<BarChartIcon />} onClick={() => setOrder("asc")}>Default</DropdownMenu.Item>
                    <DropdownMenu.Item shortcut={<ArrowDownIcon />} onClick={() => setOrder("asc")}>Ascending</DropdownMenu.Item>
                    <DropdownMenu.Item shortcut={<ArrowUpIcon />}  onClick={() => setOrder("desc")}>Descending</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </th>

              {/* Rating */}
              <th style={{ padding: "6px 4px", textAlign: "left" }}>
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger>
                    <Button size="1" variant="soft" color="gray">
                      Rating
                      {sortField === "rating" && sortDir !== "default" && <SortIcon field="rating" />}
                      <DropdownMenu.TriggerIcon />
                    </Button>
                  </DropdownMenu.Trigger>
                  <SortDropdownContent field="rating" />
                </DropdownMenu.Root>
              </th>

              {/* Solved */}
              <th style={{ padding: "6px 4px", textAlign: "left" }}>
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger>
                    <Button size="1" variant="soft" color="gray">
                      Solved
                      {sortField === "solvedCount" && sortDir !== "default" && <SortIcon field="solvedCount" />}
                      <DropdownMenu.TriggerIcon />
                    </Button>
                  </DropdownMenu.Trigger>
                  <SortDropdownContent field="solvedCount" />
                </DropdownMenu.Root>
              </th>

              {/* Tags — always present */}
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: ".8rem", color: maskTags ? "#444" : "#cccccc" }}>
                Tags
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {page.map((p, index) => {
              const done = isSolved(p.contestId, p.index);
              const href =
                p.contestId > 10000
                  ? `https://codeforces.com/problemset/gymProblem/${p.contestId}/${p.index}`
                  : `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;

              const rowStyle = {
                color:           "#888888",
                opacity:         done ? 0.55 : 1,
                backgroundColor: done ? "rgba(34, 197, 94, 0.07)" : "transparent",
                transition:      "opacity 0.15s ease, background-color 0.15s ease",
                borderBottom:    "1px solid #1e2025",
              };

              const cellStyle = { padding: "5px 8px", verticalAlign: "middle", overflow: "hidden" };

              return (
                <tr key={`${p.contestId}-${p.index}`} style={rowStyle}>
                  <td style={{ ...cellStyle, fontSize: ".8rem" }}>{pageNo * pageSize + index + 1}</td>
                  <td style={{ ...cellStyle, padding: "5px 4px" }}>
                    {done && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </td>
                  <td style={{ ...cellStyle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <Link href={href} target="_blank" style={{ whiteSpace: "nowrap" }}>{p.name}</Link>
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                    <Link href={href} target="_blank" style={{ color: "#888888" }}>
                      {p.contestId}{p.index}
                    </Link>
                  </td>
                  <td style={{ ...cellStyle, color: maskRating ? "transparent" : ratingColor(p.rating ?? 0) }}>
                    {maskRating ? (
                      <span style={{
                        display: "inline-block", width: "2.5rem", height: "0.85em",
                        backgroundColor: "#333", borderRadius: "3px", verticalAlign: "middle",
                      }} />
                    ) : (p.rating ?? "—")}
                  </td>
                  <td style={cellStyle}>{p.solvedCount.toLocaleString()}</td>

                  {/* Tags — always in DOM, content swapped */}
                  <td style={{ ...cellStyle, whiteSpace: "nowrap", overflow: "hidden" }}>
                    {maskTags
                      ? p.tags.map((tag, ix) => <CensoredTag key={tag + ix} />)
                      : p.tags.map((tag, ix) => (
                          <Code
                            key={tag + ix}
                            color="gray"
                            variant="ghost"
                            className="mx-1 border-[0.3px] border-[#363a3f]"
                            style={{ padding: "1px 4px", whiteSpace: "nowrap" }}
                          >
                            {tag}
                          </Code>
                        ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}