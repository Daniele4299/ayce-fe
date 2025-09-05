'use client';

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode, useEffect } from "react";
import Head from "next/head";
import { baselightTheme } from "@/utils/theme/DefaultColors";
import './global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  // Blocca pinch zoom su iOS/Android
  useEffect(() => {
    const preventPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', preventPinch, { passive: false });
    return () => document.removeEventListener('touchmove', preventPinch);
  }, []);

  return (
    <html lang="en">
      <body>
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          />
        </Head>

        <style jsx global>{`
          html, body {
            touch-action: pan-x pan-y;
            -ms-touch-action: pan-x pan-y;
            -webkit-user-select: none;
            user-select: none;
          }
        `}</style>

        <ThemeProvider theme={baselightTheme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
