import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "JANASEVA";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — District Public Service Platform`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "AI-assisted district public-service and emergency coordination platform. Demo prototype with synthetic data.",
  keywords: ["e-governance", "citizen services", "complaint management", "emergency coordination"],
  robots: { index: false, follow: false }, // Prevent indexing of demo system
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: APP_NAME,
    description: "District Public Service Operations Platform — Demo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#312e81" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              expand
              closeButton
              toastOptions={{
                duration: 4000,
                classNames: {
                  error: "!bg-danger-50 !border-danger-200 dark:!bg-red-950 dark:!border-red-800",
                  success: "!bg-success-50 !border-green-200 dark:!bg-green-950 dark:!border-green-800",
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
