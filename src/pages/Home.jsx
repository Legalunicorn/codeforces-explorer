import { useDispatch } from "react-redux";
import HowToUse from "../components/HowToUse";
import PixelFlower from "../images/pixelFlower.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo } from "react";

const KNOWN_ROUTES = new Set(["contests", "user", "problem"]);

export default function Home() {
  let [searchParams] = useSearchParams();
  let path = searchParams.get("");

  const urlParams = useMemo(() => {
    if (!path) return [];
    const parts = path.split("/").filter(Boolean);
    return parts;
  }, [path]);

  const navigate = useNavigate();

  useEffect(() => {
    if (urlParams.length === 0) return;

    let target = null;

    if (urlParams.length === 1) {
      if (KNOWN_ROUTES.has(urlParams[0])) {
        target = `/${urlParams[0]}`;
      } else {
        target = `/user/${urlParams[0]}`;
      }
    } else if (urlParams.length >= 2) {
      if (urlParams[0] === "user") {
        target = `/user/${urlParams[1]}`;
      } else if (urlParams[0] === "problem") {
        target = `/problem/${urlParams[1]}/${urlParams[2] ?? ""}`;
      } else {
        target = `/problem/${urlParams[0]}/${urlParams[1]}`;
      }
    }

    if (target) {
      navigate(target, { replace: true }); // replace: true prevents history loop
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