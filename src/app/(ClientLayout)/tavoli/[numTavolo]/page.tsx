'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Button,
  Grid,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ProductCard from '@/app/(ClientLayout)/components/tavoli/ProductCard';

const CustomerTablePage = () => {
  const { numTavolo } = useParams();
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [tavolo, setTavolo] = useState<any>(null);
  const [sessione, setSessione] = useState<any>(null);
  const [numeroPersone, setNumeroPersone] = useState<number>(1);
  const [isAyce, setIsAyce] = useState<boolean>(true);
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [ordine, setOrdine] = useState<Record<number, number>>({});
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // STEP 1: Controllo tavolo
  useEffect(() => {
    const fetchTavolo = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/tavoli`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const tavoloMatch = data.find((t: any) => t.numero === Number(numTavolo));
        if (!tavoloMatch) {
          setErrore('Tavolo non esistente');
          setLoading(false);
          return;
        }
        if (!tavoloMatch.attivo) {
          setErrore('Tavolo non attivo');
          setLoading(false);
          return;
        }
        setTavolo(tavoloMatch);
      } catch (err) {
        console.error(err);
        setErrore('Errore nel recupero del tavolo');
        setLoading(false);
      }
    };

    fetchTavolo();
  }, [numTavolo]);

  // STEP 2: Controllo sessione
  useEffect(() => {
    const fetchSessione = async () => {
      if (!tavolo) return;
      try {
        const res = await fetch(`${backendUrl}/api/sessioni`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const attiva = data.find(
          (s: any) => s.tavolo.id === tavolo.id && s.stato === 'ATTIVA'
        );
        setSessione(attiva || null);
      } catch (err) {
        console.error(err);
        setErrore('Errore nel recupero della sessione');
      } finally {
        setLoading(false);
      }
    };

    fetchSessione();
  }, [tavolo]);

  const creaSessione = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/sessioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tavolo,
          numeroPartecipanti: numeroPersone,
          stato: 'ATTIVA',
          orarioInizio: new Date().toISOString(),
          isAyce: isAyce,
        }),
      });

      if (!res.ok) throw new Error();
      const nuova = await res.json();
      setSessione(nuova);
    } catch {
      setErrore('Errore nella creazione della sessione');
    }
  };

  // Caricamento prodotti
  useEffect(() => {
    const fetchProdotti = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/prodotti`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProdotti(data);
      } catch (err) {
        console.error(err);
        setErrore('Errore nel recupero dei prodotti');
      }
    };

    if (sessione) fetchProdotti();
  }, [sessione]);

  const inviaOrdine = async () => {
    const ordiniDaInviare = Object.entries(ordine)
      .filter(([_, qty]) => qty > 0)
      .map(([idProdotto, quantita]) => {
        const prodotto = prodotti.find((p) => p.id === Number(idProdotto));
        return {
          sessione,
          tavolo,
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
      alert("Errore durante l'invio dell'ordine.");
    }
  };

  const modificaQuantita = (idProdotto: number, delta: number) => {
    setOrdine((prev) => {
      const nuovaQuantita = (prev[idProdotto] || 0) + delta;
      return {
        ...prev,
        [idProdotto]: Math.max(nuovaQuantita, 0),
      };
    });
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (errore) return <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>;

  return (
    <PageContainer title={`Tavolo ${numTavolo}`} description="Ordina dal menù">
      <Box mb={2}>
        <Typography variant="h4">Tavolo {numTavolo}</Typography>
        {sessione ? (
          <Typography variant="subtitle1">
            Sessione attiva ({sessione.isAyce ? 'All You Can Eat' : 'Alla carta'}), buon appetito!
          </Typography>
        ) : (
          <Box display="flex" alignItems="center" gap={2} mt={2}>
            <TextField
              type="number"
              label="Numero persone"
              value={numeroPersone}
              onChange={(e) => setNumeroPersone(Number(e.target.value))}
              inputProps={{ min: 1 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isAyce}
                  onChange={(e) => setIsAyce(e.target.checked)}
                  color="primary"
                />
              }
              label="All You Can Eat"
            />
            <Button variant="contained" onClick={creaSessione}>
              Apri Tavolo
            </Button>
          </Box>
        )}
      </Box>

      {sessione && (
        <Grid container spacing={2}>
          {prodotti.map((prodotto) => (
            <Grid size={{ sm: 12, md: 6, lg: 4 }} key={prodotto.id}>
              <ProductCard
                prodotto={{
                  ...prodotto,
                  prezzo: sessione.isAyce ? 0 : prodotto.prezzo,
                }}
                quantita={ordine[prodotto.id] || 0}
                onIncrement={() => modificaQuantita(prodotto.id, +1)}
                onDecrement={() => modificaQuantita(prodotto.id, -1)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {sessione && Object.values(ordine).some((q) => q > 0) && (
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
