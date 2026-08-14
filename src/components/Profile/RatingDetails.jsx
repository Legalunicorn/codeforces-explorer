import timestamp from "unix-timestamp";
import { ratingColor } from "../../utils/ratingColor";

export default function RatingDetails({ entry }) {
  const counts = entry.counts;

  return (
    <div className="flex items-center justify-center font-spaceMono">
      <div className="flex w-full justify-between sm:px-10">
        {entry.rank && (
          <div className="flex-col justify-start">
            <p className="text-lg font-bold">{`Rank: ${entry.rank}`}</p>
            <p className="text-sm">{`Date: ${timestamp.toDate(entry.ratingUpdateTimeSeconds).toDateString().slice(4)} `}</p>
            <p className="text-sm">{`Contest Name: ${entry.contestName}`}</p>
            <p className="text-sm">{`Delta: ${entry.newRating >= entry.oldRating ? "+" : ""} ${entry.newRating - entry.oldRating}`}</p>
            <p className="text-sm">{`New Rating: ${entry.newRating}`}</p>
            <p className="text-sm">{`Total Problems solved: ${counts.total}`}</p>
          </div>
        )}
        <div className="flex-col items-center justify-center">
          {counts ? (
            <div className="mb-2 text-nowrap border border-gray-500 text-center font-spaceMono font-bold">
              Total Problems Solved
            </div>
          ) : (
            <div className="font-spaceMono text-sm">
              Click on the dots to view detailed stats
            </div>
          )}
          <div className="grid grid-flow-col grid-cols-3 grid-rows-5 gap-x-6 text-nowrap">
            {counts &&
              Object.keys(counts).map(
                (key) =>
                  key !== "total" && (
                    <div key={key} className="flex gap-x-1 text-sm">
                      <p
                        className="font-medium"
                        style={{ color: ratingColor(key) }}
                      >{`${key} :`}</p>
                      <p>{`${counts[key]}`}</p>
                    </div>
                  ),
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
