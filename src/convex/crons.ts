import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Poll running fine-tuning jobs every 5 minutes
crons.interval(
  "poll-finetune-jobs",
  { minutes: 5 },
  internal.finetune.pollRunningJobs,
  {}
);

export default crons;
