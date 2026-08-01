import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "next-themes";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
   title: "Architecta — Diagram-as-Code & Freeform Canvas",
   description: "The modern visual workspace for software architecture, diagrams, docs & whiteboards.",
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html
         lang="en"
         suppressHydrationWarning
         className={cn(
            "h-full",
            "antialiased",
            "font-sans",
            publicSans.variable,
         )}
      >
         <body suppressHydrationWarning className="h-screen w-screen overflow-hidden flex flex-row bg-background text-foreground">
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
               <AuthProvider>
                  <QueryProvider>
                     <main className="flex flex-1 flex-col h-full w-full overflow-hidden">
                        {children}
                     </main>
                  </QueryProvider>
               </AuthProvider>
            </ThemeProvider>
         </body>
      </html>
   );
}
