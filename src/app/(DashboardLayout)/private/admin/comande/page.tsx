'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Grid, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem,
  Switch, Box, Card, CardContent, Typography, Divider
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import OrdineCard from '@/app/(DashboardLayout)/components/comande/OrdineCard';

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
  const [mostraTuttiProdotti, setMostraTuttiProdotti] = useState(false);
  const [nascondiConsegnati, setNascondiConsegnati] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const prevOrdiniRef = useRef<number[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audio.current = new Audio('/notification.mp3');
  }, []);

  const fetchOrdini = async (): Promise<Ordine[]> => {
    const soloAssegnati = !mostraTuttiProdotti;
    const res = await fetch(`${backendUrl}/api/private/comande/filtrate?soloAssegnati=${soloAssegnati}&nascondiConsegnati=${nascondiConsegnati}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Errore caricamento comande');
    const data: Ordine[] = await res.json();
    return data.sort((a, b) => new Date(a.orario).getTime() - new Date(b.orario).getTime());
  };

  const refreshManuale = async () => {
    try {
      const data = await fetchOrdini();
      prevOrdiniRef.current = data.map(o => o.id); // aggiorna senza audio
      setOrdini(data);
    } catch (err) {
      console.error(err);
      setErrore('Errore durante il caricamento delle comande');
    }
  };

  const refreshAutomatico = async () => {
    try {
      const data = await fetchOrdini();
      const prevIds = prevOrdiniRef.current;
      const newOrders = data.filter(o => !prevIds.includes(o.id));
      if (newOrders.length > 0 && audioEnabled && audio.current) {
        audio.current.play().catch(() => {});
      }
      prevOrdiniRef.current = data.map(o => o.id);
      setOrdini(data);
    } catch (err) {
      console.error(err);
      setErrore('Errore durante il caricamento delle comande');
    }
  };

  useEffect(() => { 
    setLoading(true);
    refreshManuale().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAutomatico();
    }, 1000);
    return () => clearInterval(interval);
  }, [mostraTuttiProdotti, nascondiConsegnati, audioEnabled, viewMode]);

  const handleToggleConsegnato = async (ordine: Ordine, checked: boolean) => {
    try {
      await fetch(`${backendUrl}/api/private/comande/consegna/${ordine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: ordine.id, flagConsegnato: checked })
      });

      if (viewMode === 'prodotto' && checked && nascondiConsegnati) {
        setOrdini(prev => prev.filter(o => o.id !== ordine.id));
      } else {
        refreshManuale(); // aggiorna subito senza audio
      }
    } catch (err) {
      console.error(err);
      alert('Errore nel salvare lo stato di consegna.');
    }
  };

  const handleToggleMostraTuttiProdotti = () => {
    setMostraTuttiProdotti(prev => !prev);
    refreshManuale(); // aggiornamento immediato senza audio
  };

  const handleToggleNascondiConsegnati = () => {
    setNascondiConsegnati(prev => !prev);
    refreshManuale(); // aggiornamento immediato senza audio
  };

  const handleToggleAudio = () => {
    setAudioEnabled(prev => !prev);
  };

  const gruppi = (() => {
    const map: Record<string, { titolo: string; ordini: Ordine[], tavoloNumero?: string }> = {};
    for (const o of ordini) {
      const key = viewMode === 'prodotto' ? o.prodotto?.nome ?? 'Sconosciuto' : String(o.tavolo?.numero ?? '-');
      if (!map[key]) {
        map[key] = {
          titolo: viewMode === 'prodotto' ? key : `Tavolo ${key}`,
          ordini: [],
          tavoloNumero: viewMode === 'tavolo' ? key : undefined,
        };
      }
      map[key].ordini.push(o);
    }
    return Object.values(map)
      .map(g => ({ ...g, ordini: g.ordini.sort((a, b) => new Date(a.orario).getTime() - new Date(b.orario).getTime()) }))
      .sort((a, b) => {
        const oldestA = Math.min(...a.ordini.map(o => new Date(o.orario).getTime()));
        const oldestB = Math.min(...b.ordini.map(o => new Date(o.orario).getTime()));
        return oldestA - oldestB;
      });
  })();

  const HeaderRighe = ({ mode }: { mode: 'prodotto' | 'tavolo' }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: mode === 'prodotto' ? '90px 120px 120px 1fr 60px' : '1fr 120px 120px 80px 60px', columnGap: 2, py: 1 }}>
      {mode === 'prodotto' ? (
        <>
          <Typography variant="subtitle2">Tavolo</Typography>
          <Typography variant="subtitle2">Orario</Typography>
          <Typography variant="subtitle2">Persone</Typography>
          <Typography variant="subtitle2">Quantità</Typography>
          <Typography variant="subtitle2">✓</Typography>
        </>
      ) : (
        <>
          <Typography variant="subtitle2">Prodotto</Typography>
          <Typography variant="subtitle2">Orario</Typography>
          <Typography variant="subtitle2">Persone</Typography>
          <Typography variant="subtitle2">Quantità</Typography>
          <Typography variant="subtitle2">✓</Typography>
        </>
      )}
    </Box>
  );

  return (
    <PageContainer title="Comande" description="Lista comande attive">
      <Grid size={12} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="view-select-label">Visualizzazione</InputLabel>
          <Select labelId="view-select-label" value={viewMode} onChange={(e) => setViewMode(e.target.value as 'prodotto' | 'tavolo')}>
            <MenuItem value="prodotto">Per prodotto</MenuItem>
            <MenuItem value="tavolo">Per tavolo</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>Mostra tutti i prodotti</Typography>
          <Switch checked={mostraTuttiProdotti} onChange={handleToggleMostraTuttiProdotti} />

          <Typography>Nascondi consegnati</Typography>
          <Switch checked={nascondiConsegnati} onChange={handleToggleNascondiConsegnati} />

          <Typography>Suono</Typography>
          <Switch checked={audioEnabled} onChange={handleToggleAudio} />
        </Box>
      </Grid>

      <Grid size={12}>
        {loading ? (
          <CircularProgress sx={{ m: 4 }} />
        ) : errore ? (
          <Alert severity="error" sx={{ m: 4 }}>{errore}</Alert>
        ) : ordini.length === 0 ? (
          <Alert severity="info" sx={{ m: 4 }}>Nessuna comanda attiva</Alert>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, overflowY: 'auto', maxHeight: '80vh', pb: 2 }}>
            {gruppi.map(gruppo => (
              <Card key={gruppo.titolo}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>{gruppo.titolo}</Typography>
                  <Divider />
                  <HeaderRighe mode={viewMode} />
                  <Divider sx={{ mb: 1 }} />
                  <Box>
                    {gruppo.ordini.map(o => (
                      <OrdineCard
                        key={o.id}
                        ordine={o}
                        mode={viewMode}
                        onToggle={(checked) => handleToggleConsegnato(o, checked)}
                        isNew={!prevOrdiniRef.current.includes(o.id)}
                      />
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
