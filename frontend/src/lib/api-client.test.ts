import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { apiRequest, listUsers, login, sendChat, setUnauthorizedHandler } from "./api-client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe("apiRequest", () => {
  it("returns parsed JSON and sends Accept", async () => {
    fetchMock.mockResolvedValue(json([{ id: "1" }]));
    const data = await listUsers();
    expect(data).toEqual([{ id: "1" }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/backend/users");
    expect(init.headers.Accept).toBe("application/json");
    expect(init.credentials).toBe("same-origin");
  });

  it("sends JSON bodies with a JSON content type", async () => {
    fetchMock.mockResolvedValue(json({ company_id: "c", company_slug: "acme", email: "a@b.co" }));
    await login({ company_slug: "acme", email: "a@b.co", password: "pw" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ company_slug: "acme", email: "a@b.co", password: "pw" });
  });

  it("does NOT set Content-Type for FormData (browser adds the boundary)", async () => {
    fetchMock.mockResolvedValue(json({}));
    const fd = new FormData();
    fd.append("file", new Blob(["x"]), "x.txt");
    await apiRequest("/api/backend/ingest/upload", { method: "POST", body: fd });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("passes chat parameters as query-string values and omits empty session_id", async () => {
    fetchMock.mockImplementation(async () => json({ answer: "ok" }));
    await sendChat("what is x?");
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/backend/chat?query=what+is+x%3F");
    await sendChat("again", "s-1");
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/backend/chat?query=again&session_id=s-1");
  });

  it("turns non-2xx responses into ApiError with the backend message", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Not enough permissions" }, 403));
    await expect(listUsers()).rejects.toMatchObject({ name: "ApiError", status: 403, message: "Not enough permissions" });
  });

  it("calls the unauthorized handler on 401 unless skipAuthRedirect", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(json({ detail: "expired" }, 401));
    await expect(listUsers()).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValue(json({ detail: "bad creds" }, 401));
    await expect(login({ company_slug: "a", email: "a@b.co", password: "x" })).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1); // unchanged: login 401 must not redirect
  });

  it("maps network failure to status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(listUsers()).rejects.toMatchObject({ status: 0 });
  });

  it("handles 204 with no body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest("/api/backend/chat/sessions/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("propagates caller cancellation as an abort, not an ApiError", async () => {
    const ctrl = new AbortController();
    fetchMock.mockImplementation((_u: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(new DOMException("x", "AbortError")))),
    );
    const p = apiRequest("/api/backend/users", { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.not.toBeInstanceOf(ApiError);
  });
});
