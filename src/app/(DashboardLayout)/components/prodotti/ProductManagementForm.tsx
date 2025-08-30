'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Grid, MenuItem, Card, CardContent, Divider, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

type Categoria = {
  id: number;
  nome: string;
};

type Prodotto = {
  id?: number;
  nome: string;
  descrizione: string;
  prezzo: number;
  categoria?: Categoria | null;
  isPranzo: boolean;
  isCena: boolean;
  isAyce: boolean;
  isCarta: boolean;
  isLimitedPartecipanti: boolean;
};

type UtenteProdotto = {
  id: { utenteId: number; prodottoId: number };
  riceveComanda: boolean;
};

const disponibilitaOptions = ['tutto', 'pranzo', 'cena'];
const menuOptions = ['tutto', 'ayce', 'carta'];

const ProductManagementForm = () => {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [utenteProdotti, setUtenteProdotti] = useState<Record<number, boolean> | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('tutti');
  const [selectedDisponibilita, setSelectedDisponibilita] = useState('tutto');
  const [selectedMenu, setSelectedMenu] = useState('tutto');
  const [searchText, setSearchText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<Prodotto>({
    nome: '',
    descrizione: '',
    prezzo: 0,
    categoria: undefined,
    isPranzo: true,
    isCena: true,
    isAyce: true,
    isCarta: true,
    isLimitedPartecipanti: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchCurrentUser = async () => {
    const res = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setCurrentUserId(data.id);
      await fetchUtenteProdotti(data.id);
    }
  };

  const fetchCategorie = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/categorie`, { credentials: 'include' });
      if (res.ok) {
        const data: Categoria[] = await res.json();
        setCategorie(data);
      }
    } catch (err) {
      console.error('Errore fetch categorie', err);
    }
  };

  const fetchProdotti = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' });
      if (res.ok) {
        const raw: any[] = await res.json();
        const data: Prodotto[] = raw.map(p => ({
          id: p.id,
          nome: p.nome,
          descrizione: p.descrizione,
          prezzo: p.prezzo,
          categoria: p.categoria ? { id: p.categoria.id, nome: p.categoria.nome } : null,
          isPranzo: p.isPranzo ?? true,
          isCena: p.isCena ?? true,
          isAyce: p.isAyce ?? true,
          isCarta: p.isCarta ?? true,
          isLimitedPartecipanti: p.isLimitedPartecipanti ?? false,
        }));
        setProdotti(data);
      }
    } catch (err) {
      console.error('Errore fetch prodotti', err);
    }
  };

  const fetchUtenteProdotti = async (utenteId: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/utente-prodotti/${utenteId}`, { credentials: 'include' });
      if (res.ok) {
        const data: UtenteProdotto[] = await res.json();
        const map: Record<number, boolean> = {};
        data.forEach(up => {
          map[up.id.prodottoId] = up.riceveComanda;
        });
        setUtenteProdotti(map);
      }
    } catch (err) {
      console.error('Errore fetch utente-prodotti', err);
    }
  };

  const toggleRiceveComanda = async (prodottoId: number, value: boolean) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${backendUrl}/api/utente-prodotti/${currentUserId}/${prodottoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riceveComanda: value }),
        credentials: 'include',
      });
      if (res.ok) {
        setUtenteProdotti(prev => prev ? { ...prev, [prodottoId]: value } : { [prodottoId]: value });
      }
    } catch (err) {
      console.error('Errore toggle riceveComanda', err);
    }
  };

  const toggleRiceveComandaBulk = async (value: boolean) => {
    if (!currentUserId) return;
    const promises = prodottiFiltrati.map(p => toggleRiceveComanda(p.id!, value));
    await Promise.all(promises);
  };

  const handleSubmit = async () => {
    if (!form.categoria?.id) {
      alert("Seleziona una categoria prima di salvare.");
      return;
    }
    const formData = new FormData();
    formData.append('nome', form.nome);
    formData.append('descrizione', form.descrizione || '');
    formData.append('prezzo', String(form.prezzo));
    formData.append('categoriaId', String(form.categoria.id));
    formData.append('isPranzo', String(form.isPranzo));
    formData.append('isCena', String(form.isCena));
    formData.append('isAyce', String(form.isAyce));
    formData.append('isCarta', String(form.isCarta));
    formData.append('isLimitedPartecipanti', String(form.isLimitedPartecipanti));
    if (file) {
      formData.append('immagine', file);
    } else {
      formData.append('placeholder', '/images/products/placeholder.png');
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${backendUrl}/api/prodotti/${form.id}` : `${backendUrl}/api/prodotti`;
    try {
      const res = await fetch(url, { method, body: formData, credentials: 'include' });
      if (res.ok) {
        await fetchProdotti();
        setForm({
          nome: '',
          descrizione: '',
          prezzo: 0,
          categoria: undefined,
          isPranzo: true,
          isCena: true,
          isAyce: true,
          isCarta: true,
          isLimitedPartecipanti: false,
        });
        setFile(null);
      }
    } catch (err) {
      console.error('Errore salvataggio prodotto', err);
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${backendUrl}/api/prodotti/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchProdotti();
    } catch (err) {
      console.error('Errore eliminazione prodotto', err);
    }
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const handleEdit = (prodotto: Prodotto) => {
    setForm({ ...prodotto, categoria: prodotto.categoria ?? undefined });
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetchCategorie();
    fetchProdotti();
    fetchCurrentUser();
  }, []);

  const prodottiFiltrati = prodotti.filter(p => {
    if (selectedCategoria !== 'tutti') {
      const pid = p.categoria?.id ? String(p.categoria.id) : '';
      if (pid !== selectedCategoria) return false;
    }
    if (selectedDisponibilita === 'pranzo' && !p.isPranzo) return false;
    if (selectedDisponibilita === 'cena' && !p.isCena) return false;
    if (selectedMenu === 'ayce' && !p.isAyce) return false;
    if (selectedMenu === 'carta' && !p.isCarta) return false;
    if (searchText && !p.nome.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

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
            <Button variant="outlined" component="label" fullWidth>
              Carica Immagine
              <input type="file" hidden accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
            </Button>
            {file && <Typography variant="body2">{file.name}</Typography>}
            {!file && form.id && (
              <Box mt={1} textAlign="center">
                <img
                  src={`${backendUrl}/api/prodotti/${form.id}/immagine`}
                  alt="Anteprima immagine prodotto"
                  style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).src = '/images/products/placeholder.png'; }}
                />
              </Box>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Categoria" value={form.categoria?.id ?? ''} onChange={e => {
              const id = e.target.value === '' ? undefined : Number(e.target.value);
              const sel = id ? categorie.find(c => c.id === id) : undefined;
              setForm({ ...form, categoria: sel });
            }}>
              <MenuItem value=''>Seleziona categoria</MenuItem>
              {categorie.map(cat => <MenuItem key={cat.id} value={String(cat.id)}>{cat.nome}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel control={<Checkbox checked={form.isPranzo} onChange={e => setForm({ ...form, isPranzo: e.target.checked })} />} label="Disponibile a pranzo" />
            <FormControlLabel control={<Checkbox checked={form.isCena} onChange={e => setForm({ ...form, isCena: e.target.checked })} />} label="Disponibile a cena" />
            <FormControlLabel control={<Checkbox checked={form.isAyce} onChange={e => setForm({ ...form, isAyce: e.target.checked })} />} label="All You Can Eat" />
            <FormControlLabel control={<Checkbox checked={form.isCarta} onChange={e => setForm({ ...form, isCarta: e.target.checked })} />} label="Alla Carta" />
            <FormControlLabel control={<Checkbox checked={form.isLimitedPartecipanti} onChange={e => setForm({ ...form, isLimitedPartecipanti: e.target.checked })} />} label="Limitato ai partecipanti" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button fullWidth variant="contained" color="primary" onClick={handleSubmit}>
              {form.id ? 'Aggiorna' : 'Aggiungi'}
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box mb={2} display="flex" gap={2}>
          <TextField select label="Filtro per categoria" value={selectedCategoria} onChange={e => setSelectedCategoria(e.target.value)} fullWidth>
            <MenuItem value="tutti">Tutti</MenuItem>
            {categorie.map(cat => <MenuItem key={cat.id} value={String(cat.id)}>{cat.nome}</MenuItem>)}
          </TextField>
          <TextField select label="Filtro disponibilità" value={selectedDisponibilita} onChange={e => setSelectedDisponibilita(e.target.value)} fullWidth>
            {disponibilitaOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </TextField>
          <TextField select label="Filtro menu" value={selectedMenu} onChange={e => setSelectedMenu(e.target.value)} fullWidth>
            {menuOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </TextField>
          <TextField label="Cerca prodotto" value={searchText} onChange={e => setSearchText(e.target.value)} fullWidth />
        </Box>

        {utenteProdotti && currentUserId && (
          <Box mb={2} display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="outlined" onClick={() => toggleRiceveComandaBulk(true)}>Attiva ricezione comande</Button>
            <Button variant="outlined" color="error" onClick={() => toggleRiceveComandaBulk(false)}>Disattiva ricezione comande</Button>
          </Box>
        )}

        <Typography variant="h6">Lista Prodotti</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
{prodottiFiltrati.map(p => (
  <Grid size={{ xs: 12 }} key={p.id}>
    <Card variant="outlined" sx={{ position: 'relative' }}>
            {p.isLimitedPartecipanti && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: 'error.main',
                  color: 'white',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 'bold',
                  fontSize: 12,
                  zIndex: 10,
                }}
              >
                LIMITATO
              </Box>
            )}
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  {p.id && (
                    <img
                      src={`${backendUrl}/api/prodotti/${p.id}/immagine`}
                      alt={p.nome}
                      style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }}
                      onError={e => { (e.target as HTMLImageElement).src = '/images/products/placeholder.png'; }}
                    />
                  )}
                  <Box>
                    <Typography variant="subtitle1">{p.nome} - €{p.prezzo.toFixed(2)}</Typography>
                    <Typography variant="body2" color="textSecondary">{p.descrizione}</Typography>
                    <Typography variant="body2" color="textSecondary">{p.categoria?.nome ?? ''}</Typography>
                    <Box display="flex" gap={1}>
                      {p.isPranzo && <Typography variant="caption" color="primary">Pranzo</Typography>}
                      {p.isCena && <Typography variant="caption" color="secondary">Cena</Typography>}
                      {p.isAyce && <Typography variant="caption" color="success.main">AYCE</Typography>}
                      {p.isCarta && <Typography variant="caption" color="warning.main">Carta</Typography>}
                    </Box>
                  </Box>
                </Box>
                <Box display="flex" gap={1} alignItems="center">
                  {utenteProdotti && currentUserId && (
                    <FormControlLabel control={<Checkbox checked={utenteProdotti[p.id!] || false} onChange={e => toggleRiceveComanda(p.id!, e.target.checked)} />} label="Ricevi comanda" />
                  )}
                  <Button size="small" variant="outlined" onClick={() => handleEdit(p)}>Modifica</Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => confirmDelete(p.id!)}>Elimina</Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

        </Grid>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Conferma eliminazione</DialogTitle>
          <DialogContent>Sei sicuro di voler eliminare questo prodotto?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Annulla</Button>
            <Button color="error" onClick={handleDeleteConfirmed}>Elimina</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ProductManagementForm;
