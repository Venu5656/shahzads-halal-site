import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it.each(["/account", "/menu?item=combo", "/admin/orders", "/"])("allows %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "account",
    "/login",
    "/signup?next=/x",
    "/verify",
    "/\u0000x",
    "",
    undefined,
    null,
    42,
    "/" + "a".repeat(600),
  ])("refuses %s", (path) => {
    expect(safeNextPath(path)).toBe("/account");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("//x", "/")).toBe("/");
  });
});
