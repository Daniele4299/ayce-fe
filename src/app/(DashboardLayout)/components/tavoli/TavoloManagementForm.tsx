'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
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
  ultimoOrdineInviato?: string | null;
};

type ResocontoDto = {
  id: number;
  nome: string;             
  quantita: number;
  prezzoUnitario: number;
  totale: number;
  orario: string | null;    
  tavolo: number | null;
  stato: string | null;
};


const TavoloManagementForm = () => {
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [numero, setNumero] = useState<number | undefined>(0);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | Tavolo>(null);
  const [openSessioneModal, setOpenSessioneModal] = useState<null | Tavolo>(null);
  const [numeroPartecipanti, setNumeroPartecipanti] = useState<number | undefined>(1);
  const [isAyce, setIsAyce] = useState(true);
  const [confirmDisattiva, setConfirmDisattiva] = useState<null | Sessione>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [prodotti, setProdotti] = useState<{ id: number; nome: string; prezzo: number }[]>([]);
  const [searchProdotto, setSearchProdotto] = useState('');
  const [selectedProdotto, setSelectedProdotto] = useState<{ id: number; nome: string; prezzo: number } | null>(null);
  const [quantitaProdotto, setQuantitaProdotto] = useState<number | undefined>(1);


// 🔹 funzione per aprire modale prodotti
const apriAddProductModal = async () => {
  try {
    const res = await fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      // 🔹 ORDINAMENTO PER CATEGORIA
      data.sort((a: { categoria: { id: any; }; }, b: { categoria: { id: any; }; }) => (a.categoria?.id ?? 0) - (b.categoria?.id ?? 0));
      setProdotti(data);
      setSearchProdotto('');
      setSelectedProdotto(null);
      setQuantitaProdotto(1);
      setOpenAddProductModal(true);
    }
  } catch (err) {
    console.error('Errore caricamento prodotti', err);
  }
};

// 🔹 funzione conferma nuovo ordine
const confermaNuovoOrdine = async () => {
  if (!selectedProdotto || !openResocontoModal) return;

  // Calcolo prezzo considerando sessione AYCE e categorie
  let prezzoUnitario = selectedProdotto.prezzo;

  // Se la sessione è AYCE e la categoria del prodotto ha id < 100, prezzo = 0
  if (openResocontoModal?.isAyce && (selectedProdotto as any).categoria?.id < 100) {
    prezzoUnitario = 0;
  }

  try {
    const body = {
      sessione: { id: openResocontoModal.id },
      tavolo: { id: openResocontoModal.tavolo?.id },
      prodotto: { id: selectedProdotto.id },
      quantita: quantitaProdotto || 1,
      prezzoUnitario,
      //orario: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}T${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}:${String(new Date().getSeconds()).padStart(2,'0')}`,
      flagConsegnato: false,
      stato: 'INVIATO', // oppure un valore di default coerente con il tuo backend
    };

    const res = await fetch(`${backendUrl}/api/ordini/add-resoconto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (res.ok) {
      fetchResoconto(openResocontoModal); // ricarica resoconto
      setOpenAddProductModal(false);
    } else {
      console.error('Errore creazione ordine');
    }
  } catch (err) {
    console.error('Errore creazione ordine', err);
  }
};


  // nuovi stati per Resoconto
  const [openResocontoModal, setOpenResocontoModal] = useState<null | Sessione>(null);
  const [resoconto, setResoconto] = useState<ResocontoDto[]>([]);
  const [confirmReset, setConfirmReset] = useState<null | Sessione>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchTavoli = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/tavoli`, { credentials: 'include' });
      if (res.ok) {
        const dati = await res.json();
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
        body: JSON.stringify({ numero: numero ?? 0, attivo: true }),
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
        method: 'DELETE',
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
    const win = window.open('', '_blank');
    try {
      const res = await fetch(`${backendUrl}/api/sessioni/${sessione.id}/disattiva`, {
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

      const pdfRes = await fetch(`${backendUrl}/api/sessioni/${sessione.id}/pdf`, { credentials: 'include' });
      if (!pdfRes.ok) {
        console.error('Errore download PDF');
        win?.close();
        return;
      }

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
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

  const nuovaSessione: Partial<Sessione> = {
    id: null,
    tavolo,
    // orarioInizio: non inviato, lo imposta il backend
    numeroPartecipanti: numeroPartecipanti ?? 0,
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
      } else if (res.status === 409) {
      await fetchSessioni();
      setOpenSessioneModal(null);
      setErrore('Esiste già una sessione attiva per questo tavolo');
      } else setErrore('Errore apertura sessione');
    } catch (err) {
      console.error(err);
      setErrore('Errore apertura sessione');
    }
  };

  const handleDeleteOrdine = async (ordine: ResocontoDto) => {
  if (!confirm(`Sei sicuro di voler eliminare l'ordine di "${ordine.nome}"?`)) return;

  try {
    const res = await fetch(`${backendUrl}/api/ordini/${ordine.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      // Ricarica il resoconto
      if (openResocontoModal) fetchResoconto(openResocontoModal);
    } else {
      console.error('Errore eliminazione ordine');
    }
  } catch (err) {
    console.error(err);
  }
};


  const getSessioneTavolo = (tavoloId: number) =>
    sessioni.find((s) => s.tavolo && s.tavolo.id === tavoloId && s.stato === 'ATTIVA');

  // 🔹 nuovo: carica resoconto
  const fetchResoconto = async (sessione: Sessione) => {
    try {
      const res = await fetch(`${backendUrl}/api/sessioni/${sessione.id}/resoconto`, { credentials: 'include' });
      if (res.ok) {
        const data: ResocontoDto[] = await res.json();
        setResoconto(
          data.sort((a, b) => {
            if (!a.orario || !b.orario) return 0;
            return new Date(a.orario).getTime() - new Date(b.orario).getTime();
          })
        );
        setOpenResocontoModal(sessione);
      }
    } catch (err) {
      console.error('Errore recupero resoconto', err);
    }
  };


  // 🔹 nuovo: reset timer via update
  const resetTimer = async (sessione: Sessione) => {
    try {
      const res = await fetch(`${backendUrl}/api/sessioni/${sessione.id}/reset-timer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...sessione, ultimoOrdineInviato: null }),
      });
      if (res.ok) {
        fetchSessioni();
      }
    } catch (err) {
      console.error('Errore reset timer', err);
    } finally {
      setConfirmReset(null);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Gestione Tavoli</Typography>

        {errore && <Alert severity="error" sx={{ mb: 2 }}>{errore}</Alert>}
<Box mb={2} display="flex" justifyContent="space-between">
  <Button variant="contained" onClick={() => setOpenAddModal(true)}>Aggiungi Tavolo</Button>
  <Button 
    variant="contained" color="secondary" 
    onClick={() => window.open(`${backendUrl}/api/qr/pdf`, '_blank')}
  >
    Genera PDF QR
  </Button>
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
  Inizio: {sessione.orarioInizio ? new Date(sessione.orarioInizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '-'}
</Typography>

                      </>
                    ) : (
                      <Typography variant="body2" color="textSecondary">Nessuna sessione attiva</Typography>
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    {sessione ? (
                      <>
                        <Button variant="outlined" color="info" onClick={() => fetchResoconto(sessione)}>
                          Resoconto
                        </Button>
                        <Button variant="outlined" color="warning" onClick={() => setConfirmDisattiva(sessione)}>
                          Disattiva
                        </Button>
                      </>
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
  value={numero ?? ''}
  onChange={(e) => {
    const val = e.target.value;
    if (val === '') {
      setNumero(undefined); // permette cancellare tutto
    } else {
      const num = Number(val);
      setNumero(num > 0 ? num : undefined); // minimo 1
    }
  }}
/>

          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddModal(false)}>Annulla</Button>
            <Button
  variant="contained"
  onClick={handleAddTavolo}
  disabled={loading || !numero || numero < 1}
>
  Conferma
</Button>

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
  value={numeroPartecipanti ?? ''}
  onChange={(e) => {
    const val = e.target.value;
    if (val === '') {
      setNumeroPartecipanti(undefined); // permette cancellare tutto
    } else {
      const num = Number(val);
      setNumeroPartecipanti(num > 0 ? num : undefined); // minimo 1
    }
  }}
/>

            <FormControlLabel
              control={<Switch checked={isAyce} onChange={() => setIsAyce(!isAyce)} />}
              label="All You Can Eat (AYCE)"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSessioneModal(null)}>Annulla</Button>
            <Button
  variant="contained"
  color="primary"
  onClick={() => openSessioneModal && apriSessione(openSessioneModal)}
  disabled={!numeroPartecipanti || numeroPartecipanti < 1}
>
  Apri
</Button>

          </DialogActions>
        </Dialog>
{/* Modale Resoconto */}
<Dialog open={!!openResocontoModal} onClose={() => setOpenResocontoModal(null)} maxWidth="md" fullWidth>
  <DialogTitle>Resoconto Tavolo #{openResocontoModal?.tavolo?.numero}</DialogTitle>
  <DialogContent>
    {resoconto.length > 0 ? (
      resoconto.map((r, idx) => (
        <Box key={idx} mb={2} p={2} border={1} borderColor="grey.300" borderRadius={2} display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2"><b>Prodotto:</b> {r.nome}</Typography>
            <Typography variant="body2"><b>Quantità:</b> {r.quantita}</Typography>
            <Typography variant="body2"><b>Prezzo unitario:</b> € {r.prezzoUnitario.toFixed(2)}</Typography>
            <Typography variant="body2"><b>Totale riga:</b> € {r.totale.toFixed(2)}</Typography>
            {r.orario && (
              <Typography variant="body2"><b>Ora:</b> {new Date(r.orario).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Typography>
            )}
            {r.stato && <Typography variant="body2"><b>Stato consegna:</b> {r.stato}</Typography>}
          </Box>
          <IconButton color="error" onClick={() => handleDeleteOrdine(r)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ))
    ) : (
      <Typography variant="body2">Nessun ordine registrato</Typography>
    )}
  </DialogContent>
    <DialogActions sx={{ justifyContent: 'space-between' }}>
      <Button onClick={apriAddProductModal}>
        Aggiungi prodotto
      </Button>
      <Box>
        {openResocontoModal?.isAyce && (
          <Button color="warning" onClick={() => setConfirmReset(openResocontoModal)}>
            Resetta timer ordinazione
          </Button>
        )}
        <Button onClick={() => setOpenResocontoModal(null)}>Chiudi</Button>
      </Box>
    </DialogActions>
</Dialog>

        {/* Modale conferma reset timer */}
        <Dialog open={!!confirmReset} onClose={() => setConfirmReset(null)}>
          <DialogTitle>Conferma reset timer</DialogTitle>
          <DialogContent>
            Vuoi davvero resettare il timer ordinazione per il Tavolo #{confirmReset?.tavolo?.numero}?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmReset(null)}>Annulla</Button>
            <Button color="warning" onClick={() => confirmReset && resetTimer(confirmReset)}>
              Conferma
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={openAddProductModal} onClose={() => setOpenAddProductModal(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Aggiungi Prodotto</DialogTitle>
  <DialogContent>
    <TextField
      fullWidth
      margin="dense"
      label="Cerca prodotto"
      value={searchProdotto}
      onChange={(e) => setSearchProdotto(e.target.value)}
    />
    <Box mt={2} maxHeight={300} overflow="auto">
      {prodotti
        .filter(p => p.nome.toLowerCase().includes(searchProdotto.toLowerCase()))
        .map((p) => (
          <Box
            key={p.id}
            p={1}
            border={1}
            borderColor={selectedProdotto?.id === p.id ? 'primary.main' : 'grey.300'}
            borderRadius={1}
            mb={1}
            sx={{ cursor: 'pointer' }}
            onClick={() => setSelectedProdotto(p)}
          >
            <Typography>{p.nome} - € {p.prezzo.toFixed(2)}</Typography>
          </Box>
        ))}
      {prodotti.filter(p => p.nome.toLowerCase().includes(searchProdotto.toLowerCase())).length === 0 && (
        <Typography>Nessun prodotto trovato</Typography>
      )}
    </Box>
    {selectedProdotto && (
      <TextField
    type="number"
    label="Quantità"
    fullWidth
    margin="dense"
    value={quantitaProdotto !== undefined ? quantitaProdotto : ''} // <-- mai undefined
    onChange={(e) => {
      const val = e.target.value;
      if (val === '') {
        setQuantitaProdotto(undefined); // ok, interno ok
      } else {
        const num = Number(val);
        setQuantitaProdotto(num > 0 ? num : 1); // minimo 1
      }
    }}
  />
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenAddProductModal(false)}>Annulla</Button>
<Button
  variant="contained"
  onClick={confermaNuovoOrdine}
  disabled={!selectedProdotto || (quantitaProdotto ?? 0) < 1}
>
  Conferma
</Button>
  </DialogActions>
</Dialog>

      </CardContent>
    </Card>
  );
};

export default TavoloManagementForm;
