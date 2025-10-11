import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Plus, Sparkles, TrendingUp, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function ResultsComparison() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const job = useQuery(api.finetune.getStatus, id ? { jobId: id as Id<"finetune_jobs"> } : "skip");
  const testPrompts = useQuery(api.testPrompts.listByJob, id ? { jobId: id as Id<"finetune_jobs"> } : "skip");
  const createPrompt = useMutation(api.testPrompts.create);

  const [newPrompt, setNewPrompt] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (job.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Job Not Completed</CardTitle>
            <CardDescription>
              This job is still {job.status}. Results comparison is only available for completed jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/finetune/${id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Job Monitoring
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim() || !id) return;

    setIsAdding(true);
    try {
      await createPrompt({
        jobId: id as Id<"finetune_jobs">,
        prompt: newPrompt,
        expectedOutput: expectedOutput || undefined,
      });
      toast.success("Test prompt added successfully!");
      setNewPrompt("");
      setExpectedOutput("");
    } catch (error) {
      toast.error("Failed to add test prompt");
    } finally {
      setIsAdding(false);
    }
  };

  const avgBleuScore = testPrompts && testPrompts.length > 0
    ? testPrompts.reduce((sum, p) => sum + (p.bleuScore || 0), 0) / testPrompts.filter(p => p.bleuScore).length
    : 0;

  const avgCulturalAccuracy = testPrompts && testPrompts.length > 0
    ? testPrompts.reduce((sum, p) => sum + (p.culturalAccuracy || 0), 0) / testPrompts.filter(p => p.culturalAccuracy).length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/finetune/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Results Comparison</h1>
              <p className="text-sm text-muted-foreground">{job.model} - Fine-tuned Model</p>
            </div>
          </div>
          <Badge variant="default" className="text-sm">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Model ID</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold truncate">{job.modelId || "N/A"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Avg BLEU Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{avgBleuScore > 0 ? avgBleuScore.toFixed(2) : "N/A"}</p>
                <Progress value={avgBleuScore * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Cultural Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{avgCulturalAccuracy > 0 ? `${(avgCulturalAccuracy * 100).toFixed(0)}%` : "N/A"}</p>
                <Progress value={avgCulturalAccuracy * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Add Test Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Test Prompt
              </CardTitle>
              <CardDescription>
                Test your fine-tuned model with custom prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPrompt} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Test Prompt *</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Enter a test prompt in your target language..."
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    required
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected">Expected Output (Optional)</Label>
                  <Textarea
                    id="expected"
                    placeholder="What should the model ideally respond?"
                    value={expectedOutput}
                    onChange={(e) => setExpectedOutput(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button type="submit" disabled={isAdding || !newPrompt.trim()}>
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Test Prompt
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                {testPrompts?.length || 0} test prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!testPrompts || testPrompts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No test prompts yet. Add one above to compare model outputs.
                </p>
              ) : (
                <div className="space-y-6">
                  {testPrompts.map((prompt) => (
                    <div key={prompt._id} className="border rounded-lg p-4 space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Prompt</Label>
                        <p className="text-sm font-medium mt-1">{prompt.prompt}</p>
                      </div>

                      {prompt.expectedOutput && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Expected Output</Label>
                          <p className="text-sm mt-1">{prompt.expectedOutput}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Base Model ({job.model})</Label>
                          <div className="bg-muted/50 rounded p-3 min-h-[80px]">
                            <p className="text-sm">
                              {prompt.baseModelOutput || (
                                <span className="text-muted-foreground italic">Pending evaluation...</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Fine-tuned Model
                          </Label>
                          <div className="bg-primary/5 border border-primary/20 rounded p-3 min-h-[80px]">
                            <p className="text-sm">
                              {prompt.fineTunedOutput || (
                                <span className="text-muted-foreground italic">Pending evaluation...</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {(prompt.bleuScore !== undefined || prompt.culturalAccuracy !== undefined) && (
                        <div className="flex gap-4 pt-2">
                          {prompt.bleuScore !== undefined && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">BLEU: {prompt.bleuScore.toFixed(2)}</Badge>
                            </div>
                          )}
                          {prompt.culturalAccuracy !== undefined && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                Cultural: {(prompt.culturalAccuracy * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
