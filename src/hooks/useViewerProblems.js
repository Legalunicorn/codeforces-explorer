// src/hooks/useViewerProblems.js
//
// Uses a module-level event emitter so every component that calls this hook
// shares the same solvedSet and viewerHandle — no Redux needed.

import { useState, useEffect, useCallback } from "react";
import { USER_STATUS } from "../utils/api";

const STORAGE_KEY = "cfe-viewer-handle";

// ── Module-level shared state ────────────────────────────────────────────────
let _viewerHandle = localStorage.getItem(STORAGE_KEY) || "";
let _solvedSet    = new Set();
let _isLoading    = false;
let _error        = "";
const _listeners  = new Set();

function _notify() {
  _listeners.forEach((fn) => fn());
}

async function _fetchSolved(handle) {
  if (!handle) {
    _solvedSet  = new Set();
    _isLoading  = false;
    _error      = "";
    _notify();
    return;
  }

  _isLoading = true;
  _error     = "";
  _notify();

  try {
    const res = await fetch(USER_STATUS(handle));
    if (res.status === 400) throw new Error("User not found");
    if (res.status === 403) throw new Error("Too many requests");
    if (!res.ok)            throw new Error("Failed to fetch data");

    const data   = await res.json();
    const solved = new Set();
    data.result.forEach((it) => {
      if (it.verdict === "OK") {
        solved.add(`${it.contestId}-${it.problem.index}`);
      }
    });
    _solvedSet = solved;
  } catch (e) {
    _error = e instanceof TypeError && e.message === "Failed to fetch"
      ? "Network error or CF API is down."
      : e.message;
    _solvedSet = new Set();
  } finally {
    _isLoading = false;
    _notify();
  }
}

// Kick off a fetch on module load if a handle was previously stored
if (_viewerHandle) _fetchSolved(_viewerHandle);

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useViewerProblems() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }, []);

  const saveHandle = useCallback((handle) => {
    const trimmed = handle.trim();
    _viewerHandle = trimmed;

    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    _fetchSolved(trimmed);
  }, []);

  const isSolved = useCallback(
    (contestId, index) => _solvedSet.has(`${contestId}-${index}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [_solvedSet],
  );

  return {
    viewerHandle: _viewerHandle,
    saveHandle,
    isSolved,
    isLoading: _isLoading,
    error:     _error,
  };
}