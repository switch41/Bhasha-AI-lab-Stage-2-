import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Plus, ArrowLeft, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function FinetuneJobsList() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const allJobs = useQuery(api.finetune.listJobs, {});
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const filteredJobs = statusFilter && statusFilter !== "all"
    ? allJobs?.filter(job => job.status === statusFilter)
    : allJobs;

  const totalJobs = allJobs?.length || 0;
  const runningJobs = allJobs?.filter(j => j.status === "running").length || 0;
  const completedJobs = allJobs?.filter(j => j.status === "completed").length || 0;
  const totalCost = allJobs?.reduce((sum, j) => sum + j.estimatedCost, 0) || 0;

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
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Fine-tuning Jobs</h1>
          </div>
          <Button onClick={() => navigate("/finetune/new")}>
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalJobs}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Running</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{runningJobs}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedJobs}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Filter by status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Table */}
          {!filteredJobs || filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No jobs found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start your first fine-tuning job
                </p>
                <Button onClick={() => navigate("/finetune/new")}>Create Job</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job._id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{job.model}</TableCell>
                      <TableCell>{job.provider}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(job.status)}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(job._creationTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${job.estimatedCost.toFixed(2)}</TableCell>
                      <TableCell>
                        {job.status === "running" 
                          ? `Epoch ${job.metrics.currentEpoch}/${job.parameters.epochs}`
                          : job.status === "completed" ? "100%" : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/finetune/${job._id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
