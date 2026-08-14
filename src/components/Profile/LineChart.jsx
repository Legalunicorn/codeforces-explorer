import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import timestamp from "unix-timestamp";
import RatingBackground from "./RatingBackground";
import RatingDetails from "./RatingDetails";

function RatingTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const entry = payload[0].payload;
  return (
    <div
      className="custom-tooltip"
      style={{
        backgroundColor: "#fff",
        padding: "10px",
        border: "1px solid #ccc",
      }}
    >
      <p className="label">{`Rank: ${entry.rank}`}</p>
      <p className="label">{`Date: ${timestamp.toDate(entry.ratingUpdateTimeSeconds).toDateString().slice(4)} `}</p>
      <p className="intro">{`Contest Name: ${entry.contestName}`}</p>
      <p className="delta">{`Delta: ${entry.newRating >= entry.oldRating ? "+" : ""} ${entry.newRating - entry.oldRating}`}</p>
      <p className="desc">{`New Rating: ${entry.newRating}`}</p>
      <p className="totalProbs">{`Total Problems solved: ${entry?.counts?.total}`}</p>
    </div>
  );
}

function addSolvedProblemCounts(ratings, problemsSolved) {
  const reversedSubmissions = [...problemsSolved].reverse();
  const updatedRatings = ratings.map((entry) => ({ ...entry }));
  const counts = { total: 0 };
  let ratingIndex = 0;

  for (let index = 0; index <= reversedSubmissions.length; index++) {
    if (
      reversedSubmissions[index]?.creationTimeSeconds <
      updatedRatings[ratingIndex].ratingUpdateTimeSeconds
    ) {
      const rating = reversedSubmissions[index].rating;
      counts[rating] = counts[rating] ? counts[rating] + 1 : 1;
      counts.total += 1;
    } else {
      updatedRatings[ratingIndex].counts = { ...counts };
      ratingIndex++;
      if (ratingIndex >= updatedRatings.length) break;
    }
  }

  return updatedRatings;
}

export default function RatingLineChart() {
  const [graphData, setGraphData] = useState([]);
  const ratings = useSelector((store) => store.user.ratingGraph);
  const problemsSolved = useSelector((store) => store.user.problemsSolved);
  const [selectedEntry, setSelectedEntry] = useState({});

  if (ratings.length === 0) {
    throw new Error(
      "No contest data to show here.\n User probably has not participated in any contests yet.",
    );
  }

  const updatedRatings = useMemo(
    () => addSolvedProblemCounts(ratings, problemsSolved),
    [ratings, problemsSolved],
  );

  useEffect(() => {
    setGraphData(
      updatedRatings.map((entry) => ({
        ...entry,
        date: timestamp
          .toDate(entry.ratingUpdateTimeSeconds)
          .toLocaleDateString("en-US", { year: "numeric", month: "short" }),
      })),
    );
  }, [updatedRatings]);

  const interval =
    graphData.length > 10 ? Math.floor(graphData.length / 10) : 0;
  const currentRating = Number(
    Math.max(...ratings.map((entry) => entry.newRating)),
  );
  const ratingTicks = [1200, 1400, 1600, 1900, 2100, 2300, 2400, 2600, 3000];
  const yAxisTicks = ratingTicks.filter((rating) => rating <= currentRating);
  yAxisTicks.push(ratingTicks[yAxisTicks.length]);

  return (
    <div className="h-96 w-[100%]">
      <div className="border-b border-[#2e3135] pb-2 font-spaceMono font-medium">
        # Rating v/s Problems Solved Chart
      </div>
      <ResponsiveContainer
        width="100%"
        height="100%"
        className="overflow-hidden"
      >
        <LineChart
          width={500}
          height={300}
          data={graphData}
          onMouseDown={(event) =>
            setSelectedEntry(event.activePayload[0].payload)
          }
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <filter id="shadow" height="130%">
              <feDropShadow
                dx="3"
                dy="3"
                stdDeviation="2"
                floodColor="#00000050"
              />
            </filter>
          </defs>
          <RatingBackground fillOpacity={1} />
          <CartesianGrid
            strokeDasharray=""
            stroke="#54545460"
            strokeWidth={1.3}
            horizontal={false}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="counts.total"
            tick={{ fontSize: 12 }}
            interval={interval}
          />
          <YAxis ticks={yAxisTicks} tickCount={1} interval={0} fontSize={13} />
          <Tooltip
            layout="vertical"
            verticalAlign="top"
            wrapperStyle={{ color: "#000", fontSize: 12 }}
            content={<RatingTooltip />}
          />
          <Legend />
          <Line
            type="linear"
            dataKey="newRating"
            stroke="#ecbe3f"
            name="Problems Solved"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            dot={{ stroke: "#ecbe3f", fill: "#fff", r: 3.8, filter: "" }}
            filter="url(#shadow)"
          />
        </LineChart>
      </ResponsiveContainer>
      <RatingDetails entry={selectedEntry} />
    </div>
  );
}
