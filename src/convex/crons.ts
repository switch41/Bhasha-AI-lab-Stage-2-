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

// Process pending test prompt evaluations every 2 minutes
// TODO: Re-enable once types are generated
// crons.interval(
//   "process-test-prompts",
//   { minutes: 2 },
//   (internal as any).providers_evaluation.processPendingPrompts,
//   {}
// );

export default crons;