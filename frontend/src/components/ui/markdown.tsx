"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders untrusted (model/user) Markdown safely: raw HTML is NOT enabled
 * (react-markdown ignores it by default) and unsafe URL protocols are stripped.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
          img: () => null, // never load remote images referenced by model output
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
