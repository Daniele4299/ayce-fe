'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import ProductForm from './ProductForm';

interface Categoria { id: number; nome: string; }

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  categorie: Categoria[];
  onSubmitSuccess: () => void;
  productToEdit?: any; // opzionale, se è modifica
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, onClose, categorie, onSubmitSuccess, productToEdit }) => {
  const [initialProduct, setInitialProduct] = useState<any>(null);

  useEffect(() => {
    if (productToEdit) setInitialProduct(productToEdit);
    else setInitialProduct(null);
  }, [productToEdit]);

  const handleSuccess = useCallback(() => {
    onSubmitSuccess();
    onClose();
  }, [onSubmitSuccess, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{productToEdit ? 'Modifica Prodotto' : 'Aggiungi Prodotto'}</DialogTitle>
      <DialogContent>
        <ProductForm categorie={categorie} onSubmitSuccess={handleSuccess} initialData={initialProduct} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(ProductFormModal);
