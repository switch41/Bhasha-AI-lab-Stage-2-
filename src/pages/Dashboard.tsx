import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Sparkles, BarChart3, Plus, FileText, Brain, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const contentStats = useQuery(api.content.stats);
  const recentContent = useQuery(api.content.list, { limit: 5 });
  const datasets = useQuery(api.datasets.list, {});
  const finetuneJobs = useQuery(api.finetune.listJobs, { limit: 5 });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8 cursor-pointer" onClick={() => navigate("/")} />
            <h1 className="text-2xl font-bold tracking-tight">Bhasha AI Lab</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user.name || user.email}</span>
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contentStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Published entries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Datasets</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datasets?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Ready for training</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fine-tune Jobs</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{finetuneJobs?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Training runs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Quality</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contentStats?.avgQuality ? contentStats.avgQuality.toFixed(1) : "0.0"}
                </div>
                <p className="text-xs text-muted-foreground">Content score</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your AI training workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-auto py-6 flex flex-col gap-2" onClick={() => navigate("/content/new")}>
                  <Plus className="h-6 w-6" />
                  <span className="font-semibold">Add Content</span>
                  <span className="text-xs text-muted-foreground">Contribute new data</span>
                </Button>
                <Button className="h-auto py-6 flex flex-col gap-2" variant="outline" onClick={() => navigate("/datasets/create")}>
                  <Database className="h-6 w-6" />
                  <span className="font-semibold">Create Dataset</span>
                  <span className="text-xs text-muted-foreground">Build training set</span>
                </Button>
                <Button className="h-auto py-6 flex flex-col gap-2" variant="outline" onClick={() => navigate("/finetune/new")}>
                  <Sparkles className="h-6 w-6" />
                  <span className="font-semibold">Start Fine-tuning</span>
                  <span className="text-xs text-muted-foreground">Train your model</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Content */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Content</CardTitle>
                <CardDescription>Your latest contributions</CardDescription>
              </CardHeader>
              <CardContent>
                {!recentContent || recentContent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No content yet. Start contributing!</p>
                ) : (
                  <div className="space-y-4">
                    {recentContent.map((content) => (
                      <div key={content._id} className="flex items-start justify-between border-b pb-3 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">{content.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{content.language}</Badge>
                            <Badge variant="outline" className="text-xs">{content.contentType}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/content/${content._id}`)}>
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Fine-tuning Jobs</CardTitle>
                <CardDescription>Training progress</CardDescription>
              </CardHeader>
              <CardContent>
                {!finetuneJobs || finetuneJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No jobs yet. Create your first dataset!</p>
                ) : (
                  <div className="space-y-4">
                    {finetuneJobs.map((job) => (
                      <div key={job._id} className="flex items-start justify-between border-b pb-3 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{job.model}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={job.status === "completed" ? "default" : job.status === "running" ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {job.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{job.provider}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/finetune/${job._id}`)}>
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
