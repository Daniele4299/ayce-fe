// File: app/(ClientLayout)/tavoli/CustomerTablePage.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ProductCard from '@/app/(ClientLayout)/components/tavoli/ProductCard';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface TavoloMessagePayload {
  [prodottoId: number]: number;
}
interface TavoloMessage {
  tipoEvento: string;
  payload: string;
}
interface OrdineStoricoItem {
  id: number;
  prodotto: string;
  quantita: number;
  orario: string;
  stato: string;
}

const COOLDOWN_MINUTI = 15;

const CustomerTablePage = () => {
  const { numTavolo } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [sessione, setSessione] = useState<any>(null);
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [ordine, setOrdine] = useState<Record<number, number>>({});
  const [ordineBloccato, setOrdineBloccato] = useState(false);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [storicoOpen, setStoricoOpen] = useState(false);
  const [storico, setStorico] = useState<OrdineStoricoItem[]>([]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const stompClientRef = useRef<Client | null>(null);
  const checkDone = useRef(false);
  const cooldownIntervalRef = useRef<number | null>(null);

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
    if (!sessione) return;
    const fetchProdotti = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProdotti(data);
      } catch (err) {
        console.error(err);
        setErrore('Errore nel recupero dei prodotti');
      }
    };
    fetchProdotti();
  }, [sessione, backendUrl]);

  // ---- Recupero ordine temporaneo
  useEffect(() => {
    if (!sessione) return;
    const fetchOrdineTemp = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/tavoli/${sessione.tavoloId}/ordine-temporaneo`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const data: TavoloMessagePayload = await res.json();
        setOrdine(data || {});
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrdineTemp();
  }, [sessione, backendUrl]);

  // ---- Recupera storico
  const fetchStorico = async () => {
    if (!sessione) return;
    try {
      const res = await fetch(`${backendUrl}/api/ordini/sessione/${sessione.sessioneId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const dataRaw = await res.json();
      const data: OrdineStoricoItem[] = (dataRaw || []).map((o: any) => ({
        id: o.id,
        prodotto: o.prodotto?.nome || 'Prodotto sconosciuto',
        quantita: o.quantita,
        orario: o.orario,
        stato: o.stato || 'INVIATO',
      }));
      setStorico(data);
      setStoricoOpen(true);
    } catch (err) {
      console.error(err);
      alert('Errore nel recupero storico ordini');
    }
  };

  // ---- WebSocket
  useEffect(() => {
    if (!sessione) return;
    const socket = new SockJS(`${backendUrl}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: () => {},
      reconnectDelay: 5000,
    });
    client.onConnect = () => {
      client.subscribe(`/topic/tavolo/${sessione.tavoloId}`, (message: IMessage) => {
        try {
          const data: TavoloMessage = JSON.parse(message.body);
          if (data.tipoEvento === 'UPDATE_TEMP') {
            let parsed: any;
            try {
              parsed = JSON.parse(data.payload);
            } catch {
              parsed = data.payload;
            }
            if (parsed && typeof parsed === 'object') {
              setOrdine(parsed.ordine ?? parsed);
              if (parsed.lastOrder) {
                const last = Date.parse(parsed.lastOrder);
                const diff = Math.max(0, COOLDOWN_MINUTI * 60 - Math.floor((Date.now() - last) / 1000));
                if (diff > 0) setCooldown(diff);
                setOrdineBloccato(diff > 0);
              }
            }
          } else if (data.tipoEvento === 'ORDER_SENT') {
            setOrdine({});
            setOrdineBloccato(true);
            setCooldown(COOLDOWN_MINUTI * 60);
          } else if (data.tipoEvento === 'ERROR') {
            alert(data.payload);
          }
        } catch (err) {
          console.error('WS message handling error', err);
        }
      });
      client.publish({
        destination: '/app/tavolo',
        body: JSON.stringify({ tipoEvento: 'GET_STATUS', payload: '' }),
      });
    };
    client.activate();
    stompClientRef.current = client;
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [sessione, backendUrl]);

  // ---- Timer countdown
  useEffect(() => {
    if (cooldown === null) return;
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldown(prev => {
        if (!prev || prev <= 1) {
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
          }
          setOrdineBloccato(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [cooldown]);

  // ---- Modifica quantità
  const modificaQuantita = (idProdotto: number, delta: number, categoria: number) => {
    if (!stompClientRef.current?.connected) return;

    // Il controllo del maxPortate vale solo per sessioni AYCE
    if (sessione?.isAyce) {
      const totale = Object.values(ordine).reduce((sum, q) => sum + q, 0);
      const maxPortate = sessione.numeroPartecipanti * 5;
      if (totale + delta > maxPortate) {
        alert(`Limite portate raggiunto: ${maxPortate}`);
        return;
      }
    }

    stompClientRef.current.publish({
      destination: '/app/tavolo',
      body: JSON.stringify({
        tipoEvento: delta > 0 ? 'ADD_ITEM_TEMP' : 'REMOVE_ITEM_TEMP',
        payload: JSON.stringify({ prodottoId: idProdotto, quantita: Math.abs(delta) }),
      }),
    });
  };

  // ---- Invia ordine
  const inviaOrdine = () => {
    // Solo per sessioni AYCE applichiamo le regole di cooldown
    if (sessione?.isAyce && ordineBloccato) {
      const normalPresent = Object.keys(ordine).some(idStr => {
        const id = Number(idStr);
        const qty = ordine[id] || 0;
        if (qty <= 0) return false;
        const prod = prodotti.find(p => p.id === id);
        const catId = prod?.categoria?.id ?? 0;
        return catId < 100;
      });
      const bevandePresent = Object.keys(ordine).some(idStr => {
        const id = Number(idStr);
        const qty = ordine[id] || 0;
        if (qty <= 0) return false;
        const prod = prodotti.find(p => p.id === id);
        const catId = prod?.categoria?.id ?? 0;
        return catId >= 100;
      });

      if (normalPresent && bevandePresent) {
        const allowedCats = Array.from(
          new Set(
            prodotti
              .filter(p => (p.categoria?.id ?? 0) >= 100)
              .map(p => p.categoria?.nome ?? `Categoria ${(p.categoria?.id ?? 0)}`)
          )
        );
        const lista = allowedCats.length > 0 ? allowedCats.join(', ') : 'categorie speciali';
        alert(`Durante il timer puoi ordinare solo dalle seguenti categorie: ${lista} - rimuovi gli altri prodotti prima di ordinare`);
        return;
      }

      // se ci sono solo prodotti "normali" blocco l'invio fino a fine timer
      if (normalPresent && !bevandePresent) {
        const remaining = cooldown ?? 0;
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        alert(`Devi aspettare ancora ${min}:${sec.toString().padStart(2, '0')} prima di inviare prodotti dalla lista. Puoi comunque ordinare bevande (categorie ≥ 100).`);
        return;
      }

      // se non sono presenti prodotti normali (solo bevande) allora lasciamo proseguire
    }

    stompClientRef.current?.publish({
      destination: '/app/tavolo',
      body: JSON.stringify({ tipoEvento: 'ORDER_SENT', payload: '' }),
    });
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (errore) return <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>;
  if (!sessione) return <Alert severity="info" sx={{ m: 4 }}>Sessione non ancora aperta, attendere il personale</Alert>;

  // ---- Raggruppa prodotti per categoria
  const prodottiPerCategoria: Record<number, any[]> = {};
  prodotti.forEach(p => {
    const catId = p.categoria?.id || 0;
    if (!prodottiPerCategoria[catId]) prodottiPerCategoria[catId] = [];
    prodottiPerCategoria[catId].push(p);
  });

  const sortedCategorie = Object.keys(prodottiPerCategoria)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <PageContainer title={`Tavolo ${sessione.tavoloNum}`} description="Ordina dal menù">
      {sortedCategorie.map(catId => (
        <Box key={catId} mb={4}>
          <Typography variant="h6" gutterBottom>
            {prodottiPerCategoria[catId][0]?.categoria?.nome || `Categoria ${catId}`}
          </Typography>
          <Grid container spacing={2}>
            {prodottiPerCategoria[catId].map(prodotto => {
              const showPrezzo = catId >= 100 || !sessione.isAyce;
              return (
                <Grid size={{ xs: 12, sm: 6 , md: 4}} key={prodotto.id}>
                  <ProductCard
                    prodotto={{ ...prodotto, prezzo: showPrezzo ? prodotto.prezzo : 0 }}
                    quantita={ordine[prodotto.id] || 0}
                    onIncrement={() => modificaQuantita(prodotto.id, +1, catId)}
                    onDecrement={() => modificaQuantita(prodotto.id, -1, catId)}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}

      {cooldown !== null && (
        <Box mt={2}>
          <Typography variant="body1" color="textSecondary">
            Prossimo ordine disponibile tra: {formatTime(cooldown)}
          </Typography>
        </Box>
      )}

      <Box mt={4}>
        <Button
          variant="contained"
          color="primary"
          onClick={inviaOrdine}
          disabled={Object.values(ordine).every(q => q === 0)}
        >
          Invia Ordine
        </Button>
      </Box>

      <Box mt={4} display="flex" gap={2}>
        <Button variant="outlined" color="secondary" onClick={fetchStorico}>
          Mostra Storico Ordini
        </Button>
      </Box>

      <Dialog open={storicoOpen} onClose={() => setStoricoOpen(false)}>
        <DialogTitle>Storico Ordini</DialogTitle>
        <DialogContent>
          <List>
            {storico.length > 0 ? storico.map(item => (
              <ListItem key={item.id}>
                <ListItemText
                  primary={`${item.prodotto} x${item.quantita}`}
                  secondary={`${new Date(item.orario).toLocaleString()} - ${item.stato}`}
                />
              </ListItem>
            )) : <Typography>Nessun ordine storico</Typography>}
          </List>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default CustomerTablePage;
