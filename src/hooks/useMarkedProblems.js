// src/hooks/useMarkedProblems.js
import { useState, useCallback } from "react";

const STORAGE_KEY = "cfe-marked-problems";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Returns [markedMap, toggle, isMarked]
 *
 * markedMap  – { "1480-C": true, ... }
 * toggle(id) – flips the marked state for a problem key
 * isMarked(id) – returns boolean
 *
 * Problem key convention: `${contestId}-${index}`  e.g. "1480-C"
 */
export function useMarkedProblems() {
  const [marked, setMarked] = useState(load);

  const toggle = useCallback((problemKey) => {
    setMarked((prev) => {
      const next = { ...prev };
      if (next[problemKey]) {
        delete next[problemKey];
      } else {
        next[problemKey] = true;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isMarked = useCallback(
    (problemKey) => Boolean(marked[problemKey]),
    [marked],
  );

  return [marked, toggle, isMarked];
}