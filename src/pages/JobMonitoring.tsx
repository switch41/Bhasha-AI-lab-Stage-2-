import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useParams } from "react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, XCircle, CheckCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function JobMonitoring() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const job = useQuery(api.finetune.getStatus, id ? { jobId: id as Id<"finetune_jobs"> } : "skip");
  const dataset = useQuery(api.datasets.getById, job?.datasetId ? { id: job.datasetId } : "skip");
  const cancelJob = useMutation(api.finetune.cancel);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Auto-refresh when job is running
  useEffect(() => {
    if (job?.status === "running") {
      const interval = setInterval(() => {
        // Convex queries auto-refresh, so we just need to keep the component mounted
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [job?.status]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await cancelJob({ jobId: id as Id<"finetune_jobs"> });
      toast.success("Job cancelled successfully");
    } catch (error) {
      toast.error("Failed to cancel job");
    }
  };

  if (isLoading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const progress = job.status === "completed" ? 100 
    : job.status === "running" ? (job.metrics.currentEpoch / job.parameters.epochs) * 100
    : 0;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "running": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/finetune")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Job Monitoring</h1>
              <p className="text-sm text-muted-foreground">{job.model} on {job.provider}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {job.status === "running" && (
              <Button variant="destructive" onClick={handleCancel}>
                <XCircle className="h-4 w-4" />
                Cancel Job
              </Button>
            )}
            {job.status === "completed" && (
              <Button onClick={() => navigate(`/results/${job._id}`)}>
                <CheckCircle className="h-4 w-4" />
                View Results
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Status</CardTitle>
                <Badge variant={getStatusVariant(job.status)} className="text-sm">
                  {job.status}
                </Badge>
              </div>
              <CardDescription>
                Created {new Date(job._creationTime).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">
                  Epoch {job.metrics.currentEpoch} of {job.parameters.epochs}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dataset Info */}
          <Card>
            <CardHeader>
              <CardTitle>Dataset Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{dataset?.name || "Loading..."}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language:</span>
                <span className="font-medium">{dataset?.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{dataset?.size.toLocaleString()} entries</span>
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Training Parameters</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Learning Rate</p>
                <p className="text-lg font-medium">{job.parameters.learningRate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch Size</p>
                <p className="text-lg font-medium">{job.parameters.batchSize}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Epochs</p>
                <p className="text-lg font-medium">{job.parameters.epochs}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LoRA Rank</p>
                <p className="text-lg font-medium">{job.parameters.loraRank}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LoRA Alpha</p>
                <p className="text-lg font-medium">{job.parameters.loraAlpha}</p>
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Training Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Steps</p>
                  <p className="text-2xl font-bold">{job.metrics.steps}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Loss</p>
                  <p className="text-2xl font-bold">
                    {job.metrics.loss.length > 0 
                      ? job.metrics.loss[job.metrics.loss.length - 1].toFixed(4)
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
              {job.metrics.loss.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Loss History</p>
                  <div className="h-32 flex items-end gap-1">
                    {job.metrics.loss.slice(-20).map((loss, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-primary rounded-t"
                        style={{ height: `${Math.max(5, (1 - loss) * 100)}%` }}
                        title={`Step ${idx + 1}: ${loss.toFixed(4)}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost & Time */}
          <Card>
            <CardHeader>
              <CardTitle>Cost & Time Tracking</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-lg font-medium">${job.estimatedCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <p className="text-lg font-medium">{job.estimatedTimeMinutes} min</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}