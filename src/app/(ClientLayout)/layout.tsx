'use client';

import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import clientTheme from "@/utils/theme/ClientTheme"; // o baselightTheme
import { ReactNode } from "react";
import Head from "next/head";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Head>
        {/* Disabilita lo zoom su mobile */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>

      {/* Sposta tutti gli stili global fuori dal <body> */}
      <style jsx global>{`
        html, body {
          touch-action: pan-x pan-y;
          -ms-touch-action: pan-x pan-y;
          -webkit-user-select: none;
          user-select: none;
          margin: 0;
          padding: 0;
          font-size: 16px;
        }

        body, #__next {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        img, video, canvas {
          max-width: 100%;
          height: auto;
        }

        * {
          box-sizing: border-box;
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
    </>
  );
}
