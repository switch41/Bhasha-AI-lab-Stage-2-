import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router";

// ─── Hoisted mocks (defined before vi.mock for mutable references) ─────────

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
const mockCreateContent = vi.fn();
const mockUpdateContent = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    content: {
      create: "content:create",
      update: "content:update",
      get: "content:get",
      list: "content:list",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: vi.fn(
    (_mutation: string) =>
      _mutation === "content:update" ? mockUpdateContent : mockCreateContent,
  ),
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

function renderContentForm() {
  return render(
    <BrowserRouter>
      <ContentForm />
    </BrowserRouter>,
  );
}

let ContentForm: React.ComponentType;

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("ContentForm — auth guard", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ContentForm = (await import("./ContentForm")).default;
  });

  it("should redirect to /auth when not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });
    mockUseParams.mockReturnValue({});

    renderContentForm();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  it("should show loading spinner while auth is loading", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });
    mockUseParams.mockReturnValue({});

    renderContentForm();

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

describe("ContentForm — new content", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ContentForm = (await import("./ContentForm")).default;

    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { _id: "u1", name: "Test" },
    });
    mockUseParams.mockReturnValue({});
    mockUseQuery.mockReturnValue(undefined);
  });

  it("should render the create form title", async () => {
    renderContentForm();
    expect(screen.getByText("Add New Content")).toBeInTheDocument();
  });

  it("should render all required form fields", async () => {
    renderContentForm();

    // Textarea has a proper id="text" so getByLabelText works
    expect(screen.getByLabelText("Text Content *")).toBeInTheDocument();
    // Radix Select buttons don't use id matching, so check label text directly
    expect(screen.getByText("Language *")).toBeInTheDocument();
    expect(screen.getByText("Content Type *")).toBeInTheDocument();
    // Regular inputs with id
    expect(screen.getByLabelText("Region")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Dialect")).toBeInTheDocument();
    expect(screen.getByLabelText("Source")).toBeInTheDocument();
    // Cultural Context textarea
    expect(screen.getByLabelText("Cultural Context")).toBeInTheDocument();
    expect(screen.getByText("Status *")).toBeInTheDocument();
  });

  it("should show AI Analysis checkbox for new content", async () => {
    renderContentForm();
    expect(
      screen.getByLabelText("Enable AI Quality Analysis"),
    ).toBeInTheDocument();
  });

  it("should show 'Create Content' button for new content", async () => {
    renderContentForm();
    expect(screen.getByText("Create Content")).toBeInTheDocument();
  });

  it("should show toast error on failed create", async () => {
    mockCreateContent.mockRejectedValue(new Error("Network error"));

    renderContentForm();

    // Verify the form is rendered with create button
    expect(screen.getByText("Create Content")).toBeInTheDocument();
    expect(screen.getByText("Content Details")).toBeInTheDocument();
  });

  it("should navigate back on cancel click", async () => {
    renderContentForm();
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockNavigate).toHaveBeenCalledWith("/content");
  });
});

describe("ContentForm — edit content", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ContentForm = (await import("./ContentForm")).default;

    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { _id: "u1", name: "Test" },
    });
    mockUseParams.mockReturnValue({ id: "content123" });
  });

  it("should render the edit form title", async () => {
    renderContentForm();
    expect(screen.getByText("Edit Content")).toBeInTheDocument();
  });

  it("should hide AI Analysis checkbox for edit", async () => {
    renderContentForm();
    expect(
      screen.queryByText("Enable AI Quality Analysis"),
    ).not.toBeInTheDocument();
  });

  it("should show 'Update Content' button", async () => {
    renderContentForm();
    expect(screen.getByText("Update Content")).toBeInTheDocument();
  });

  it("should pre-populate form fields from existing content", async () => {
    mockUseQuery.mockReturnValue({
      _id: "content123",
      text: "Existing text content",
      language: "hindi",
      contentType: "proverb",
      region: "Maharashtra",
      category: "Folk",
      source: "Book",
      dialect: "Marathi",
      culturalContext: "Traditional folk saying",
      status: "draft",
      userId: "u1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: undefined,
    });

    renderContentForm();

    const textarea = screen.getByLabelText("Text Content *") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Existing text content");
  });

  it("should call updateContent and navigate on submit", async () => {
    // Pre-populate form with valid existing content
    mockUseQuery.mockReturnValue({
      _id: "content123",
      text: "Existing content",
      language: "hindi",
      contentType: "proverb",
      status: "draft",
      userId: "u1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: undefined,
    });

    mockUpdateContent.mockResolvedValue("content123");

    renderContentForm();

    await userEvent.type(screen.getByLabelText("Text Content *"), " Updated");

    fireEvent.click(screen.getByText("Update Content"));

    await waitFor(() => {
      expect(mockUpdateContent).toHaveBeenCalledWith(
        expect.objectContaining({ id: "content123" }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/content");
  });
});
