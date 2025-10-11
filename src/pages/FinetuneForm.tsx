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
import { Loader2, Sparkles, ArrowLeft, Brain, Zap, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export default function FinetuneForm() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const datasets = useQuery(api.datasets.list, {});
  const llmConnections = useQuery(api.llmConnections.list, {});
  const createJob = useMutation(api.finetune.create);

  const [selectedDatasetId, setSelectedDatasetId] = useState<Id<"datasets"> | null>(null);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [selectedConnectionId, setSelectedConnectionId] = useState<Id<"llm_connections"> | null>(null);
  
  const recommendations = useQuery(
    api.finetune.recommend,
    selectedDatasetId ? { datasetId: selectedDatasetId } : "skip"
  );

  const splitRecommendations = useQuery(
    api.finetune.recommendSplit,
    selectedDatasetId ? { datasetId: selectedDatasetId } : "skip"
  );

  const [parameters, setParameters] = useState({
    learningRate: 0.00003,
    batchSize: 16,
    epochs: 3,
    loraRank: 8,
    loraAlpha: 16,
  });

  const [splitMode, setSplitMode] = useState<"smart" | "manual">("smart");
  const [dataSplit, setDataSplit] = useState({
    train: 0.8,
    validation: 0.1,
    test: 0.1,
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

  useEffect(() => {
    if (splitRecommendations && splitMode === "smart") {
      setDataSplit(splitRecommendations.split);
    }
  }, [splitRecommendations, splitMode]);

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

    if (provider === "custom" && !selectedConnectionId) {
      toast.error("Please select an LLM connection");
      return;
    }

    // Validate split ratios
    const totalSplit = dataSplit.train + dataSplit.validation + dataSplit.test;
    if (Math.abs(totalSplit - 1.0) > 0.01) {
      toast.error("Data split ratios must sum to 1.0 (100%)");
      return;
    }

    setIsCreating(true);

    try {
      const jobId = await createJob({
        datasetId: selectedDatasetId,
        parameters,
        provider,
        model: provider === "custom" ? "custom" : model,
        connectionId: provider === "custom" && selectedConnectionId ? selectedConnectionId : undefined,
        dataSplit,
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
                  >
                    <SelectTrigger className="w-full">
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

                <div className="space-y-2">
                  <Label htmlFor="baseModel">Base Model *</Label>
                  <Select
                    value={provider === "openai" ? model : selectedConnectionId ?? undefined}
                    onValueChange={(value) => {
                      if (value === "gpt-3.5-turbo" || value === "gpt-4") {
                        setProvider("openai");
                        setModel(value);
                      } else {
                        setProvider("custom");
                        setSelectedConnectionId(value as Id<"llm_connections">);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select base model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (OpenAI)</SelectItem>
                      <SelectItem value="gpt-4">GPT-4 (OpenAI)</SelectItem>
                      {llmConnections?.filter(c => c.isActive).map((conn) => (
                        <SelectItem key={conn._id} value={conn._id}>
                          {conn.name} (Custom)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!llmConnections || llmConnections.filter(c => c.isActive).length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      No custom LLM connections found.{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => navigate("/llm-connections")}
                      >
                        Add one now
                      </Button>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedDatasetId && splitRecommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Data Split Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure how your dataset is split for training, validation, and testing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card
                      className={`cursor-pointer transition-all ${
                        splitMode === "smart"
                          ? "border-primary ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setSplitMode("smart")}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <h4 className="font-semibold text-sm">Smart Split</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          AI-optimized split based on dataset size
                        </p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-all ${
                        splitMode === "manual"
                          ? "border-primary ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setSplitMode("manual")}
                    >
                      <CardContent className="pt-4 pb-4">
                        <h4 className="font-semibold text-sm mb-1">Manual Split</h4>
                        <p className="text-xs text-muted-foreground">
                          Configure your own split ratios
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {splitMode === "smart" ? (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Training</Label>
                          <div className="text-2xl font-bold">{(dataSplit.train * 100).toFixed(0)}%</div>
                          <p className="text-xs text-muted-foreground">{splitRecommendations.sizes.train} samples</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Validation</Label>
                          <div className="text-2xl font-bold">{(dataSplit.validation * 100).toFixed(0)}%</div>
                          <p className="text-xs text-muted-foreground">{splitRecommendations.sizes.validation} samples</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Test</Label>
                          <div className="text-2xl font-bold">{(dataSplit.test * 100).toFixed(0)}%</div>
                          <p className="text-xs text-muted-foreground">{splitRecommendations.sizes.test} samples</p>
                        </div>
                      </div>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4 pb-4">
                          <p className="text-sm">{splitRecommendations.reasoning.overall}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Confidence: {(splitRecommendations.confidence * 100).toFixed(0)}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="trainSplit" className="text-xs">Training %</Label>
                          <Input
                            id="trainSplit"
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={dataSplit.train}
                            onChange={(e) => setDataSplit({ ...dataSplit, train: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="validationSplit" className="text-xs">Validation %</Label>
                          <Input
                            id="validationSplit"
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={dataSplit.validation}
                            onChange={(e) => setDataSplit({ ...dataSplit, validation: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="testSplit" className="text-xs">Test %</Label>
                          <Input
                            id="testSplit"
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={dataSplit.test}
                            onChange={(e) => setDataSplit({ ...dataSplit, test: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total: {((dataSplit.train + dataSplit.validation + dataSplit.test) * 100).toFixed(0)}% (must equal 100%)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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