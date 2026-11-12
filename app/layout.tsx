import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const arabic = localFont({
  src: "../node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2",
  variable: "--font-vazir-arabic",
  weight: "100 900",
  display: "swap",
  preload: true,
});
const latin = localFont({
  src: "../node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2",
  variable: "--font-vazir-latin",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: { default: "ترب بیمه | هر عدد، یک منبع", template: "%s | ترب بیمه" },
  description: "پوشش‌ها و استثناهای بیمه را با داده‌های ساختگی و مستند، کنار هم مقایسه کنید.",
  openGraph: {
    title: "ترب بیمه | هر عدد، یک منبع",
    description: "یک نمونه مستقل برای مقایسه شفاف بیمه با داده‌های ساختگی",
    type: "website",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary",
    title: "ترب بیمه | هر عدد، یک منبع",
    description: "مقایسه پوشش‌ها با داده‌های ساختگی و منبع قابل بررسی",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "rgb(249, 250, 249)" },
    { media: "(prefers-color-scheme: dark)", color: "rgb(16, 24, 23)" },
  ],
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${arabic.variable} ${latin.variable}`}
    >
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('torob-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body>
        <div id="app-shell">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface-raised focus:p-3 focus:text-text"
          >
            رفتن به محتوای اصلی
          </a>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div id="main-content" className="flex-1">
              {children}
            </div>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
