// src/pages/Home.jsx
import { useDispatch } from "react-redux";
import HowToUse from "../components/HowToUse";
import PixelFlower from "../images/pixelFlower.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo } from "react";

// ── Routes that should never be treated as a username or problem id ──
const KNOWN_ROUTES = new Set(["contests", "user", "problem"]);

export default function Home() {
  const dispatch = useDispatch();

  let [searchParams] = useSearchParams();
  let path = searchParams.get("");

  const urlParams = useMemo(() => {
    if (!path) return [];
    const parts = [];
    if (path.split("/")[0]) parts.push(path.split("/")[0]);
    if (path.split("/")[1]) parts.push(path.split("/")[1]);
    return parts;
  }, [path]);

  const navigate = useNavigate();

  useEffect(() => {
    // If the first segment is a known route (e.g. "contests"),
    // navigate directly to it instead of treating it as a username.
    if (urlParams.length === 1 && KNOWN_ROUTES.has(urlParams[0])) {
      navigate(`/${urlParams[0]}`);
    } else if (urlParams.length === 1) {
      navigate(`/user/${urlParams[0]}`);
    } else if (urlParams.length === 2) {
      if (urlParams[0] === "user") {
        navigate(`/user/${urlParams[1]}`);
      } else if (urlParams[0] === "problem") {
        navigate(`/problem/${urlParams[1]}`);  // won't have index here anyway
      } else {
        navigate(`/problem/${urlParams[0]}/${urlParams[1]}`);
      }
    }
  }, [navigate, urlParams]);

  return (
    <div className="">
      <div
        className="mt-6 flex flex-col items-center justify-between"
        style={{ height: "80vh" }}
      >
        <div
          className="flex items-center justify-center gap-4 text-lg"
          style={{ fontFamily: "Pixelify Sans", margin: "auto" }}
        >
          CodeForces
          <img className="h-14 w-auto" src={PixelFlower} alt="" />
          Explorer
        </div>

        <div className="text-xs">
          <HowToUse />
        </div>
      </div>
    </div>
  );
}