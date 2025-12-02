import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExpandableModuleCard from "./expandable-module-card";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

// Mock hooks
vi.mock("@/hooks/use-subscription-status", () => ({
  useHasPremiumAccess: vi.fn(),
}));

describe("ExpandableModuleCard", () => {
  let queryClient: QueryClient;
  const mockOnLessonClick = vi.fn();

  const mockModule = {
    id: 1,
    title: "Introduction to Trading",
    subtitle: "Learn the basics",
    icon: "📈",
    totalLessons: 10,
    completedLessons: 0,
    estimatedTime: "2 hours",
    status: "locked" as const,
    lessons: [
      {
        id: 1,
        title: "Lesson 1",
        duration: "10 min",
        status: "locked" as const,
      },
    ],
  };

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
    hasPremiumAccess = false
  ) => {
    const { useHasPremiumAccess } = require("@/hooks/use-subscription-status");
    vi.mocked(useHasPremiumAccess).mockReturnValue({
      hasPremiumAccess,
      subscriptionData: {
        role: hasPremiumAccess ? "premium" : "free",
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe("Access control for free users", () => {
    it("should allow access to module 1 for free users", () => {
      const module1 = { ...mockModule, id: 1 };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={module1}
          onLessonClick={mockOnLessonClick}
        />,
        false
      );

      expect(screen.getByText("Introduction to Trading")).toBeInTheDocument();
      // Module 1 should be accessible (not locked)
      expect(screen.queryByText(/Upgrade to Access/i)).not.toBeInTheDocument();
    });

    it("should block access to module 2+ for free users", () => {
      const module2 = { ...mockModule, id: 2 };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={module2}
          onLessonClick={mockOnLessonClick}
        />,
        false
      );

      expect(screen.getByText("Introduction to Trading")).toBeInTheDocument();
      // Module 2+ should show upgrade prompt
      expect(screen.getByText(/Upgrade to Access/i)).toBeInTheDocument();
    });
  });

  describe("Access control for premium users", () => {
    it("should allow access to all modules for premium users", () => {
      const module2 = { ...mockModule, id: 2, status: "locked" as const };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={module2}
          onLessonClick={mockOnLessonClick}
        />,
        true
      );

      expect(screen.getByText("Introduction to Trading")).toBeInTheDocument();
      // Premium users should see all modules as available
      expect(screen.queryByText(/Upgrade to Access/i)).not.toBeInTheDocument();
    });

    it("should allow access to all modules for admin users", () => {
      const { useHasPremiumAccess } = require("@/hooks/use-subscription-status");
      vi.mocked(useHasPremiumAccess).mockReturnValue({
        hasPremiumAccess: true,
        subscriptionData: { role: "admin" },
      });

      const module2 = { ...mockModule, id: 2 };
      render(
        <QueryClientProvider client={queryClient}>
          <ExpandableModuleCard
            module={module2}
            onLessonClick={mockOnLessonClick}
          />
        </QueryClientProvider>
      );

      expect(screen.queryByText(/Upgrade to Access/i)).not.toBeInTheDocument();
    });
  });

  describe("Visual restrictions", () => {
    it("should apply opacity to locked modules for free users", () => {
      const module2 = { ...mockModule, id: 2 };
      const { container } = renderWithQueryClient(
        <ExpandableModuleCard
          module={module2}
          onLessonClick={mockOnLessonClick}
        />,
        false
      );

      const card = container.querySelector(".opacity-60");
      expect(card).toBeInTheDocument();
    });

    it("should show locked badge for locked modules", () => {
      const module2 = { ...mockModule, id: 2 };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={module2}
          onLessonClick={mockOnLessonClick}
        />,
        false
      );

      expect(screen.getByText(/🔒 Locked/i)).toBeInTheDocument();
    });

    it("should show upgrade prompt for locked modules", () => {
      const module2 = { ...mockModule, id: 2 };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={module2}
          onLessonClick={mockOnLessonClick}
        />,
        false
      );

      expect(screen.getByText(/Upgrade to Access/i)).toBeInTheDocument();
    });
  });

  describe("Module status display", () => {
    it("should show completed status correctly", () => {
      const completedModule = {
        ...mockModule,
        status: "completed" as const,
        completedLessons: 10,
      };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={completedModule}
          onLessonClick={mockOnLessonClick}
        />,
        true
      );

      expect(screen.getByText(/✅ Completed/i)).toBeInTheDocument();
    });

    it("should show in-progress status correctly", () => {
      const inProgressModule = {
        ...mockModule,
        status: "in-progress" as const,
        completedLessons: 5,
      };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={inProgressModule}
          onLessonClick={mockOnLessonClick}
        />,
        true
      );

      expect(screen.getByText(/🔄 In Progress/i)).toBeInTheDocument();
    });
  });

  describe("Module interaction", () => {
    it("should expand module when clicked (premium users)", () => {
      const module1 = { ...mockModule, id: 1 };
      renderWithQueryClient(
        <ExpandableModuleCard
          module={module1}
          onLessonClick={mockOnLessonClick}
        />,
        true
      );

      const card = screen.getByText("Introduction to Trading").closest("div");
      if (card) {
        fireEvent.click(card);
        // Should show lessons list
        expect(screen.getByText(/Lessons/i)).toBeInTheDocument();
      }
    });

    it("should redirect to pricing when clicking locked module (free users)", () => {
      const module2 = { ...mockModule, id: 2 };
      const mockSetLocation = vi.fn();
      const { useLocation } = require("wouter");
      vi.mocked(useLocation).mockReturnValue(["/", mockSetLocation]);

      renderWithQueryClient(
        <ExpandableModuleCard
          module={module2}
          onLessonClick={mockOnLessonClick}
        />,
        false
      );

      const card = screen.getByText("Introduction to Trading").closest("div");
      if (card) {
        fireEvent.click(card);
        expect(mockSetLocation).toHaveBeenCalledWith("/pricing");
      }
    });
  });
});

