import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import ContentBrowser from "./pages/ContentBrowser.tsx";
import ContentForm from "./pages/ContentForm.tsx";
import DatasetForm from "./pages/DatasetForm.tsx";
import FinetuneForm from "./pages/FinetuneForm.tsx";
import DatasetBrowser from "./pages/DatasetBrowser.tsx";
import FinetuneJobsList from "./pages/FinetuneJobsList.tsx";
import JobMonitoring from "./pages/JobMonitoring.tsx";
import ResultsComparison from "./pages/ResultsComparison.tsx";
import LLMConnections from "./pages/LLMConnections.tsx";
import ExternalDatasetImport from "./pages/ExternalDatasetImport.tsx";
import "./types/global.d.ts";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/content",
    element: <ContentBrowser />,
  },
  {
    path: "/content/new",
    element: <ContentForm />,
  },
  {
    path: "/content/:id",
    element: <ContentForm />,
  },
  {
    path: "/datasets",
    element: <DatasetBrowser />,
  },
  {
    path: "/datasets/create",
    element: <DatasetForm />,
  },
  {
    path: "/finetune",
    element: <FinetuneJobsList />,
  },
  {
    path: "/finetune/new",
    element: <FinetuneForm />,
  },
  {
    path: "/finetune/:id",
    element: <JobMonitoring />,
  },
  {
    path: "/results/:id",
    element: <ResultsComparison />,
  },
  {
    path: "/llm-connections",
    element: <LLMConnections />,
  },
  {
    path: "/external-import",
    element: <ExternalDatasetImport />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <RouterProvider router={router} />
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);