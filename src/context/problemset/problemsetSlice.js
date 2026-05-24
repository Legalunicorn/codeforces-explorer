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
  minRating: 800,
  maxRating: 3500,
  tags: [],          // empty = all tags shown
  solveStatus: "all", // "all" | "solved" | "unsolved"
};

const savedFilters = loadFilters();

const initialState = {
  problems: [],
  allTags: [],
  isLoading: false,
  errorMsg: "",
  filters: savedFilters
    ? { ...defaultFilters, ...savedFilters } // merge so new keys get defaults
    : defaultFilters,
};

const problemsetSlice = createSlice({
  name: "problemset",
  initialState,
  reducers: {
    fetchingProblems(state) {
      state.isLoading = true;
      state.errorMsg = "";
    },
    setProblems(state, action) {
      state.problems = action.payload.problems;
      state.allTags = action.payload.allTags;
      state.isLoading = false;
    },
    setError(state, action) {
      state.errorMsg = action.payload;
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

export function fetchProblems() {
  return async function (dispatch, getState) {
    if (getState().problemset.problems.length > 0) return;
    dispatch({ type: "problemset/fetchingProblems" });
    try {
      const res = await fetch("https://codeforces.com/api/problemset.problems");
      if (!res.ok) throw new Error("Failed to fetch problemset");
      const data = await res.json();
      if (data.status !== "OK") throw new Error(data.comment || "API error");

      const { problems, problemStatistics } = data.result;

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
        }))
        .sort((a, b) => b.solvedCount - a.solvedCount);

      dispatch({
        type: "problemset/setProblems",
        payload: { problems: merged, allTags },
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