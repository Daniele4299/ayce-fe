'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface TavoloMessagePayload {
  prodottoId: number;
  quantita: number;
}

interface TavoloMessage {
  sessioneId: number;
  tavoloId: number;
  tipoEvento: string; // ADD_ITEM_TEMP, REMOVE_ITEM_TEMP, ORDER_SENT
  payload: string;
}

const CustomerTablePage = () => {
  const { numTavolo } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [sessione, setSessione] = useState<any>(null);
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [ordine, setOrdine] = useState<Record<number, number>>({});
  const [ordineBloccato, setOrdineBloccato] = useState(false);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const stompClientRef = useRef<Client | null>(null);
  const checkDone = useRef(false);

  // ---- Recupero sessione
  useEffect(() => {
    if (checkDone.current) return;

    const checkSessione = async () => {
      try {
        const meRes = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });

        if (meRes.status === 401) setSessione(null);

        if (meRes.ok) {
          const userData = await meRes.json();

          if (userData.sessioneId && userData.tavoloNum !== Number(numTavolo)) {
            router.replace(`/tavoli/${userData.tavoloNum}`);
            return;
          }

          if (userData.sessioneId) {
            setSessione(userData);
            return;
          }
        }

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
        checkDone.current = true;
      }
    };

    checkSessione();
  }, [numTavolo, backendUrl, router]);

  // ---- Recupero prodotti
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

  // ---- Inizializza WebSocket
  useEffect(() => {
  if (!sessione) return;

  const socket = new SockJS(`${backendUrl}/ws`);
  const client = new Client({
    webSocketFactory: () => socket,
    debug: (str) => console.log(str),
    reconnectDelay: 5000,
  });

  client.onConnect = () => {
    client.subscribe(`/topic/tavolo/${sessione.tavoloId}`, (message: IMessage) => {
      const data: TavoloMessage = JSON.parse(message.body);

      if (data.tipoEvento === 'ADD_ITEM_TEMP' || data.tipoEvento === 'REMOVE_ITEM_TEMP') {
        const payload: TavoloMessagePayload = JSON.parse(data.payload);
        setOrdine((prev) => {
          const nuovaQuantita = data.tipoEvento === 'ADD_ITEM_TEMP'
            ? (prev[payload.prodottoId] || 0) + payload.quantita
            : Math.max((prev[payload.prodottoId] || 0) - payload.quantita, 0);
          return { ...prev, [payload.prodottoId]: nuovaQuantita };
        });
      } else if (data.tipoEvento === 'ORDER_SENT') {
        setOrdineBloccato(true);
      }
    });
  };

  client.activate();
  stompClientRef.current = client;

  // Cleanup sincrono
  return () => {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
  };
}, [sessione, backendUrl]);


  // ---- Modifica quantità
  const modificaQuantita = (idProdotto: number, delta: number) => {
    if (ordineBloccato || !stompClientRef.current?.connected) return;

    setOrdine((prev) => {
      const nuovaQuantita = Math.max((prev[idProdotto] || 0) + delta, 0);

      if (nuovaQuantita !== (prev[idProdotto] || 0)) {
        stompClientRef.current?.publish({
          destination: '/app/tavolo',
          body: JSON.stringify({
            sessioneId: sessione.sessioneId,
            tavoloId: sessione.tavoloId,
            tipoEvento: delta > 0 ? 'ADD_ITEM_TEMP' : 'REMOVE_ITEM_TEMP',
            payload: JSON.stringify({ prodottoId: idProdotto, quantita: Math.abs(delta) }),
          }),
        });
      }

      return { ...prev, [idProdotto]: nuovaQuantita };
    });
  };

  // ---- Invia ordine
  const inviaOrdine = async () => {
    if (ordineBloccato) return;

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
      setOrdineBloccato(true);

      // invio evento ORDER_SENT al WS
      stompClientRef.current?.publish({
        destination: '/app/tavolo',
        body: JSON.stringify({
          sessioneId: sessione.sessioneId,
          tavoloId: sessione.tavoloId,
          tipoEvento: 'ORDER_SENT',
          payload: '',
        }),
      });

      alert('Ordine inviato con successo!');
    } catch {
      alert('Errore durante l\'invio dell\'ordine.');
    }
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
              //disabled={ordineBloccato}
            />
          </Grid>
        ))}
      </Grid>

      {Object.values(ordine).some((q) => q > 0) && !ordineBloccato && (
        <Box mt={4}>
          <Button variant="contained" color="primary" onClick={inviaOrdine}>
            Invia Ordine
          </Button>
        </Box>
      )}

      {ordineBloccato && (
        <Box mt={4}>
          <Alert severity="info">Ordine inviato, non è più possibile modificare</Alert>
        </Box>
      )}
    </PageContainer>
  );
};

export default CustomerTablePage;
