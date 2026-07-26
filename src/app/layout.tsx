import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppNav } from "@/components/AppNav";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "next-themes";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
   title: "Eraser.io Clone",
   description: "Full-featured Eraser.io Clone with Diagram-as-Code, Docs & Canvas",
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
               <QueryProvider>
                  <AppNav />
                  <main className="flex flex-1 flex-col h-full w-full overflow-hidden">
                     {children}
                  </main>
               </QueryProvider>
            </ThemeProvider>
         </body>
      </html>
   );
}
