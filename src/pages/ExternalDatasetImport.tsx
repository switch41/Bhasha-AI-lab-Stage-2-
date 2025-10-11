import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, ArrowRight, Upload, Link as LinkIcon, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type DataSource = "upload" | "url" | "kaggle";

export default function ExternalDatasetImport() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [dataSource, setDataSource] = useState<DataSource>("upload");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  
  // Field mappings
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({
    text: "",
    language: "",
    contentType: "",
    region: "",
    category: "",
    source: "",
    dialect: "",
    culturalContext: "",
  });

  // Pipeline config
  const [config, setConfig] = useState({
    autoDetectLanguage: false,
    removeDuplicates: true,
    enableAIAnalysis: false,
    defaultContentType: "text",
    defaultStatus: "published",
    minQualityThreshold: 0,
    autoCreateDataset: true,
    datasetName: "",
    autoFinetune: false,
    connectionId: "",
    model: "",
  });

  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const pipelineStatus = useQuery(
    api.dataPipeline.getStatus,
    pipelineId ? { pipelineId: pipelineId as any } : "skip"
  );

  const llmConnections = useQuery(api.llmConnections.list);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setDatasetName(file.name.replace(/\.[^/.]+$/, ""));

    // Read and preview file
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Simple CSV parsing for preview
      const lines = content.split("\n").slice(0, 11); // Header + 10 rows
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      setDetectedColumns(headers);

      const preview = lines.slice(1, 11).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || "";
        });
        return row;
      });

      setPreviewData(preview);
      toast.success("File loaded successfully!");
    };

    reader.readAsText(file);
  };

  const handleNext = () => {
    if (currentStep === 1 && !uploadedFile && !sourceIdentifier) {
      toast.error("Please select a data source");
      return;
    }
    if (currentStep === 2 && !fieldMappings.text) {
      toast.error("Please map the 'text' field");
      return;
    }
    if (currentStep === 2 && !fieldMappings.language) {
      toast.error("Please map the 'language' field");
      return;
    }
    if (currentStep === 2 && !fieldMappings.contentType) {
      toast.error("Please map the 'contentType' field");
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStartPipeline = async () => {
    toast.info("Pipeline feature is under development. Core infrastructure is ready!");
    // Pipeline creation will be implemented in the next phase
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Select Data Source</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className={`cursor-pointer transition-all ${dataSource === "upload" ? "border-primary ring-2 ring-primary" : ""}`}
                  onClick={() => setDataSource("upload")}
                >
                  <CardContent className="pt-6 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold">File Upload</h3>
                    <p className="text-sm text-muted-foreground">CSV, JSON, JSONL</p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${dataSource === "url" ? "border-primary ring-2 ring-primary" : ""}`}
                  onClick={() => setDataSource("url")}
                >
                  <CardContent className="pt-6 text-center">
                    <LinkIcon className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold">URL</h3>
                    <p className="text-sm text-muted-foreground">Direct download link</p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${dataSource === "kaggle" ? "border-primary ring-2 ring-primary" : ""}`}
                  onClick={() => setDataSource("kaggle")}
                >
                  <CardContent className="pt-6 text-center">
                    <Database className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold">Kaggle</h3>
                    <p className="text-sm text-muted-foreground">Dataset identifier</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {dataSource === "upload" && (
              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.json,.jsonl"
                  onChange={handleFileUpload}
                />
                {uploadedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            )}

            {dataSource === "url" && (
              <div className="space-y-2">
                <Label htmlFor="url">Dataset URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com/dataset.csv"
                  value={sourceIdentifier}
                  onChange={(e) => setSourceIdentifier(e.target.value)}
                />
              </div>
            )}

            {dataSource === "kaggle" && (
              <div className="space-y-2">
                <Label htmlFor="kaggle">Kaggle Dataset Identifier</Label>
                <Input
                  id="kaggle"
                  placeholder="username/dataset-name"
                  value={sourceIdentifier}
                  onChange={(e) => setSourceIdentifier(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Configure Kaggle API keys in the API Keys tab
                </p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Data Preview</h3>
              <p className="text-sm text-muted-foreground mb-4">
                First 10 rows of your dataset
              </p>
              <div className="border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {detectedColumns.map((col) => (
                        <th key={col} className="px-4 py-2 text-left font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-t">
                        {detectedColumns.map((col) => (
                          <td key={col} className="px-4 py-2">
                            {String(row[col] || "").substring(0, 50)}
                            {String(row[col] || "").length > 50 ? "..." : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Field Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(fieldMappings).map((targetField) => (
                  <div key={targetField} className="space-y-2">
                    <Label>
                      {targetField}
                      {["text", "language", "contentType"].includes(targetField) && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    <Select
                      value={fieldMappings[targetField]}
                      onValueChange={(value) =>
                        setFieldMappings({ ...fieldMappings, [targetField]: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {detectedColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Auto-detect Language</Label>
                <Switch
                  checked={config.autoDetectLanguage}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, autoDetectLanguage: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Remove Duplicates</Label>
                <Switch
                  checked={config.removeDuplicates}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, removeDuplicates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable AI Quality Analysis</Label>
                <Switch
                  checked={config.enableAIAnalysis}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, enableAIAnalysis: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Default Content Type</Label>
                <Select
                  value={config.defaultContentType}
                  onValueChange={(value) =>
                    setConfig({ ...config, defaultContentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="proverb">Proverb</SelectItem>
                    <SelectItem value="narrative">Narrative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Status</Label>
                <Select
                  value={config.defaultStatus}
                  onValueChange={(value) =>
                    setConfig({ ...config, defaultStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Quality Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={config.minQualityThreshold}
                  onChange={(e) =>
                    setConfig({ ...config, minQualityThreshold: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-create Dataset</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create a dataset after import
                  </p>
                </div>
                <Switch
                  checked={config.autoCreateDataset}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, autoCreateDataset: checked })
                  }
                />
              </div>

              {config.autoCreateDataset && (
                <div className="space-y-2 ml-6">
                  <Label>Dataset Name</Label>
                  <Input
                    value={config.datasetName}
                    onChange={(e) =>
                      setConfig({ ...config, datasetName: e.target.value })
                    }
                    placeholder="My Imported Dataset"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-start Fine-tuning</Label>
                  <p className="text-sm text-muted-foreground">
                    Start fine-tuning after dataset creation
                  </p>
                </div>
                <Switch
                  checked={config.autoFinetune}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, autoFinetune: checked })
                  }
                  disabled={!config.autoCreateDataset}
                />
              </div>

              {config.autoFinetune && config.autoCreateDataset && (
                <div className="space-y-4 ml-6">
                  <div className="space-y-2">
                    <Label>LLM Connection</Label>
                    <Select
                      value={config.connectionId}
                      onValueChange={(value) =>
                        setConfig({ ...config, connectionId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select LLM" />
                      </SelectTrigger>
                      <SelectContent>
                        {llmConnections?.map((conn) => (
                          <SelectItem key={conn._id} value={conn._id}>
                            {conn.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Base Model</Label>
                    <Input
                      value={config.model}
                      onChange={(e) =>
                        setConfig({ ...config, model: e.target.value })
                      }
                      placeholder="gpt-3.5-turbo"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
                  <h3 className="text-xl font-semibold">Pipeline Ready!</h3>
                  <p className="text-muted-foreground">
                    Your automated data pipeline is configured and ready to start.
                  </p>
                  <div className="text-sm text-left space-y-2 max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Source:</span>
                      <span className="font-medium">{dataSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remove Duplicates:</span>
                      <span className="font-medium">{config.removeDuplicates ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Analysis:</span>
                      <span className="font-medium">{config.enableAIAnalysis ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto-create Dataset:</span>
                      <span className="font-medium">{config.autoCreateDataset ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto-start Fine-tuning:</span>
                      <span className="font-medium">{config.autoFinetune ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleStartPipeline}
              className="w-full"
              size="lg"
            >
              Start Pipeline
            </Button>
          </div>
        );

      default:
        return null;
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
            <h1 className="text-2xl font-bold tracking-tight">Import External Dataset</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === currentStep
                      ? "bg-primary text-primary-foreground"
                      : step < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
                </div>
                {step < 5 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex items-center justify-between text-sm">
            <span className={currentStep === 1 ? "font-semibold" : "text-muted-foreground"}>
              Source
            </span>
            <span className={currentStep === 2 ? "font-semibold" : "text-muted-foreground"}>
              Mapping
            </span>
            <span className={currentStep === 3 ? "font-semibold" : "text-muted-foreground"}>
              Normalize
            </span>
            <span className={currentStep === 4 ? "font-semibold" : "text-muted-foreground"}>
              Automate
            </span>
            <span className={currentStep === 5 ? "font-semibold" : "text-muted-foreground"}>
              Execute
            </span>
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && "Select Data Source"}
                {currentStep === 2 && "Map Fields"}
                {currentStep === 3 && "Configure Normalization"}
                {currentStep === 4 && "Automation Settings"}
                {currentStep === 5 && "Review & Execute"}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Choose where to import your dataset from"}
                {currentStep === 2 && "Map your data columns to internal fields"}
                {currentStep === 3 && "Configure data cleaning and validation"}
                {currentStep === 4 && "Set up automated dataset creation and fine-tuning"}
                {currentStep === 5 && "Review your configuration and start the pipeline"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          {currentStep < 5 && (
            <div className="flex gap-4">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button onClick={handleNext} className="flex-1">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
