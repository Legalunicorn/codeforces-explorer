import { defaultFilters } from "../context/problemset/problemsetSlice";

const RATING_MIN = 800;
const RATING_MAX = 3500;
const DEFAULT_PAGE_SIZE = 100;
const UNPAGINATED_PAGE_SIZE = 100000;
const SORT_FIELDS = new Set(["rating", "solvedCount"]);
const SORT_DIRECTIONS = new Set(["asc", "desc"]);
const SOLVE_STATUSES = new Set(["all", "solved", "unsolved"]);

function parsePositiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function normalizeRating(value, fallback) {
  const rating = parsePositiveInteger(value, fallback);
  return Math.max(RATING_MIN, Math.min(RATING_MAX, rating));
}

function hasFilterParameters(searchParams) {
  return ["filters", "min", "max", "tag", "status", "unrated"].some(
    (parameter) => searchParams.has(parameter),
  );
}

export function readProblemsetUrlState(searchParams) {
  const sortField = searchParams.get("sort");
  const sortDirection = searchParams.get("dir");
  const solveStatus = searchParams.get("status");
  const tags = searchParams.getAll("tag");

  const minRating = normalizeRating(
    searchParams.get("min"),
    defaultFilters.minRating,
  );
  const maxRating = normalizeRating(
    searchParams.get("max"),
    defaultFilters.maxRating,
  );

  return {
    pageNo: parsePositiveInteger(searchParams.get("page"), 1) - 1,
    pageSize: parsePositiveInteger(searchParams.get("size"), DEFAULT_PAGE_SIZE),
    sortField: SORT_FIELDS.has(sortField) ? sortField : null,
    sortDir:
      SORT_DIRECTIONS.has(sortDirection) && SORT_FIELDS.has(sortField)
        ? sortDirection
        : "default",
    orderDir: searchParams.get("order") === "desc" ? "desc" : "asc",
    filters: hasFilterParameters(searchParams)
      ? {
          minRating: Math.min(minRating, maxRating),
          maxRating: Math.max(minRating, maxRating),
          tags: searchParams.has("tag") ? tags.filter(Boolean) : null,
          solveStatus: SOLVE_STATUSES.has(solveStatus)
            ? solveStatus
            : defaultFilters.solveStatus,
          hideUnrated: searchParams.get("unrated") === "1",
        }
      : null,
  };
}

export function createProblemsetSearchParams({
  pageNo,
  pageSize,
  sortField,
  sortDir,
  orderDir,
  filters,
}) {
  const searchParams = new URLSearchParams();

  // Marks even the default filter set as URL-owned, preventing a recipient's
  // local-storage filters from changing the view behind a shared link.
  searchParams.set("filters", "1");
  if (pageNo > 0) searchParams.set("page", String(pageNo + 1));
  if (pageSize !== DEFAULT_PAGE_SIZE)
    searchParams.set("size", String(pageSize));
  if (sortField && sortDir !== "default") {
    searchParams.set("sort", sortField);
    searchParams.set("dir", sortDir);
  } else if (orderDir === "desc") {
    searchParams.set("order", "desc");
  }

  if (filters.minRating !== defaultFilters.minRating)
    searchParams.set("min", String(filters.minRating));
  if (filters.maxRating !== defaultFilters.maxRating)
    searchParams.set("max", String(filters.maxRating));
  if (filters.tags !== null) {
    if (filters.tags.length === 0) searchParams.append("tag", "");
    else filters.tags.forEach((tag) => searchParams.append("tag", tag));
  }
  if (filters.solveStatus !== defaultFilters.solveStatus)
    searchParams.set("status", filters.solveStatus);
  if (filters.hideUnrated) searchParams.set("unrated", "1");

  return searchParams;
}

export function clampPageNo(pageNo, itemCount, pageSize) {
  const lastPageNo = Math.max(0, Math.ceil(itemCount / pageSize) - 1);
  return Math.min(pageNo, lastPageNo);
}

export { DEFAULT_PAGE_SIZE, UNPAGINATED_PAGE_SIZE };
