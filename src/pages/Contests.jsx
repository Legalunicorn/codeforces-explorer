import { useEffect, useMemo, useState } from "react";
import {
  EyeNoneIcon,
  EyeOpenIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { useDispatch, useSelector } from "react-redux";
import ContestTable from "../components/Contests/ContestTable";
import { fetchProblems } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";
import CenteredLoader from "../ui/CenteredLoader";
import { buildContests, DIV_TABS, PAGE_SIZE } from "../utils/contests";
import ErrorPage from "./ErrorPage";

function ContestControls({
  maskRatings,
  onMaskRatingsChange,
  contestCount,
  search,
  onSearchChange,
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="1"
          variant={maskRatings ? "solid" : "soft"}
          color={maskRatings ? "amber" : "gray"}
          onClick={onMaskRatingsChange}
        >
          {maskRatings ? (
            <EyeNoneIcon width={13} height={13} />
          ) : (
            <EyeOpenIcon width={13} height={13} />
          )}
          {maskRatings ? "Ratings hidden" : "Hide ratings"}
        </Button>
        <span className="text-xs text-[#555]">{contestCount} contests</span>
      </div>
      <div className="flex items-center gap-1 rounded border border-[#2e3135] bg-[#111] px-2 py-1">
        <MagnifyingGlassIcon width={13} height={13} className="text-[#555]" />
        <input
          className="w-48 bg-transparent text-xs text-white outline-none placeholder:text-[#444]"
          placeholder="Search contest name or ID…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function ContestTabs({ activeTab, onTabChange }) {
  return (
    <div className="mb-3 flex flex-wrap gap-1">
      {DIV_TABS.map((tab, index) => (
        <button
          key={tab.label}
          onClick={() => onTabChange(index)}
          className={`rounded px-3 py-1 text-xs font-semibold ring-1 transition-all duration-100 ${activeTab === index ? "bg-[#1e3a5c] text-white ring-[#2d5c8a]" : "bg-[#111] text-[#666] ring-[#2e3135] hover:text-[#aaa]"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        onClick={() =>
          onPageChange((currentPage) => Math.max(0, currentPage - 1))
        }
        disabled={page === 0}
        className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] transition hover:border-[#555] hover:text-white disabled:opacity-30"
      >
        ← Prev
      </button>
      <span className="text-xs text-[#555]">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() =>
          onPageChange((currentPage) =>
            Math.min(totalPages - 1, currentPage + 1),
          )
        }
        disabled={page === totalPages - 1}
        className="rounded border border-[#2e3135] px-3 py-1 text-xs text-[#888] transition hover:border-[#555] hover:text-white disabled:opacity-30"
      >
        Next →
      </button>
    </div>
  );
}

export default function Contests() {
  const dispatch = useDispatch();
  const { problems, contestNames, isLoading, errorMsg } = useSelector(
    (state) => state.problemset,
  );
  const { isSolved } = useViewerProblems();
  const [maskRatings, setMaskRatings] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [contestMetadata, setContestMetadata] = useState(new Map());

  useEffect(() => {
    dispatch(fetchProblems());
  }, [dispatch]);

  useEffect(() => {
    fetch("https://codeforces.com/api/contest.list?gym=false")
      .then((response) => response.json())
      .then((data) => {
        if (data.status !== "OK") return;
        const metadata = new Map();
        data.result.forEach((contest) =>
          metadata.set(contest.id, {
            name: contest.name,
            startTimeSeconds: contest.startTimeSeconds,
          }),
        );
        setContestMetadata(metadata);
      })
      .catch(() => {});
  }, []);

  const contests = useMemo(
    () => buildContests(problems, contestNames, contestMetadata),
    [problems, contestNames, contestMetadata],
  );
  const filteredContests = useMemo(() => {
    const matchesTab = DIV_TABS[activeTab].match;
    const query = search.trim().toLowerCase();
    return contests.filter(
      (contest) =>
        matchesTab(contest.name) &&
        (!query ||
          contest.name.toLowerCase().includes(query) ||
          String(contest.id).includes(query)),
    );
  }, [contests, activeTab, search]);

  const totalPages = Math.ceil(filteredContests.length / PAGE_SIZE);
  const pageContests = useMemo(
    () =>
      filteredContests.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredContests, page],
  );

  useEffect(() => {
    setPage(0);
  }, [activeTab, search]);

  if (isLoading) return <CenteredLoader />;
  if (errorMsg) return <ErrorPage text={errorMsg} />;

  return (
    <div className="mt-4 sm:mx-4 lg:mx-14">
      <ContestControls
        maskRatings={maskRatings}
        onMaskRatingsChange={() => setMaskRatings((value) => !value)}
        contestCount={filteredContests.length}
        search={search}
        onSearchChange={setSearch}
      />
      <ContestTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <ContestTable
        contests={pageContests}
        isSolved={isSolved}
        maskRatings={maskRatings}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
