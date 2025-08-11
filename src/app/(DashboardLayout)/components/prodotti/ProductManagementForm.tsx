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
  prezzo: number;
  tipo: string;
};

const tipoOptions = ['antipasto', 'primo', 'secondo', 'contorno', 'dessert', 'bevanda'];

const ProductManagementForm = () => {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<Prodotto>({
    nome: '',
    descrizione: '',
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
    const formData = new FormData();
    formData.append('nome', form.nome);
    formData.append('descrizione', (form as any).descrizione || '');
    formData.append('prezzo', String(form.prezzo));
    formData.append('tipo', form.tipo);
    if (file) {
      formData.append('immagine', file);
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${backendUrl}/api/prodotti/${form.id}` : `${backendUrl}/api/prodotti`;

    try {
      const res = await fetch(url, {
        method,
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        await fetchProdotti();
        setForm({ nome: '', descrizione: '', prezzo: 0, tipo: '' });
        setFile(null);
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
    setFile(null);
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
            <TextField
              fullWidth
              label="Nome"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Prezzo"
              type="number"
              value={form.prezzo}
              onChange={e => setForm({ ...form, prezzo: parseFloat(e.target.value) })}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              label="Descrizione"
              value={(form as any).descrizione || ''}
              onChange={e => setForm({ ...form, descrizione: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button variant="outlined" component="label" fullWidth>
              Carica Immagine
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>
            {file && <Typography variant="body2">{file.name}</Typography>}
            {!file && form.id && (
              <Box mt={1} textAlign="center">
                <img
                  src={`${backendUrl}/api/prodotti/${form.id}/immagine`}
                  alt="Anteprima immagine prodotto"
                  style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }}
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/placeholder.png';
                  }}
                />
              </Box>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Tipo"
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
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
            <Grid size={{ xs: 12 }} key={p.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                      {p.id && (
                        <img
                          src={`${backendUrl}/api/prodotti/${p.id}/immagine`}
                          alt={p.nome}
                          style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }}
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/placeholder.png';
                          }}
                        />
                      )}
                      <Box>
                        <Typography variant="subtitle1">{p.nome} - €{p.prezzo.toFixed(2)}</Typography>
                        <Typography variant="body2" color="textSecondary">{p.tipo}</Typography>
                      </Box>
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
