'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Grid, Box, Typography } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import UserManagement from '@/app/(DashboardLayout)/components/utenze/UserManagement';

const Utenze = () => {
  const router = useRouter();
  const [role, setRole] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
          setRole(data.livello);
        } else if (res.status === 401) {
          window.location.href = '/authentication/login';
        } else {
          console.error('Errore nel recupero del ruolo utente');
        }
      } catch (error) {
        console.error('Errore fetch /auth/me', error);
        window.location.href = '/authentication/login';
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  if (loading) return <PageContainer title="Utenze" description=""><Box>Caricamento...</Box></PageContainer>;

  if (role === null || role >= 2) {
    return (
      <PageContainer title="Accesso Negato" description="">
        <Box p={2}>
          <Typography variant="h6" color="error">Non hai i permessi per visualizzare questa pagina.</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Gestione Utenze" description="Gestione Utenze">
      <Box mb={2}>
        <Typography variant="subtitle2">Ruolo utente: {role === 0 ? 'Amministratore' : 'Dipendente'}</Typography>
      </Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 10 }}>
          <UserManagement readOnly={role !== 0} />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Utenze;
