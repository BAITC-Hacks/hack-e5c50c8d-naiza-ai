import type { Metadata } from "next";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "./globals.css";
import { Frame } from "@/components/Frame";

export const metadata: Metadata = {
  title: "Аким на 5 часов",
  description: "Один бюджет. Пять решений. Город отвечает баллом Astana Quality of Life Score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        <Frame>{children}</Frame>
      </body>
    </html>
  );
}
