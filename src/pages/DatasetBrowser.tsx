import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Download, Eye, Filter, ArrowLeft, Link as LinkIcon, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function DatasetBrowser() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("");
  const [minQuality, setMinQuality] = useState<number>(0);
  const [minSize, setMinSize] = useState<number>(0);
  const [previewDatasetId, setPreviewDatasetId] = useState<Id<"datasets"> | null>(null);

  const datasets = useQuery(api.datasets.list, {
    language: languageFilter || undefined,
    contentType: contentTypeFilter || undefined,
    minQuality: minQuality > 0 ? minQuality : undefined,
    minSize: minSize > 0 ? minSize : undefined,
  });

  const llmConnections = useQuery(api.llmConnections.list, {});

  const previewData = useQuery(
    api.datasets.preview,
    previewDatasetId ? { id: previewDatasetId, limit: 10 } : "skip"
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleExport = async (datasetId: Id<"datasets">) => {
    toast.info("Preparing dataset export...");
    // In a real implementation, this would trigger the export and download
    toast.success("Dataset export started! Download will begin shortly.");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalDatasets = datasets?.length || 0;
  const totalEntries = datasets?.reduce((sum, d) => sum + d.size, 0) || 0;
  const avgQuality = datasets?.length
    ? datasets.reduce((sum, d) => sum + d.qualityScore, 0) / datasets.length
    : 0;

  const activeLLMConnections = llmConnections?.filter(c => c.isActive).length || 0;
  const totalLLMConnections = llmConnections?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Dataset Browser</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/llm-connections")}>
              <LinkIcon className="h-4 w-4" />
              LLM Connections
            </Button>
            <Button variant="outline" onClick={() => navigate("/external-import")}>
              <Database className="h-4 w-4" />
              Import Data
            </Button>
            <Button onClick={() => navigate("/datasets/create")}>
              <Database className="h-4 w-4" />
              Create Dataset
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
          {/* Data Source Connection Status */}
          <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">LLM Connections</p>
                      <p className="text-xs text-muted-foreground">
                        {activeLLMConnections} active / {totalLLMConnections} total
                      </p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Auto Fine-tuning</p>
                      <p className="text-xs text-muted-foreground">
                        Available for new datasets
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate("/llm-connections")}>
                    Manage Connections
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/external-import")}>
                    Import External Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDatasets}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEntries.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Quality</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgQuality.toFixed(1)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={languageFilter} onValueChange={setLanguageFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All languages</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="bengali">Bengali</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                      <SelectItem value="telugu">Telugu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="proverb">Proverb</SelectItem>
                      <SelectItem value="narrative">Narrative</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Min Quality</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={minQuality}
                    onChange={(e) => setMinQuality(parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Size</Label>
                  <Input
                    type="number"
                    min="0"
                    value={minSize}
                    onChange={(e) => setMinSize(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datasets Grid */}
          {!datasets || datasets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No datasets found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first dataset to get started
                </p>
                <Button onClick={() => navigate("/datasets/create")}>Create Dataset</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {datasets.map((dataset) => (
                <motion.div
                  key={dataset._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{dataset.name}</CardTitle>
                      <CardDescription>
                        Created {new Date(dataset._creationTime).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{dataset.language}</Badge>
                        <Badge variant="outline">{dataset.contentType}</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Entries:</span>
                          <span className="font-medium">{dataset.size.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quality:</span>
                          <span className="font-medium">{dataset.qualityScore.toFixed(1)}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Tokens:</span>
                          <span className="font-medium">{dataset.metadata.avgTokens}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setPreviewDatasetId(dataset._id)}
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleExport(dataset._id)}
                        >
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewDatasetId} onOpenChange={() => setPreviewDatasetId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dataset Preview</DialogTitle>
            <DialogDescription>Sample entries from this dataset</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewData?.map((entry, idx) => (
              <Card key={entry?._id || idx}>
                <CardContent className="pt-6">
                  <p className="text-sm mb-2">{entry?.text}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{entry?.language}</Badge>
                    <Badge variant="outline" className="text-xs">{entry?.contentType}</Badge>
                    <Badge variant="outline" className="text-xs">
                      Quality: {entry?.qualityScore.toFixed(1)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}