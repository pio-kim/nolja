// Runs one task per id with at most `limit` running at once. Ids added again are
// ignored; prioritize() moves a queued id to the front.
export function runLimited<T extends string>(limit: number, task: (id: T) => Promise<void>) {
  const queue: T[] = [];
  const seen = new Set<T>();
  let running = 0;
  let waiters: (() => void)[] = [];

  function pump() {
    while (running < limit && queue.length > 0) {
      const id = queue.shift() as T;
      running++;
      task(id)
        .catch(() => {})
        .finally(() => {
          running--;
          pump();
        });
    }
    if (running === 0 && queue.length === 0) {
      waiters.forEach((resolve) => resolve());
      waiters = [];
    }
  }

  return {
    add(ids: T[]) {
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        queue.push(id);
      }
      pump();
    },
    prioritize(id: T) {
      const i = queue.indexOf(id);
      if (i > 0) queue.unshift(...queue.splice(i, 1));
    },
    idle() {
      return new Promise<void>((resolve) => {
        waiters.push(resolve);
        queueMicrotask(pump);
      });
    },
  };
}
