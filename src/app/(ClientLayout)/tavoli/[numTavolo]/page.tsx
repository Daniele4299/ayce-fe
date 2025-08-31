'use client';

import Image from "next/image";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Button, CircularProgress, Alert, Grid, Typography,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText,
  Divider, Select, MenuItem, Badge
} from '@mui/material';
import ProductCard from '@/app/(ClientLayout)/components/tavoli/ProductCard';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface TavoloMessagePayload { [prodottoId: number]: number; }
interface TavoloMessage { tipoEvento: string; payload: string; }
interface OrdineStoricoItem { id: number; prodotto: string; quantita: number; orario: string; stato: string; }

const COOLDOWN_MINUTI = 15;

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
  const [storico, setStorico] = useState<OrdineStoricoItem[]>([]);
  const [categoriaSelezionata, setCategoriaSelezionata] = useState<number | 'all'>('all');

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

  // ---- Recupero prodotti
  useEffect(() => {
    if (!sessione) return;
    fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setProdotti(data))
      .catch(err => { console.error(err); setErrore('Errore nel recupero dei prodotti'); });
  }, [sessione, backendUrl]);

  // ---- Recupero ordine temporaneo
  useEffect(() => {
    if (!sessione) return;
    fetch(`${backendUrl}/api/tavoli/${sessione.tavoloId}/ordine-temporaneo`, { credentials: 'include' })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setOrdine(data || {}))
      .catch(console.error);
  }, [sessione, backendUrl]);

  // ---- Recupera storico
  const fetchStorico = async () => {
    if (!sessione) return;
    try {
      const res = await fetch(`${backendUrl}/api/ordini/sessione/${sessione.sessioneId}`, { credentials: 'include' });
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
  };

  // ---- WebSocket
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
                if (diff > 0) setCooldown(diff);
                setOrdineBloccato(diff > 0);
              }
            }
          } else if (data.tipoEvento === 'ORDER_SENT') { setOrdine({}); setOrdineBloccato(true); setCooldown(COOLDOWN_MINUTI * 60); }
          else if (data.tipoEvento === 'ERROR') alert(data.payload);
        } catch (err) { console.error('WS message handling error', err); }
      });
      client.publish({ destination: '/app/tavolo', body: JSON.stringify({ tipoEvento: 'GET_STATUS', payload: '' }) });
    };

    client.activate(); stompClientRef.current = client;
    return () => { client.deactivate(); stompClientRef.current = null; if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); };
  }, [sessione, backendUrl]);

  // ---- Timer countdown
  useEffect(() => {
    if (cooldown === null) return;
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldown(prev => { if (!prev || prev <= 1) { if (cooldownIntervalRef.current) { clearInterval(cooldownIntervalRef.current); cooldownIntervalRef.current = null; } setOrdineBloccato(false); return null; } return prev - 1; });
    }, 1000);
    return () => { if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); };
  }, [cooldown]);

  // ---- Modifica quantità
  const modificaQuantita = (idProdotto: number, delta: number, categoria: number) => {
    if (!stompClientRef.current?.connected) return;
    // Limite massimo solo per categorie <100
    if (categoria < 100 && sessione?.isAyce && Object.entries(ordine).reduce((s, [pid, q]) => {
      const prod = prodotti.find(p => p.id === Number(pid));
      return prod && (prod.categoria?.id ?? 0) < 100 ? s + q : s;
    }, 0) + delta > sessione.numeroPartecipanti * 5) {
      alert(`Limite portate raggiunto: ${sessione.numeroPartecipanti * 5}`); return;
    }
    stompClientRef.current.publish({
      destination: '/app/tavolo',
      body: JSON.stringify({ tipoEvento: delta > 0 ? 'ADD_ITEM_TEMP' : 'REMOVE_ITEM_TEMP', payload: JSON.stringify({ prodottoId: idProdotto, quantita: Math.abs(delta) }) })
    });
  };

  const inviaOrdine = () => {
    if (!stompClientRef.current?.connected) return;

    // Controllo cooldown solo per categorie <100
    const hasNormal = Object.keys(ordine).some(idStr => {
      const id = Number(idStr), qty = ordine[id] || 0;
      if (qty <= 0) return false;
      return (prodotti.find(p => p.id === id)?.categoria?.id ?? 0) < 100;
    });

    const hasSpecial = Object.keys(ordine).some(idStr => {
      const id = Number(idStr), qty = ordine[id] || 0;
      if (qty <= 0) return false;
      return (prodotti.find(p => p.id === id)?.categoria?.id ?? 0) >= 100;
    });

    if (sessione?.isAyce && ordineBloccato && hasNormal) {
      if (hasSpecial && hasNormal) {
        const lista = Array.from(new Set(prodotti.filter(p => (p.categoria?.id ?? 0) >= 100).map(p => p.categoria?.nome ?? `Categoria ${(p.categoria?.id ?? 0)}`))).join(', ') || 'categorie speciali';
        alert(`Durante il timer puoi ordinare solo dalle seguenti categorie: ${lista} - rimuovi gli altri prodotti prima di ordinare`);
        return;
      } else {
        const remaining = cooldown ?? 0;
        alert(`Devi aspettare ancora ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')} prima di inviare prodotti dalla lista. Puoi comunque ordinare categorie ≥100.`);
        return;
      }
    }

    stompClientRef.current.publish({ destination: '/app/tavolo', body: JSON.stringify({ tipoEvento: 'ORDER_SENT', payload: '' }) });
  };

  const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.toLowerCase().slice(1) : '';

  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (errore) return <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>;
  if (!sessione) return <Alert severity="info" sx={{ m: 4 }}>Sessione non ancora aperta, attendere il personale</Alert>;

  // ---- Raggruppa prodotti per categoria
  const prodottiPerCategoria: Record<number, any[]> = {};
  prodotti.forEach(p => { const id = p.categoria?.id || 0; if (!prodottiPerCategoria[id]) prodottiPerCategoria[id] = []; prodottiPerCategoria[id].push(p); });
  const sortedCategorie = Object.keys(prodottiPerCategoria).map(Number).sort((a, b) => a - b);
  const categorieList = sortedCategorie.map(id => ({ id, nome: prodottiPerCategoria[id][0]?.categoria?.nome || `Categoria ${id}` }));

  // ---- Filtra categorie da mostrare (solo quella selezionata se non "all")
  const categorieDaMostrare = categoriaSelezionata === 'all' ? sortedCategorie : [categoriaSelezionata];

  // ---- Disabilita bottone: solo se tutte quantità 0 o se cooldown e ordini normali
  const disableInvio = Object.values(ordine).every(q => q === 0) || (ordineBloccato && Object.keys(ordine).some(id => {
    const prod = prodotti.find(p => p.id === Number(id));
    return prod && (prod.categoria?.id ?? 0) < 100 && (ordine[Number(id)] || 0) > 0;
  }));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme => theme.palette.background.default }}>
      {/* HEADER */}
      <Box component="header" sx={{ py: 2, px: 3, bgcolor: theme => theme.palette.background.paper, borderBottom: "1px solid #333", position: "sticky", top: 0, zIndex: 1000 }}>
<Box
  sx={{
    maxWidth: "md",
    mx: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 1,
    flexWrap: "wrap",
    py: 1,
  }}
>
  {/* Riga principale: logo + testo */}
  <Box
    sx={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      width: "100%",
    }}
  >
    {/* Logo più grande */}
    <Image
      src="/images/logos/logo.png"
      alt="Logo ristorante"
      width={120}   // aumentato
      height={60}   // aumentato
      priority
      style={{ objectFit: "contain" }}
    />

    {/* Testo a fianco del logo con font più piccolo */}
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        flexGrow: 1,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: theme => theme.palette.primary.main,
          lineHeight: 1.2,
          fontSize: '1rem',  // leggermente più piccolo
        }}
      >
        🍽️ Benvenuto — Tavolo {sessione.tavoloNum}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", fontSize: '0.75rem' }} // leggermente più piccolo
      >
        Sfoglia le categorie e ordina facilmente dall’app
      </Typography>
    </Box>
  </Box>

  {/* Select sotto, a tutta larghezza */}
  <Box sx={{ width: "100%", mt: 1 }}>
    <Select
      size="small"
      value={categoriaSelezionata}
      onChange={e => setCategoriaSelezionata(e.target.value as any)}
      sx={{
        width: "100%",
        bgcolor: "background.default",
        borderRadius: 2,
      }}
    >
      <MenuItem value="all">Tutte le categorie</MenuItem>
      {categorieList.map(c => <MenuItem key={c.id} value={c.id}>{capitalize(c.nome)}</MenuItem>)}
    </Select>
  </Box>
</Box>




      </Box>

      {/* MAIN CONTENT */}
      <Box component="main" sx={{ flexGrow: 1, overflowY: "auto", maxWidth: "md", mx: "auto", width: "100%", px: 2, py: 2 }}>
        {categorieDaMostrare.map((catId, idx) => (
          <Box key={catId} mb={4}>
            {idx !== 0 && categoriaSelezionata === 'all' && <Divider sx={{ mb: 3, borderColor: 'divider' }} />}
            <Typography variant="h6" gutterBottom color="primary">{capitalize(prodottiPerCategoria[catId][0]?.categoria?.nome) || `Categoria ${catId}`}</Typography>
            <Grid container spacing={2}>
              {prodottiPerCategoria[catId].map(prodotto => {
                const showPrezzo = catId >= 100 || !sessione.isAyce;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={prodotto.id}>
                    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(201,168,86,0.25)', transition: 'all 0.2s ease', backgroundColor: 'rgba(255,255,255,0.02)', '&:hover': { backgroundColor: 'rgba(201,168,86,0.08)', transform: 'translateY(-2px)' }, p: 1.5, height: 360, display: 'flex', flexDirection: 'column' }}>
                      <ProductCard prodotto={{ ...prodotto, prezzo: showPrezzo ? prodotto.prezzo : 0 }} quantita={ordine[prodotto.id] || 0} onIncrement={() => modificaQuantita(prodotto.id, 1, catId)} onDecrement={() => modificaQuantita(prodotto.id, -1, catId)} />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Box>

      {/* FOOTER */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', py: 2, borderTop: '1px solid #333', display: 'flex', gap: 2, px: 2, justifyContent: 'center', zIndex: 1200 }}>
        <Badge badgeContent={cooldown !== null ? `${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2,'0')}` : 0} color="secondary" invisible={cooldown === null}>
          <Button variant="contained" color="primary" disabled={disableInvio} onClick={inviaOrdine}>Invia Ordine</Button>
        </Badge>
        <Button variant="outlined" color="secondary" onClick={fetchStorico}>Storico</Button>
      </Box>

      <Dialog open={storicoOpen} onClose={() => setStoricoOpen(false)}>
        <DialogTitle>Storico Ordini</DialogTitle>
        <DialogContent>
          <List>
            {storico.length > 0 ? storico.map(item => <ListItem key={item.id}><ListItemText primary={`${item.prodotto} x${item.quantita}`} secondary={`${new Date(item.orario).toLocaleString()} - ${item.stato}`} /></ListItem>) : <Typography>Nessun ordine storico</Typography>}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CustomerTablePage;
