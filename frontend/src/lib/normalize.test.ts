import { describe, expect, it } from "vitest";
import { extractChatReply, normalizeMessages, normalizeSessions } from "./normalize";

let n = 0;
const id = () => `id-${n++}`;

describe("extractChatReply", () => {
  it("accepts a plain string", () => {
    expect(extractChatReply("hello").text).toBe("hello");
  });
  it("finds the answer text, session id and sources", () => {
    const r = extractChatReply({
      answer: "42",
      session_id: "abc",
      sources: [{ filename: "a.pdf", content: "chunk", page: 3 }, "b.txt"],
    });
    expect(r.text).toBe("42");
    expect(r.sessionId).toBe("abc");
    expect(r.sources).toEqual([
      { title: "a.pdf", snippet: "chunk", meta: "Page 3" },
      { title: "b.txt" },
    ]);
    expect(r.unrecognized).toBe(false);
  });
  it("shows the raw payload instead of inventing text when unrecognised", () => {
    const r = extractChatReply({ foo: 1 });
    expect(r.unrecognized).toBe(true);
    expect(r.text).toContain('"foo": 1');
  });
});

describe("normalizeSessions", () => {
  it("handles ids, objects and wrapped lists", () => {
    expect(normalizeSessions(["a", "b"]).map((s) => s.id)).toEqual(["a", "b"]);
    expect(normalizeSessions([{ session_id: "x", title: "T", created_at: "2026-01-01" }])).toEqual([
      { id: "x", title: "T", updatedAt: "2026-01-01" },
    ]);
    expect(normalizeSessions({ sessions: [{ id: "q" }] })).toHaveLength(1);
  });
  it("returns [] for unknown shapes", () => {
    expect(normalizeSessions("nope")).toEqual([]);
    expect(normalizeSessions(null)).toEqual([]);
  });
});

describe("normalizeMessages", () => {
  it("reads role/content turns", () => {
    const m = normalizeMessages([{ role: "user", content: "hi" }, { role: "assistant", content: "yo" }], id);
    expect(m.map((x) => [x.role, x.content])).toEqual([["user", "hi"], ["assistant", "yo"]]);
  });
  it("splits query/answer rows into two messages", () => {
    const m = normalizeMessages([{ query: "q?", answer: "a." }], id);
    expect(m.map((x) => x.role)).toEqual(["user", "assistant"]);
  });
  it("ignores garbage", () => {
    expect(normalizeMessages([1, "x", null], id)).toEqual([]);
  });
});
