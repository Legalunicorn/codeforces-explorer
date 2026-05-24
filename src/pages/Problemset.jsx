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

export default function Problemset() {
  const dispatch = useDispatch();
  const { problems, isLoading, errorMsg, filters } = useSelector(
    (store) => store.problemset,
  );
  const { isSolved } = useViewerProblems();
  const [maskRating, setMaskRating] = useState(false);

  useEffect(() => {
    dispatch(fetchProblems());
  }, [dispatch]);

  // ── Sorting ────────────────────────────────────────────
  // field: null = natural order, "rating", "solvedCount"
  // dir: "default" | "asc" | "desc"
  // For "No." column we expose "asc" (1→N, natural) and "desc" (N→1, reverse)
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("default");
  const [orderDir, setOrderDir] = useState("asc"); // "No." column direction

  function setSort(field, dir) {
    setSortField(field);
    setSortDir(dir);
  }

  function setOrder(dir) {
    setOrderDir(dir);
    // clear any column sort so natural order takes effect
    setSortField(null);
    setSortDir("default");
  }

  // ── Filtering ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return problems.filter((p) => {
      if (filters.hideUnrated && !p.rating) return false;
      if (p.rating !== undefined && p.rating) {
        if (p.rating < filters.minRating || p.rating > filters.maxRating)
          return false;
      }
      if (filters.tags !== null) {
        if (!p.tags.some((t) => filters.tags.includes(t))) return false;
      }
      if (filters.solveStatus === "solved" && !isSolved(p.contestId, p.index))
        return false;
      if (
        filters.solveStatus === "unsolved" &&
        isSolved(p.contestId, p.index)
      )
        return false;
      return true;
    });
  }, [problems, filters, isSolved]);

  // ── Sorted list ────────────────────────────────────────
  const sorted = useMemo(() => {
    let list = [...filtered];

    if (sortField && sortDir !== "default") {
      list.sort((a, b) => {
        const av = a[sortField] ?? 0;
        const bv = b[sortField] ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      });
    } else {
      // natural order (already stored correctly in slice), respect orderDir
      if (orderDir === "desc") list.reverse();
    }

    return list;
  }, [filtered, sortField, sortDir, orderDir]);

  // ── Pagination ─────────────────────────────────────────
  const [pageSize, setPageSize] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [page, setPage] = useState([]);

  useEffect(() => {
    setPageNo(0);
  }, [filters]);
  useEffect(() => {
    setPage(sorted.slice(pageNo * pageSize, pageNo * pageSize + pageSize));
  }, [sorted, pageNo, pageSize]);

  if (isLoading) return <CenteredLoader />;
  if (errorMsg) return <ErrorPage text={errorMsg} />;

  // ── Sort indicator icon (for header cells) ─────────────
  function SortIcon({ field }) {
    if (sortField !== field || sortDir === "default")
      return <span className="ml-1 text-[#444]">↕</span>;
    return sortDir === "asc" ? (
      <ArrowUpIcon className="ml-1 inline" />
    ) : (
      <ArrowDownIcon className="ml-1 inline" />
    );
  }

  // ── Shared dropdown content for column sorts ───────────
  function SortDropdownContent({ field }) {
    return (
      <DropdownMenu.Content size="1">
        <DropdownMenu.Item
          shortcut={<BarChartIcon />}
          onClick={() => setSort(field, "default")}
        >
          Default
        </DropdownMenu.Item>
        <DropdownMenu.Item
          shortcut={<ArrowDownIcon />}
          onClick={() => setSort(field, "asc")}
        >
          Ascending
        </DropdownMenu.Item>
        <DropdownMenu.Item
          shortcut={<ArrowUpIcon />}
          onClick={() => setSort(field, "desc")}
        >
          Descending
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    );
  }

  return (
    <div className="mt-6 sm:mx-4 lg:mx-14">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <FilterModal
            filteredCount={filtered.length}
            totalCount={problems.length}
          />
          <Button
            size="1"
            variant={maskRating ? "solid" : "soft"}
            color={maskRating ? "amber" : "gray"}
            onClick={() => setMaskRating((v) => !v)}
          >
            {maskRating ? (
              <EyeNoneIcon width={13} height={13} />
            ) : (
              <EyeOpenIcon width={13} height={13} />
            )}
            {maskRating ? "Ratings hidden" : "Hide ratings"}
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

      <Table.Root size="1">
        <Table.Header>
          <Table.Row style={{ color: "#cccccc" }}>
            <Table.ColumnHeaderCell>No.</Table.ColumnHeaderCell>

            <Table.ColumnHeaderCell title="Already solved by you">
              ✓
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Problem</Table.ColumnHeaderCell>

            {/* ── ID column with order dropdown ── */}
            <Table.ColumnHeaderCell>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger>
                  <Button size="1" variant="soft" color="gray">
                    ID <DropdownMenu.TriggerIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content size="1">
                  <DropdownMenu.Item shortcut={<BarChartIcon />} onClick={() => setOrder("asc")}>Default</DropdownMenu.Item>
                  <DropdownMenu.Item shortcut={<ArrowDownIcon />} onClick={() => setOrder("asc")}>Ascending</DropdownMenu.Item>
                  <DropdownMenu.Item shortcut={<ArrowUpIcon />} onClick={() => setOrder("desc")}>Descending</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Table.ColumnHeaderCell>

            {/* ── Rating column ── */}
            <Table.ColumnHeaderCell>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger>
                  <Button size="1" variant="soft" color="gray">
                    Rating
                    {sortField === "rating" && sortDir !== "default" && (
                      <SortIcon field="rating" />
                    )}
                    <DropdownMenu.TriggerIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <SortDropdownContent field="rating" />
              </DropdownMenu.Root>
            </Table.ColumnHeaderCell>

            {/* ── Solved count column ── */}
            <Table.ColumnHeaderCell>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger>
                  <Button size="1" variant="soft" color="gray">
                    Solved
                    {sortField === "solvedCount" && sortDir !== "default" && (
                      <SortIcon field="solvedCount" />
                    )}
                    <DropdownMenu.TriggerIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <SortDropdownContent field="solvedCount" />
              </DropdownMenu.Root>
            </Table.ColumnHeaderCell>

            <Table.ColumnHeaderCell>Tags</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {page.map((p, index) => {
            const done = isSolved(p.contestId, p.index);
            const href =
              p.contestId > 10000
                ? `https://codeforces.com/problemset/gymProblem/${p.contestId}/${p.index}`
                : `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;

            return (
              <Table.Row
                key={`${p.contestId}-${p.index}`}
                style={{
                  color: "#888888",
                  opacity: done ? 0.55 : 1,
                  backgroundColor: done
                    ? "rgba(34, 197, 94, 0.07)"
                    : "transparent",
                  transition:
                    "opacity 0.15s ease, background-color 0.15s ease",
                }}
              >
                <Table.Cell width="1px">
                  {pageNo * pageSize + index + 1}
                </Table.Cell>
                <Table.Cell width="1px">
                  {done && (
                    <span
                      style={{
                        color: "#22c55e",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </Table.Cell>
                <Table.RowHeaderCell className="text-nowrap">
                  <Link href={href} target="_blank" className="text-nowrap">
                    {p.name}
                  </Link>
                </Table.RowHeaderCell>
                <Table.Cell className="text-nowrap">
                  <Link
                    href={href}
                    target="_blank"
                    style={{ color: "#888888" }}
                  >
                    {p.contestId}
                    {p.index}
                  </Link>
                </Table.Cell>
                <Table.Cell
                  style={{
                    color: maskRating
                      ? "transparent"
                      : ratingColor(p.rating ?? 0),
                  }}
                >
                  {maskRating ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: "2.5rem",
                        height: "0.85em",
                        backgroundColor: "#333",
                        borderRadius: "3px",
                        verticalAlign: "middle",
                      }}
                    />
                  ) : (
                    (p.rating ?? "—")
                  )}
                </Table.Cell>
                <Table.Cell>{p.solvedCount.toLocaleString()}</Table.Cell>
                <Table.Cell>
                  {p.tags.map((tag, ix) => (
                    <Code
                      key={tag + ix}
                      color="gray"
                      variant="ghost"
                      className="mx-1 text-nowrap border-[0.3px] border-[#363a3f]"
                      style={{ padding: "1px 4px" }}
                    >
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