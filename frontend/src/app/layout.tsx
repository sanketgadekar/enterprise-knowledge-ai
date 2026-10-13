import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Enterprise Knowledge AI", template: "%s · Enterprise Knowledge AI" },
  description: "Ask questions grounded in your company's private knowledge.",
};
export const viewport: Viewport = { themeColor: "#0b1424" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
