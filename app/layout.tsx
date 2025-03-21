import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Town Hall',
  description: 'Connect with your local community',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}