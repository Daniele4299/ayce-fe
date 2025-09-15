'use client'

import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, IconButton } from '@mui/material';
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
}

interface Props {
  onBack: () => void;
}

const VisualizzaScontrini = ({ onBack }: Props) => {
  const [giorno, setGiorno] = useState<string>(''); // formato YYYY-MM-DD
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [loading, setLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchSessioni = async () => {
    if (!giorno) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/sessioni/by-day?data=${giorno}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Errore fetch sessioni');
      const data: Sessione[] = await res.json();

      // Ordina per orarioInizio crescente
      data.sort((a, b) => new Date(a.orarioInizio).getTime() - new Date(b.orarioInizio).getTime());

      setSessioni(data);
    } catch (err) {
      console.error(err);
      setSessioni([]);
    } finally {
      setLoading(false);
    }
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

  return (
    <DashboardCard>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={onBack} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" ml={1}>
          Visualizza tutti gli scontrini
        </Typography>
      </Box>

      {/* Selezione giorno */}
      <Box mb={2} display="flex" gap={2} alignItems="center">
        <TextField
          label="Seleziona giorno"
          type="date"
          value={giorno}
          onChange={e => setGiorno(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={fetchSessioni}>
          Carica sessioni
        </Button>
      </Box>

      {loading && <Typography>Caricamento...</Typography>}

      {sessioni.length > 0 && (
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
            {sessioni.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.tavolo.numero}</TableCell>
                <TableCell>{new Date(s.orarioInizio).toLocaleTimeString()}</TableCell>
                <TableCell>
                  {s.isAyce ? 'AYCE' : 'CARTA'}
                </TableCell>
                <TableCell>{s.stato}</TableCell>
                <TableCell>
                  <Button variant="contained" onClick={() => scaricaPdf(s.id)}>
                    Scarica PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {sessioni.length === 0 && !loading && <Typography>Nessuna sessione trovata per questo giorno.</Typography>}
    </DashboardCard>
  );
};

export default VisualizzaScontrini;
