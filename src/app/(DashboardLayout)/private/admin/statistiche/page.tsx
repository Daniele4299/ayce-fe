'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Grid, Box } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
// components
import SalesOverview from '@/app/(DashboardLayout)/components/dashboard/SalesOverview';
import YearlyBreakup from '@/app/(DashboardLayout)/components/dashboard/YearlyBreakup';
import RecentTransactions from '@/app/(DashboardLayout)/components/dashboard/RecentTransactions';
import ProductPerformance from '@/app/(DashboardLayout)/components/dashboard/ProductPerformance';
import Blog from '@/app/(DashboardLayout)/components/dashboard/Blog';
import MonthlyEarnings from '@/app/(DashboardLayout)/components/dashboard/MonthlyEarnings';


const Dashboard = () => {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

useEffect(() => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  async function fetchUserRole() {
    try {
      const res = await fetch(`${backendUrl}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setRole(data.ruolo);
      } else if (res.status === 401) {
        // 🔥 Forza redirect con ricarica completa
        window.location.href = '/authentication/login';
      } else {
        console.error('Errore nel recupero del ruolo utente');
      }
    } catch (error) {
      console.error('Errore fetch /auth/me', error);
      // Fallimento fetch -> considera redirect
      window.location.href = '/authentication/login';
    }
  }

  fetchUserRole();
}, []);


  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SalesOverview />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <YearlyBreakup />
              </Grid>
              <Grid size={12}>
                <MonthlyEarnings />
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, lg: 12 }}>
            <ProductPerformance />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
}

export default Dashboard;