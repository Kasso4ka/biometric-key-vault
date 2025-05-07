import React from "react";
import { ThemeProvider } from "next-themes";

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/50">
        {children}
      </main>
    </ThemeProvider>
  );
}
