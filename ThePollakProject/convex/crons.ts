import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run auto-return check every hour
crons.interval(
  "auto return overdue books",
  { hours: 1 },
  internal.textbooks.autoReturnOverdueBooks,
  {}
);

export default crons;
