// src/hooks/useViewerProblems.js
import { useState, useEffect, useCallback } from "react";
import { USER_STATUS } from "../utils/api";

const STORAGE_KEY = "cfe-viewer-handle";

export function useViewerProblems() {
  const [viewerHandle, setViewerHandle] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ""
  );
  const [solvedSet, setSolvedSet] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSolved = useCallback(async (handle) => {
    if (!handle) {
      setSolvedSet(new Set());
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(USER_STATUS(handle));
      if (res.status === 400) throw new Error("User not found");
      if (res.status === 403) throw new Error("Too many requests");
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      const solved = new Set();
      data.result.forEach((it) => {
        if (it.verdict === "OK") {
          solved.add(`${it.contestId}-${it.problem.index}`);
        }
      });
      setSolvedSet(solved);
    } catch (e) {
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        setError("Network error or CF API is down.");
      } else {
        setError(e.message);
      }
      setSolvedSet(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On mount, re-fetch if a handle was previously stored
  useEffect(() => {
    if (viewerHandle) fetchSolved(viewerHandle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveHandle = useCallback(
    (handle) => {
      const trimmed = handle.trim();
      setViewerHandle(trimmed);
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setSolvedSet(new Set());
        setError("");
      }
      fetchSolved(trimmed);
    },
    [fetchSolved]
  );

  const isSolved = useCallback(
    (contestId, index) => solvedSet.has(`${contestId}-${index}`),
    [solvedSet]
  );

  return { viewerHandle, saveHandle, isSolved, isLoading, error };
}