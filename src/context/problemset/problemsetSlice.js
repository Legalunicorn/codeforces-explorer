// src/context/problemset/problemsetSlice.js
import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "cfe-problemset-filters";

function loadFilters() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveFilters(filters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {}
}

export const defaultFilters = {
  minRating:   800,
  maxRating:   3500,
  tags:        null,
  solveStatus: "all",
  hideUnrated: false,
};

const savedFilters = loadFilters();

const initialState = {
  problems:      [],
  allTags:       [],
  contestNames:  {}, // contestId -> contestName
  isLoading:     false,
  errorMsg:      "",
  filters: savedFilters
    ? { ...defaultFilters, ...savedFilters }
    : defaultFilters,
};

const problemsetSlice = createSlice({
  name: "problemset",
  initialState,
  reducers: {
    fetchingProblems(state) {
      state.isLoading = true;
      state.errorMsg  = "";
    },
    setProblems(state, action) {
      state.problems      = action.payload.problems;
      state.allTags       = action.payload.allTags;
      state.contestNames  = action.payload.contestNames ?? {};
      state.isLoading     = false;
    },
    setError(state, action) {
      state.errorMsg  = action.payload;
      state.isLoading = false;
    },
    setFilters(state, action) {
      state.filters = action.payload;
      saveFilters(action.payload);
    },
    resetFilters(state) {
      state.filters = defaultFilters;
      saveFilters(defaultFilters);
    },
  },
});

export const { setFilters, resetFilters } = problemsetSlice.actions;
export default problemsetSlice.reducer;

function indexOrder(index) {
  const letter = index.charCodeAt(0) - 65;
  const suffix = parseInt(index.slice(1) || "0", 10);
  return letter + suffix * 26;
}

export function fetchProblems() {
  return async function (dispatch, getState) {
    if (getState().problemset.problems.length > 0) return;
    dispatch({ type: "problemset/fetchingProblems" });

    try {
      // Fetch problems and contest list in parallel
      const [problemsRes, contestsRes] = await Promise.all([
        fetch("https://codeforces.com/api/problemset.problems"),
        fetch("https://codeforces.com/api/contest.list?gym=false"),
      ]);

      if (!problemsRes.ok) throw new Error("Failed to fetch problemset");
      const problemsData = await problemsRes.json();
      if (problemsData.status !== "OK") throw new Error(problemsData.comment || "API error");

      // Build a contestId -> name map from contest.list
      // It's okay if this fails — we fall back to "Contest {id}"
      const contestNames = {};
      if (contestsRes.ok) {
        const contestsData = await contestsRes.json();
        if (contestsData.status === "OK") {
          contestsData.result.forEach((c) => {
            contestNames[c.id] = c.name;
          });
        }
      }

      const { problems, problemStatistics } = problemsData.result;

      const statsMap = {};
      problemStatistics.forEach((s) => {
        statsMap[`${s.contestId}-${s.index}`] = s.solvedCount;
      });

      const tagSet = new Set();
      problems.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
      const allTags = Array.from(tagSet).sort();

      const merged = problems
        .map((p) => ({
          ...p,
          solvedCount: statsMap[`${p.contestId}-${p.index}`] ?? 0,
          // Annotate each problem with the resolved contest name
          contestName: contestNames[p.contestId] ?? `Contest ${p.contestId}`,
        }))
        .sort((a, b) => {
          if (b.contestId !== a.contestId) return b.contestId - a.contestId;
          return indexOrder(a.index) - indexOrder(b.index);
        });

      dispatch({
        type: "problemset/setProblems",
        payload: { problems: merged, allTags, contestNames },
      });
    } catch (error) {
      dispatch({
        type: "problemset/setError",
        payload:
          error instanceof TypeError && error.message === "Failed to fetch"
            ? "Network error or CF API is down. Please try again later."
            : error.message,
      });
    }
  };
}