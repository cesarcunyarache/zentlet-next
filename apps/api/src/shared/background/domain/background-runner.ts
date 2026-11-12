/**
 * Work that must not delay the response (analytics, deferred notifications).
 * The caller does not know how it runs: today in-process via `setImmediate`,
 * later a real queue — without changing a single call site.
 */
export type BackgroundTask = () => Promise<unknown>;

export abstract class BackgroundRunner {
  abstract run(task: BackgroundTask): void;
}
