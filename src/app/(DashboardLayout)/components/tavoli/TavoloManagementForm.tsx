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
  DialogContentText,
  DialogActions,
  Alert,
  FormControlLabel,
} from '@mui/material';
import { useEffect, useState } from 'react';

type Tavolo = { id: number; numero: number; attivo: boolean };
type Sessione = {
  id: number | null;
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
  const [confirmDelete, setConfirmDelete] = useState<null | Tavolo>(null);
  const [openSessioneModal, setOpenSessioneModal] = useState<null | Tavolo>(null);
  const [numeroPartecipanti, setNumeroPartecipanti] = useState<number>(1);
  const [isAyce, setIsAyce] = useState(true);
  const [confirmDisattiva, setConfirmDisattiva] = useState<null | Sessione>(null);
  const [openAddModal, setOpenAddModal] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchTavoli = async () => {
  try {
    const res = await fetch(`${backendUrl}/api/tavoli`, { credentials: 'include' });
    if (res.ok) {
      const dati = await res.json();
      // Mostra solo tavoli attivi e ordina per numero tavolo
      setTavoli(
        dati
          .filter((t: Tavolo) => t.attivo)
          .sort((a: Tavolo, b: Tavolo) => a.numero - b.numero)
      );
    }
  } catch (err) {
    console.error('Errore recupero tavoli', err);
  }
};


  const fetchSessioni = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/sessioni`, { credentials: 'include' });
      if (res.ok) setSessioni(await res.json());
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
        body: JSON.stringify({ numero, attivo: true }), // tavolo attivo di default
      });
      if (res.ok) {
        setNumero(0);
        fetchTavoli();
        setOpenAddModal(false);
      } else setErrore('Errore aggiunta tavolo');
    } catch (err) {
      console.error(err);
      setErrore('Errore aggiunta tavolo');
    } finally {
      setLoading(false);
    }
  };

  const deleteTavolo = async (tavolo: Tavolo) => {
    try {
      const res = await fetch(`${backendUrl}/api/tavoli/${tavolo.id}`, {
        method: 'DELETE', // backend deve gestire cascade
        credentials: 'include',
      });
      if (res.ok) fetchTavoli();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

const disattivaSessione = async (sessione: Sessione) => {
  // apro subito la finestra vuota
  const win = window.open('', '_blank');

  try {
    // chiudo la sessione
    const res = await fetch(`${backendUrl}/api/sessioni/${sessione.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...sessione, stato: 'CHIUSA' }),
    });

    if (!res.ok) {
      console.error('Errore chiusura sessione');
      win?.close();
      return;
    }

    fetchSessioni();
    fetchTavoli();

    // scarico il PDF
    const pdfRes = await fetch(`${backendUrl}/api/sessioni/${sessione.id}/pdf`, { credentials: 'include' });
    if (!pdfRes.ok) {
      console.error('Errore download PDF');
      win?.close();
      return;
    }

    const blob = await pdfRes.blob();
    const url = URL.createObjectURL(blob);

    // assegno l'URL alla finestra già aperta
    win!.location.href = url;
  } catch (err) {
    console.error(err);
    win?.close();
  } finally {
    setConfirmDisattiva(null);
  }
};



  const apriSessione = async (tavolo: Tavolo) => {
    if (!numeroPartecipanti || numeroPartecipanti < 1) {
      setErrore('Inserire un numero partecipanti valido (>0)');
      return;
    }

    const nuovaSessione: Sessione = {
      id: null,
      tavolo,
      orarioInizio: new Date().toISOString(),
      numeroPartecipanti,
      isAyce,
      stato: 'ATTIVA',
    };

    try {
      const res = await fetch(`${backendUrl}/api/sessioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(nuovaSessione),
      });
      if (res.ok) {
        fetchSessioni();
        setOpenSessioneModal(null);
        setNumeroPartecipanti(1);
        setIsAyce(true);
      } else setErrore('Errore apertura sessione');
    } catch (err) {
      console.error(err);
      setErrore('Errore apertura sessione');
    }
  };

  const getSessioneTavolo = (tavoloId: number) =>
    sessioni.find((s) => s.tavolo && s.tavolo.id === tavoloId && s.stato === 'ATTIVA');

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Gestione Tavoli</Typography>

        {errore && <Alert severity="error" sx={{ mb: 2 }}>{errore}</Alert>}

        <Box mb={2}>
          <Button variant="contained" onClick={() => setOpenAddModal(true)}>Aggiungi Tavolo</Button>
        </Box>

        <Grid container spacing={2}>
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
                    <Typography>Tavolo #{t.numero}</Typography>
                    {sessione ? (
                      <>
                        <Typography variant="body2" color="textSecondary">
                          Sessione attiva: {sessione.isAyce ? 'AYCE' : 'CARTA'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Partecipanti: {sessione.numeroPartecipanti ?? '-'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Inizio: {sessione.orarioInizio ? new Date(sessione.orarioInizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="textSecondary">Nessuna sessione attiva</Typography>
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    {sessione ? (
                      <Button variant="outlined" color="warning" onClick={() => setConfirmDisattiva(sessione)}>
                        Disattiva
                      </Button>
                    ) : (
                      <Button variant="outlined" color="success" onClick={() => setOpenSessioneModal(t)}>
                        Apri Sessione
                      </Button>
                    )}
                    <Button variant="outlined" color="primary" onClick={() => window.open(`${backendUrl}/api/qr/${t.numero}`, '_blank')}>QR</Button>
                    <Button variant="outlined" color="error" onClick={() => setConfirmDelete(t)}>Elimina</Button>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Modale aggiunta tavolo */}
        <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)}>
          <DialogTitle>Aggiungi Tavolo</DialogTitle>
          <DialogContent>
            <DialogContentText>Inserisci il numero del nuovo tavolo</DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              type="number"
              label="Numero Tavolo"
              fullWidth
              value={numero}
              onChange={(e) => setNumero(Number(e.target.value) || 0)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddModal(false)}>Annulla</Button>
            <Button variant="contained" onClick={handleAddTavolo} disabled={loading}>Conferma</Button>
          </DialogActions>
        </Dialog>

        {/* Modale conferma eliminazione */}
        <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
          <DialogTitle>Conferma eliminazione</DialogTitle>
          <DialogContent>
            Sei sicuro di voler eliminare il Tavolo #{confirmDelete?.numero}?
            Questa operazione eliminerà <b>tutte le sessioni e gli ordini ad esso associati</b>.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(null)}>Annulla</Button>
            <Button color="error" onClick={() => confirmDelete && deleteTavolo(confirmDelete)}>
              Elimina
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modale conferma disattivazione sessione */}
        <Dialog open={!!confirmDisattiva} onClose={() => setConfirmDisattiva(null)}>
          <DialogTitle>Conferma chiusura sessione</DialogTitle>
          <DialogContent>
            Sei sicuro di voler chiudere la sessione del Tavolo #{confirmDisattiva?.tavolo?.numero}?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDisattiva(null)}>Annulla</Button>
            <Button color="warning" onClick={() => confirmDisattiva && disattivaSessione(confirmDisattiva)}>
              Conferma
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modale apertura sessione */}
        <Dialog open={!!openSessioneModal} onClose={() => setOpenSessioneModal(null)}>
          <DialogTitle>Apri Sessione Tavolo #{openSessioneModal?.numero}</DialogTitle>
          <DialogContent>
            <DialogContentText>Inserisci numero partecipanti e tipo di sessione</DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Numero partecipanti"
              type="number"
              fullWidth
              value={numeroPartecipanti}
              onChange={(e) => setNumeroPartecipanti(Number(e.target.value) || 0)}
            />
            <FormControlLabel
              control={<Switch checked={isAyce} onChange={() => setIsAyce(!isAyce)} />}
              label="All You Can Eat (AYCE)"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSessioneModal(null)}>Annulla</Button>
            <Button variant="contained" color="primary" onClick={() => openSessioneModal && apriSessione(openSessioneModal)}>
              Apri
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TavoloManagementForm;
