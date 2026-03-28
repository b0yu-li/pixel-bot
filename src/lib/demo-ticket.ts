/** Deterministic-enough demo ids for mock repair tickets (no external system). */
export function createDemoTicketId(): string {
  const suffix =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `DEMO-${suffix}`;
}
