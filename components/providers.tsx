"use client";

import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#111113",
            border: "1px solid #27272a",
            color: "#f4f4f5",
          },
        }}
      />
    </>
  );
}
