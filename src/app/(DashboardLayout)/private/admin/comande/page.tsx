'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Grid, Alert } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import OrdineCard from '@/app/(DashboardLayout)/components/comande/OrdineCard';

const Comande = () => {
  const [ordini, setOrdini] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const fetchOrdini = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/ordini`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOrdini(data.filter((o: any) => !o.flagConsegnato));
      } catch (err) {
        console.error(err);
        setErrore('Errore nel recupero delle comande');
      } finally {
        setLoading(false);
      }
    };

    fetchOrdini();
  }, []);

  const aggiornaOrdine = (ordineId: number) => {
    setOrdini((prev) => prev.filter((o) => o.id !== ordineId));
  };

  return (
    <PageContainer title="Comande" description="Lista comande attive">
      <Grid size={12}>
        {loading ? (
          <CircularProgress sx={{ m: 4 }} />
        ) : errore ? (
          <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>
        ) : ordini.length === 0 ? (
          <Alert severity="info" sx={{ m: 4 }}>Nessuna comanda attiva</Alert>
        ) : (
          <Grid container spacing={2}>
            {ordini.map((ordine) => (
              <Grid size={12} key={ordine.id}>
                <OrdineCard ordine={ordine} onConsegnato={aggiornaOrdine} />
              </Grid>
            ))}
          </Grid>
        )}
      </Grid>
    </PageContainer>
  );
};

export default Comande;
