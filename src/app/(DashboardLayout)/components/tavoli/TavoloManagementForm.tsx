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
} from '@mui/material';
import { useEffect, useState } from 'react';

type Tavolo = {
  id: number;
  numero: number;
  attivo: boolean;
};

const TavoloManagementForm = () => {
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [numero, setNumero] = useState<number>(0);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchTavoli();
  }, []);

  const handleAddTavolo = async () => {
    if (!numero) return;
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
        console.error('Errore aggiunta tavolo');
      }
    } catch (err) {
      console.error('Errore:', err);
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

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Gestione Tavoli
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ sm: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Numero Tavolo"
              value={numero}
              onChange={(e) => setNumero(parseInt(e.target.value))}
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

          {tavoli.map((t) => (
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
                <Typography>
                  Tavolo #{t.numero}
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2">
                    {t.attivo ? 'Attivo' : 'Disattivo'}
                  </Typography>
                  <Switch
                    checked={t.attivo}
                    onChange={() => toggleAttivo(t.id, !t.attivo)}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => deleteTavolo(t.id)}
                  >
                    Elimina
                  </Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default TavoloManagementForm;
