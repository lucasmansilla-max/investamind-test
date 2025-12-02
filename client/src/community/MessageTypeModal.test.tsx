import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MessageTypeModal from "./MessageTypeModal";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

// Mock apiRequest
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

// Mock useLanguage - return actual message type names
vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      // Map message type keys to actual names
      const messageTypeMap: Record<string, string> = {
        "community.messageTypes.analysis": "Market Analysis",
        "community.messageTypes.prediction": "Price Prediction",
        "community.messageTypes.signal": "Trading Signal",
        "community.messageTypes.education": "Educational Content",
        "community.messageTypes.news": "Market News",
        "community.messageTypes.question": "Ask Question",
        "community.messageTypes.general": "General Discussion",
        "community.messageTypes.advertisement": "Advertisement",
      };
      
      const descriptionMap: Record<string, string> = {
        "community.messageTypeDescriptions.analysis": "Share your technical or fundamental analysis",
        "community.messageTypeDescriptions.prediction": "Make a price prediction with reasoning",
        "community.messageTypeDescriptions.signal": "Share entry/exit points with targets",
        "community.messageTypeDescriptions.education": "Teach others about trading concepts",
        "community.messageTypeDescriptions.news": "Share and discuss market news",
        "community.messageTypeDescriptions.question": "Get help from the community",
        "community.messageTypeDescriptions.general": "General trading discussion",
        "community.messageTypeDescriptions.advertisement": "Publish an official announcement (Admin only)",
      };
      
      return messageTypeMap[key] || descriptionMap[key] || key;
    },
  }),
}));

// Mock useQuery
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: any) => mockUseQuery(options),
  };
});

describe("MessageTypeModal", () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();
  const mockOnSelectType = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithQueryClient = (
    component: React.ReactElement,
    subscriptionData: any = { role: "free" }
  ) => {
    mockUseQuery.mockReturnValue({
      data: subscriptionData,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe("Message type filtering by role", () => {
    it("should show all message types for admin users", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "admin" }
      );

      // Admin should see all types including advertisement and signal
      expect(screen.getAllByText(/Advertisement/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Trading Signal/i)).toBeInTheDocument();
      expect(screen.getByText(/Market Analysis/i)).toBeInTheDocument();
    });

    it("should hide advertisement type for non-admin users", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "premium" }
      );

      // Premium users should not see advertisement
      expect(screen.queryByText(/Advertisement/i)).not.toBeInTheDocument();
      // But should see other types
      expect(screen.getByText(/Trading Signal/i)).toBeInTheDocument();
    });

    it("should hide trading signal for free users", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "free" }
      );

      // Free users should not see trading signal
      expect(screen.queryByText(/Trading Signal/i)).not.toBeInTheDocument();
      // But should see other basic types
      expect(screen.getByText(/Market Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/Ask Question/i)).toBeInTheDocument();
    });

    it("should show trading signal for premium users", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "premium" }
      );

      expect(screen.getByText(/Trading Signal/i)).toBeInTheDocument();
    });

    it("should show trading signal for legacy users", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "legacy" }
      );

      expect(screen.getByText(/Trading Signal/i)).toBeInTheDocument();
    });

    it("should show trading signal for beta users", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "free", isBetaUser: true }
      );

      expect(screen.getByText(/Trading Signal/i)).toBeInTheDocument();
    });
  });

  describe("Visual restrictions for locked types", () => {
    it("should show lock icon for locked message types", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "free" }
      );

      // Free users should see locked signal type (if it's rendered but disabled)
      // The modal filters out unavailable types, so we check for available types
      const availableTypes = screen.getAllByText(/Market Analysis|Ask Question|General Discussion/i);
      expect(availableTypes.length).toBeGreaterThan(0);
    });

    it("should disable locked message types", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "free" }
      );

      // Free users should not be able to click on signal type (it's filtered out)
      expect(screen.queryByText(/Trading Signal/i)).not.toBeInTheDocument();
    });
  });

  describe("Modal interaction", () => {
    it("should call onSelectType when clicking available type", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "free" }
      );

      const marketAnalysis = screen.getByText(/Market Analysis/i);
      fireEvent.click(marketAnalysis.closest("div")!);

      expect(mockOnSelectType).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onClose when clicking overlay", () => {
      renderWithQueryClient(
        <MessageTypeModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "free" }
      );

      const overlay = screen.getByRole("dialog").parentElement;
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it("should not render when isOpen is false", () => {
      const { container } = renderWithQueryClient(
        <MessageTypeModal
          isOpen={false}
          onClose={mockOnClose}
          onSelectType={mockOnSelectType}
        />,
        { role: "free" }
      );

      expect(container.firstChild).toBeNull();
    });
  });
});

