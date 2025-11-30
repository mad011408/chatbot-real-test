"use client";

import { UIProvider } from "./ui-context";

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  return <UIProvider>{children}</UIProvider>;
}


