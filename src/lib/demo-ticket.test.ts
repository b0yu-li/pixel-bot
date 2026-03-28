import { describe, expect, it } from "vitest";
import { createDemoTicketId } from "./demo-ticket";

describe("createDemoTicketId", () => {
  it("returns DEMO- prefix and unique values", () => {
    const a = createDemoTicketId();
    const b = createDemoTicketId();
    expect(a).toMatch(/^DEMO-[a-z0-9]+$/i);
    expect(b).toMatch(/^DEMO-[a-z0-9]+$/i);
    expect(a).not.toBe(b);
  });
});
