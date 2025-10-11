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

  const [formData, setFormData] = useState({
    name: "",
    language: "",
    contentType: "",
    minQualityScore: 0,
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
      });
      toast.success("Dataset created successfully!");
      navigate(`/datasets/${datasetId}`);
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
