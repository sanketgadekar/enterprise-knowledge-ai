"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, RotateCw, Trash2, UploadCloud } from "lucide-react";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadDocument } from "@/lib/api-client";
import { permissionMessage } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { pickString } from "@/lib/normalize";
import { cn, formatBytes, newId } from "@/lib/utils";

// File types the previous Streamlit app accepted. The backend does not publish its
// limits, so this is advisory: other types get a warning but are not blocked.
const KNOWN_EXTENSIONS = ["pdf", "txt", "docx", "csv"];
const ACCEPT = ".pdf,.txt,.docx,.csv";

type Status = "queued" | "uploading" | "success" | "error";
interface Item {
  id: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
  note?: string;
  warning?: string;
}

function warningFor(file: File): string | undefined {
  if (file.size === 0) return undefined;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return KNOWN_EXTENSIONS.includes(ext)
    ? undefined
    : `".${ext || "?"}" isn't one of the usual types (PDF, TXT, DOCX, CSV). The server may reject it.`;
}

export function DocumentsView() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const runningRef = React.useRef(false);

  const patch = React.useCallback((id: string, p: Partial<Item>) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }, []);

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    setItems((cur) => {
      const next = [...cur];
      for (const file of incoming) {
        const dup = next.some((i) => i.file.name === file.name && i.file.size === file.size && i.file.lastModified === file.lastModified && i.status !== "error");
        if (dup) continue;
        next.push({
          id: newId(),
          file,
          status: file.size === 0 ? "error" : "queued",
          progress: 0,
          error: file.size === 0 ? "This file is empty." : undefined,
          warning: warningFor(file),
        });
      }
      return next;
    });
  };

  const pending = items.filter((i) => i.status === "queued" || (i.status === "error" && i.file.size > 0));

  const uploadAll = async () => {
    if (runningRef.current) return; // prevents duplicate submissions
    runningRef.current = true;
    setRunning(true);
    const snapshot = items.filter((i) => i.status === "queued" || (i.status === "error" && i.file.size > 0));
    for (const item of snapshot) {
      patch(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        const { data } = await uploadDocument(item.file, (f) => patch(item.id, { progress: f }));
        patch(item.id, { status: "success", progress: 1, note: pickString(data, ["message", "status", "detail"]) });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          patch(item.id, { status: "error", error: "Upload cancelled." });
        } else if (err instanceof ApiError && err.status === 401) {
          patch(item.id, { status: "error", error: "Your session expired." });
          break;
        } else {
          patch(item.id, { status: "error", error: permissionMessage(err, "upload documents") });
        }
      }
    }
    runningRef.current = false;
    setRunning(false);
  };

  const remove = (id: string) => setItems((cur) => cur.filter((i) => i.id !== id));
  const clearDone = () => setItems((cur) => cur.filter((i) => i.status !== "success"));
  const doneCount = items.filter((i) => i.status === "success").length;

  return (
    <PageContainer>
      <PageHeader
        title="Documents"
        description="Upload company documents so the AI assistant can answer questions from them."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Documents" }]}
      />

      <Alert tone="info" title="Uploaded does not always mean searchable" className="mb-6">
        A successful upload means the server accepted the file. The API doesn&apos;t report when processing and indexing finish, so allow a little time before asking about a new document.
      </Alert>

      <Card>
        <CardContent className="p-5">
          <div
            role="group"
            aria-label="Document upload area"
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragging ? "border-primary bg-green-50" : "border-input bg-muted/40",
            )}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary shadow-card">
              <UploadCloud className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-medium">{dragging ? "Drop files to add them" : "Drag and drop files here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, TXT, DOCX or CSV · one file per request</p>
            <Button className="mt-5" variant="outline" onClick={() => inputRef.current?.click()} disabled={running}>
              Browse files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose files to upload"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = ""; // allow re-selecting the same file
              }}
            />
          </div>

          {items.length > 0 && (
            <div className="mt-6 space-y-3">
              <ul className="space-y-3" aria-label="Selected files">
                {items.map((item) => (
                  <li key={item.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-muted-foreground">
                        {item.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                        ) : item.status === "error" ? (
                          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
                        ) : item.status === "uploading" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                        ) : (
                          <FileText className="h-5 w-5" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium" title={item.file.name}>
                            {item.file.name}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                        </div>

                        {item.status === "uploading" && (
                          <div
                            role="progressbar"
                            aria-label={`Uploading ${item.file.name}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(item.progress * 100)}
                            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                          >
                            <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                          </div>
                        )}

                        <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
                          {item.status === "queued" && "Ready to upload"}
                          {item.status === "uploading" && (item.progress >= 1 ? "Sent — waiting for the server…" : `Uploading… ${Math.round(item.progress * 100)}%`)}
                          {item.status === "success" && (
                            <span className="text-green-800">
                              Accepted by the server{item.note ? ` — ${item.note}` : ""}. Processing/indexing status isn&apos;t reported.
                            </span>
                          )}
                          {item.status === "error" && <span className="font-medium text-destructive">{item.error}</span>}
                        </p>
                        {item.warning && item.status !== "success" && <p className="mt-1 text-xs text-amber-800">{item.warning}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {item.status === "error" && item.file.size > 0 && (
                          <Button size="sm" variant="outline" onClick={uploadAll} disabled={running} aria-label={`Retry ${item.file.name}`}>
                            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
                          </Button>
                        )}
                        {item.status !== "uploading" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(item.id)} aria-label={`Remove ${item.file.name}`}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Button variant="ghost" size="sm" onClick={clearDone} disabled={doneCount === 0 || running}>
                  Clear completed
                </Button>
                <Button onClick={uploadAll} loading={running} disabled={pending.length === 0}>
                  {running ? "Uploading…" : `Upload ${pending.length} file${pending.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About this page</CardTitle>
          <CardDescription>What the current backend does and doesn&apos;t provide.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Files are sent to the upload endpoint as multipart form data.</li>
            <li>The backend has no document-listing endpoint, so only files uploaded in this browser session appear above — previously uploaded documents can&apos;t be listed or removed here.</li>
            <li>Size and file-type limits aren&apos;t published by the API; the server&apos;s own error message is shown if it rejects a file.</li>
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
