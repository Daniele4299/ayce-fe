'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import Filters from '@/app/(DashboardLayout)/components/prodotti/Filters';
import ProductForm from '@/app/(DashboardLayout)/components/prodotti/ProductForm';
import ProductList from '@/app/(DashboardLayout)/components/prodotti/ProductList';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const ProductManagementForm: React.FC = () => {
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [categorie, setCategorie] = useState<any[]>([]);
  const [utenteProdotti, setUtenteProdotti] = useState<Record<number, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any>(null);
  
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]);
  const [deletedModalOpen, setDeletedModalOpen] = useState(false);

  const fetchDeletedProducts = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/prodotti/deleted`, { credentials: 'include' });
      if (res.ok) setDeletedProducts(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleRestoreProduct = async (id: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/prodotti/${id}/restore`, { method: 'PUT', credentials: 'include' });
      if (res.ok) {
        fetchDeletedProducts();
        fetchData(); // ricarica prodotti attivi
      }
    } catch (err) { console.error(err); }
  };


  const [filters, setFilters] = useState({
    categoria: 'tutti',
    disponibilita: 'tutto',
    menu: 'tutto',
    searchText: '',
  });

  // recupero ruolo utente
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const res = await fetch(`${backendUrl}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setRole(data.role); // il backend manda role come stringa
          setCurrentUserId(data.id);
          // carico anche utente-prodotti
          const utenteProdottiRes = await fetch(`${backendUrl}/api/utente-prodotti/${data.id}`, { credentials: 'include' });
          if (utenteProdottiRes.ok) {
            const dataMap = await utenteProdottiRes.json();
            const map: Record<number, boolean> = {};
            dataMap.forEach((up: any) => map[up.id.prodottoId] = up.riceveComanda);
            setUtenteProdotti(map);
          }
        } else if (res.status === 401) {
          window.location.href = '/authentication/login';
        }
      } catch (err) {
        console.error('Errore fetch /auth/me', err);
        window.location.href = '/authentication/login';
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [catsRes, prodRes] = await Promise.all([
        fetch(`${backendUrl}/api/categorie`, { credentials: 'include' }),
        fetch(`${backendUrl}/api/prodotti`, { credentials: 'include' }),
      ]);
      if (catsRes.ok) setCategorie(await catsRes.json());
      if (prodRes.ok) setProdotti(await prodRes.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddProduct = () => {
    setProductToEdit(null);
    setModalOpen(true);
  };

  const handleEditProduct = (p: any) => {
    setProductToEdit(p);
    setModalOpen(true);
  };

  const confirmDelete = (id: number) => { setDeleteId(id); setDeleteDialogOpen(true); };
  const handleDeleteConfirmed = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${backendUrl}/api/prodotti/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
    setDeleteDialogOpen(false); setDeleteId(null);
  };

  if (loading) {
    return <Box>Caricamento...</Box>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Gestione Prodotti</Typography>

        {/* Mostra bottone solo se ADMIN */}
{role === 'ADMIN' && (
  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
    <Button variant="contained" color="primary" onClick={handleAddProduct}>
      Aggiungi prodotto
    </Button>
    <Button variant="outlined" color="secondary" onClick={() => { fetchDeletedProducts(); setDeletedModalOpen(true); }}>
      Prodotti eliminati
    </Button>
  </Box>
)}



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

        <Dialog open={deletedModalOpen} onClose={() => setDeletedModalOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Prodotti eliminati</DialogTitle>
  <DialogContent>
    <Box sx={{ mb: 2 }}>
      <input 
        type="text" 
        placeholder="Cerca..." 
        style={{ width: '100%', padding: '8px' }}
        onChange={(e) => {
          const search = e.target.value.toLowerCase();
          setDeletedProducts(deletedProducts.map(p => ({
            ...p,
            visible: p.nome.toLowerCase().includes(search)
          })));
        }}
      />
    </Box>
    <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
      {deletedProducts.filter(p => p.visible !== false).map(p => (
        <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
          <Typography>{p.nome}</Typography>
          <Button size="small" variant="outlined" onClick={() => handleRestoreProduct(p.id)}>Ripristina</Button>
        </Box>
      ))}
    </Box>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeletedModalOpen(false)}>Chiudi</Button>
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
          onEdit={role === 'ADMIN' ? handleEditProduct : undefined}
          onDelete={role === 'ADMIN' ? confirmDelete : undefined}
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
