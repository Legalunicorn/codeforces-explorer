// src/components/TabSubmissions.jsx
import { Box, Tabs, Text } from "@radix-ui/themes";
import TableSubmissions from "./TableSubmissions";
import { useSelector } from "react-redux";
import Profile from "./Profile/Profile";
import { useViewerProblems } from "../hooks/useViewerProblems";

export default function TabSubmissions() {
  const { problemsSolved, correctSubmissions, skippedSubmissions } =
    useSelector((store) => store.user);

  const { isSolved } = useViewerProblems();

  return (
    <div>
      <Tabs.Root defaultValue="psolved">
        <Tabs.List>
          <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
          <Tabs.Trigger value="psolved">Problems Solved</Tabs.Trigger>
          <Tabs.Trigger value="correct">Correct Submissions</Tabs.Trigger>
          <Tabs.Trigger value="skipped">Skipped Submissions</Tabs.Trigger>
        </Tabs.List>

        <Box pt="3">
          <Tabs.Content value="profile">
            <Profile />
          </Tabs.Content>

          <Tabs.Content value="psolved">
            <TableSubmissions data={problemsSolved} isSolved={isSolved} />
          </Tabs.Content>

          <Tabs.Content value="correct">
            <TableSubmissions data={correctSubmissions} isSolved={isSolved} />
          </Tabs.Content>

          <Tabs.Content value="skipped">
            <Text size="2">
              <TableSubmissions data={skippedSubmissions} isSolved={isSolved} />
            </Text>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </div>
  );
}