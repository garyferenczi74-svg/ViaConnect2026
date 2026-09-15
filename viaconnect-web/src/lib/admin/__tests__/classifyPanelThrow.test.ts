import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AdminPanelErrorBoundary } from "@/components/admin/AdminPanelErrorBoundary";
import { classifyPanelThrow } from "../classifyPanelThrow";

function withDigest(message: string, digest: string): Error {
  const error = new Error(message);
  (error as Error & { digest?: string }).digest = digest;
  return error;
}

describe("classifyPanelThrow / admin.panel.boundary digest", () => {
  it("classifies Lucide-class invalid element and keeps digest", () => {
    const error = withDigest(
      "Element type is invalid: expected a string or a class/function but got: undefined.",
      "admin-panel-digest-lucide",
    );
    const classified = classifyPanelThrow(error);
    expect(classified.kind).toBe("invalid_element");
    expect(classified.digest).toBe("admin-panel-digest-lucide");
  });

  it("classifies malformed-row object child and keeps digest", () => {
    const error = withDigest(
      "Objects are not valid as a React child (found: object with keys {nested})",
      "admin-panel-digest-row",
    );
    expect(classifyPanelThrow(error)).toEqual({
      kind: "invalid_child",
      digest: "admin-panel-digest-row",
      name: "Error",
    });
  });

  it("classifies stages.find TypeError as invalid_row_shape (no stack)", () => {
    const error = withDigest(
      "a.stages.find is not a function",
      "admin-panel-digest-stages",
    );
    error.name = "TypeError";
    const classified = classifyPanelThrow(error);
    expect(classified.kind).toBe("invalid_row_shape");
    expect(classified.digest).toBe("admin-panel-digest-stages");
    expect(classified.name).toBe("TypeError");
  });

  it("classifies Next 16 useSearchParams missing Suspense", () => {
    const error = withDigest(
      "Missing Suspense boundary with useSearchParams",
      "admin-panel-digest-suspense",
    );
    expect(classifyPanelThrow(error).kind).toBe("missing_suspense");
    expect(classifyPanelThrow(error).digest).toBe("admin-panel-digest-suspense");
  });

  it("getDerivedStateFromError stores digest and never surfaces the stack", () => {
    const error = withDigest(
      "Element type is invalid: expected a string or a class/function but got: object.",
      "abc123digest",
    );
    const state = AdminPanelErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.errorId).toBe("abc123digest");
    expect(state.message).toBe("failed to load");
    const src = readFileSync(
      join(process.cwd(), "src/components/admin/AdminPanelErrorBoundary.tsx"),
      "utf8",
    );
    expect(src).toContain("classifyPanelThrow");
    expect(src).toContain("kind: classified.kind");
    expect(src).toContain("admin.panel.boundary");
    expect(src).not.toMatch(/error\.stack/);
  });
});
