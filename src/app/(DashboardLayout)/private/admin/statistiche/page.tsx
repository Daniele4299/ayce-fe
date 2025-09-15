'use client'

import { useEffect, useState } from 'react';
import { Box, Typography, Stack, Button, Grid, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';

// Sezioni
import GestisciCostoProdotto from '@/app/(DashboardLayout)/components/statistiche/GestisciCostoProdotto';
import StampaPdfProdottiUsati from '@/app/(DashboardLayout)/components/statistiche/StampaPdfProdottiUsati';
import VisualizzaScontrini from '@/app/(DashboardLayout)/components/statistiche/VisualizzaScontrini';
import dynamic from 'next/dynamic';
import Breakup from '@/app/(DashboardLayout)/components/dashboard/Breakup';
import Affluenza from '@/app/(DashboardLayout)/components/dashboard/Affluenza';

// Grafici lato client
const ProductPerformance = dynamic(() => import('@/app/(DashboardLayout)/components/dashboard/ProductPerformance'), { ssr: false });

const Dashboard = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'main' | 'gestisci' | 'grafici' | 'pdf' | 'scontrini'>('main');

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    async function fetchUserRole() {
      try {
        const res = await fetch(`${backendUrl}/auth/me`, { method: 'GET', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        } else if (res.status === 401) {
          window.location.href = '/authentication/login';
        }
      } catch (error) {
        console.error(error);
        window.location.href = '/authentication/login';
      } finally {
        setLoading(false);
      }
    }
    fetchUserRole();
  }, []);

  if (loading) return (
    <PageContainer title="Dashboard" description="">
      <Box>Caricamento...</Box>
    </PageContainer>
  );

  if (role !== 'ADMIN') return (
    <PageContainer title="Accesso Negato" description="">
      <Box p={2}>
        <Typography variant="h6" color="error">
          Non hai i permessi per visualizzare questa pagina.
        </Typography>
      </Box>
    </PageContainer>
  );

  const renderBackButton = () => (
    <Box mb={2}>
      <IconButton onClick={() => setActiveView('main')} color="primary">
        <ArrowBackIcon />
      </IconButton>
    </Box>
  );

  const renderMain = () => (
    <Box mt={4}>
      <Typography variant="h5" mb={3}>Gestione Statistiche</Typography>
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <Button variant="contained" onClick={() => setActiveView('grafici')}>Visualizza grafici</Button>
        <Button variant="contained" onClick={() => setActiveView('gestisci')}>Gestisci costo prodotto</Button>
        <Button variant="contained" onClick={() => setActiveView('pdf')}>Stampa PDF prodotti usati</Button>
        <Button variant="contained" onClick={() => setActiveView('scontrini')}>Visualizza tutti gli scontrini</Button>
      </Stack>
    </Box>
  );

  const renderActiveView = () => {
    switch(activeView) {
      case 'gestisci':
        return <GestisciCostoProdotto onBack={() => setActiveView('main')} />;
      case 'grafici':
        return (
          <Box mt={3}>
            {renderBackButton()}
<Grid container spacing={3}>
  <Grid size={{ xs: 12 }}>
    <Breakup />
  </Grid>
  <Grid size={{ xs: 12 }}>
    <Affluenza />
  </Grid>
  <Grid size={{ xs: 12 }}>
    <ProductPerformance />
  </Grid>
</Grid>

          </Box>
        );
      case 'pdf':
        return <StampaPdfProdottiUsati onBack={() => setActiveView('main')} />;
      case 'scontrini':
        return <VisualizzaScontrini onBack={() => setActiveView('main')} />;
      default:
        return renderMain();
    }
  };

  return (
    <PageContainer title="Dashboard" description="">
      {renderActiveView()}
    </PageContainer>
  );
};

export default Dashboard;
