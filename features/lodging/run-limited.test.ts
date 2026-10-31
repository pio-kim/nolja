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

test("stop()은 대기 중인 작업을 버리고 진행 중인 작업에 중단 신호를 보내며, 이후 다시 추가할 수 있다", async () => {
  const started: string[] = [];
  const aborted: string[] = [];
  const queue = runLimited(1, async (id: string, signal: AbortSignal) => {
    started.push(id);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 5);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        aborted.push(id);
        resolve();
      });
    });
  });

  queue.add(["a", "b"]);
  queue.stop();
  await queue.idle();
  expect(started).toEqual(["a"]);
  expect(aborted).toEqual(["a"]);

  queue.add(["a"]);
  await queue.idle();
  expect(started).toEqual(["a", "a"]);
});
