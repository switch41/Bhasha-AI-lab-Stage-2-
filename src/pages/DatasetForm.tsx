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
import { Loader2, Database, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function DatasetForm() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const createDataset = useMutation(api.datasets.create);
  const contentStats = useQuery(api.content.stats);
  const llmConnections = useQuery(api.llmConnections.list, {});

  const [formData, setFormData] = useState({
    name: "",
    language: "",
    contentType: "",
    minQualityScore: 0,
    autoNormalize: true,
    removeDuplicates: true,
    minTextLength: 10,
    maxTextLength: 10000,
    normMinQuality: 0,
    autoFinetune: false,
    provider: "openai",
    model: "gpt-3.5-turbo",
    connectionId: "",
  });

  const [isCreating, setIsCreating] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const datasetId = await createDataset({
        name: formData.name,
        language: formData.language,
        contentType: formData.contentType || undefined,
        minQualityScore: formData.minQualityScore > 0 ? formData.minQualityScore : undefined,
        autoNormalize: formData.autoNormalize,
        normalizationOptions: formData.autoNormalize ? {
          removeDuplicates: formData.removeDuplicates,
          minTextLength: formData.minTextLength > 0 ? formData.minTextLength : undefined,
          maxTextLength: formData.maxTextLength < 10000 ? formData.maxTextLength : undefined,
          minQualityScore: formData.normMinQuality > 0 ? formData.normMinQuality : undefined,
        } : undefined,
        autoFinetune: formData.autoFinetune,
        finetuneConfig: formData.autoFinetune ? {
          provider: formData.provider,
          model: formData.provider === "custom" ? "custom" : formData.model,
          connectionId: formData.provider === "custom" && formData.connectionId ? formData.connectionId as any : undefined,
        } : undefined,
      });
      toast.success(formData.autoFinetune ? "Dataset created and fine-tuning started!" : "Dataset created successfully!");
      navigate(`/datasets`);
    } catch (error) {
      toast.error("Failed to create dataset. Please try again.");
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
            <h1 className="text-2xl font-bold tracking-tight">Create Dataset</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Dataset Configuration
              </CardTitle>
              <CardDescription>
                Build a curated dataset from published content for AI training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Dataset Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Hindi Proverbs Collection"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="bengali">Bengali</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                      <SelectItem value="telugu">Telugu</SelectItem>
                      <SelectItem value="marathi">Marathi</SelectItem>
                      <SelectItem value="gujarati">Gujarati</SelectItem>
                      <SelectItem value="kannada">Kannada</SelectItem>
                      <SelectItem value="malayalam">Malayalam</SelectItem>
                      <SelectItem value="punjabi">Punjabi</SelectItem>
                      <SelectItem value="odia">Odia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type (Optional)</Label>
                  <Select
                    value={formData.contentType}
                    onValueChange={(value) => setFormData({ ...formData, contentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="proverb">Proverb</SelectItem>
                      <SelectItem value="narrative">Narrative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minQuality">Minimum Quality Score</Label>
                  <Input
                    id="minQuality"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0"
                    value={formData.minQualityScore}
                    onChange={(e) => setFormData({ ...formData, minQualityScore: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Only include content with quality score above this threshold
                  </p>
                </div>

                <Card className="bg-muted/30 border-primary/20">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <Label htmlFor="autoNormalize" className="font-medium cursor-pointer">
                          Auto-Normalize Dataset
                        </Label>
                      </div>
                      <input
                        type="checkbox"
                        id="autoNormalize"
                        checked={formData.autoNormalize}
                        onChange={(e) => setFormData({ ...formData, autoNormalize: e.target.checked })}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically clean and optimize dataset during creation
                    </p>

                    {formData.autoNormalize && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="removeDuplicates" className="text-sm">Remove Duplicates</Label>
                          <input
                            type="checkbox"
                            id="removeDuplicates"
                            checked={formData.removeDuplicates}
                            onChange={(e) => setFormData({ ...formData, removeDuplicates: e.target.checked })}
                            className="h-4 w-4 cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="minTextLength" className="text-sm">Min Text Length</Label>
                            <Input
                              id="minTextLength"
                              type="number"
                              min="0"
                              value={formData.minTextLength}
                              onChange={(e) => setFormData({ ...formData, minTextLength: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="maxTextLength" className="text-sm">Max Text Length</Label>
                            <Input
                              id="maxTextLength"
                              type="number"
                              min="0"
                              value={formData.maxTextLength}
                              onChange={(e) => setFormData({ ...formData, maxTextLength: parseInt(e.target.value) || 10000 })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="normMinQuality" className="text-sm">Normalization Min Quality</Label>
                          <Input
                            id="normMinQuality"
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={formData.normMinQuality}
                            onChange={(e) => setFormData({ ...formData, normMinQuality: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-primary/20">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <Label htmlFor="autoFinetune" className="font-medium cursor-pointer">
                          Auto-start Fine-tuning
                        </Label>
                      </div>
                      <input
                        type="checkbox"
                        id="autoFinetune"
                        checked={formData.autoFinetune}
                        onChange={(e) => setFormData({ ...formData, autoFinetune: e.target.checked })}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically start fine-tuning with AI-optimized parameters after dataset creation
                    </p>

                    {formData.autoFinetune && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="provider">Provider</Label>
                            <Select
                              value={formData.provider}
                              onValueChange={(value) => setFormData({ ...formData, provider: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="openai">OpenAI</SelectItem>
                                <SelectItem value="custom">Custom LLM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {formData.provider === "custom" ? (
                            <div className="space-y-2">
                              <Label htmlFor="connection">LLM Connection</Label>
                              <Select
                                value={formData.connectionId}
                                onValueChange={(value) => setFormData({ ...formData, connectionId: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select connection" />
                                </SelectTrigger>
                                <SelectContent>
                                  {llmConnections?.filter(c => c.isActive).map((conn) => (
                                    <SelectItem key={conn._id} value={conn._id}>
                                      {conn.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label htmlFor="model">Model</Label>
                              <Select
                                value={formData.model}
                                onValueChange={(value) => setFormData({ ...formData, model: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {contentStats && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">Available Content</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Published:</span>
                          <span className="ml-2 font-medium">{contentStats.total}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Quality:</span>
                          <span className="ml-2 font-medium">{contentStats.avgQuality.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={isCreating} className="flex-1">
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Create Dataset
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}