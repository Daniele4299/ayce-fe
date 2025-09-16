'use client'

import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, IconButton, FormControlLabel, Checkbox } from '@mui/material';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Tavolo {
  id: number;
  numero: number;
  attivo: boolean;
}

interface Sessione {
  id: number;
  tavolo: Tavolo;
  orarioInizio: string;
  ultimoOrdineInviato?: string | null;
  numeroPartecipanti: number;
  isAyce: boolean;
  stato: string;
  isDeleted?: boolean;
}

interface Props {
  onBack: () => void;
}

const VisualizzaScontrini = ({ onBack }: Props) => {
  const [giorno, setGiorno] = useState<string>(''); 
  const [sessioniAttive, setSessioniAttive] = useState<Sessione[]>([]);
  const [sessioniEliminate, setSessioniEliminate] = useState<Sessione[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostraEliminate, setMostraEliminate] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const oggi = new Date().toISOString().split('T')[0];
    setGiorno(oggi);
  }, []);

  useEffect(() => {
    if (!giorno) return;
    fetchTutteSessioni();
  }, [giorno]);

  const fetchTutteSessioni = async () => {
    setLoading(true);
    try {
      const [resAttive, resEliminate] = await Promise.all([
        fetch(`${backendUrl}/api/sessioni/by-day?data=${giorno}`, { credentials: 'include' }),
        fetch(`${backendUrl}/api/sessioni/eliminate/by-day?data=${giorno}`, { credentials: 'include' }),
      ]);

      if (!resAttive.ok || !resEliminate.ok) throw new Error('Errore fetch sessioni');

      const attive: Sessione[] = await resAttive.json();
      const eliminate: Sessione[] = await resEliminate.json();

      attive.sort((a, b) => new Date(a.orarioInizio).getTime() - new Date(b.orarioInizio).getTime());
      eliminate.sort((a, b) => new Date(a.orarioInizio).getTime() - new Date(b.orarioInizio).getTime());

      setSessioniAttive(attive);
      setSessioniEliminate(eliminate);
    } catch (err) {
      console.error(err);
      setSessioniAttive([]);
      setSessioniEliminate([]);
    } finally {
      setLoading(false);
    }
  };

  const eliminaSessione = async (id: number) => {
    await fetch(`${backendUrl}/api/sessioni/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchTutteSessioni();
  };

  const ripristinaSessione = async (id: number) => {
    await fetch(`${backendUrl}/api/sessioni/${id}/ripristina`, { method: 'PUT', credentials: 'include' });
    fetchTutteSessioni();
  };

  const scaricaPdf = async (sessioneId: number) => {
    const win = window.open('', '_blank');
    try {
      const res = await fetch(`${backendUrl}/api/sessioni/${sessioneId}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Errore download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      win!.location.href = url;
    } catch (err) {
      console.error(err);
      win?.close();
    }
  };

  // combina le sessioni da mostrare
  const sessioniDaMostrare = mostraEliminate
    ? [...sessioniAttive, ...sessioniEliminate]
    : sessioniAttive;

  return (
    <DashboardCard>
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={onBack} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" ml={1}>
          Visualizza tutti gli scontrini
        </Typography>
      </Box>

      <Box mb={2} display="flex" gap={2} alignItems="center">
        <TextField
          label="Seleziona giorno"
          type="date"
          value={giorno}
          onChange={e => setGiorno(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={mostraEliminate}
              onChange={() => setMostraEliminate(!mostraEliminate)}
            />
          }
          label="Mostra scontrini eliminati"
        />
      </Box>

      {loading && <Typography>Caricamento...</Typography>}

      {sessioniDaMostrare.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tavolo</TableCell>
              <TableCell>Orario Apertura</TableCell>
              <TableCell>Tipologia</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessioniDaMostrare.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.tavolo.numero}</TableCell>
                <TableCell>{new Date(s.orarioInizio + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</TableCell>
                <TableCell>{s.isAyce ? 'AYCE' : 'CARTA'}</TableCell>
                <TableCell>{s.stato}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button variant="contained" onClick={() => scaricaPdf(s.id)}>
                      PDF
                    </Button>
                    {!s.isDeleted ? (
                      <Button variant="contained" color="error" onClick={() => eliminaSessione(s.id)}>
                        Elimina
                      </Button>
                    ) : (
                      <Button variant="contained" color="success" onClick={() => ripristinaSessione(s.id)}>
                        Ripristina
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {sessioniDaMostrare.length === 0 && !loading && (
        <Typography>Nessuna sessione trovata per questo giorno.</Typography>
      )}
    </DashboardCard>
  );
};

export default VisualizzaScontrini;
