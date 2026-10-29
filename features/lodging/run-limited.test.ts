import { expect, test } from "vitest";

import { runLimited } from "@/features/lodging/run-limited";

test("한 번에 정해진 개수까지만 동시에 실행하고, 앞으로 당긴 작업을 먼저 시작한다", async () => {
  let running = 0;
  let peak = 0;
  const started: string[] = [];
  const queue = runLimited(2, async (id: string) => {
    started.push(id);
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
  });

  queue.add(["a", "b", "c", "d"]);
  queue.prioritize("d");
  await queue.idle();

  expect(peak).toBe(2);
  expect(started.slice(0, 2)).toEqual(["a", "b"]);
  expect(started[2]).toBe("d");
  expect(started).toHaveLength(4);
});
