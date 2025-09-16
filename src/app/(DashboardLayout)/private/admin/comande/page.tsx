'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  Snackbar,
  TextField,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import OrdineCard from '@/app/(DashboardLayout)/components/comande/OrdineCard';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { useWS } from '@/app/(DashboardLayout)/ws/WSContext';


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
  const [cardHeight, setCardHeight] = useState(500);
  const [filtroProdotto, setFiltroProdotto] = useState('');


  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const prevOrdiniRef = useRef<number[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  const mostraTuttiProdottiRef = useRef(false);
  const nascondiConsegnatiRef = useRef(true);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [highlightedCards, setHighlightedCards] = useState<Record<string, boolean>>({});

  const draggingKeyRef = useRef<string | null>(null);
  const dragActiveKeyRef = useRef<string | null>(null);

  

  const toggleAudio = useCallback(() => {
  setAudioEnabled((prev) => {
    const next = !prev;
    if (!next && audio.current) {
      // se sto disabilitando, stoppa subito l'audio corrente
      try { audio.current.pause(); } catch (e) {}
      try { audio.current.currentTime = 0; } catch (e) {}
    }
    return next;
  });
}, []);

// Inizializza l'Audio object (una sola volta)
useEffect(() => {
  audio.current = new Audio('/notification.mp3');
  audio.current.preload = 'auto';
  // audio.current.volume = 0.9; // opzionale
  audio.current.loop = false;
  // assicurati che sia "pulito"
  audio.current.pause();
  try { audio.current.currentTime = 0; } catch (e) {}
}, []);

// Sblocca il contesto audio al primo touch / click dell'utente (necessario su iOS Safari)
const [showAudioHint, setShowAudioHint] = useState(true);

// nella useEffect già presente per unlockAudio:
useEffect(() => {
  const unlockAudio = () => {
    if (!audio.current) return;

    audio.current.play()
      .then(() => {
        audio.current?.pause();
        try { audio.current!.currentTime = 0; } catch (e) {}
      })
      .catch(() => {});

    // nascondi la snackbar
    setShowAudioHint(false);
  };

  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('click', unlockAudio, { once: true });

  return () => {
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
}, []);





  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(orientation: portrait)');
    const calcHeight = () => {
      setCardHeight(Math.round(mq.matches ? window.innerHeight * 0.6 : window.innerHeight * 0.8));
    };
    calcHeight();

    if (mq.addEventListener) {
      mq.addEventListener('change', calcHeight);
      return () => mq.removeEventListener('change', calcHeight);
    } else {
      mq.addListener(calcHeight);
      return () => mq.removeListener(calcHeight);
    }
  }, []);

  const fetchOrdini = useCallback(async (): Promise<Ordine[]> => {
    const res = await fetch(
      `${backendUrl}/api/private/comande/filtrate?soloAssegnati=${!mostraTuttiProdottiRef.current}&nascondiConsegnati=${nascondiConsegnatiRef.current}`,
      { credentials: 'include' }
    );
    if (!res.ok) throw new Error('Errore caricamento comande');
    return res.json();
  }, [backendUrl]);

  const refresh = useCallback(
    async (playAudio = false, isWebsocketUpdate = false) => {
      try {
        const data = await fetchOrdini();
        const newOrders = data.filter((o) => !prevOrdiniRef.current.includes(o.id));

       if (playAudio && newOrders.length > 0) {
  // sempre reset/fermo per evitare conflitti di istanze già in play
  if (audio.current) {
    // se l'audio è abilitato: pausa/reset e poi play
    if (audioEnabled) {
      try { audio.current.pause(); } catch (e) {}
      try { audio.current.currentTime = 0; } catch (e) {}
      audio.current.play().catch(() => {});
    } else {
      // se disabilitato: assicurati che non ci siano suoni in corso
      try { audio.current.pause(); } catch (e) {}
      try { audio.current.currentTime = 0; } catch (e) {}
    }
  }
}





        if (isWebsocketUpdate) {
          const newHighlighted: Record<string, boolean> = {};
          for (const o of newOrders) {
            const key = viewMode === 'prodotto' ? o.prodotto?.nome ?? 'Sconosciuto' : String(o.tavolo?.numero ?? '-');
            newHighlighted[key] = true;
          }
          setHighlightedCards((prev) => ({ ...prev, ...newHighlighted }));
        }

        prevOrdiniRef.current = data.map((o) => o.id);
        setOrdini(data);
      } catch (err) {
        console.error(err);
        setErrore('Errore durante il caricamento delle comande');
      }
    },
    [fetchOrdini, audioEnabled, viewMode]
  );

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

// Mantieni una singola istanza del client e puliscila sul cleanup
const wsClientRef = useRef<Client | null>(null);

useEffect(() => {
  let mounted = true;

  const setupWebSocket = async () => {
    // Se esiste già un client, disattivalo prima di crearne uno nuovo
    if (wsClientRef.current) {
      try { wsClientRef.current.deactivate(); } catch (e) {}
      wsClientRef.current = null;
    }

    const client = new Client({
      brokerURL: undefined,
      connectHeaders: {},
      debug: () => {}, // evita spam in console in produzione; o lascia console.log se preferisci
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(`${backendUrl}/ws`),
    });

    client.onConnect = () => {
      setWsConnesso(true);
      // sottoscrivi -> quando ricevo eventi chiamo refresh
      client.subscribe('/topic/cucina', (msg: IMessage) => {
        if (!mounted) return;
        try {
          const data = JSON.parse(msg.body);
          if (['ORDER_SENT', 'CONSEGNA_CHANGED'].includes(data.tipoEvento)) {
            // chiamata non bloccante
            refresh(true, true);
          }
        } catch (e) { console.error('WS message parse error', e); }
      });
    };

    client.onStompError = () => setWsConnesso(false);
    client.onWebSocketClose = () => setWsConnesso(false);
    client.activate();
    wsClientRef.current = client;
  };

  setupWebSocket();

  return () => {
    mounted = false;
    if (wsClientRef.current) {
      try { wsClientRef.current.deactivate(); } catch (e) {}
      wsClientRef.current = null;
    }
  };
}, [backendUrl, refresh]);


  const handleToggleConsegnato = async (ordine: Ordine, checked: boolean) => {
    try {
      await fetch(`${backendUrl}/api/private/comande/consegna/${ordine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: ordine.id, flagConsegnato: checked }),
      });

    // --- NUOVO: rimuove il bordo dorato della card del gruppo ---
    const key = viewMode === 'prodotto'
      ? ordine.prodotto?.nome ?? 'Sconosciuto'
      : String(ordine.tavolo?.numero ?? '-');
    setHighlightedCards((prev) => ({ ...prev, [key]: false }));
    // ------------------------------------------------------------

      if (viewMode === 'prodotto' && checked && nascondiConsegnatiRef.current) {
        setOrdini((prev) => prev.filter((o) => o.id !== ordine.id));
      } else refresh();
    } catch (err) {
      console.error(err);
      alert('Errore nel salvare lo stato di consegna.');
    }
  };

  const gruppiMap = useMemo(() => {
    const map: Record<string, { titolo: string; ordini: Ordine[]; tavoloNumero?: string }> = {};
    ordini.forEach((o) => {
      const key = viewMode === 'prodotto' ? o.prodotto?.nome ?? 'Sconosciuto' : String(o.tavolo?.numero ?? '-');
      if (!map[key]) {
        map[key] = {
          titolo: viewMode === 'prodotto' ? key : `Tavolo ${key}`,
          ordini: [],
          tavoloNumero: viewMode === 'tavolo' ? key : undefined,
        };
      }
      map[key].ordini.push(o);
    });
    Object.values(map).forEach((g) =>
      g.ordini.sort((a, b) => new Date(a.orario).getTime() - new Date(b.orario).getTime())
    );
    return map;
  }, [ordini, viewMode]);

  const gruppiArrayArrivalOrder = useMemo(() => Object.values(gruppiMap), [gruppiMap]);
  const [groupsOrder, setGroupsOrder] = useState<string[]>([]);

  useEffect(() => {
    const arrivalKeys = gruppiArrayArrivalOrder.map((g) => g.titolo);
    setGroupsOrder((prev) => {
      if (!prev.length) return arrivalKeys;
      const newOrder = prev.filter((k) => arrivalKeys.includes(k));
      arrivalKeys.forEach((k) => { if (!newOrder.includes(k)) newOrder.push(k); });
      return newOrder;
    });
  }, [gruppiArrayArrivalOrder]);

  const gruppiByTitle = useMemo(() => {
    const map: Record<string, typeof gruppiArrayArrivalOrder[0]> = {};
    gruppiArrayArrivalOrder.forEach((g) => (map[g.titolo] = g));
    return map;
  }, [gruppiArrayArrivalOrder]);

  const resetToArrivalOrder = () => {
    const sortedKeys = gruppiArrayArrivalOrder
      .map((g) => ({
        titolo: g.titolo,
        minOrario: g.ordini.length ? Math.min(...g.ordini.map((o) => new Date(o.orario).getTime())) : Infinity,
      }))
      .sort((a, b) => a.minOrario - b.minOrario)
      .map((g) => g.titolo);
    setGroupsOrder(sortedKeys);
  };

  const onHandleMouseDown = (key: string) => (e: React.MouseEvent | React.TouchEvent) => {
    draggingKeyRef.current = key;
    setHighlightedCards((prev) => ({ ...prev, [key]: false }));
    const clear = () => {
      draggingKeyRef.current = null;
      window.removeEventListener('mouseup', clear);
      window.removeEventListener('touchend', clear);
    };
    window.addEventListener('mouseup', clear);
    window.addEventListener('touchend', clear);
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

    setGroupsOrder((prev) => {
      const newOrder = prev.filter((k) => k !== draggedKey);
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

  const orderedGruppe = useMemo(() => groupsOrder.map((k) => gruppiByTitle[k]).filter(Boolean), [groupsOrder, gruppiByTitle]);

  const HeaderRighe = ({ mode }: { mode: 'prodotto' | 'tavolo' }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: mode === 'prodotto' ? '50px 45px 42px 32px 40px' : '190px 45px 42px 60px 60px', columnGap: 2, py: 1 }}>
      {(mode === 'prodotto' ? ['Tavolo','Ora','Pers.','Qta','✓'] : ['Prod','Ora','Pers.','Qta','✓']).map(t => <Typography key={t} variant="subtitle2">{t}</Typography>)}
    </Box>
  );

  const gruppiFiltrati = useMemo(() => {
  if (!filtroProdotto.trim()) return orderedGruppe;
  return orderedGruppe.filter((g) =>
    g.titolo.toLowerCase().includes(filtroProdotto.toLowerCase())
  );
}, [orderedGruppe, filtroProdotto]);


  const { setWsConnesso } = useWS();


  return (
    <PageContainer title="Comande" description="Lista comande attive">
{showAudioHint && (
  <Snackbar
    open={showAudioHint}
    // rimuovi autoHideDuration per non chiudere automaticamente
    onClose={() => setShowAudioHint(false)}
    message="Clicca o tocca lo schermo per abilitare il suono"
    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
  />
)}

     <Box
  sx={{
    width: {
      xs: '100%',   // mobile
      sm: '95vw',   // tablet
      lg: '100%',   // desktop grande
    },
    maxWidth: '1600px',
    mx: 'auto',
    overflowX: 'hidden',
  }}
>
        {/* Header bottoni + select */}
        <Grid size={12} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
<FormControl sx={{ minWidth: 140, maxWidth: 180 }}>
  <InputLabel id="view-select-label">Visualizzazione</InputLabel>
  <Select
    labelId="view-select-label"
    value={viewMode}
    onChange={(e) => setViewMode(e.target.value as 'prodotto' | 'tavolo')}
    size="small"
  >
    <MenuItem value="prodotto">Per prodotto</MenuItem>
    <MenuItem value="tavolo">Per tavolo</MenuItem>
  </Select>
</FormControl>

{viewMode === 'prodotto' && (
  <TextField
    label="Cerca"
    size="small"
    variant="outlined"
    value={filtroProdotto}
    onChange={(e) => setFiltroProdotto(e.target.value)}
    sx={{ minWidth: 140, maxWidth: 180 }}
  />
)}


          <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {[
              {
                label: 'Mostra tutti i prodotti',
                checked: mostraTuttiProdottiRef.current,
                onChange: () => { mostraTuttiProdottiRef.current = !mostraTuttiProdottiRef.current; refresh(); },
              },
              {
                label: 'Nascondi consegnati',
                checked: nascondiConsegnatiRef.current,
                onChange: () => { nascondiConsegnatiRef.current = !nascondiConsegnatiRef.current; refresh(); },
              },
            ].map(({ label, checked, onChange }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180 }}>
                <Typography sx={{ whiteSpace: 'nowrap' }}>{label}</Typography>
                <Switch checked={checked} onChange={onChange} />
              </Box>
            ))}

            {viewMode === 'prodotto' && (
              <Button variant="outlined" onClick={resetToArrivalOrder}>Riordina (ordine più vecchio)</Button>
            )}
          </Box>

        </Grid>

        {/* Contenitore card */}
        <Grid size={12}>
          {loading ? (
            <CircularProgress sx={{ m: 4 }} />
          ) : errore ? (
            <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>
          ) : ordini.length === 0 ? (
            <Alert severity="info" sx={{ m: 4 }}>Nessuna comanda attiva</Alert>
          ) : (
<Box
  sx={{
    display: 'flex',
    flexDirection: 'row',
    gap: 2,
    overflowX: 'auto',
    overflowY: 'hidden',
    pb: 2,
    px: 1,
    WebkitOverflowScrolling: 'touch',
    width: '100%',
    maxWidth: '100vw',
    boxSizing: 'border-box',
  }}
>

              {gruppiFiltrati.map((gruppo) => {
                const key = gruppo.titolo;
                const isHighlighted = highlightedCards[key] ?? false;

                return (
                  <Card
  key={gruppo.titolo}
  sx={{
    flex: '0 0 auto',
    width: {
      xs: viewMode === 'prodotto' ? 280 : 350,  // larghezza fissa su mobile
      sm: viewMode === 'prodotto' ? 320 : 400,
      md: viewMode === 'prodotto' ? 380 : 500,
      lg: viewMode === 'prodotto' ? 480 : 600,
    },
    maxWidth: '100%', // evita overflow
    height: cardHeight,
    display: 'flex',
    flexDirection: 'column',
    border: isHighlighted ? '2px solid #fbc02d' : '1px solid rgba(0,0,0,0.12)',
    transition: 'border 0.3s',
  }}
  draggable
  onDragStart={onCardDragStart(key)}
  onDragOver={onCardDragOver(key)}
  onDrop={onCardDrop(key)}
  onDragEnd={onCardDragEnd}
>


                    <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, minHeight: 44 }}>
                        <Box
                          onMouseDown={onHandleMouseDown(key)}
                          onTouchStart={(e) => { e.preventDefault(); draggingKeyRef.current = key; setHighlightedCards((prev) => ({ ...prev, [key]: false })); }}
                          sx={{
                            width: 28,
                            height: 28,
                            mr: 1,
                            borderRadius: 1,
                            border: '1px dashed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'grab',
                          }}
                          title="Tieni premuto e trascina per spostare"
                        >
                          <Box sx={{ width: 10, height: 2, bgcolor: 'text.primary' }} />
                        </Box>

                        <Typography
                          variant="h6"
                          sx={{
                            wordBreak: 'break-word',
                            lineHeight: 1.1,
                            fontSize: 'clamp(0.9rem, 2.4vw, 1.05rem)',
                            maxHeight: 'calc(1.1rem * 2.4)',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                          }}
                        >
                          {gruppo.titolo}
                        </Typography>
                          {/* Spacer */}
  <Box sx={{ flex: 1 }} />
{/* Totale a destra */}
  <Typography sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
    Qta: {gruppo.ordini.reduce((sum, o) => sum + o.quantita, 0)}
  </Typography>
                      </Box>

                      <Divider />
                      <HeaderRighe mode={viewMode} />
                      <Divider sx={{ mb: 1 }} />
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        {gruppo.ordini.map((o) => (
                          <OrdineCard
  key={o.id}
  ordine={o}
  mode={viewMode}
  nascondiConsegnati={nascondiConsegnatiRef.current} // ← aggiungi qui
  onToggle={(checked) => handleToggleConsegnato(o, checked)}
  onRemove={() => {
    setOrdini((prev) => prev.filter((ord) => ord.id !== o.id));
  }}
/>

                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Comande;
