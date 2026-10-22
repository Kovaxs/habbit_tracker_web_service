import { expect, it } from "vitest";
import { cn } from "@/lib/utils";

it("merges conditional classes and resolves Tailwind conflicts", () => {
  expect(cn("px-2", false && "hidden", { block: true }, "px-4")).toBe("block px-4");
});
