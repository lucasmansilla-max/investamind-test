import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RoleBadge from "./RoleBadge";

describe("RoleBadge", () => {
  describe("Badge display based on role", () => {
    it("should display Admin badge for admin role", () => {
      render(<RoleBadge role="admin" />);
      const badge = screen.getByText("Admin");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-red-100", "text-red-800");
    });

    it("should display Legacy badge for legacy role", () => {
      render(<RoleBadge role="legacy" />);
      const badge = screen.getByText("Legacy");
      expect(badge).toBeInTheDocument();
    });

    it("should display Premium badge for premium role", () => {
      render(<RoleBadge role="premium" />);
      const badge = screen.getByText("Premium");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-emerald-100", "text-emerald-800");
    });

    it("should not display badge for free role", () => {
      const { container } = render(<RoleBadge role="free" />);
      expect(container.firstChild).toBeNull();
    });

    it("should not display badge for null role", () => {
      const { container } = render(<RoleBadge role={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("should not display badge for undefined role", () => {
      const { container } = render(<RoleBadge role={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Badge styling", () => {
    it("should apply custom className", () => {
      render(<RoleBadge role="admin" className="custom-class" />);
      const badge = screen.getByText("Admin");
      expect(badge).toHaveClass("custom-class");
    });

    it("should apply special styling for legacy role", () => {
      render(<RoleBadge role="legacy" />);
      const badge = screen.getByText("Legacy");
      expect(badge).toBeInTheDocument();
      // Legacy has gradient background in style attribute
      expect(badge).toHaveAttribute("style");
      const styleAttr = badge.getAttribute("style");
      expect(styleAttr).toContain("gradient");
    });
  });
});

