// src/components/TabSubmissions.jsx
import { Box, Tabs, Text, Button } from "@radix-ui/themes";
import TableSubmissions from "./TableSubmissions";
import { useSelector } from "react-redux";
import Profile from "./Profile/Profile";
import { useViewerProblems } from "../hooks/useViewerProblems";
import { useMemo, useState, useEffect } from "react";
import { EyeNoneIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import FilterModal from "./FilterModal";
import { useDispatch } from "react-redux";
import { fetchProblems } from "../context/problemset/problemsetSlice";

export default function TabSubmissions() {
  const dispatch = useDispatch();
  const { problemsSolved, correctSubmissions, skippedSubmissions } =
    useSelector((store) => store.user);
  const { filters } = useSelector((store) => store.problemset);
  const { isSolved } = useViewerProblems();
  const [maskRating, setMaskRating] = useState(false);

  useEffect(() => { dispatch(fetchProblems()); }, [dispatch]);

  function applyFilters(data) {
    return data.filter((it) => {
      if (it.rating) {
        if (it.rating < filters.minRating || it.rating > filters.maxRating) return false;
      }
      // tags: [] = no filter; [...] = must match at least one
      if (filters.tags !== null) {
        if (!it.tags.some((t) => filters.tags.includes(t))) return false;
      }
      if (filters.solveStatus === "solved"   && !isSolved(it.contestId, it.index)) return false;
      if (filters.solveStatus === "unsolved" &&  isSolved(it.contestId, it.index)) return false;
      return true;
    });
  }

  const filteredSolved   = useMemo(() => applyFilters(problemsSolved),    [problemsSolved,    filters, isSolved]);
  const filteredCorrect  = useMemo(() => applyFilters(correctSubmissions), [correctSubmissions, filters, isSolved]);
  const filteredSkipped  = useMemo(() => applyFilters(skippedSubmissions), [skippedSubmissions, filters, isSolved]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <FilterModal filteredCount={filteredSolved.length} totalCount={problemsSolved.length} />
        <Button
          size="1"
          variant={maskRating ? "solid" : "soft"}
          color={maskRating ? "amber" : "gray"}
          onClick={() => setMaskRating((v) => !v)}
        >
          {maskRating ? <EyeNoneIcon width={13} height={13} /> : <EyeOpenIcon width={13} height={13} />}
          {maskRating ? "Ratings hidden" : "Hide ratings"}
        </Button>
      </div>

      <Tabs.Root defaultValue="psolved">
        <Tabs.List>
          <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
          <Tabs.Trigger value="psolved">Problems Solved</Tabs.Trigger>
          <Tabs.Trigger value="correct">Correct Submissions</Tabs.Trigger>
          <Tabs.Trigger value="skipped">Skipped Submissions</Tabs.Trigger>
        </Tabs.List>

        <Box pt="3">
          <Tabs.Content value="profile"><Profile /></Tabs.Content>
          <Tabs.Content value="psolved">
            <TableSubmissions data={filteredSolved}   isSolved={isSolved} maskRating={maskRating} />
          </Tabs.Content>
          <Tabs.Content value="correct">
            <TableSubmissions data={filteredCorrect}  isSolved={isSolved} maskRating={maskRating} />
          </Tabs.Content>
          <Tabs.Content value="skipped">
            <Text size="2">
              <TableSubmissions data={filteredSkipped} isSolved={isSolved} maskRating={maskRating} />
            </Text>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </div>
  );
}