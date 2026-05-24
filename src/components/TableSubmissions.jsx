// src/components/TableSubmissions.jsx
import { Button, Code, DropdownMenu, Link, Table } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, BarChartIcon } from "@radix-ui/react-icons";
import Pagination from "./Pagination";
import { ratingColor } from "../utils/ratingColor";

export default function TableSubmissions({ data, isSolved, maskRating = false }) {
  const [tempq, setTempq] = useState(data);

  useEffect(() => {
    setTempq(data);
    setPageNo(0);
  }, [data]);

  function sortAsc() {
    setTempq([...tempq].sort((a, b) => {
      if (!a.rating && !b.rating) return 0;
      if (!a.rating) return 1;
      if (!b.rating) return -1;
      return a.rating - b.rating;
    }));
  }

  function sortDesc() {
    setTempq([...tempq].sort((a, b) => b.rating - a.rating));
  }

  function sortDefault() {
    setTempq(data);
  }

  const [pageSize, setPageSize] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [page, setPage] = useState([]);

  useEffect(() => {
    const start = pageNo * pageSize;
    setPage(tempq.slice(start, start + pageSize));
  }, [tempq, pageNo, pageSize]);

  return (
    <div className="relative">
      <div className="right-0 flex justify-end">
        <Pagination
          arraySize={tempq.length}
          pageSize={pageSize}
          setPageSize={setPageSize}
          pageNo={pageNo}
          setPageNo={setPageNo}
          page={page}
          setPage={setPage}
          position="absolute z-10"
        />
      </div>
      <Table.Root size="1">
        <Table.Header>
          <Table.Row style={{ color: "#cccccc" }}>
            <Table.ColumnHeaderCell>No.</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell title="Already solved by you">✓</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Problem</Table.ColumnHeaderCell>
            <Table.Cell px={"0"}>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger>
                  <Button size={"1"} variant="soft" color="gray">
                    Rating <DropdownMenu.TriggerIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content size={"1"}>
                  <DropdownMenu.Item shortcut={<BarChartIcon />} onClick={sortDefault}>Default</DropdownMenu.Item>
                  <DropdownMenu.Item shortcut={<ArrowDownIcon />} onClick={sortAsc}>Ascending</DropdownMenu.Item>
                  <DropdownMenu.Item shortcut={<ArrowUpIcon />} onClick={sortDesc}>Descending</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Table.Cell>
            <Table.ColumnHeaderCell>Division</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Tags</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body style={{ color: "#888888" }}>
          {page.map((it, index) => {
            const done = isSolved(it.contestId, it.index);

            return (
              <Table.Row
                key={it.id}
                style={{
                  color: "#888888",
                  opacity: done ? 0.55 : 1,
                  backgroundColor: done ? "rgba(34, 197, 94, 0.07)" : "transparent",
                  transition: "opacity 0.15s ease, background-color 0.15s ease",
                }}
              >
                <Table.Cell width={"1px"}>{pageNo * pageSize + index + 1}</Table.Cell>

                <Table.Cell width={"1px"}>
                  {done && (
                    <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>
                      ✓
                    </span>
                  )}
                </Table.Cell>

                <Table.RowHeaderCell className="text-nowrap">
                  <Link
                    className="text-nowrap"
                    target="_blank"
                    href={`https://codeforces.com/contest/${it.contestId}/submission/${it.id}`}
                  >
                    {it.problem}
                  </Link>
                </Table.RowHeaderCell>

                <Table.Cell style={{ color: maskRating ? "transparent" : ratingColor(it.rating) }}>
                  {maskRating ? (
                    <span style={{
                      display: "inline-block",
                      width: "2.5rem",
                      height: "0.85em",
                      backgroundColor: "#333",
                      borderRadius: "3px",
                      verticalAlign: "middle",
                    }} />
                  ) : (
                    it.rating ? it.rating : ""
                  )}
                </Table.Cell>

                <Table.Cell>
                  <Link
                    style={{ color: "#888888", whiteSpace: "nowrap" }}
                    target="_blank"
                    href={
                      it.contestId > 10000
                        ? `https://codeforces.com/problemset/gymProblem/${it.contestId}/${it.index}`
                        : `https://codeforces.com/problemset/problem/${it.contestId}/${it.index}`
                    }
                  >{`${it.contestId} - ${it.index}`}</Link>
                </Table.Cell>

                <Table.Cell>
                  {it.tags.map((tag, ix) => (
                    <Code
                      key={tag + it.id + ix}
                      color="gray"
                      variant="ghost"
                      className="mx-1 text-nowrap border-[0.3px] border-[#363a3f]"
                      style={{ padding: "1px 4px" }}
                    >
                      {tag}
                    </Code>
                  ))}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
}