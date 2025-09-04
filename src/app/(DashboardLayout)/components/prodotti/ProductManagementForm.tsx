'use client';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Divider, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import Filters from '@/app/(DashboardLayout)/components/prodotti/Filters';
import ProductForm from '@/app/(DashboardLayout)/components/prodotti/ProductForm';
import ProductList from '@/app/(DashboardLayout)/components/prodotti/ProductList';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const ProductManagementForm: React.FC = () => {
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [categorie, setCategorie] = useState<any[]>([]);
  const [utenteProdotti, setUtenteProdotti] = useState<Record<number, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any>(null);


  const [filters, setFilters] = useState({
    categoria: 'tutti',
    disponibilita: 'tutto',
    menu: 'tutto',
    searchText: '',
  });

  const handleAddProduct = () => {
    setProductToEdit(null);
    setModalOpen(true);
  };

  const handleEditProduct = (p: any) => {
      setProductToEdit(p);
      setModalOpen(true);
  };


  const fetchData = useCallback(async () => {
    try {
      const [catsRes, prodRes, userRes] = await Promise.all([
        fetch(`${backendUrl}/api/categorie`, { credentials: 'include' }),
        fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' }),
        fetch(`${backendUrl}/auth/me`, { credentials: 'include' }),
      ]);
      if (catsRes.ok) setCategorie(await catsRes.json());
      if (prodRes.ok) setProdotti(await prodRes.json());
      if (userRes.ok) {
        const user = await userRes.json();
        setCurrentUserId(user.id);
        const utenteProdottiRes = await fetch(`${backendUrl}/api/utente-prodotti/${user.id}`, { credentials: 'include' });
        if (utenteProdottiRes.ok) {
          const data = await utenteProdottiRes.json();
          const map: Record<number, boolean> = {};
          data.forEach((up: any) => map[up.id.prodottoId] = up.riceveComanda);
          setUtenteProdotti(map);
        }
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const confirmDelete = (id: number) => { setDeleteId(id); setDeleteDialogOpen(true); };
  const handleDeleteConfirmed = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${backendUrl}/api/prodotti/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
    setDeleteDialogOpen(false); setDeleteId(null);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Gestione Prodotti</Typography>

        <Button variant="contained" color="primary" onClick={handleAddProduct} sx={{ mb: 2 }}>
          Aggiungi prodotto
        </Button>

        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{productToEdit ? 'Modifica Prodotto' : 'Aggiungi Prodotto'}</DialogTitle>
          <DialogContent>
            <ProductForm
              categorie={categorie}
              onSubmitSuccess={() => { fetchData(); setModalOpen(false); }}
              initialData={productToEdit}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalOpen(false)}>Annulla</Button>
          </DialogActions>
        </Dialog>


        <Divider sx={{ my: 3 }} />

        <Filters categorie={categorie} filters={filters} setFilters={setFilters} />

        <Divider sx={{ my: 3 }} />

        <ProductList
          prodotti={prodotti}
          filters={filters}
          utenteProdotti={utenteProdotti}
          setUtenteProdotti={setUtenteProdotti}
          currentUserId={currentUserId}
          onFetchData={fetchData}
          onEdit={handleEditProduct} 
          onDelete={confirmDelete}
        />

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
