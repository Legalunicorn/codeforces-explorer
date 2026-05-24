// src/components/FilterModal.jsx
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { ChevronUpIcon, ChevronDownIcon, Cross2Icon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFilters, defaultFilters } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";

const RATING_MIN = 800;
const RATING_MAX = 3500;
const RATING_STEP = 100;

const SOLVE_OPTIONS = [
  { value: "all",      label: "All" },
  { value: "solved",   label: "Solved" },
  { value: "unsolved", label: "Unsolved" },
];

// ── Rating input: text field + ▲▼ buttons ────────────────────────────────────
function RatingInput({ label, value, onChange, clampMin, clampMax }) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => setRaw(String(value)), [value]);

  function commit(str) {
    const num = parseInt(str, 10);
    if (isNaN(num)) { setRaw(String(value)); return; }
    const rounded = Math.round(num / RATING_STEP) * RATING_STEP;
    const clamped = Math.max(clampMin, Math.min(clampMax, rounded));
    setRaw(String(clamped));
    onChange(clamped);
  }

  function step(delta) {
    const next = Math.max(clampMin, Math.min(clampMax, value + delta));
    setRaw(String(next));
    onChange(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Text size="1" color="gray" className="w-6 shrink-0">{label}</Text>
      <div className="flex items-center rounded border border-[#43484e] bg-[#1a1a1a] focus-within:border-indigo-500 transition-colors">
        <input
          className="w-14 bg-transparent px-2 py-1 text-center text-sm text-white outline-none"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => commit(raw)}
          onKeyDown={(e) => {
            if (e.key === "Enter")     commit(raw);
            if (e.key === "ArrowUp")   { e.preventDefault(); step(+RATING_STEP); }
            if (e.key === "ArrowDown") { e.preventDefault(); step(-RATING_STEP); }
          }}
        />
        <div className="flex flex-col border-l border-[#43484e]">
          <button
            onClick={() => step(+RATING_STEP)}
            className="flex items-center justify-center px-1 py-0.5 text-[#888] transition hover:bg-[#2a2a2a] hover:text-white"
            tabIndex={-1}
          >
            <ChevronUpIcon width={12} height={12} />
          </button>
          <button
            onClick={() => step(-RATING_STEP)}
            className="flex items-center justify-center border-t border-[#43484e] px-1 py-0.5 text-[#888] transition hover:bg-[#2a2a2a] hover:text-white"
            tabIndex={-1}
          >
            <ChevronDownIcon width={12} height={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag state semantics (draft.tags):
//   null         → all selected, all green, no filter applied
//   []           → nothing selected, all gray, nothing passes tag filter
//   [...subset]  → only those tags highlighted; filter to problems with ≥1 match
// ─────────────────────────────────────────────────────────────────────────────

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

  function selectAllTags() {
    setDraft((prev) => ({ ...prev, tags: null }));
  }

  function deselectAllTags() {
    setDraft((prev) => ({ ...prev, tags: [] }));
  }

  function toggleTag(tag) {
    setDraft((prev) => {
      if (prev.tags === null) {
        // All selected → deselect just this one tag
        const next = allTags.filter((t) => t !== tag);
        // If somehow everything still selected, stay at null
        return { ...prev, tags: next.length === allTags.length ? null : next };
      }
      const has = prev.tags.includes(tag);
      if (has) {
        return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      } else {
        const next = [...prev.tags, tag];
        // If all tags are now selected, collapse to null
        return { ...prev, tags: next.length === allTags.length ? null : next };
      }
    });
  }

  // tag for display: green if null (all) or explicitly included
  function isTagSelected(tag) {
    return draft.tags === null || draft.tags.includes(tag);
  }

  // active filter badge: tag filter is "active" only when it's a strict subset (not null/all)
  const hasTagFilter = filters.tags !== null;
  const activeFilterCount =
    (filters.minRating !== RATING_MIN || filters.maxRating !== RATING_MAX ? 1 : 0) +
    (hasTagFilter ? 1 : 0) +
    (filters.solveStatus !== "all" ? 1 : 0);

  const draftSelectedCount = draft.tags === null ? allTags.length : draft.tags.length;

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

          {/* ── Solve status (viewer only) ── */}
          {viewerHandle && (
            <div>
              <Text size="2" weight="medium" className="mb-2 block">Solve Status</Text>
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
            <Text size="2" weight="medium" className="mb-2 block">Rating Range</Text>
            <div className="flex items-center gap-3 flex-wrap">
              <RatingInput
                label="Min"
                value={draft.minRating}
                onChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    minRating: v,
                    maxRating: Math.max(prev.maxRating, v),
                  }))
                }
                clampMin={RATING_MIN}
                clampMax={RATING_MAX}
              />
              <Text size="1" color="gray">—</Text>
              <RatingInput
                label="Max"
                value={draft.maxRating}
                onChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    maxRating: v,
                    minRating: Math.min(prev.minRating, v),
                  }))
                }
                clampMin={RATING_MIN}
                clampMax={RATING_MAX}
              />
              <Text size="1" color="gray" className="ml-1 tabular-nums">
                {draft.minRating} – {draft.maxRating}
              </Text>
            </div>
          </div>

          {/* ── Tags ── */}
          <div>
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <Text size="2" weight="medium">Tags</Text>
              <Text size="1" color="gray">
                ({draftSelectedCount} / {allTags.length})
              </Text>
              <button
                onClick={selectAllTags}
                className="rounded border border-[#43484e] px-2 py-0.5 text-xs text-gray-300 transition hover:border-indigo-500 hover:text-white"
              >
                Select All
              </button>
              <button
                onClick={deselectAllTags}
                className="rounded border border-[#43484e] px-2 py-0.5 text-xs text-gray-300 transition hover:border-red-500 hover:text-white"
              >
                Unselect All
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-all duration-100 ${
                    isTagSelected(tag)
                      ? "bg-[#1a5c35] text-white ring-1 ring-[#2d8a52]"
                      : "bg-[#1e1e1e] text-[#555] ring-1 ring-[#333] hover:text-[#aaa]"
                  }`}
                >
                  {tag}
                </button>
              ))}
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