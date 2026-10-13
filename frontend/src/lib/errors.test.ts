import { describe, expect, it } from "vitest";
import { ApiError, parseErrorBody } from "./errors";

describe("parseErrorBody", () => {
  it("reads a FastAPI string detail", () => {
    expect(parseErrorBody(401, { detail: "Invalid credentials" }).message).toBe("Invalid credentials");
  });

  it("maps 422 validation arrays to field errors", () => {
    const { message, fieldErrors } = parseErrorBody(422, {
      detail: [
        { loc: ["body", "email"], msg: "value is not a valid email address", type: "value_error" },
        { loc: ["body", "password"], msg: "Field required", type: "missing" },
      ],
    });
    expect(fieldErrors).toEqual({ email: "value is not a valid email address", password: "Field required" });
    expect(message).toContain("email: value is not a valid email address");
  });

  it("falls back to message/error keys", () => {
    expect(parseErrorBody(400, { message: "Bad" }).message).toBe("Bad");
    expect(parseErrorBody(400, { error: "Oops" }).message).toBe("Oops");
  });

  it("never leaks HTML error pages", () => {
    expect(parseErrorBody(500, "<html><body>Traceback...</body></html>").message).toMatch(/unexpected error/i);
  });

  it("gives readable defaults by status", () => {
    expect(parseErrorBody(403, undefined).message).toMatch(/permission/i);
    expect(parseErrorBody(502, null).message).toMatch(/unavailable/i);
  });

  it("ApiError flags network-ish statuses", () => {
    expect(new ApiError("x", 0).isNetwork).toBe(true);
    expect(new ApiError("x", 404).isNetwork).toBe(false);
  });
});
