'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Alert, Snackbar, IconButton } from '@mui/material';
import HeaderTavolo from '@/app/(ClientLayout)/components/tavoli/HeaderTavolo';
import ProductListVirtualized from '@/app/(ClientLayout)/components/tavoli/ProductListVirtualized';
import FooterOrdine from '@/app/(ClientLayout)/components/tavoli/FooterOrdine';
import dynamic from 'next/dynamic';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import CloseIcon from '@mui/icons-material/Close';

const StoricoDialog = dynamic(() => import('../../components/tavoli/StoricoTavolo'), { ssr: false });

interface TavoloMessage { tipoEvento: string; payload: string; }

const CustomerTablePage = () => {
  const { numTavolo } = useParams();
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL as string;

  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [sessione, setSessione] = useState<any>(null);
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [ordine, setOrdine] = useState<Record<number, number>>({});
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [storicoOpen, setStoricoOpen] = useState(false);
  const [storico, setStorico] = useState<any[]>([]);
  const [categoriaSelezionata, setCategoriaSelezionata] = useState<number | 'all'>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'warning' | 'success'; key: number } | null>(null);
  const [maxPortate, setMaxPortate] = useState<number | undefined>(undefined);
  const [isPranzoNow, setIsPranzoNow] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState(false);



  const stompClientRef = useRef<Client | null>(null);
  const checkDone = useRef(false);
  const cooldownIntervalRef = useRef<number | null>(null);

  const ordineRef = useRef(ordine);
  const sessioneRef = useRef(sessione);

  useEffect(() => { ordineRef.current = ordine; }, [ordine]);
  useEffect(() => { sessioneRef.current = sessione; }, [sessione]);

  // ---------- Recupero sessione
  useEffect(() => {
    if (checkDone.current) return;
    const checkSessione = async () => {
      try {
        const meRes = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });
        if (meRes.status === 401) setSessione(null);
        if (meRes.ok) {
          const userData = await meRes.json();
          if (userData.sessioneId && userData.tavoloNum !== Number(numTavolo)) { router.replace(`/tavoli/${userData.tavoloNum}`); return; }
          if (userData.sessioneId) { setSessione(userData); return; }
        }
        const loginRes = await fetch(`${backendUrl}/auth/login-tavolo/${numTavolo}`, {
        method: 'POST',
        credentials: 'include'
      });
      const loginData = await loginRes.json();

      if (loginRes.status === 404) {
        setErrore('Il tavolo non esiste.');
        setSessione(null);
      } else if (loginRes.status === 409) {
        setErrore(null); // non è un errore, solo sessione non inizializzata
        setSessione(null);
      } else if (!loginRes.ok) {
        throw new Error('Errore login tavolo');
      } else {
        setSessione(loginData);
      }
      } catch (err) { console.error(err); setErrore('Errore nel collegamento al tavolo'); }
      finally { setLoading(false); checkDone.current = true; }
    };
    checkSessione();
  }, [numTavolo, backendUrl, router]);

  // ---------- Recupero prodotti
  useEffect(() => {
    if (!sessione) return;
    fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setProdotti(data))
      .catch(err => { console.error(err); setErrore('Errore nel recupero dei prodotti'); });
  }, [sessione, backendUrl]);

// ---------- WebSocket con reconnect stabile su iPhone
useEffect(() => {
  if (!sessione) return;

  let mounted = true; // evita setState su componente smontato

  // Pulizia eventuale client precedente
  if (stompClientRef.current) {
    try { stompClientRef.current.deactivate(); } catch {}
    stompClientRef.current = null;
  }

  const client = new Client({
    brokerURL: undefined,          // usiamo SockJS
    reconnectDelay: 5000,          // tenta di riconnettere ogni 5s
    debug: () => {},
    webSocketFactory: () => new SockJS(`${backendUrl}/ws`)
  });

  client.onConnect = () => {
    if (!mounted) return;
    console.log('WS connesso');
    setWsConnected(true);

    client.subscribe(`/topic/tavolo/${sessione.tavoloId}`, (msg: IMessage) => {
      try {
        const data: TavoloMessage = JSON.parse(msg.body);
        if (!mounted) return;

        if (data.tipoEvento === 'REFRESH') window.location.reload();

        if (data.tipoEvento === 'UPDATE_TEMP') {
          let parsed: any;
          try { parsed = JSON.parse(data.payload); } catch { parsed = data.payload; }
          if (parsed && typeof parsed === 'object') {
            const ordinePayload = parsed.ordine ?? parsed;
            setOrdine(ordinePayload || {});

            if (parsed.lastOrder && parsed.cooldownMinuti) {
              const diff = Math.max(0, parsed.cooldownMinuti * 60 - Math.floor((Date.parse(parsed.dateNow) - Date.parse(parsed.lastOrder)) / 1000));
              if (diff > 0) setCooldown(diff);
            }

            if (parsed.maxPortatePerPersona && parsed.numeroPartecipanti) {
              setMaxPortate(parsed.maxPortatePerPersona * parsed.numeroPartecipanti);
            }

            if (parsed.pranzoStartHour !== undefined && parsed.pranzoEndHour !== undefined) {
              const nowHour = new Date().getHours();
              setIsPranzoNow(nowHour >= parsed.pranzoStartHour && nowHour < parsed.pranzoEndHour);
            }
          }
        }

        if (data.tipoEvento === 'UPDATE_TEMP_DELTA') {
          let parsed: any;
          try { parsed = JSON.parse(data.payload); } catch { parsed = data.payload; }
          if (parsed && typeof parsed === 'object' && parsed.prodottoId !== undefined) {
            const pid = Number(parsed.prodottoId);
            const q = Number(parsed.quantita) || 0;
            setOrdine(prev => {
              const copy = { ...prev };
              if (q <= 0) delete copy[pid]; else copy[pid] = q;
              return copy;
            });
          }
        }

        if (['ORDER_SENT', 'ERROR', 'WARNING', 'SUCCESS'].includes(data.tipoEvento)) {
          const typeMap: Record<string, 'error'|'warning'|'success'> = {
            ERROR: 'error',
            WARNING: 'warning',
            SUCCESS: 'success'
          };
          if (data.tipoEvento !== 'ORDER_SENT') {
            setToastMessage({ text: data.payload || '', type: typeMap[data.tipoEvento], key: Date.now() });
          }
        }

      } catch (err) { console.error('WS message handling error', err); }
    });

    client.publish({ destination: '/app/tavolo', body: JSON.stringify({ tipoEvento: 'GET_STATUS', payload: '' ,sessioneId: sessione.sessioneId}) });
  };

  client.onStompError = () => setWsConnected(false);
  client.onWebSocketClose = () => setWsConnected(false);
  client.onWebSocketError = () => setWsConnected(false);

  client.activate();
  stompClientRef.current = client;

  return () => {
    mounted = false;
    try { client.deactivate(); } catch {}
    stompClientRef.current = null;
    setWsConnected(false);
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
  };
}, [sessione, backendUrl]);



  // ---------- Timer cooldown
  useEffect(() => {
    if (cooldown === null) return;
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);

    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldown(prev => {
        if (!prev || prev <= 1) {
          clearInterval(cooldownIntervalRef.current!);
          cooldownIntervalRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); };
  }, [cooldown]);

  const showWsErrorToast = () => {
  setToastMessage({ text: 'Riconnessione, riprova tra 5s', type: 'error', key: Date.now() });
};

  // ---------- Funzioni di gestione ordine
  const modificaQuantita = useCallback((idProdotto: number, delta: number) => {
    const client = stompClientRef.current;
if (!client?.connected) {
  showWsErrorToast();
  return;
}


    client.publish({
      destination: '/app/tavolo',
      body: JSON.stringify({
        tipoEvento: delta > 0 ? 'ADD_ITEM_TEMP' : 'REMOVE_ITEM_TEMP',
        sessioneId: sessione.sessioneId,
        payload: JSON.stringify({ prodottoId: idProdotto, quantita: Math.abs(delta) })
      })
    });
  }, [sessione]);

  const inviaOrdine = useCallback(() => {
    const client = stompClientRef.current;
    if (!client?.connected) {
      window.location.reload();
      return;
    }
    client.publish({ destination: '/app/tavolo', body: JSON.stringify({ tipoEvento: 'ORDER_SENT', payload: '' , sessioneId: sessione.sessioneId}) });
  }, [sessione]);

  const fetchStorico = useCallback(async () => {
    const sess = sessioneRef.current;
    if (!sess) return;
    try {
      const res = await fetch(`${backendUrl}/api/ordini/storico/${sess.sessioneId}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const dataRaw = await res.json();
      setStorico((dataRaw || []).map((o: any) => ({
        id: o.id,
        prodotto: o.prodotto?.nome || 'Prodotto sconosciuto',
        quantita: o.quantita,
        orario: o.orario,
        stato: o.stato || 'INVIATO'
      })));
      setStoricoOpen(true);
    } catch { alert('Errore nel recupero storico ordini'); }
  }, [backendUrl]);

  const capitalize = useCallback((s?: string) => s ? s.charAt(0).toUpperCase() + s.toLowerCase().slice(1) : '', []);

  // ---------- Early guards
  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (errore) return <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>;
  if (!sessione) return <Alert severity="info" sx={{ m: 4 }}>Sessione non ancora aperta, attendere il personale</Alert>;

// Calcolo totale portate AYCE (solo prodotti categoria < 100)
const totalPortate = prodotti
  .filter(p => p.categoria?.id < 100)             // solo prodotti normali
  .reduce((sum, p) => sum + (ordine[p.id] || 0), 0);

  const hasItems = Object.values(ordine).some(q => q > 0);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme => theme.palette.background.default }}>
      <HeaderTavolo
        sessione={sessione}
        categoriaSelezionata={categoriaSelezionata}
        setCategoriaSelezionata={setCategoriaSelezionata}
        prodotti={prodotti}
        capitalize={capitalize}
      />

      <ProductListVirtualized
        prodotti={prodotti}
        ordine={ordine}
        modificaQuantita={modificaQuantita}
        categoriaSelezionata={categoriaSelezionata}
        sessione={sessione}
        isPranzoNow={isPranzoNow}
      />

      <Snackbar
        open={!!toastMessage}
        autoHideDuration={5000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        key={toastMessage?.key}
      >
        <Alert
          severity={toastMessage?.type}
          variant="filled"
          onClose={() => setToastMessage(null)}
          action={
            <IconButton size="small" color="inherit" onClick={() => setToastMessage(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          sx={{ alignItems: 'center' }}
        >
          {toastMessage?.text}
        </Alert>
      </Snackbar>

<FooterOrdine
    disableInvio={!hasItems}
    cooldown={cooldown}
    inviaOrdine={inviaOrdine}
    fetchStorico={fetchStorico}
    totalPortate={sessione.isAyce ? totalPortate : undefined}
    maxPortate={sessione.isAyce ? maxPortate : undefined}
/>


      <StoricoDialog open={storicoOpen} storico={storico} onClose={() => setStoricoOpen(false)} />
    </Box>
  );
};

export default CustomerTablePage;
