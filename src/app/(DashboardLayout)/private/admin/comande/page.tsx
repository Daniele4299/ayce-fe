'use client';

import { useEffect, useState } from 'react';
import { Grid, CircularProgress, Alert } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import OrdineCard from '@/app/(DashboardLayout)/components/comande/OrdineCard';

type UtenteProdotto = {
  id: {
    utenteId: number;
    prodottoId: number;
  };
  riceveComanda: boolean;
};

const Comande = () => {
  const [ordini, setOrdini] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Recupera l'utente loggato
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });
      if (!res.ok) throw new Error('Utente non trovato');
      const data = await res.json();
      setCurrentUserId(data.id);
      await fetchUtenteProdotti(data.id);
    } catch (err) {
      console.error(err);
      setErrore('Errore nel recupero dell\'utente loggato');
      setLoading(false);
    }
  };

  // Recupera i prodotti che l'utente riceve e poi le comande
  const fetchUtenteProdotti = async (utenteId: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/utente-prodotti/${utenteId}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data: UtenteProdotto[] = await res.json();

      const prodottiMap: Record<number, boolean> = {};
      data.forEach(up => {
        prodottiMap[up.id.prodottoId] = up.riceveComanda; // <- CORRETTO
      });

      await fetchOrdini(prodottiMap);
    } catch (err) {
      console.error(err);
      setErrore('Errore nel recupero dei prodotti utente');
      setLoading(false);
    }
  };

  // Recupera tutte le comande filtrando solo quelle attive e che l'utente deve ricevere
  const fetchOrdini = async (prodottiMap: Record<number, boolean>) => {
    try {
      const res = await fetch(`${backendUrl}/api/ordini`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const filtrate = data.filter(
        (o: any) => !o.flagConsegnato && prodottiMap[o.prodotto.id] === true
      );
      setOrdini(filtrate);
    } catch (err) {
      console.error(err);
      setErrore('Errore nel recupero delle comande');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const aggiornaOrdine = (ordineId: number) => {
    setOrdini(prev => prev.filter(o => o.id !== ordineId));
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
            {ordini.map(ordine => (
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
