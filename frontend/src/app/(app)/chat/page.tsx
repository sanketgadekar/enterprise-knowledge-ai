import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatView } from "@/features/chat/chat-view";

export const metadata: Metadata = { title: "AI Chat" };
export default function Page() {
  return (
    <Suspense>
      <ChatView />
    </Suspense>
  );
}
