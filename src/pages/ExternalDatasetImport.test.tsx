import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const { mockUseQuery, mockUseAuth, mockUseParams } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(() => undefined),
  mockUseAuth: vi.fn(() => ({
    isLoading: false,
    isAuthenticated: true,
    user: { _id: "u1", name: "Test User" },
  })),
  mockUseParams: vi.fn(() => ({})),
}));

const mockNavigate = vi.fn();
const mockCreateExternalDataset = vi.fn();
const mockCreatePipeline = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    externalDatasets: {
      create: "externalDatasets:create",
      generateUploadUrl: "externalDatasets:generateUploadUrl",
      fetchUrlContent: "externalDatasets:fetchUrlContent",
    },
    dataPipeline: {
      create: "dataPipeline:create",
      getStatus: "dataPipeline:getStatus",
    },
    llmConnections: { list: "llmConnections:list" },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: vi.fn(
    (_mutation: string) =>
      _mutation === "dataPipeline:create" ? mockCreatePipeline : mockCreateExternalDataset,
  ),
  useAction: vi.fn(() => vi.fn()),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────

function renderExternalDatasetImport() {
  return render(
    <BrowserRouter>
      <ExternalDatasetImport />
    </BrowserRouter>,
  );
}

let ExternalDatasetImport: React.ComponentType;

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("ExternalDatasetImport — auth guard", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ExternalDatasetImport = (await import("./ExternalDatasetImport")).default;
  });

  it("should redirect to /auth when not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    renderExternalDatasetImport();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  it("should show loading spinner while auth is loading", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });

    renderExternalDatasetImport();

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

describe("ExternalDatasetImport — step rendering", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ExternalDatasetImport = (await import("./ExternalDatasetImport")).default;

    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { _id: "u1", name: "Test" },
    });

    // Step 1 is shown by default
    mockUseQuery.mockReturnValue(undefined);
  });

  it("should render the page title", async () => {
    renderExternalDatasetImport();
    expect(screen.getByText("Import External Dataset")).toBeInTheDocument();
  });

  it("should show step 1 — data source selection", async () => {
    renderExternalDatasetImport();
    // Card title + label both say "Select Data Source" — use getAllByText
    expect(screen.getAllByText("Select Data Source").length).toBeGreaterThanOrEqual(1);
  });

  it("should show source option buttons", async () => {
    renderExternalDatasetImport();

    expect(screen.getByText("Upload File")).toBeInTheDocument();
    expect(screen.getByText("URL")).toBeInTheDocument();
    expect(screen.getByText("Kaggle")).toBeInTheDocument();
  });

  it("should show the Next button on step 1", async () => {
    renderExternalDatasetImport();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("should show step indicators", async () => {
    renderExternalDatasetImport();

    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Mapping")).toBeInTheDocument();
    expect(screen.getByText("Normalize")).toBeInTheDocument();
    expect(screen.getByText("Automate")).toBeInTheDocument();
    expect(screen.getByText("Execute")).toBeInTheDocument();
  });
});

describe("ExternalDatasetImport — pipeline progress", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ExternalDatasetImport = (await import("./ExternalDatasetImport")).default;

    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { _id: "u1", name: "Test" },
    });
  });

  it("should render without crashing", async () => {
    renderExternalDatasetImport();

    expect(screen.getByText("Import External Dataset")).toBeInTheDocument();
  });
});
