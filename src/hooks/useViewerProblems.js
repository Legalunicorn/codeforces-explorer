// src/hooks/useViewerProblems.js
//
// Supports multiple comma-separated handles.
// Every component sharing this hook sees the same solvedSet.

import { useState, useEffect, useCallback } from "react";
import { USER_STATUS } from "../utils/api";

const STORAGE_KEY = "cfe-viewer-handle";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a raw input string into a clean array of handles. */
function parseHandles(raw) {
  return raw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
}

/** Join handles back to a display string. */
function joinHandles(handles) {
  return handles.join(", ");
}

// ── Module-level shared state ─────────────────────────────────────────────────
let _rawInput     = localStorage.getItem(STORAGE_KEY) || "";   // raw string, e.g. "Hiroc, Tanny"
let _solvedSet    = new Set();
let _isLoading    = false;
let _error        = "";
const _listeners  = new Set();

function _notify() {
  _listeners.forEach((fn) => fn());
}

async function _fetchSolved(rawInput) {
  const handles = parseHandles(rawInput);

  if (handles.length === 0) {
    _solvedSet = new Set();
    _isLoading = false;
    _error     = "";
    _notify();
    return;
  }

  _isLoading = true;
  _error     = "";
  _notify();

  try {
    // Fetch all handles in parallel
    const results = await Promise.all(
      handles.map(async (handle) => {
        const res = await fetch(USER_STATUS(handle));
        if (res.status === 400) throw new Error(`User "${handle}" not found`);
        if (res.status === 403) throw new Error("Too many requests");
        if (!res.ok)            throw new Error(`Failed to fetch data for "${handle}"`);
        return res.json();
      })
    );

    const solved = new Set();
    results.forEach((data) => {
      data.result.forEach((it) => {
        if (it.verdict === "OK") {
          solved.add(`${it.contestId}-${it.problem.index}`);
        }
      });
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

// Kick off a fetch on module load if handles were previously stored
if (_rawInput) _fetchSolved(_rawInput);

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useViewerProblems() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }, []);

  const saveHandle = useCallback((raw) => {
    const trimmed = raw.trim();
    _rawInput = trimmed;

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
    /** The raw comma-separated string, e.g. "Hiroc, Tanny" */
    viewerHandle: _rawInput,
    /** Whether any handle is active (used for UI styling) */
    hasHandles: parseHandles(_rawInput).length > 0,
    /** Number of active handles */
    handleCount: parseHandles(_rawInput).length,
    saveHandle,
    isSolved,
    isLoading: _isLoading,
    error:     _error,
  };
}