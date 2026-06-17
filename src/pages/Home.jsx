import HowToUse from "../components/HowToUse";
import PixelFlower from "../images/pixelFlower.png";

export default function Home() {
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