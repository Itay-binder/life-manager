import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Life Manager",
  description: "ניהול תחומי חיים, משימות והרגלים",
  appleWebApp: {
    capable: true,
    title: "Life Manager",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f7ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <AuthProvider>
          <div className="flex min-h-full flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
