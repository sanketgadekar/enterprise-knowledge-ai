import { describe, expect, it } from "vitest";
import { resolveProxyRoute } from "./proxy-routes";

describe("resolveProxyRoute (allow-list)", () => {
  it("maps verified endpoints with the backend's exact slash style", () => {
    expect(resolveProxyRoute("GET", ["users"])?.backendPath).toBe("/users/");
    expect(resolveProxyRoute("POST", ["users"])?.backendPath).toBe("/users/");
    expect(resolveProxyRoute("POST", ["ingest", "upload"])?.backendPath).toBe("/ingest/upload");
    expect(resolveProxyRoute("POST", ["chat"])?.backendPath).toBe("/chat/");
    expect(resolveProxyRoute("GET", ["chat", "sessions"])?.backendPath).toBe("/chat/sessions");
    expect(resolveProxyRoute("DELETE", ["chat", "sessions", "abc"])?.backendPath).toBe("/chat/sessions/abc");
  });
  it("only forwards the documented chat query params", () => {
    expect(resolveProxyRoute("POST", ["chat"])?.query).toEqual(["query", "session_id"]);
  });
  it("encodes session ids so they cannot alter the path", () => {
    expect(resolveProxyRoute("GET", ["chat", "sessions", "../users"])?.backendPath).toBe("/chat/sessions/..%2Fusers");
  });
  it("rejects unknown paths and wrong methods", () => {
    expect(resolveProxyRoute("DELETE", ["users"])).toBeNull();
    expect(resolveProxyRoute("GET", ["auth", "login"])).toBeNull();
    expect(resolveProxyRoute("GET", ["chat", "test-retrieval"])).toBeNull();
    expect(resolveProxyRoute("GET", ["chat", "sessions", "a", "b"])).toBeNull();
  });
});
