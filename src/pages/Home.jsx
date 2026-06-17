// import { useDispatch } from "react-redux";
// import { toast } from "sonner";
// import HowToUse from "../components/HowToUse";
// import PixelFlower from "../images/pixelFlower.png";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import { useEffect, useMemo } from "react";

// export default function Home() {
//   const dispatch = useDispatch();

//   let [searchParams] = useSearchParams();
//   let path = searchParams.get("");

//   // Stabilize with useMemo so the array reference doesn't change every render,
//   // which was causing useEffect to fire every render → navigate(0) infinitely.
//   const urlParams = useMemo(() => {
//     if (!path) return [];
//     const parts = [];
//     if (path.split("/")[0]) parts.push(path.split("/")[0]);
//     if (path.split("/")[1]) parts.push(path.split("/")[1]);
//     return parts;
//   }, [path]);

//   const navigate = useNavigate();

//   useEffect(() => {
//     if (urlParams.length === 1) {
//       navigate(`/user/${urlParams[0]}`);
//     } else if (urlParams.length === 2) {
//       navigate(`/problem/${urlParams[0]}/${urlParams[1]}`);
//     }
//   }, [navigate, urlParams]);

//   return (
//     <div className="">
//       <div
//         className="mt-6 flex flex-col items-center justify-between"
//         style={{ height: "80vh" }}
//       >
//         <div
//           className="flex items-center justify-center gap-4 text-lg"
//           style={{ fontFamily: "Pixelify Sans", margin: "auto" }}
//         >
//           CodeForces
//           <img className="h-14 w-auto" src={PixelFlower} alt="" />
//           Explorer
//         </div>

//         <div className="text-xs">
//           <HowToUse />
//         </div>
//       </div>
//     </div>
//   );
// }
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProblems } from "../context/problemset/problemsetSlice";
import { useViewerProblems } from "../hooks/useViewerProblems";
import CenteredLoader from "../ui/CenteredLoader";
import ErrorPage from "./ErrorPage";
import { Button } from "@radix-ui/themes";
import { ratingColor } from "../utils/ratingColor";
import { EyeNoneIcon, EyeOpenIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const PAGE_SIZE = 50;

const NO_COL_W = 34;
const CONTEST_COL_W = 170;
const PROB_COL_W = 105;

function shortName(name) {
  return name.replace(/\s*\(.*?\)\s*/g, "").trim();
}

function maxCols(pl) {
  let mx = 0;
  for (const k of Object.keys(pl)) {
    mx = Math.max(mx, k.charCodeAt(0) - 64);
  }
  return mx;
}

const cellBase = {
  width: PROB_COL_W,
  minWidth: PROB_COL_W,
  maxWidth: PROB_COL_W,
  borderRight: "1px solid #1e2025",
  borderBottom: "1px solid #1e2025",
  verticalAlign: "middle",
  overflow: "hidden",
};

function ProbCell({ p, done, mask }) {
  if (!p) {
    return <td style={{ ...cellBase }} />;
  }

  const href =
    p.contestId > 10000
      ? `https://codeforces.com/problemset/gymProblem/${p.contestId}/${p.index}`
      : `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;

  return (
    <td
      style={{
        ...cellBase,
        padding: "6px 8px",
        backgroundColor: done ? "rgba(34,197,94,.12)" : "transparent",
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col"
      >
        <span
          className="truncate text-xs hover:underline"
          style={{
            color: done
              ? "#4ade80"
              : !mask && p.rating
                ? ratingColor(p.rating)
                : "#bbb",
          }}
        >
          {p.index}. {p.name}
        </span>

        {!mask && p.rating && (
          <span
            className="text-[.65rem]"
            style={{ color: ratingColor(p.rating) }}
          >
            {p.rating}
          </span>
        )}
      </a>
    </td>
  );
}

function ProbsCell({ probs, isSolved, mask }) {
  if (!probs?.length) {
    return <td style={{ ...cellBase }} />;
  }

  return (
    <td style={{ ...cellBase, padding: 0 }}>
      <div className="flex h-full">
        {probs.map((p) => (
          <ProbCell
            key={p.index}
            p={p}
            done={isSolved(p.contestId, p.index)}
            mask={mask}
          />
        ))}
      </div>
    </td>
  );
}

function ContestRow({ contest, isSolved, mask, rowNo, numCols }) {
  const all = Object.values(contest.problemList).flat();
  const solved = all.filter((p) =>
    isSolved(p.contestId, p.index),
  ).length;

  return (
    <tr>
      <td
        style={{
          width: NO_COL_W,
          textAlign: "center",
          color: "#555",
          borderBottom: "1px solid #1e2025",
        }}
      >
        {rowNo}
      </td>

      <td
        style={{
          width: CONTEST_COL_W,
          borderBottom: "1px solid #1e2025",
          padding: "8px",
        }}
      >
        <a
          href={`https://codeforces.com/contest/${contest.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <div className="truncate text-xs font-semibold text-[#bbb]">
            {shortName(contest.name)}
          </div>

          <div className="text-[.65rem] text-[#555]">
            #{contest.id}
          </div>

          {solved > 0 && (
            <div className="mt-1 text-[.65rem] font-bold text-green-400">
              Solved: {solved}/{all.length}
            </div>
          )}
        </a>
      </td>

      {ALL_LETTERS.slice(0, numCols).map((x) => (
        <ProbsCell
          key={x}
          probs={contest.problemList[x] ?? []}
          isSolved={isSolved}
          mask={mask}
        />
      ))}
    </tr>
  );
}

export default function Contests() {
  const dispatch = useDispatch();
  const { problems, contestNames, isLoading, errorMsg } =
    useSelector((s) => s.problemset);

  const { isSolved } = useViewerProblems();

  const [meta, setMeta] = useState(new Map());
  const [maskRating, setMaskRating] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    dispatch(fetchProblems());

    fetch("https://codeforces.com/api/contest.list?gym=false")
      .then((r) => r.json())
      .then((d) => {
        if (d.status !== "OK") return;

        const m = new Map();

        d.result.forEach((c) =>
          m.set(c.id, {
            name: c.name,
            startTimeSeconds: c.startTimeSeconds,
          }),
        );

        setMeta(m);
      });
  }, [dispatch]);

  const contests = useMemo(() => {
    const map = new Map();

    problems.forEach((p) => {
      if (p.contestId >= 100000) return;

      if (!map.has(p.contestId)) {
        const m = meta.get(p.contestId);

        map.set(p.contestId, {
          id: p.contestId,
          name:
            m?.name ??
            contestNames[p.contestId] ??
            `Contest ${p.contestId}`,
          startTimeSeconds: m?.startTimeSeconds ?? 0,
          problemList: {},
        });
      }

      const c = map.get(p.contestId);
      const base = p.index[0];

      c.problemList[base] ??= [];
      c.problemList[base].push(p);
    });


    // fix shared rounds
    const groups = {};

    for (const c of map.values()) {
      const key = c.name
        .replace(/div\.?\s*[12]/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      groups[key] ??= [];
      groups[key].push(c);
    }


    for (const group of Object.values(groups)) {
      const div1 = group.find((x) =>
        /div\.?\s*1/i.test(x.name),
      );

      const div2 = group.find((x) =>
        /div\.?\s*2/i.test(x.name),
      );

      if (!div1 || !div2) continue;

      if (
        Math.abs(
          div1.startTimeSeconds -
          div2.startTimeSeconds,
        ) > 3600
      ) continue;


      // Div1 A,B,C,D -> Div2 C,D,E,F
      const shift = 2;

      for (const [letter, probs] of Object.entries(div1.problemList)) {
        const newLetter =
          String.fromCharCode(
            letter.charCodeAt(0) + shift,
          );

        if (!div2.problemList[newLetter]) {
          div2.problemList[newLetter] =
            probs.map((p) => ({
              ...p,
              contestId: div2.id,
              index:
                newLetter +
                p.index.slice(1),
            }));
        }
      }
    }

    return [...map.values()].sort(
      (a, b) =>
        b.startTimeSeconds - a.startTimeSeconds,
    );

  }, [problems, meta, contestNames]);


  const filtered = contests.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    String(c.id).includes(search),
  );

  const pageContests = filtered.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );


  const numCols = Math.max(
    8,
    ...pageContests.map((c) =>
      maxCols(c.problemList),
    ),
  );


  if (isLoading) return <CenteredLoader />;
  if (errorMsg) return <ErrorPage text={errorMsg} />;


  return (
    <div className="mx-4 mt-4">

      <div className="mb-3 flex justify-between">

        <Button
          size="1"
          variant={maskRating ? "solid" : "soft"}
          onClick={() => setMaskRating((x) => !x)}
        >
          {maskRating
            ? <EyeNoneIcon />
            : <EyeOpenIcon />}
          {maskRating ? "Show ratings" : "Hide ratings"}
        </Button>


        <div className="flex items-center gap-1 border border-[#2e3135] px-2">
          <MagnifyingGlassIcon />
          <input
            className="bg-transparent text-xs outline-none"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>

      </div>


      <table
        style={{
          borderCollapse: "collapse",
          tableLayout: "fixed",
          minWidth:
            NO_COL_W +
            CONTEST_COL_W +
            numCols * PROB_COL_W,
        }}
      >

        <thead>
          <tr>
            <th>No</th>
            <th>Contest</th>

            {ALL_LETTERS
              .slice(0, numCols)
              .map((x) => (
                <th key={x}>{x}</th>
              ))}
          </tr>
        </thead>


        <tbody>
          {pageContests.map((c, i) => (
            <ContestRow
              key={c.id}
              contest={c}
              isSolved={isSolved}
              mask={maskRating}
              rowNo={page * PAGE_SIZE + i + 1}
              numCols={numCols}
            />
          ))}
        </tbody>

      </table>


      <div className="mt-3 flex gap-2 text-xs">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Prev
        </button>

        <span>
          {page + 1}/
          {Math.ceil(filtered.length / PAGE_SIZE)}
        </span>

        <button
          onClick={() =>
            setPage((p) =>
              Math.min(
                Math.ceil(filtered.length / PAGE_SIZE) - 1,
                p + 1,
              ),
            )
          }
        >
          Next
        </button>
      </div>

    </div>
  );
}