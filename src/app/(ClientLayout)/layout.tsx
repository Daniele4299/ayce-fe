'use client';

import { ThemeProvider, CssBaseline, Box } from "@mui/material"; // o baselightTheme
import clientTheme from "@/utils/theme/ClientTheme"; // o baselightTheme
import { ReactNode, useEffect } from "react";
import Head from "next/head";

export default function ClientLayout({ children }: { children: ReactNode }) {
  // Blocca pinch zoom su iOS/Android con touchmove
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

        <ThemeProvider theme={clientTheme}>
          <CssBaseline />
          <Box
            sx={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              backgroundColor: (theme) => theme.palette.background.default,
            }}
          >
            {children}
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}
