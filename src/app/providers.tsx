import React from "react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main className="h-screen w-full px-10 bg-gradient-to-b from-background to-muted/50">
        {children}
      </main>
    </ThemeProvider>
  );
}
