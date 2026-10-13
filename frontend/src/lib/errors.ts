export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
  get isNetwork() {
    return this.status === 0 || this.status === 502 || this.status === 504;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Turns a FastAPI/Starlette error body into a readable message plus per-field errors.
 *  - `{detail: "text"}`                          -> text
 *  - `{detail: [{loc:[..,"email"], msg:".."}]}`   -> field errors + joined message (422)
 *  - `{message|error: "text"}`                   -> text
 */
export function parseErrorBody(status: number, body: unknown): { message: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  let message: string | undefined;

  if (isRecord(body)) {
    const detail = body.detail;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      const parts: string[] = [];
      for (const item of detail) {
        if (!isRecord(item)) continue;
        const msg = typeof item.msg === "string" ? item.msg : undefined;
        if (!msg) continue;
        const loc = Array.isArray(item.loc) ? item.loc.filter((x) => typeof x === "string" || typeof x === "number") : [];
        const field = loc.filter((x) => x !== "body" && x !== "query" && x !== "path").pop();
        if (field !== undefined) {
          const key = String(field);
          if (!fieldErrors[key]) fieldErrors[key] = msg;
          parts.push(`${key}: ${msg}`);
        } else {
          parts.push(msg);
        }
      }
      if (parts.length) message = parts.join("; ");
    } else if (isRecord(detail) && typeof detail.message === "string") {
      message = detail.message;
    } else if (typeof body.message === "string") {
      message = body.message;
    } else if (typeof body.error === "string") {
      message = body.error;
    }
  } else if (typeof body === "string" && body.trim() && body.length < 300 && !body.trim().startsWith("<")) {
    message = body.trim();
  }

  return { message: message ?? defaultMessage(status), fieldErrors };
}

export function defaultMessage(status: number): string {
  switch (status) {
    case 0:
      return "Could not reach the server. Check your connection and that the backend is running.";
    case 400:
      return "The request was not accepted. Please check the details and try again.";
    case 401:
      return "Your session is missing or has expired. Please sign in again.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "The requested item was not found.";
    case 409:
      return "That conflicts with existing data.";
    case 413:
      return "The file is too large for the server.";
    case 415:
      return "That file type isn't supported.";
    case 422:
      return "Some of the submitted values are invalid.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 502:
    case 503:
    case 504:
      return "The backend is unavailable or took too long to respond.";
    default:
      return status >= 500 ? "The server hit an unexpected error. Please try again." : "Something went wrong.";
  }
}
