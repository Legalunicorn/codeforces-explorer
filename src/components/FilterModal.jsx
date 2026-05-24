// src/components/FilterModal.jsx
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { Cross2Icon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFilters, defaultFilters } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";

const RATING_MIN = 800;
const RATING_MAX = 3500;
const RATING_STEP = 100;

const ratingOptions = [];
for (let r = RATING_MIN; r <= RATING_MAX; r += RATING_STEP) ratingOptions.push(r);

const SOLVE_OPTIONS = [
  { value: "all",      label: "All" },
  { value: "solved",   label: "Solved" },
  { value: "unsolved", label: "Unsolved" },
];

export default function FilterModal({ filteredCount, totalCount }) {
  const dispatch = useDispatch();
  const { filters, allTags } = useSelector((store) => store.problemset);
  const { viewerHandle } = useViewerProblems();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  function handleOpen() {
    setDraft(filters);
    setOpen(true);
  }

  function applyFilters() {
    dispatch(setFilters(draft));
    setOpen(false);
  }

  function handleReset() {
    setDraft(defaultFilters);
  }

  function toggleTag(tag) {
    setDraft((prev) => {
      // If empty = "all selected", expand to full set first, then remove the clicked one
      const current = prev.tags.length === 0 ? [...allTags] : prev.tags;
      const has = current.includes(tag);
      const next = has ? current.filter((t) => t !== tag) : [...current, tag];
      // If everything is selected, collapse back to empty (= "all")
      return { ...prev, tags: next.length === allTags.length ? [] : next };
    });
  }

  function selectAllTags() {
    setDraft((prev) => ({ ...prev, tags: [] })); // empty = all
  }

  function deselectAllTags() {
    setDraft((prev) => ({ ...prev, tags: [...allTags] }));
  }

  const activeFilterCount =
    (filters.minRating !== 800 || filters.maxRating !== 3500 ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0) +
    (filters.solveStatus !== "all" ? 1 : 0);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button
          size="1"
          variant={activeFilterCount > 0 ? "solid" : "soft"}
          color={activeFilterCount > 0 ? "indigo" : "gray"}
          onClick={handleOpen}
        >
          <MixerHorizontalIcon />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between">
          <Dialog.Title mb="0">Filter Problems</Dialog.Title>
          <Button size="1" variant="ghost" color="gray" onClick={() => setOpen(false)}>
            <Cross2Icon />
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-5">

          {/* ── Solve status — only shown when viewer handle is set ── */}
          {viewerHandle && (
            <div>
              <Text size="2" weight="medium" className="mb-2 block">
                Solve Status
              </Text>
              <div className="flex gap-2">
                {SOLVE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDraft((prev) => ({ ...prev, solveStatus: value }))}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition-all duration-100 ring-1 ${
                      draft.solveStatus === value
                        ? value === "solved"
                          ? "bg-[#1a5c35] text-white ring-[#2d8a52]"
                          : value === "unsolved"
                          ? "bg-[#5c1a1a] text-white ring-[#8a2d2d]"
                          : "bg-[#1e3a5c] text-white ring-[#2d5c8a]"
                        : "bg-[#1e1e1e] text-[#777] ring-[#333] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Rating range ── */}
          <div>
            <Text size="2" weight="medium" className="mb-2 block">
              Rating Range
            </Text>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Text size="1" color="gray">Min</Text>
                <select
                  className="rounded border border-[#43484e] bg-[#1a1a1a] px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
                  value={draft.minRating}
                  onChange={(e) => setDraft((prev) => ({ ...prev, minRating: Number(e.target.value) }))}
                >
                  {ratingOptions.map((r) => (
                    <option key={r} value={r} disabled={r > draft.maxRating}>{r}</option>
                  ))}
                </select>
              </div>
              <Text size="1" color="gray">—</Text>
              <div className="flex items-center gap-2">
                <Text size="1" color="gray">Max</Text>
                <select
                  className="rounded border border-[#43484e] bg-[#1a1a1a] px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
                  value={draft.maxRating}
                  onChange={(e) => setDraft((prev) => ({ ...prev, maxRating: Number(e.target.value) }))}
                >
                  {ratingOptions.map((r) => (
                    <option key={r} value={r} disabled={r < draft.minRating}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Tags ── */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Text size="2" weight="medium">Tags</Text>
              <Text size="1" color="gray">
                {draft.tags.length === 0 ? "(all shown)" : `(${draft.tags.length} selected)`}
              </Text>
              <button
                onClick={selectAllTags}
                className="rounded border border-[#43484e] px-2 py-0.5 text-xs text-gray-300 transition hover:border-indigo-500 hover:text-white"
              >
                Select All
              </button>
              <button
                onClick={deselectAllTags}
                className="rounded border border-[#43484e] px-2 py-0.5 text-xs text-gray-300 transition hover:border-indigo-500 hover:text-white"
              >
                Unselect All
              </button>
            </div>
            <Text size="1" color="gray" className="mb-2 block">
              Selected tags are required — problems must match at least one. No selection = show all.
            </Text>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                // empty tags array = all selected; otherwise check membership
                const selected = draft.tags.length === 0 || draft.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-all duration-100 ${
                      selected
                        ? "bg-[#1a5c35] text-white ring-1 ring-[#2d8a52]"
                        : "bg-[#1e1e1e] text-[#555] ring-1 ring-[#333]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <Flex gap="3" mt="5" justify="between" align="center">
          <Text size="1" color="gray">
            {filteredCount.toLocaleString()} / {totalCount.toLocaleString()} problems
          </Text>
          <Flex gap="2">
            <Button size="2" variant="soft" color="gray" onClick={handleReset}>Reset</Button>
            <Button size="2" variant="solid" color="indigo" onClick={applyFilters}>Apply</Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}