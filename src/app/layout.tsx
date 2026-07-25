import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppNav } from "@/components/AppNav";
import { QueryProvider } from "@/components/providers/QueryProvider";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"],
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
});

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
         className={cn(
            "h-full",
            "antialiased",
            geistSans.variable,
            geistMono.variable,
            "font-sans",
            publicSans.variable,
         )}
      >
         <body suppressHydrationWarning className="h-screen w-screen overflow-hidden flex flex-row bg-background">
            <QueryProvider>
               <AppNav />
               <main className="flex flex-1 flex-col h-full w-full overflow-hidden">
                  {children}
               </main>
            </QueryProvider>
         </body>
      </html>
   );
}
