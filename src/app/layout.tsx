import "@/styles/globals.css";
import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XRPL EVM Analytics",
  description: "Analyze XRPL EVM transactions",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.className}`}>
      <NextThemesProvider attribute="class" defaultTheme="dark">
        <body>{children}</body>
      </NextThemesProvider>
    </html>
  );
}
