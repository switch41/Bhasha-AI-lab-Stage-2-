import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ContentForm() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const existingContent = useQuery(api.content.get, id ? { id: id as any } : "skip");
  const createContent = useMutation(api.content.create);
  const updateContent = useMutation(api.content.update);

  const [formData, setFormData] = useState({
    text: "",
    language: "",
    contentType: "text" as "text" | "proverb" | "narrative",
    region: "",
    category: "",
    source: "",
    dialect: "",
    culturalContext: "",
    status: "draft" as "draft" | "published",
    enableAIAnalysis: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (existingContent) {
      setFormData({
        text: existingContent.text,
        language: existingContent.language,
        contentType: existingContent.contentType,
        region: existingContent.region || "",
        category: existingContent.category || "",
        source: existingContent.source || "",
        dialect: existingContent.dialect || "",
        culturalContext: existingContent.culturalContext || "",
        status: existingContent.status,
        enableAIAnalysis: false,
      });
    }
  }, [existingContent]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (id) {
        await updateContent({
          id: id as any,
          ...formData,
        });
        toast.success("Content updated successfully!");
      } else {
        await createContent(formData);
        toast.success("Content created successfully!" + (formData.enableAIAnalysis ? " AI analysis in progress..." : ""));
      }
      navigate("/content");
    } catch (error) {
      toast.error("Failed to save content. Please try again.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/content")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {id ? "Edit Content" : "Add New Content"}
            </h1>
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
              <CardTitle>Content Details</CardTitle>
              <CardDescription>
                Add linguistic content to help build AI models for Indian languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="text">Text Content *</Label>
                  <Textarea
                    id="text"
                    placeholder="Enter the text content..."
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    required
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="contentType">Content Type *</Label>
                    <Select
                      value={formData.contentType}
                      onValueChange={(value: any) => setFormData({ ...formData, contentType: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="proverb">Proverb</SelectItem>
                        <SelectItem value="narrative">Narrative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      placeholder="e.g., Maharashtra, Tamil Nadu"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Folk, Literature, Daily"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialect">Dialect</Label>
                    <Input
                      id="dialect"
                      placeholder="e.g., Awadhi, Bhojpuri"
                      value={formData.dialect}
                      onChange={(e) => setFormData({ ...formData, dialect: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input
                      id="source"
                      placeholder="e.g., Book, Oral tradition"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="culturalContext">Cultural Context</Label>
                  <Textarea
                    id="culturalContext"
                    placeholder="Describe the cultural significance or context..."
                    value={formData.culturalContext}
                    onChange={(e) => setFormData({ ...formData, culturalContext: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!id && (
                  <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                    <input
                      type="checkbox"
                      id="aiAnalysis"
                      checked={formData.enableAIAnalysis}
                      onChange={(e) => setFormData({ ...formData, enableAIAnalysis: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <Label htmlFor="aiAnalysis" className="cursor-pointer font-medium">
                        Enable AI Quality Analysis
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use Gemini API to automatically analyze content quality, cultural authenticity, and preservation value
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={isSaving} className="flex-1">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {id ? "Update Content" : "Create Content"}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/content")}>
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