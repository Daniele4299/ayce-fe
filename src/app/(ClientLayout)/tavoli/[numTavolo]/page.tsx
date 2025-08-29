'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ProductCard from '@/app/(ClientLayout)/components/tavoli/ProductCard';

const CustomerTablePage = () => {
  const { numTavolo } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [sessione, setSessione] = useState<any>(null);
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [ordine, setOrdine] = useState<Record<number, number>>({});
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    if (checkDone) return;

    const checkSessione = async () => {
      try {
        const meRes = await fetch(`${backendUrl}/auth/me`, {
          credentials: 'include',
        });

        if (meRes.status === 401) {
            setSessione(null);
        }


        if (meRes.ok) {
          const userData = await meRes.json();

          // Se sessione CLIENT attiva ma tavolo diverso, redirect
          if (userData.sessioneId && userData.tavoloNum !== Number(numTavolo)) {
            router.replace(`/tavoli/${userData.tavoloNum}`);
            return;
          }

          // Salva sessione se esiste
          if (userData.sessioneId) {
            setSessione(userData);
            return;
          }
        }

        // Se non c'è sessione attiva, login tavolo
        const loginRes = await fetch(`${backendUrl}/auth/login-tavolo/${numTavolo}`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!loginRes.ok) throw new Error('Errore login tavolo');
        const data = await loginRes.json();
        setSessione(data);

      } catch (err) {
        console.error(err);
        setErrore('Errore nel collegamento al tavolo');
      } finally {
        setLoading(false);
        setCheckDone(true);
      }
    };

    checkSessione();
  }, [numTavolo, backendUrl, router, checkDone]);

  useEffect(() => {
    const fetchProdotti = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProdotti(data);
      } catch {
        setErrore('Errore nel recupero dei prodotti');
      }
    };
    if (sessione) fetchProdotti();
  }, [sessione, backendUrl]);

  const inviaOrdine = async () => {
    const ordiniDaInviare = Object.entries(ordine)
      .filter(([_, qty]) => qty > 0)
      .map(([idProdotto, quantita]) => {
        const prodotto = prodotti.find((p) => p.id === Number(idProdotto));
        return {
          sessione,
          tavolo: { id: sessione.tavoloId, numero: sessione.tavoloNum },
          prodotto,
          quantita,
          prezzoUnitario: prodotto.prezzo,
          orario: new Date().toISOString(),
          flagConsegnato: false,
          stato: 'INVIATO',
        };
      });

    try {
      await Promise.all(
        ordiniDaInviare.map((ordine) =>
          fetch(`${backendUrl}/api/ordini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(ordine),
          })
        )
      );
      setOrdine({});
      alert('Ordine inviato con successo!');
    } catch {
      alert('Errore durante l\'invio dell\'ordine.');
    }
  };

  const modificaQuantita = (idProdotto: number, delta: number) => {
    setOrdine((prev) => {
      const nuovaQuantita = (prev[idProdotto] || 0) + delta;
      return { ...prev, [idProdotto]: Math.max(nuovaQuantita, 0) };
    });
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (errore) return <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>;
  if (!sessione) return <Alert severity="info" sx={{ m: 4 }}>Sessione non ancora aperta, attendere il personale</Alert>;

  return (
    <PageContainer title={`Tavolo ${sessione.tavoloNum}`} description="Ordina dal menù">
      <Grid container spacing={2}>
        {prodotti.map((prodotto) => (
          <Grid size={{ sm: 12, md: 6, lg: 4 }} key={prodotto.id}>
            <ProductCard
              prodotto={{ ...prodotto, prezzo: sessione.isAyce ? 0 : prodotto.prezzo }}
              quantita={ordine[prodotto.id] || 0}
              onIncrement={() => modificaQuantita(prodotto.id, +1)}
              onDecrement={() => modificaQuantita(prodotto.id, -1)}
            />
          </Grid>
        ))}
      </Grid>

      {Object.values(ordine).some((q) => q > 0) && (
        <Box mt={4}>
          <Button variant="contained" color="primary" onClick={inviaOrdine}>
            Invia Ordine
          </Button>
        </Box>
      )}
    </PageContainer>
  );
};

export default CustomerTablePage;
