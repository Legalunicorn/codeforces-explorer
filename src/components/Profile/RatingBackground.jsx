import { ReferenceArea } from "recharts";

const RATING_BANDS = [
  { from: 0, to: 1200, color: "#cccccc" },
  { from: 1200, to: 1400, color: "#77ff77" },
  { from: 1400, to: 1600, color: "#77ddbb" },
  { from: 1600, to: 1900, color: "#9eb1ff" },
  { from: 1900, to: 2100, color: "#e97ee9" },
  { from: 2100, to: 2300, color: "#e9ac50" },
  { from: 2300, to: 2400, color: "#f7963c" },
  { from: 2400, to: 2600, color: "#e96e6e" },
  { from: 2600, to: 3000, color: "#ff3333" },
  { from: 3000, to: 3500, color: "#b22323" },
  { from: 3500, color: "#b22323" },
];

export default function RatingBackground({ fillOpacity }) {
  return RATING_BANDS.map(({ from, to, color }) => (
    <ReferenceArea
      key={from}
      stroke="#54545430"
      strokeWidth={1.3}
      y1={from}
      y2={to}
      fill={color}
      fillOpacity={fillOpacity}
    />
  ));
}
