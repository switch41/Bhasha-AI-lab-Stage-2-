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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Plug, Trash2, Power, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export default function LLMConnections() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const connections = useQuery(api.llmConnections.list, {});
  const createConnection = useMutation(api.llmConnections.create);
  const updateConnection = useMutation(api.llmConnections.update);
  const removeConnection = useMutation(api.llmConnections.remove);
  const toggleActive = useMutation(api.llmConnections.toggleActive);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    apiEndpoint: "",
    authType: "bearer" as "bearer" | "api_key" | "none",
    apiKey: "",
    dataFormat: "jsonl" as "jsonl" | "json" | "csv",
    statusEndpoint: "",
    modelIdentifier: "",
  });

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
    
    if (!formData.name || !formData.apiEndpoint) {
      toast.error("Name and API endpoint are required");
      return;
    }

    setIsSubmitting(true);

    try {
      await createConnection({
        name: formData.name,
        apiEndpoint: formData.apiEndpoint,
        authType: formData.authType,
        apiKey: formData.apiKey || undefined,
        dataFormat: formData.dataFormat,
        statusEndpoint: formData.statusEndpoint || undefined,
        modelIdentifier: formData.modelIdentifier || undefined,
      });
      
      toast.success("LLM connection created successfully!");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        apiEndpoint: "",
        authType: "bearer",
        apiKey: "",
        dataFormat: "jsonl",
        statusEndpoint: "",
        modelIdentifier: "",
      });
    } catch (error) {
      toast.error("Failed to create connection. Please check your inputs.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"llm_connections">) => {
    try {
      await removeConnection({ id });
      toast.success("Connection deleted successfully");
    } catch (error) {
      toast.error("Failed to delete connection");
      console.error(error);
    }
  };

  const handleToggle = async (id: Id<"llm_connections">) => {
    try {
      await toggleActive({ id });
      toast.success("Connection status updated");
    } catch (error) {
      toast.error("Failed to update connection status");
      console.error(error);
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
            <h1 className="text-2xl font-bold tracking-tight">LLM Connections</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Custom LLM Connection</DialogTitle>
                <DialogDescription>
                  Connect your own LLM for fine-tuning with your datasets
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Connection Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Custom LLM"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint URL *</Label>
                  <Input
                    id="apiEndpoint"
                    type="url"
                    placeholder="https://api.example.com/v1/finetune"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authType">Authentication Type</Label>
                    <Select
                      value={formData.authType}
                      onValueChange={(value: any) => setFormData({ ...formData, authType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataFormat">Data Format</Label>
                    <Select
                      value={formData.dataFormat}
                      onValueChange={(value: any) => setFormData({ ...formData, dataFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jsonl">JSONL</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.authType !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key / Token</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key or token"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="statusEndpoint">Status Endpoint (Optional)</Label>
                  <Input
                    id="statusEndpoint"
                    type="url"
                    placeholder="https://api.example.com/v1/status"
                    value={formData.statusEndpoint}
                    onChange={(e) => setFormData({ ...formData, statusEndpoint: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the main endpoint for status checks
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelIdentifier">Model Identifier (Optional)</Label>
                  <Input
                    id="modelIdentifier"
                    placeholder="my-custom-model-v1"
                    value={formData.modelIdentifier}
                    onChange={(e) => setFormData({ ...formData, modelIdentifier: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plug className="mr-2 h-4 w-4" />
                        Create Connection
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {!connections || connections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plug className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No LLM Connections</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect your own LLM to start fine-tuning with your datasets
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Connection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {connections.map((connection) => (
                <Card key={connection._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {connection.name}
                          {connection.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {connection.testStatus === "success" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {connection.testStatus === "failed" && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {connection.apiEndpoint}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggle(connection._id)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(connection._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Auth Type:</span>
                        <div className="font-medium">{connection.authType}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data Format:</span>
                        <div className="font-medium uppercase">{connection.dataFormat}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Model ID:</span>
                        <div className="font-medium">{connection.modelIdentifier || "Auto"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Tested:</span>
                        <div className="font-medium">
                          {connection.lastTested
                            ? new Date(connection.lastTested).toLocaleDateString()
                            : "Never"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
