'use client';

import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import clientTheme from "@/utils/theme/ClientTheme";
import { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
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
