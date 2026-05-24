// src/pages/Problemset.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProblems } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";
import CenteredLoader from "../ui/CenteredLoader";
import ErrorPage from "./ErrorPage";
import Pagination from "../components/Pagination";
import FilterModal from "../components/FilterModal";
import { Code, Link, Table, Button } from "@radix-ui/themes";
import { ratingColor } from "../utils/ratingColor";
import { ArrowDownIcon, ArrowUpIcon, EyeNoneIcon, EyeOpenIcon } from "@radix-ui/react-icons";

export default function Problemset() {
  const dispatch = useDispatch();
  const { problems, isLoading, errorMsg, filters } = useSelector((store) => store.problemset);
  const { isSolved } = useViewerProblems();
  const [maskRating, setMaskRating] = useState(false);

  useEffect(() => { dispatch(fetchProblems()); }, [dispatch]);

  // ── Filtering ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return problems.filter((p) => {
      if (p.rating !== undefined) {
        if (p.rating < filters.minRating || p.rating > filters.maxRating) return false;
      }
      // tags: [] = no filter; [...] = must match at least one
      if (filters.tags.length > 0) {
        if (!p.tags.some((t) => filters.tags.includes(t))) return false;
      }
      if (filters.solveStatus === "solved"   && !isSolved(p.contestId, p.index)) return false;
      if (filters.solveStatus === "unsolved" &&  isSolved(p.contestId, p.index)) return false;
      return true;
    });
  }, [problems, filters, isSolved]);

  // ── Sorting ────────────────────────────────────────────
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  function handleSort(field) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortField, sortDir]);

  // ── Pagination ─────────────────────────────────────────
  const [pageSize, setPageSize] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [page, setPage] = useState([]);

  useEffect(() => { setPageNo(0); }, [filters]);
  useEffect(() => {
    setPage(sorted.slice(pageNo * pageSize, pageNo * pageSize + pageSize));
  }, [sorted, pageNo, pageSize]);

  if (isLoading) return <CenteredLoader />;
  if (errorMsg)  return <ErrorPage text={errorMsg} />;

  function SortIcon({ field }) {
    if (sortField !== field) return <span className="ml-1 text-[#444]">↕</span>;
    return sortDir === "asc" ? <ArrowUpIcon className="ml-1 inline" /> : <ArrowDownIcon className="ml-1 inline" />;
  }

  return (
    <div className="mt-6 sm:mx-4 lg:mx-14">
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterModal filteredCount={filtered.length} totalCount={problems.length} />
          <Button
            size="1"
            variant={maskRating ? "solid" : "soft"}
            color={maskRating ? "amber" : "gray"}
            onClick={() => setMaskRating((v) => !v)}
          >
            {maskRating ? <EyeNoneIcon width={13} height={13} /> : <EyeOpenIcon width={13} height={13} />}
            {maskRating ? "Ratings hidden" : "Hide ratings"}
          </Button>
          <span className="text-xs text-[#666]">{filtered.length.toLocaleString()} problems</span>
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

      <Table.Root size="1">
        <Table.Header>
          <Table.Row style={{ color: "#cccccc" }}>
            <Table.ColumnHeaderCell>No.</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell title="Already solved by you">✓</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Problem</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="cursor-pointer select-none" onClick={() => handleSort("rating")}>
              Rating <SortIcon field="rating" />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="cursor-pointer select-none" onClick={() => handleSort("solvedCount")}>
              Solved <SortIcon field="solvedCount" />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Tags</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {page.map((p, index) => {
            const done = isSolved(p.contestId, p.index);
            const href = p.contestId > 10000
              ? `https://codeforces.com/problemset/gymProblem/${p.contestId}/${p.index}`
              : `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;

            return (
              <Table.Row
                key={`${p.contestId}-${p.index}`}
                style={{
                  color: "#888888",
                  opacity: done ? 0.55 : 1,
                  backgroundColor: done ? "rgba(34, 197, 94, 0.07)" : "transparent",
                  transition: "opacity 0.15s ease, background-color 0.15s ease",
                }}
              >
                <Table.Cell width="1px">{pageNo * pageSize + index + 1}</Table.Cell>
                <Table.Cell width="1px">
                  {done && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>✓</span>}
                </Table.Cell>
                <Table.RowHeaderCell className="text-nowrap">
                  <Link href={href} target="_blank" className="text-nowrap">{p.name}</Link>
                </Table.RowHeaderCell>
                <Table.Cell className="text-nowrap">
                  <Link href={href} target="_blank" style={{ color: "#888888" }}>
                    {p.contestId}{p.index}
                  </Link>
                </Table.Cell>
                <Table.Cell style={{ color: maskRating ? "transparent" : ratingColor(p.rating ?? 0) }}>
                  {maskRating ? (
                    <span style={{
                      display: "inline-block", width: "2.5rem", height: "0.85em",
                      backgroundColor: "#333", borderRadius: "3px", verticalAlign: "middle",
                    }} />
                  ) : (p.rating ?? "—")}
                </Table.Cell>
                <Table.Cell>{p.solvedCount.toLocaleString()}</Table.Cell>
                <Table.Cell>
                  {p.tags.map((tag, ix) => (
                    <Code key={tag + ix} color="gray" variant="ghost"
                      className="mx-1 text-nowrap border-[0.3px] border-[#363a3f]"
                      style={{ padding: "1px 4px" }}>
                      {tag}
                    </Code>
                  ))}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
}