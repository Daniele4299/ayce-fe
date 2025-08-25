'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Switch,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { useEffect, useState } from 'react';

type Tavolo = {
  id: number;
  numero: number;
  attivo: boolean;
};

type Sessione = {
  id: number;
  tavolo: Tavolo | null;
  orarioInizio: string | null;
  numeroPartecipanti: number | null;
  isAyce: boolean;
  stato: string;
};

const TavoloManagementForm = () => {
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [numero, setNumero] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | number>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchTavoli = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/tavoli`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTavoli(data);
      } else {
        console.error('Errore nel recupero tavoli');
      }
    } catch (err) {
      console.error('Errore:', err);
    }
  };

  const fetchSessioni = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/sessioni`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSessioni(data);
      }
    } catch (err) {
      console.error('Errore recupero sessioni', err);
    }
  };

  useEffect(() => {
    fetchTavoli();
    fetchSessioni();
  }, []);

  const handleAddTavolo = async () => {
    setErrore(null);

    if (!numero || numero < 1) {
      setErrore('Inserire un numero tavolo valido (>0)');
      return;
    }
    if (tavoli.some((t) => t.numero === numero)) {
      setErrore('Il tavolo esiste già');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/tavoli`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numero, attivo: true }),
      });
      if (res.ok) {
        setNumero(0);
        fetchTavoli();
      } else {
        setErrore('Errore aggiunta tavolo');
      }
    } catch (err) {
      console.error('Errore:', err);
      setErrore('Errore aggiunta tavolo');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttivo = async (id: number, attivo: boolean) => {
    const tavolo = tavoli.find((t) => t.id === id);
    if (!tavolo) return;
    try {
      await fetch(`${backendUrl}/api/tavoli/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...tavolo, attivo }),
      });
      fetchTavoli();
    } catch (err) {
      console.error('Errore toggle attivo', err);
    }
  };

  const deleteTavolo = async (id: number) => {
    try {
      await fetch(`${backendUrl}/api/tavoli/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchTavoli();
    } catch (err) {
      console.error('Errore delete tavolo', err);
    }
  };

  const disattivaSessione = async (sessione: Sessione) => {
    try {
      // invio l'oggetto completo per evitare che il backend azzeri i campi mancanti
      await fetch(`${backendUrl}/api/sessioni/${sessione.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...sessione,
          stato: 'CHIUSA',
        }),
      });
      await fetchSessioni();
      await fetchTavoli();
    } catch (err) {
      console.error('Errore disattivazione sessione', err);
    }
  };

  const getSessioneTavolo = (tavoloId: number) => {
    return sessioni.find(
      (s) => s.tavolo && s.tavolo.id === tavoloId && s.stato === 'ATTIVA'
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Gestione Tavoli
        </Typography>

        {errore && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errore}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ sm: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Numero Tavolo"
              value={numero}
              onChange={(e) => {
                const val = Number(e.target.value);
                setNumero(Number.isNaN(val) ? 0 : val);
              }}
            />
          </Grid>
          <Grid size={{ sm: 6 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleAddTavolo}
              disabled={loading}
            >
              Aggiungi Tavolo
            </Button>
          </Grid>

          {tavoli.map((t) => {
            const sessione = getSessioneTavolo(t.id);
            return (
              <Grid size={12} key={t.id}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  border={1}
                  borderColor="grey.300"
                  borderRadius={2}
                  px={2}
                  py={1}
                >
                  <Box>
                    <Typography>
                      Tavolo #{t.numero}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {sessione
                        ? `Sessione attiva: ${sessione.isAyce ? 'AYCE' : 'CARTA'}`
                        : 'Nessuna sessione attiva'}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2">
                      {t.attivo ? 'Attivo' : 'Disattivo'}
                    </Typography>
                    <Switch
                      checked={t.attivo}
                      onChange={() => toggleAttivo(t.id, !t.attivo)}
                    />
                    {sessione && (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => disattivaSessione(sessione)}
                      >
                        Disattiva
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() =>
                        window.open(`${backendUrl}/api/qr/${t.numero}`, '_blank')
                      }
                    >
                      QR
                    </Button>

                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setConfirmDelete(t.id)}
                    >
                      Elimina
                    </Button>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Modale conferma eliminazione */}
        <Dialog
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
        >
          <DialogTitle>Conferma eliminazione</DialogTitle>
          <DialogContent>
            Sei sicuro di voler eliminare questo tavolo?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(null)}>Annulla</Button>
            <Button
              color="error"
              onClick={() => {
                if (confirmDelete) deleteTavolo(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Elimina
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TavoloManagementForm;
