'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Box, TextField, Button, Grid, FormControlLabel, Checkbox, MenuItem, Typography } from '@mui/material';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Categoria { id: number; nome: string; }
interface ProductFormProps {
  categorie: Categoria[];
  onSubmitSuccess: () => void;
  initialData?: any;
}

const ProductForm: React.FC<ProductFormProps> = ({ categorie, onSubmitSuccess, initialData }) => {
  const [form, setForm] = useState<any>({
  nome: initialData?.nome || '',
  descrizione: initialData?.descrizione || '',
  prezzo: initialData?.prezzo || 0,
  categoria: initialData?.categoria || undefined,
  isPranzo: initialData?.isPranzo ?? true,
  isCena: initialData?.isCena ?? true,
  isAyce: initialData?.isAyce ?? true,
  isCarta: initialData?.isCarta ?? true,
  isLimitedPartecipanti: initialData?.isLimitedPartecipanti ?? false,
  id: initialData?.id,
  immagine: initialData?.immagine,
});
const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
  if (initialData) setForm({
    nome: initialData.nome,
    descrizione: initialData.descrizione,
    prezzo: initialData.prezzo,
    categoria: initialData.categoria,
    isPranzo: initialData.isPranzo,
    isCena: initialData.isCena,
    isAyce: initialData.isAyce,
    isCarta: initialData.isCarta,
    isLimitedPartecipanti: initialData.isLimitedPartecipanti,
    id: initialData.id,
    immagine: initialData.immagine,
  });
  else setForm({ nome:'', descrizione:'', prezzo:0, categoria:undefined, isPranzo:true, isCena:true, isAyce:true, isCarta:true, isLimitedPartecipanti:false });
}, [initialData]);

  
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => { URL.revokeObjectURL(url); };
  }, [file]);

  const handleSubmit = useCallback(async () => {
    if (!form.categoria?.id) return alert("Seleziona una categoria.");
    const formData = new FormData();
    formData.append('nome', form.nome);
    formData.append('descrizione', form.descrizione);
    formData.append('prezzo', String(form.prezzo));
    formData.append('categoriaId', String(form.categoria.id));
    formData.append('isPranzo', String(form.isPranzo));
    formData.append('isCena', String(form.isCena));
    formData.append('isAyce', String(form.isAyce));
    formData.append('isCarta', String(form.isCarta));
    formData.append('isLimitedPartecipanti', String(form.isLimitedPartecipanti));
    if (file) formData.append('immagine', file);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const url = form.id ? `${backendUrl}/api/prodotti/${form.id}` : `${backendUrl}/api/prodotti`;
      const res = await fetch(url, { method, body: formData, credentials: 'include' });
      if (res.ok) { resetForm(); onSubmitSuccess(); }
    } catch (err) { console.error(err); }
  }, [form, file, onSubmitSuccess]);

  const resetForm = useCallback(() => {
    setForm({ nome:'', descrizione:'', prezzo:0, categoria:undefined, isPranzo:true, isCena:true, isAyce:true, isCarta:true, isLimitedPartecipanti:false });
    setFile(null);
    setPreviewUrl(null);
  }, []);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Nome" value={form.nome} onChange={e => setForm((prev: any) => ({ ...prev, nome: e.target.value }))} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth type="number" label="Prezzo" value={form.prezzo} onChange={e => setForm((prev: any) => ({ ...prev, prezzo: parseFloat(e.target.value) }))} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth multiline label="Descrizione" value={form.descrizione} onChange={e => setForm((prev: any) => ({ ...prev, descrizione: e.target.value }))} />
      </Grid>
<Grid size={{ xs: 12 }}>
  <Button variant="outlined" component="label" fullWidth>
    Carica Immagine
    <input
      type="file"
      hidden
      accept="image/*"
      onChange={e => setFile(e.target.files?.[0] ?? null)}
    />
  </Button>

  {/* Nome file se caricato */}
  {file && <Typography variant="body2">{file.name}</Typography>}

  {/* Anteprima se hai caricato un nuovo file */}
  {previewUrl && (
    <Box mt={1} textAlign="center">
      <img
        src={previewUrl}
        alt="Anteprima"
        style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }}
      />
    </Box>
  )}

  {/* Se non hai caricato nulla, mostra l’immagine salvata */}
  {!previewUrl && form.immagine && (
    <Box mt={1} textAlign="center">
      <img
        src={`${backendUrl}/images/prodotti/${form.immagine}.jpeg`}
        alt={form.nome}
        style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }}
      />
    </Box>
  )}
</Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField select fullWidth label="Categoria" value={form.categoria?.id ?? ''} onChange={e => {
          const id = e.target.value === '' ? undefined : Number(e.target.value);
          const sel = id ? categorie.find(c => c.id === id) : undefined;
          setForm((prev: any) => ({ ...prev, categoria: sel }));
        }}>
          <MenuItem value=''>Seleziona categoria</MenuItem>
          {categorie.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControlLabel control={<Checkbox checked={form.isPranzo} onChange={e => setForm((prev: any) => ({ ...prev, isPranzo: e.target.checked }))} />} label="Disponibile a pranzo" />
        <FormControlLabel control={<Checkbox checked={form.isCena} onChange={e => setForm((prev: any) => ({ ...prev, isCena: e.target.checked }))} />} label="Disponibile a cena" />
        <FormControlLabel control={<Checkbox checked={form.isAyce} onChange={e => setForm((prev: any) => ({ ...prev, isAyce: e.target.checked }))} />} label="All You Can Eat" />
        <FormControlLabel control={<Checkbox checked={form.isCarta} onChange={e => setForm((prev: any) => ({ ...prev, isCarta: e.target.checked }))} />} label="Alla Carta" />
        <FormControlLabel control={<Checkbox checked={form.isLimitedPartecipanti} onChange={e => setForm((prev: any) => ({ ...prev, isLimitedPartecipanti: e.target.checked }))} />} label="Limitato ai partecipanti" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Button fullWidth variant="contained" color="primary" onClick={handleSubmit}>{form.id ? 'Aggiorna' : 'Aggiungi'}</Button>
      </Grid>
    </Grid>
  );
};

export default React.memo(ProductForm);
