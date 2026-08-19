import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";

export default function ProblemStar({ problemKey, isStarred, onToggle }) {
  const label = isStarred ? "Unstar problem" : "Star problem";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isStarred}
      title={label}
      onClick={() => onToggle(problemKey)}
      className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        isStarred
          ? "text-amber-400 hover:text-amber-300"
          : "text-[#555] hover:text-amber-300"
      }`}
    >
      {isStarred ? <StarFilledIcon /> : <StarIcon />}
    </button>
  );
}
