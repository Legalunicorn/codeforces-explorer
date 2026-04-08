// src/components/TabSubmissions.jsx
import { Box, Tabs, Text, AlertDialog, Button, Flex } from "@radix-ui/themes";
import TableSubmissions from "./TableSubmissions";
import { useSelector } from "react-redux";
import Profile from "./Profile/Profile";
import { useMarkedProblems } from "../hooks/useMarkedProblems";
import { useParams } from "react-router-dom";

export default function TabSubmissions({ setStyleBlur }) {
  const { problemsSolved, correctSubmissions, skippedSubmissions } =
    useSelector((store) => store.user);

  const [marked, toggle, isMarked, markAll, clearAll] = useMarkedProblems();
  const { id: username } = useParams();

  const solvedKeys = problemsSolved.map((p) => `${p.contestId}-${p.index}`);
  const markedCount = Object.keys(marked).length;

  function handleMarkAll() {
    markAll(solvedKeys);
  }

  return (
    <div>
      {/* ── Action bar ── */}
      <div className="mb-3 flex items-center gap-3">
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button size="1" variant="soft" color="indigo">
              Mark all as solved ({solvedKeys.length} problems)
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="420px">
            <AlertDialog.Title>Mark all as solved?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This will mark all <strong>{solvedKeys.length} problems</strong> solved
              by <strong>{username}</strong> as done in your local tracker.
              <br /><br />
              Your existing marks won't be removed — this only adds new ones.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button variant="solid" color="indigo" onClick={handleMarkAll}>
                  Yes, mark all
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>

        {markedCount > 0 && (
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button size="1" variant="soft" color="red">
                Clear all marks ({markedCount})
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="420px">
              <AlertDialog.Title>Clear all marks?</AlertDialog.Title>
              <AlertDialog.Description size="2">
                This will remove all <strong>{markedCount} marks</strong> from
                your local tracker. This cannot be undone.
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">Cancel</Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={clearAll}>
                    Yes, clear all
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        )}
      </div>

      {/* ── Tabs ── */}
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
            <TableSubmissions data={problemsSolved} toggle={toggle} isMarked={isMarked} />
          </Tabs.Content>

          <Tabs.Content value="correct">
            <TableSubmissions data={correctSubmissions} toggle={toggle} isMarked={isMarked} />
          </Tabs.Content>

          <Tabs.Content value="skipped">
            <Text size="2">
              <TableSubmissions data={skippedSubmissions} toggle={toggle} isMarked={isMarked} />
            </Text>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </div>
  );
}