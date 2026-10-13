"use client";

import * as React from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ComposerHandle {
  setValue: (v: string) => void;
}

export const Composer = React.forwardRef<ComposerHandle, { onSend: (text: string) => void; disabled?: boolean; sending?: boolean }>(
  function Composer({ onSend, disabled, sending }, handleRef) {
    const [value, setValue] = React.useState("");
    const areaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(handleRef, () => ({
      setValue: (v) => {
        setValue(v);
        requestAnimationFrame(() => areaRef.current?.focus());
      },
    }));

    React.useEffect(() => {
      const el = areaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [value]);

    React.useEffect(() => {
      if (!sending && !disabled) areaRef.current?.focus();
    }, [sending, disabled]);

    const submit = () => {
      const text = value.trim();
      if (!text || disabled || sending) return;
      onSend(text);
      setValue("");
    };

    return (
      <div className="border-t bg-card p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-lg border border-input bg-card p-2 focus-within:ring-2 focus-within:ring-ring">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            ref={areaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask a question about your company knowledge…"
            className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/80 disabled:opacity-60"
          />
          <Button onClick={submit} disabled={disabled || sending || !value.trim()} size="icon" aria-label="Send message" loading={sending}>
            {!sending && <SendHorizontal className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
          <kbd className="rounded border bg-muted px-1 font-sans">Enter</kbd> to send ·{" "}
          <kbd className="rounded border bg-muted px-1 font-sans">Shift</kbd>+<kbd className="rounded border bg-muted px-1 font-sans">Enter</kbd> for a new line
        </p>
      </div>
    );
  },
);
