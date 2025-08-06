"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid, Box, Card, Stack, Typography } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import AuthLogin from "../auth/AuthLogin";

const Login2 = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

const handleLogin = async (username: string, password: string) => {
  setError(null);
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
      headers: { "Content-Type": "application/json" },
      credentials: "include", // <-- NECESSARIO per inviare e ricevere cookie
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Invalid username or password");
    }

    router.replace("/private/admin/comande");
  } catch (e: any) {
    setError(e.message);
  }
};


  return (
    <PageContainer title="Login" description="this is Login page">
      <Box
        sx={{
          position: "relative",
          "&:before": {
            content: '""',
            background: "radial-gradient(#d2f1df, #d3d7fa, #bad8f4)",
            backgroundSize: "400% 400%",
            animation: "gradient 15s ease infinite",
            position: "absolute",
            height: "100%",
            width: "100%",
            opacity: "0.3",
          },
        }}
      >
        <Grid container spacing={0} justifyContent="center" sx={{ height: "100vh" }}>
          <Grid
            display="flex"
            justifyContent="center"
            alignItems="center"
            size={{ xs: 12, sm: 12, lg: 4, xl: 3 }}
          >
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: "100%", maxWidth: "500px" }}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <Logo />
              </Box>
              <AuthLogin
                onSubmit={handleLogin}
                subtext={
                  <Typography variant="subtitle1" textAlign="center" color="textSecondary" mb={1}>
                    
                  </Typography>
                }
                // subtitle={
                //   <Stack direction="row" spacing={1} justifyContent="center" mt={3}>
                //     <Typography color="textSecondary" variant="h6" fontWeight="500">
                //       New to Modernize?
                //     </Typography>
                //     <Typography
                //       component={Link}
                //       href="/authentication/register"
                //       fontWeight="500"
                //       sx={{ textDecoration: "none", color: "primary.main" }}
                //     >
                //       Create an account
                //     </Typography>
                //   </Stack>
                // }
              />
              {error && (
                <Typography color="error" textAlign="center" mt={2}>
                  {error}
                </Typography>
              )}
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Login2;
