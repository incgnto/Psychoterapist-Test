// app/providers.tsx
"use client";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  // Add your other client-side providers here (NOT NextAuth)
  // return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return <>{children}</>;
}
