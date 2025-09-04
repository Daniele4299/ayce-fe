'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Grid, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, Switch, Box, Card, CardContent, Typography, Divider, Button } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import OrdineCard from '@/app/(DashboardLayout)/components/comande/OrdineCard';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

type Ordine = {
  id: number;
  tavolo?: { id: number; numero: number };
  prodotto?: { id: number; nome: string };
  quantita: number;
  orario: string;
  flagConsegnato: boolean;
  numeroPartecipanti?: number | null;
};

const Comande = () => {
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'prodotto' | 'tavolo'>('prodotto');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const prevOrdiniRef = useRef<number[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  // refs per i filtri
  const mostraTuttiProdottiRef = useRef(false);
  const nascondiConsegnatiRef = useRef(true);

  useEffect(() => {
    audio.current = new Audio('/notification.mp3');
  }, []);

  const fetchOrdini = useCallback(async () => {
    const res = await fetch(`${backendUrl}/api/private/comande/filtrate?soloAssegnati=${!mostraTuttiProdottiRef.current}&nascondiConsegnati=${nascondiConsegnatiRef.current}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Errore caricamento comande');
    const data: Ordine[] = await res.json();
    return data;
  }, [backendUrl]);

  const refresh = useCallback(async (playAudio = false) => {
    try {
      const data = await fetchOrdini();
      const prevIds = prevOrdiniRef.current;
      const newOrders = data.filter(o => !prevIds.includes(o.id));
      if (playAudio && newOrders.length > 0 && audioEnabled) audio.current?.play().catch(() => {});
      prevOrdiniRef.current = data.map(o => o.id);
      setOrdini(data);
    } catch (err) {
      console.error(err);
      setErrore('Errore durante il caricamento delle comande');
    }
  }, [fetchOrdini, audioEnabled]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // --- WEBSOCKET PER LA CUCINA ---
  useEffect(() => {
    const setupWebSocket = async () => {
      const client = new Client({
        brokerURL: undefined,
        connectHeaders: {},
        debug: (str) => console.log(str),
        reconnectDelay: 5000,
        webSocketFactory: () => new SockJS(`${backendUrl}/ws`)
      });
      client.onConnect = () => {
        client.subscribe('/topic/cucina', (message: IMessage) => {
          const msg = JSON.parse(message.body);
          if (msg.tipoEvento === 'ORDER_SENT') refresh(true);
          else if (msg.tipoEvento === 'CONSEGNA_CHANGED') refresh();
        });
      };
      client.activate();
    };
    setupWebSocket();
    return () => {};
  }, [backendUrl, refresh]);
  // --- FINE WEBSOCKET ---

  const handleToggleConsegnato = async (ordine: Ordine, checked: boolean) => {
    try {
      await fetch(`${backendUrl}/api/private/comande/consegna/${ordine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: ordine.id, flagConsegnato: checked })
      });
      if (viewMode === 'prodotto' && checked && nascondiConsegnatiRef.current) {
        setOrdini(prev => prev.filter(o => o.id !== ordine.id));
      } else refresh();
    } catch (err) {
      console.error(err);
      alert('Errore nel salvare lo stato di consegna.');
    }
  };

  // --- LOGICA GRUPPI E ORDINE DELLE CARD (supporto drag & drop SOLO premendo l'handle) ---
  const gruppiMap = useMemo(() => {
    const map: Record<string, { titolo: string; ordini: Ordine[]; tavoloNumero?: string }> = {};
    for (const o of ordini) {
      const key = viewMode === 'prodotto' ? o.prodotto?.nome ?? 'Sconosciuto' : String(o.tavolo?.numero ?? '-');
      if (!map[key]) {
        map[key] = { titolo: viewMode === 'prodotto' ? key : `Tavolo ${key}`, ordini: [], tavoloNumero: viewMode === 'tavolo' ? key : undefined };
      }
      map[key].ordini.push(o);
    }
    return map;
  }, [ordini, viewMode]);

  const gruppiArrayArrivalOrder = useMemo(() => Object.values(gruppiMap), [gruppiMap]);
  const [groupsOrder, setGroupsOrder] = useState<string[]>([]);
  const draggingKeyRef = useRef<string | null>(null);
  const dragActiveKeyRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const arrivalKeys = gruppiArrayArrivalOrder.map(g => g.titolo);
    setGroupsOrder(prev => {
      if (prev.length === 0) return arrivalKeys;
      const newOrder = prev.filter(k => arrivalKeys.includes(k));
      for (const k of arrivalKeys) if (!newOrder.includes(k)) newOrder.push(k);
      return newOrder;
    });
  }, [gruppiArrayArrivalOrder]);

  const gruppiByTitle = useMemo(() => {
    const map: Record<string, typeof gruppiArrayArrivalOrder[0]> = {};
    for (const g of gruppiArrayArrivalOrder) map[g.titolo] = g;
    return map;
  }, [gruppiArrayArrivalOrder]);

  const resetToArrivalOrder = () => {
    setGroupsOrder(gruppiArrayArrivalOrder.map(g => g.titolo));
  };

  const onHandleMouseDown = (key: string) => (e: React.MouseEvent) => {
    draggingKeyRef.current = key;
    const clear = () => { draggingKeyRef.current = null; window.removeEventListener('mouseup', clear); };
    window.addEventListener('mouseup', clear);
  };

  const onCardDragStart = (key: string) => (e: React.DragEvent) => {
    if (draggingKeyRef.current !== key) { e.preventDefault(); return; }
    dragActiveKeyRef.current = key;
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onCardDragOver = (key: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onCardDrop = (targetKey: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const draggedKey = dragActiveKeyRef.current ?? e.dataTransfer.getData('text/plain');
    if (!draggedKey || draggedKey === targetKey) return;
    setGroupsOrder(prev => {
      const newOrder = [...prev.filter(k => k !== draggedKey)];
      const idx = newOrder.indexOf(targetKey);
      if (idx === -1) newOrder.push(draggedKey);
      else newOrder.splice(idx, 0, draggedKey);
      return newOrder;
    });
    dragActiveKeyRef.current = null;
    draggingKeyRef.current = null;
  };

  const onCardDragEnd = () => {
    dragActiveKeyRef.current = null;
    draggingKeyRef.current = null;
  };

  const orderedGruppe = useMemo(() => groupsOrder.map(k => gruppiByTitle[k]).filter(Boolean), [groupsOrder, gruppiByTitle]);

  const HeaderRighe = ({ mode }: { mode: 'prodotto' | 'tavolo' }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: mode === 'prodotto' ? '90px 120px 120px 1fr 60px' : '1fr 120px 120px 80px 60px', columnGap: 2, py: 1 }}>
      {['prodotto','tavolo'].includes(mode) && (mode === 'prodotto' ? ['Tavolo','Orario','Persone','Quantità','✓'] : ['Prodotto','Orario','Persone','Quantità','✓'] ).map(t => <Typography key={t} variant="subtitle2">{t}</Typography>) }
    </Box>
  );

  // --- SCROLL AUTOMATICO DURANTE DRAG ---
  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (!dragActiveKeyRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const margin = 60;
      const speed = 20;
      if (clientY < rect.top + margin) containerRef.current.scrollBy({ top: -speed, behavior: 'smooth' });
      else if (clientY > rect.bottom - margin) containerRef.current.scrollBy({ top: speed, behavior: 'smooth' });
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => { handleMove(e.touches[0].clientY); e.preventDefault(); };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <PageContainer title="Comande" description="Lista comande attive">
      <Grid size={12} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="view-select-label">Visualizzazione</InputLabel>
          <Select labelId="view-select-label" value={viewMode} onChange={e => setViewMode(e.target.value as 'prodotto' | 'tavolo')}>
            <MenuItem value="prodotto">Per prodotto</MenuItem>
            <MenuItem value="tavolo">Per tavolo</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          {[{ label: 'Mostra tutti i prodotti', checked: mostraTuttiProdottiRef.current, onChange: () => { mostraTuttiProdottiRef.current = !mostraTuttiProdottiRef.current; refresh(); } }, { label: 'Nascondi consegnati', checked: nascondiConsegnatiRef.current, onChange: () => { nascondiConsegnatiRef.current = !nascondiConsegnatiRef.current; refresh(); } }, { label: 'Suono', checked: audioEnabled, onChange: () => setAudioEnabled(p => !p) }].map(({ label, checked, onChange }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>{label}</Typography>
              <Switch checked={checked} onChange={onChange} />
            </Box>
          ))}
          {viewMode === 'prodotto' && (
            <Button variant="outlined" onClick={resetToArrivalOrder}>
              Riordina (ordine di arrivo)
            </Button>
          )}
        </Box>
      </Grid>

      <Grid size={12}>
        {loading ? <CircularProgress sx={{ m: 4 }} /> : errore ? <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert> : ordini.length === 0 ? <Alert severity="info" sx={{ m: 4 }}>Nessuna comanda attiva</Alert> : (
          <Box ref={containerRef} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, overflowY: 'auto', maxHeight: '80vh', pb: 2 }}>
            {orderedGruppe.map(gruppo => (
              <Card
                key={gruppo.titolo}
                draggable={true}
                onDragStart={onCardDragStart(gruppo.titolo)}
                onDragOver={onCardDragOver(gruppo.titolo)}
                onDrop={onCardDrop(gruppo.titolo)}
                onDragEnd={onCardDragEnd}
                sx={{ position: 'relative' }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      onMouseDown={onHandleMouseDown(gruppo.titolo)}
                      onTouchStart={(e) => { e.preventDefault(); draggingKeyRef.current = gruppo.titolo; }}
                      sx={{ width: 28, height: 28, mr: 1, borderRadius: 1, border: '1px dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}
                      title="Tieni premuto e trascina per spostare"
                    >
                      <Box sx={{ width: 10, height: 2, bgcolor: 'text.primary' }} />
                    </Box>
                    <Typography variant="h6">{gruppo.titolo}</Typography>
                  </Box>
                  <Divider />
                  <HeaderRighe mode={viewMode} />
                  <Divider sx={{ mb: 1 }} />
                  <Box>
                    {gruppo.ordini.map(o => (
                      <OrdineCard key={o.id} ordine={o} mode={viewMode} onToggle={checked => handleToggleConsegnato(o, checked)} isNew={!prevOrdiniRef.current.includes(o.id)} />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Grid>
    </PageContainer>
  );
};

export default Comande;
