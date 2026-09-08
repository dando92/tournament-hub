export type Status = "idle" | "running" | "pending" | "done" | "failed";

export const STATUS_LABEL: Record<Status, string> = {
  idle: "Not started",
  running: "In progress",
  pending: "Awaiting confirmation",
  done: "Completed",
  failed: "Failed",
};
