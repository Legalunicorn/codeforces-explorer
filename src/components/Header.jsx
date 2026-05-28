// src/components/Header.jsx
import SearchBar from "./SearchBar";
import header from "../assets/header2.png";
import { Link, NavLink } from "react-router-dom";
import {
  DividerVerticalIcon,
  GitHubLogoIcon,
  MoonIcon,
  PersonIcon,
  SunIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { useRef, useState } from "react";
import { useViewerProblems } from "../hooks/useViewerProblems";

export default function Header({ theme, toggleTheme }) {
  const { viewerHandle, hasHandles, handleCount, saveHandle, isLoading, error } =
    useViewerProblems();
  const [input, setInput] = useState(viewerHandle);
  const inputRef = useRef(null);

  function handleSave() {
    saveHandle(input.trim());
    inputRef.current?.blur();
  }

  function handleClear() {
    setInput("");
    saveHandle("");
  }

  return (
    <div className="z-10 flex items-center justify-between border-[#5a5e6750] px-4 py-3">
      {/* ── Left: logo + github + nav ── */}
      <div className="flex items-center justify-center gap-x-2">
        <Link
          className="flex w-fit cursor-pointer select-none gap-x-2 rounded-sm p-1 font-spaceMono text-sm transition-all duration-200 hover:bg-[#70707030]"
          to={"/"}
        >
          <img className="w-5" src={header} alt="" />
          <span>explorer.</span>
        </Link>

        <DividerVerticalIcon width={20} height={20} color="#ffffff40" />

        {/* Nav links */}
        <nav className="flex items-center gap-x-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded px-2 py-1 text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-[#1e3a5c] text-white"
                  : "text-[#666] hover:bg-[#70707020] hover:text-[#aaa]"
              }`
            }
          >
            Problems
          </NavLink>
          <NavLink
            to="/contests"
            className={({ isActive }) =>
              `rounded px-2 py-1 text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-[#1e3a5c] text-white"
                  : "text-[#666] hover:bg-[#70707020] hover:text-[#aaa]"
              }`
            }
          >
            Contests
          </NavLink>
        </nav>

        <DividerVerticalIcon width={20} height={20} color="#ffffff40" />

        <Button color="gray" variant="ghost" size={"1"}>
          <a
            href="https://github.com/legalunicorn/codeforces-explorer"
            target="_blank"
            rel="noreferrer"
          >
            <GitHubLogoIcon className="my-1" width={17} height={17} />
          </a>
        </Button>
      </div>

      {/* ── Center: search ── */}
      <div className="w-2/6">
        <SearchBar />
      </div>

      {/* ── Right: handle input + extension + theme ── */}
      <div className="flex items-center justify-center gap-x-2">
        <Link
          target="_blank"
          to="https://github.com/hitarth-gg/codeforces-explorer-extension"
        >
          <Button color="gray" variant="ghost" size={"1"}>
            <div className="p-1 text-[.8rem]">Extension</div>
          </Button>
        </Link>

        {/* ── Inline handle input ── */}
        <div className="group relative flex items-center">
          {/* Tooltip */}
          <div
            className="
              pointer-events-none absolute -bottom-10 right-0 z-50
              whitespace-nowrap rounded bg-[#1c1c1c] px-2.5 py-1.5
              text-xs text-[#ccc] shadow-lg ring-1 ring-[#333]
              opacity-0 transition-opacity duration-150
              group-focus-within:opacity-0 group-hover:opacity-100
            "
          >
            Enter one or more handles separated by commas
            <br />
            <span className="text-[#888]">e.g. tourist, Benq, Um_nik</span>
          </div>

          <div
            className={`
              flex items-center gap-1 rounded border px-2 py-1 transition-all duration-150
              ${
                hasHandles
                  ? "border-indigo-500 bg-indigo-950/40"
                  : "border-[#43484e] bg-transparent hover:border-[#666]"
              }
              focus-within:border-indigo-500 focus-within:bg-indigo-950/40
            `}
          >
            <PersonIcon
              width={13}
              height={13}
              className={hasHandles ? "text-indigo-400" : "text-[#666]"}
            />
            <input
              ref={inputRef}
              className="w-36 bg-transparent text-[.78rem] text-white outline-none placeholder:text-[#555]"
              placeholder="handle1, handle2, …"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") inputRef.current?.blur();
              }}
              onBlur={() => {
                if (input.trim() !== viewerHandle) handleSave();
              }}
            />

            {/* Loading indicator */}
            {isLoading && (
              <span className="text-[10px] text-[#666]">…</span>
            )}

            {/* Handle count badge */}
            {hasHandles && !isLoading && handleCount > 1 && (
              <span
                className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white"
                title={`${handleCount} handles active`}
              >
                {handleCount}
              </span>
            )}

            {/* Clear button */}
            {hasHandles && !isLoading && (
              <button
                onClick={handleClear}
                className="ml-0.5 rounded p-0.5 text-[#555] transition hover:text-rose-400"
                tabIndex={-1}
                title="Clear all handles"
              >
                <Cross2Icon width={10} height={10} />
              </button>
            )}
          </div>

          {/* Error hint */}
          {error && (
            <div className="absolute -bottom-5 right-0 text-[10px] text-rose-400">
              {error}
            </div>
          )}
        </div>

        <Button color="gray" variant="ghost" size={"1"} onClick={toggleTheme}>
          {theme === "dark" ? (
            <MoonIcon className="my-1" width={17} height={17} />
          ) : (
            <SunIcon className="my-1" width={17} height={17} />
          )}
        </Button>
      </div>
    </div>
  );
}