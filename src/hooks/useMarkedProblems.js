import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cfe-marked-problems";
const CHANGE_EVENT = "cfe-marked-problems-change";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(marked) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(marked));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}

/**
 * Returns [markedMap, toggle, isMarked, markAll, clearAll].
 * problemKey convention: `${contestId}-${index}`, for example "1480-C".
 */
export function useMarkedProblems() {
  const [marked, setMarked] = useState(load);

  useEffect(() => {
    function syncMarkedProblems() {
      setMarked(load());
    }

    window.addEventListener("storage", syncMarkedProblems);
    window.addEventListener(CHANGE_EVENT, syncMarkedProblems);
    return () => {
      window.removeEventListener("storage", syncMarkedProblems);
      window.removeEventListener(CHANGE_EVENT, syncMarkedProblems);
    };
  }, []);

  const toggle = useCallback((problemKey) => {
    setMarked((previous) => {
      const next = { ...previous };
      if (next[problemKey]) delete next[problemKey];
      else next[problemKey] = true;
      save(next);
      return next;
    });
  }, []);

  const isMarked = useCallback(
    (problemKey) => Boolean(marked[problemKey]),
    [marked],
  );

  const markAll = useCallback((problemKeys) => {
    setMarked((previous) => {
      const next = { ...previous };
      problemKeys.forEach((key) => {
        next[key] = true;
      });
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {}
    setMarked({});
  }, []);

  return [marked, toggle, isMarked, markAll, clearAll];
}
