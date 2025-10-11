import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Database, Sparkles, Globe, TrendingUp, Users, Zap, ArrowRight, BookOpen } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold tracking-tight">Bhasha AI Lab</h1>
          </div>
          <Button onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}>
            {isAuthenticated ? "Dashboard" : "Get Started"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Globe className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Preserve & Empower
            <br />
            <span className="text-primary">Indian Languages</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Build AI models for low-resource Indian languages. Contribute content, create datasets, and fine-tune models to preserve linguistic diversity.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}>
              {isAuthenticated ? "Go to Dashboard" : "Start Contributing"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/content")}>
              <BookOpen className="mr-2 h-5 w-5" />
              Browse Content
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            Complete AI Training Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Database className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Content Contribution</CardTitle>
                <CardDescription>
                  Add text, proverbs, and narratives in regional languages with cultural context
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Sparkles className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Dataset Creation</CardTitle>
                <CardDescription>
                  Build curated datasets with quality filtering and smart categorization
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle>AI Fine-tuning</CardTitle>
                <CardDescription>
                  Train models with AI-optimized parameters and real-time monitoring
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Quality Scoring</CardTitle>
                <CardDescription>
                  Automatic quality assessment ensures high-standard training data
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Collaborative</CardTitle>
                <CardDescription>
                  Community-driven approach to preserve linguistic heritage
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Multi-lingual</CardTitle>
                <CardDescription>
                  Support for Hindi, Bengali, Tamil, Telugu, and more regional languages
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10+</div>
              <div className="text-muted-foreground">Languages</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">1000+</div>
              <div className="text-muted-foreground">Content Entries</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Datasets</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100+</div>
              <div className="text-muted-foreground">Models Trained</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Ready to Preserve Linguistic Heritage?
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Join our community of contributors and help build AI models for Indian languages
              </p>
              <Button size="lg" variant="secondary" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}>
                {isAuthenticated ? "Go to Dashboard" : "Get Started Now"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Bhasha AI Lab. Preserving linguistic diversity through AI.</p>
        </div>
      </footer>
    </div>
  );
}