'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Alert } from '@mui/material';
import HeaderTavolo from '@/app/(ClientLayout)/components/tavoli/HeaderTavolo';
import ProductListVirtualized from '@/app/(ClientLayout)/components/tavoli/ProductListVirtualized';
import FooterOrdine from '@/app/(ClientLayout)/components/tavoli/FooterOrdine';
import dynamic from 'next/dynamic';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';



const StoricoDialog = dynamic(() => import('../../components/tavoli/StoricoTavolo'), { ssr: false });

interface TavoloMessagePayload { [prodottoId: number]: number; }
interface TavoloMessage { tipoEvento: string; payload: string; }

const COOLDOWN_MINUTI = 15;
const PRANZO_START_HOUR = 2;
const PRANZO_END_HOUR = 16;

const CustomerTablePage = () => {
  const { numTavolo } = useParams();
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL as string;

  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [sessione, setSessione] = useState<any>(null);
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [ordine, setOrdine] = useState<Record<number, number>>({});
  const [ordineBloccato, setOrdineBloccato] = useState(false);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [storicoOpen, setStoricoOpen] = useState(false);
  const [storico, setStorico] = useState<any[]>([]);
  const [categoriaSelezionata, setCategoriaSelezionata] = useState<number | 'all'>('all');
  const [toastError, setToastError] = useState<{ text: string; key: number } | null>(null);


  const stompClientRef = useRef<Client | null>(null);
  const checkDone = useRef(false);
  const cooldownIntervalRef = useRef<number | null>(null);

  const ordineRef = useRef(ordine);
  const prodottiRef = useRef(prodotti);
  const sessioneRef = useRef(sessione);

  const [sessioneCompleta, setSessioneCompleta] = useState<any>(null);


  useEffect(() => { ordineRef.current = ordine; }, [ordine]);
  useEffect(() => { prodottiRef.current = prodotti; }, [prodotti]);
  useEffect(() => { sessioneRef.current = sessione; }, [sessione]);

  const calcolaCooldownDaSessione = (ultimoOrdine?: string) => {
  if (!ultimoOrdine) return null;
  const diffSec = Math.floor((Date.now() - Date.parse(ultimoOrdine)) / 1000);
  const remaining = COOLDOWN_MINUTI * 60 - diffSec;
  return remaining > 0 ? remaining : null;
};


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
        const loginRes = await fetch(`${backendUrl}/auth/login-tavolo/${numTavolo}`, { method: 'POST', credentials: 'include' });
        if (!loginRes.ok) throw new Error('Errore login tavolo');
        setSessione(await loginRes.json());
      } catch (err) { console.error(err); setErrore('Errore nel collegamento al tavolo'); }
      finally { setLoading(false); checkDone.current = true; }
    };
    checkSessione();
  }, [numTavolo, backendUrl, router]);

  // ----------- Recupero sessione completa
// ----------- Recupero sessione completa
const fetchSessioneCompleta = useCallback(async () => {
  if (!sessioneRef.current?.sessioneId) return;
  try {
    const res = await fetch(`${backendUrl}/api/sessioni/${sessioneRef.current.sessioneId}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Errore fetch sessione completa');
    const data = await res.json();
    setSessioneCompleta(data);

    // calcolo cooldown da ultimoOrdineInviato
    const remaining = calcolaCooldownDaSessione(data.ultimoOrdineInviato);
    if (remaining) {
      setCooldown(remaining);
      setOrdineBloccato(true);
    } else {
      setCooldown(null);
      setOrdineBloccato(false);
    }
  } catch (err) {
    console.error(err);
  }
}, [backendUrl]);

useEffect(() => {
  fetchSessioneCompleta();
}, [sessione, fetchSessioneCompleta]);




  // ---------- Recupero prodotti
  useEffect(() => {
    if (!sessione) return;
    fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setProdotti(data))
      .catch(err => { console.error(err); setErrore('Errore nel recupero dei prodotti'); });
  }, [sessione, backendUrl]);

  // ---------- Recupero ordine temporaneo
  useEffect(() => {
    if (!sessione) return;
    fetch(`${backendUrl}/api/tavoli/${sessione.tavoloId}/ordine-temporaneo`, { credentials: 'include' })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setOrdine(data || {}))
      .catch(console.error);
  }, [sessione, backendUrl]);

  // ---------- WebSocket
  useEffect(() => {
    if (!sessione) return;
    const socket = new SockJS(`${backendUrl}/ws`);
    const client = new Client({ webSocketFactory: () => socket, debug: () => {}, reconnectDelay: 5000 });

    client.onConnect = () => {
      client.subscribe(`/topic/tavolo/${sessione.tavoloId}`, (msg: IMessage) => {
        try {
          const data: TavoloMessage = JSON.parse(msg.body);
          if (data.tipoEvento === 'UPDATE_TEMP') {
            let parsed: any; try { parsed = JSON.parse(data.payload); } catch { parsed = data.payload; }
            if (parsed && typeof parsed === 'object') {
              setOrdine(parsed.ordine ?? parsed);
              if (parsed.lastOrder) {
                const diff = Math.max(0, COOLDOWN_MINUTI * 60 - Math.floor((Date.now() - Date.parse(parsed.lastOrder)) / 1000));
                if (diff > 0) {
                  setCooldown(diff);
                  setOrdineBloccato(true);
                }
              }
            }
} else if (data.tipoEvento === 'ORDER_SENT') {
  setOrdine({});
  fetchSessioneCompleta();
} else if (data.tipoEvento === 'ERROR') {
  setToastError({ text: data.payload || 'Errore sconosciuto', key: Date.now() });
}



        } catch (err) { console.error('WS message handling error', err); }
      });
      client.publish({ destination: '/app/tavolo', body: JSON.stringify({ tipoEvento: 'GET_STATUS', payload: '' }) });
    };

    client.onWebSocketClose = () => {
      console.warn('WS chiuso, provo a riconnettere...');
      setTimeout(() => {
        if (!client.active) client.activate();
      }, 2000);
    };

    client.activate(); 
    stompClientRef.current = client;

    return () => { 
      client.deactivate(); 
      stompClientRef.current = null; 
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); 
    };
  }, [sessione, backendUrl]);

  // ---------- Watchdog WS (refresh automatico se disconnesso)
  useEffect(() => {
    const interval = setInterval(() => {
      const client = stompClientRef.current;
      if (!client || !client.connected) {
        console.warn('WebSocket non connesso, forzo refresh');
        window.location.reload();
      }
    }, 10000); // ogni 10 secondi
    return () => clearInterval(interval);
  }, []);

  // ---------- Refresh al click se WS disconnesso
  useEffect(() => {
    const handleClick = () => {
      const client = stompClientRef.current;
      if (!client || !client.connected) {
        window.location.reload();
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);


  // ---------- Timer cooldown
  useEffect(() => {
    if (cooldown === null) return;
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);

    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldown(prev => {
        if (!prev || prev <= 1) {
          clearInterval(cooldownIntervalRef.current!);
          cooldownIntervalRef.current = null;
          setOrdineBloccato(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); };
  }, [cooldown]);

  // ---------- Funzioni di gestione ordine
  const modificaQuantita = useCallback((idProdotto: number, delta: number, categoria: number) => {
    const client = stompClientRef.current;
    if (!client?.connected) {
      window.location.reload();
      return;
    }

    const sess = sessioneRef.current;
    const ord = ordineRef.current;
    const prods = prodottiRef.current;

    console.log('sessioneRef.current:', sessioneRef.current);

    if (categoria < 100 && sess?.isAyce) {
      let totalNormal = 0;
      for (const [pidStr, q] of Object.entries(ord)) {
        const pid = Number(pidStr);
        if (!q || q <= 0) continue;
        const prod = prods.find(p => p.id === pid);
        if (prod && (prod.categoria?.id ?? 0) < 100) totalNormal += q;
      }
      if (totalNormal + delta > (sess.numeroPartecipanti * 5)) {
        alert(`Limite portate raggiunto: ${sess.numeroPartecipanti * 5}`);
        return;
      }
    }

    client.publish({
      destination: '/app/tavolo',
      body: JSON.stringify({ tipoEvento: delta > 0 ? 'ADD_ITEM_TEMP' : 'REMOVE_ITEM_TEMP', payload: JSON.stringify({ prodottoId: idProdotto, quantita: Math.abs(delta) }) })
    });
  }, []);

  const inviaOrdine = useCallback(() => {
    const client = stompClientRef.current;
    if (!client?.connected) {
      window.location.reload();
      return;
    }

    const sess = sessioneRef.current;
    const ord = ordineRef.current;
    const prods = prodottiRef.current;

    const hasNormal = Object.keys(ord).some(idStr => {
      const id = Number(idStr), qty = ord[id] || 0;
      if (qty <= 0) return false;
      return (prods.find(p => p.id === id)?.categoria?.id ?? 0) < 100;
    });

    const hasSpecial = Object.keys(ord).some(idStr => {
      const id = Number(idStr), qty = ord[id] || 0;
      if (qty <= 0) return false;
      return (prods.find(p => p.id === id)?.categoria?.id ?? 0) >= 100;
    });

    if (sess?.isAyce && ordineBloccato && hasNormal) {
      if (hasSpecial && hasNormal) {
        const lista = Array.from(new Set(prods.filter(p => (p.categoria?.id ?? 0) >= 100).map(p => p.categoria?.nome ?? `Categoria ${(p.categoria?.id ?? 0)}`))).join(', ') || 'categorie speciali';
        alert(`Durante il timer puoi ordinare solo dalle seguenti categorie: ${lista} - rimuovi gli altri prodotti prima di ordinare`);
        return;
      } else {
        const remaining = cooldown ?? 0;
        alert(`Devi aspettare ancora ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')} prima di inviare prodotti dalla lista. Puoi comunque ordinare categorie ≥100.`);
        return;
      }
    }

    client.publish({ destination: '/app/tavolo', body: JSON.stringify({ tipoEvento: 'ORDER_SENT', payload: '' }) });
  }, [ordineBloccato, cooldown]);

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

const numPortateSelezionate = sessioneCompleta?.isAyce === false
  ? undefined
  : Object.entries(ordine)
      .filter(([id, q]) => {
        const prod = prodotti.find(p => p.id === Number(id));
        return !!prod && ((prod.categoria?.id ?? 0) < 100) && Number(q) > 0;
      })
      .reduce((sum, [, q]) => sum + Number(q), 0);

const numPortateMax = sessioneCompleta?.isAyce === false
  ? undefined
  : sessioneCompleta?.numeroPartecipanti
    ? sessioneCompleta.numeroPartecipanti * 5
    : 0;


  // ---------- Early guards
  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (errore) return <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>;
  if (!sessione) return <Alert severity="info" sx={{ m: 4 }}>Sessione non ancora aperta, attendere il personale</Alert>;

  const nowHour = new Date().getHours();
  const isPranzoNow = (nowHour >= PRANZO_START_HOUR && nowHour < PRANZO_END_HOUR);

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
  open={!!toastError}
  autoHideDuration={5000}
  onClose={() => setToastError(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  key={toastError?.key}
>
  <Alert
    severity="error"
    variant="filled"
    onClose={() => setToastError(null)}
    action={
      <IconButton size="small" color="inherit" onClick={() => setToastError(null)}>
        <CloseIcon fontSize="small" />
      </IconButton>
    }
    sx={{ alignItems: 'center' }}
  >
    {toastError?.text}
  </Alert>
</Snackbar>


      <FooterOrdine
        disableInvio={Object.values(ordine).every(q => q === 0) || (ordineBloccato && Object.keys(ordine).some(id => {
          const p = prodotti.find(prod => prod.id === Number(id));
          return p && (p.categoria?.id ?? 0) < 100 && ordine[Number(id)] > 0;
        }))}
        cooldown={cooldown}
        inviaOrdine={inviaOrdine}
        fetchStorico={fetchStorico}
        totalPortate={numPortateSelezionate}
        maxPortate={numPortateMax}
      />

      <StoricoDialog open={storicoOpen} storico={storico} onClose={() => setStoricoOpen(false)} />
    </Box>
  );
};

export default CustomerTablePage;
