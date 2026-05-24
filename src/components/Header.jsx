// src/components/Header.jsx
import SearchBar from "./SearchBar";
import header from "../assets/header2.png";
import { Link } from "react-router-dom";
import {
  DividerVerticalIcon,
  GitHubLogoIcon,
  MoonIcon,
  PersonIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import { Button, Popover, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useViewerProblems } from "../hooks/useViewerProblems";

export default function Header({ theme, toggleTheme }) {
  const { viewerHandle, saveHandle, isLoading, error } = useViewerProblems();
  const [input, setInput] = useState(viewerHandle);
  const [open, setOpen] = useState(false);

  function handleSave() {
    saveHandle(input);
    setOpen(false);
  }

  return (
    <div className="z-10 flex items-center justify-between border-[#5a5e6750] px-4 py-3">
      <div className="flex items-center justify-center gap-x-2">
        <Link
          className="hover: flex w-fit cursor-pointer select-none gap-x-2 rounded-sm p-1 font-spaceMono text-sm transition-all duration-200 hover:bg-[#70707030]"
          to={"/"}
        >
          <img className="w-5" src={header} alt="" />
          <span>explorer.</span>
        </Link>
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

      <div className="w-2/6">
        <SearchBar />
      </div>

      <div className="flex items-center justify-center gap-x-3">
        <Link
          target="_blank"
          to="https://github.com/hitarth-gg/codeforces-explorer-extension"
        >
          <Button color="gray" variant="ghost" size={"1"}>
            <div className="p-1 text-[.8rem]">Extension</div>
          </Button>
        </Link>

        {/* ── Viewer handle popover ── */}
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger>
            <Button
              color={viewerHandle ? "indigo" : "gray"}
              variant={viewerHandle ? "soft" : "ghost"}
              size={"1"}
              title="Set your CF handle to highlight problems you've already solved"
            >
              <PersonIcon width={15} height={15} />
              {viewerHandle ? (
                <span className="max-w-[80px] truncate text-[.75rem]">
                  {viewerHandle}
                </span>
              ) : (
                <span className="text-[.75rem]">Your handle</span>
              )}
            </Button>
          </Popover.Trigger>
          <Popover.Content width="260px" side="bottom" align="end">
            <div className="flex flex-col gap-2 p-1">
              <Text size="1" weight="medium">
                Your Codeforces handle
              </Text>
              <Text size="1" color="gray">
                Problems you've already solved will be dimmed when browsing
                other users.
              </Text>
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded border border-[#43484e] bg-transparent px-2 py-1 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g. tourist"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <Button
                  size="1"
                  variant="soft"
                  color="indigo"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Set"}
                </Button>
              </div>
              {error && (
                <Text size="1" color="red">
                  {error}
                </Text>
              )}
              {viewerHandle && !isLoading && !error && (
                <div className="flex items-center justify-between">
                  <Text size="1" color="gray">
                    Active:{" "}
                    <span className="text-indigo-400">{viewerHandle}</span>
                  </Text>
                  <Button
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={() => {
                      setInput("");
                      saveHandle("");
                      setOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Root>

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