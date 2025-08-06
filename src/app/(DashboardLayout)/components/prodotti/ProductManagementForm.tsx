'use client';

import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Grid, MenuItem, Card, CardContent, Divider
} from '@mui/material';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

type Prodotto = {
  id?: number;
  nome: string;
  descrizione: string;
  immagineUrl: string;
  prezzo: number;
  tipo: string;
};

const tipoOptions = ['antipasto', 'primo', 'secondo', 'contorno', 'dessert', 'bevanda'];

const ProductManagementForm = () => {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [form, setForm] = useState<Prodotto>({
    nome: '',
    descrizione: '',
    immagineUrl: '',
    prezzo: 0,
    tipo: '',
  });

  const fetchProdotti = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProdotti(data);
      }
    } catch (err) {
      console.error('Errore fetch prodotti', err);
    }
  };

  const handleSubmit = async () => {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${backendUrl}/api/prodotti/${form.id}` : `${backendUrl}/api/prodotti`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      if (res.ok) {
        await fetchProdotti();
        setForm({ nome: '', descrizione: '', immagineUrl: '', prezzo: 0, tipo: '' });
      }
    } catch (err) {
      console.error('Errore salvataggio prodotto', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/prodotti/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchProdotti();
    } catch (err) {
      console.error('Errore eliminazione prodotto', err);
    }
  };

  const handleEdit = (prodotto: Prodotto) => {
    setForm(prodotto);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetchProdotti();
  }, []);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Gestione Prodotti</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Prezzo" type="number" value={form.prezzo} onChange={e => setForm({ ...form, prezzo: parseFloat(e.target.value) })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline label="Descrizione" value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="URL Immagine" value={form.immagineUrl} onChange={e => setForm({ ...form, immagineUrl: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select fullWidth label="Tipo"
              value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
            >
              {tipoOptions.map(tipo => (
                <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Button fullWidth variant="contained" color="primary" onClick={handleSubmit}>
              {form.id ? 'Aggiorna' : 'Aggiungi'}
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6">Lista Prodotti</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {prodotti.map(p => (
            <Grid size={{ sm: 12 }} key={p.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{p.nome} - €{p.prezzo.toFixed(2)}</Typography>
                      <Typography variant="body2" color="textSecondary">{p.tipo}</Typography>
                    </Box>
                    <Box>
                      <Button size="small" onClick={() => handleEdit(p)}>Modifica</Button>
                      <Button size="small" color="error" onClick={() => handleDelete(p.id!)}>Elimina</Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ProductManagementForm;
