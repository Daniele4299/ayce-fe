'use client';
import React, { useMemo, useRef, useCallback } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, FormControlLabel, Checkbox } from '@mui/material';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import Image from 'next/image';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

interface ProductListProps {
  prodotti:any[];
  filters:any;
  utenteProdotti:Record<number, boolean>;
  setUtenteProdotti: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  currentUserId:number|null;
  onFetchData:()=>void;
  onEdit:(p:any)=>void;
  onDelete:(id:number)=>void;
}

const PAGE_SIZE = 50;

const ProductList: React.FC<ProductListProps> = ({ prodotti, filters, utenteProdotti, setUtenteProdotti, currentUserId, onFetchData, onEdit, onDelete }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // ORDINA SEMPRE I PRODOTTI PER CATEGORIA (ID) E ID PRODOTTO
  const sortedProdotti = useMemo(() => {
    return [...prodotti].sort((a, b) => {
      const catA = a.categoria?.id ?? 0;
      const catB = b.categoria?.id ?? 0;
      if (catA !== catB) return catA - catB;
      return a.id - b.id;
    });
  }, [prodotti]);

  // FILTRA SULLA LISTA ORDINATA
  const filteredProdotti = useMemo(() => sortedProdotti.filter(p => {
    if (filters.categoria!=='tutti' && String(p.categoria?.id)!==filters.categoria) return false;
    if (filters.disponibilita==='pranzo' && !p.isPranzo) return false;
    if (filters.disponibilita==='cena' && !p.isCena) return false;
    if (filters.menu==='ayce' && !p.isAyce) return false;
    if (filters.menu==='carta' && !p.isCarta) return false;
    if (filters.searchText && !p.nome.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
    return true;
  }), [sortedProdotti, filters]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProdotti.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // meno spazio verticale
    overscan: 5,
  });

  const getProductImage = useCallback((fileName: string, size: 'thumb' | 'medium' | 'original' = 'thumb') => {
    if (!fileName) return ''; // gestione assenza immagine
    const suffix = size === 'original' ? '' : `_${size}`;
    return `${backendUrl}/images/prodotti/${fileName}${suffix}.jpeg`;
  }, []);

  const toggleRiceveComanda = useCallback(async (prodottoId:number, value:boolean) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${backendUrl}/api/utente-prodotti/${currentUserId}/${prodottoId}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ riceveComanda: value }),
        credentials:'include'
      });
      if (res.ok) setUtenteProdotti(prev => ({ ...prev, [prodottoId]: value }));
    } catch(err){ console.error(err); }
  }, [currentUserId, setUtenteProdotti]);

  const toggleRiceveComandaBulk = useCallback(async (value:boolean) => {
    if (!currentUserId) return;
    await Promise.all(filteredProdotti.map(p => toggleRiceveComanda(p.id, value)));
  }, [currentUserId, filteredProdotti, toggleRiceveComanda]);

  return (
    <>
      {currentUserId && (
        <Box mb={2} display="flex" gap={2}>
          <Button variant="outlined" onClick={()=>toggleRiceveComandaBulk(true)}>Attiva ricezione comande</Button>
          <Button variant="outlined" color="error" onClick={()=>toggleRiceveComandaBulk(false)}>Disattiva ricezione comande</Button>
        </Box>
      )}

      <Box ref={parentRef} sx={{ height: 600, overflow: 'auto', mt: 1 }}>
        <Box sx={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
            const p = filteredProdotti[virtualRow.index];
            return (
              <Box
                key={p.id}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  height: 140, // altezza fissa uniforme
                  mb: 0, // niente margine extra
                }}
              >
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
                  {p.isLimitedPartecipanti && (
                    <Box sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'error.main', color: 'white', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 'bold', fontSize: 12, zIndex: 10 }}>
                      LIMITATO
                    </Box>
                  )}
                  <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" gap={2}>
                    <Box display="flex" gap={2} alignItems="center">
                      {p.id && <Image 
                        src={getProductImage(p.immagine, 'thumb')} 
                        alt={p.nome} 
                        width={80} 
                        height={80} 
                        style={{ borderRadius: 4, objectFit: 'cover' }} 
                      />}
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
                        <FormControlLabel control={<Checkbox checked={utenteProdotti[p.id] || false} onChange={e => toggleRiceveComanda(p.id, e.target.checked)} />} label="Ricevi comanda" />
                      )}
                      <Button size="small" variant="outlined" onClick={() => onEdit(p)}>Modifica</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => onDelete(p.id)}>Elimina</Button>
                    </Box>
                  </Box>
                </Card>
              </Box>
            );
          })}
        </Box>
      </Box>
    </>
  );
};

export default React.memo(ProductList);
