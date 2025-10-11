import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ArrowLeft, Brain, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export default function FinetuneForm() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const datasets = useQuery(api.datasets.list, {});
  const createJob = useMutation(api.finetune.create);

  const [selectedDatasetId, setSelectedDatasetId] = useState<Id<"datasets"> | null>(null);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-3.5-turbo");
  
  const recommendations = useQuery(
    api.finetune.recommend,
    selectedDatasetId ? { datasetId: selectedDatasetId } : "skip"
  );

  const [parameters, setParameters] = useState({
    learningRate: 0.00003,
    batchSize: 16,
    epochs: 3,
    loraRank: 8,
    loraAlpha: 16,
  });

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (recommendations) {
      setParameters(recommendations.parameters);
    }
  }, [recommendations]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDatasetId) {
      toast.error("Please select a dataset");
      return;
    }

    setIsCreating(true);

    try {
      const jobId = await createJob({
        datasetId: selectedDatasetId,
        parameters,
        provider,
        model,
      });
      toast.success("Fine-tuning job created successfully!");
      navigate(`/finetune/${jobId}`);
    } catch (error) {
      toast.error("Failed to create fine-tuning job. Please try again.");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Start Fine-tuning</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Dataset Selection
                </CardTitle>
                <CardDescription>
                  Choose a dataset to train your AI model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dataset">Dataset *</Label>
                  <Select
                    value={selectedDatasetId ?? undefined}
                    onValueChange={(value) => setSelectedDatasetId(value as Id<"datasets">)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets?.map((dataset) => (
                        <SelectItem key={dataset._id} value={dataset._id}>
                          {dataset.name} ({dataset.size} entries, {dataset.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider *</Label>
                    <Select value={provider} onValueChange={setProvider} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="huggingface">Hugging Face</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Base Model *</Label>
                    <Select value={model} onValueChange={setModel} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI-Optimized Parameters
                  </CardTitle>
                  <CardDescription>
                    Recommended settings based on your dataset (Confidence: {(recommendations.confidence * 100).toFixed(0)}%)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="learningRate">Learning Rate</Label>
                      <Input
                        id="learningRate"
                        type="number"
                        step="0.00001"
                        value={parameters.learningRate}
                        onChange={(e) => setParameters({ ...parameters, learningRate: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">{recommendations.reasoning.learningRate}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="batchSize">Batch Size</Label>
                      <Input
                        id="batchSize"
                        type="number"
                        value={parameters.batchSize}
                        onChange={(e) => setParameters({ ...parameters, batchSize: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">{recommendations.reasoning.batchSize}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="epochs">Epochs</Label>
                      <Input
                        id="epochs"
                        type="number"
                        value={parameters.epochs}
                        onChange={(e) => setParameters({ ...parameters, epochs: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">{recommendations.reasoning.epochs}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loraRank">LoRA Rank</Label>
                      <Input
                        id="loraRank"
                        type="number"
                        value={parameters.loraRank}
                        onChange={(e) => setParameters({ ...parameters, loraRank: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">{recommendations.reasoning.lora}</p>
                    </div>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="font-medium">Estimates</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Estimated Cost:</span>
                          <div className="text-2xl font-bold">${recommendations.estimatedCost}</div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Estimated Time:</span>
                          <div className="text-2xl font-bold">{recommendations.estimatedTimeMinutes} min</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={isCreating || !selectedDatasetId} className="flex-1">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Start Fine-tuning
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
