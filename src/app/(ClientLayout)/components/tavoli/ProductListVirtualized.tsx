'use client';

import React, { useRef, useMemo } from 'react';
import { Box } from '@mui/material';
import ProductCard from './ProductCard';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

interface Props {
  prodotti: any[];
  ordine: Record<number, number>;
  modificaQuantita: (id: number, delta: number, categoria: number) => void;
  categoriaSelezionata: number | 'all';
  sessione: any;
  isPranzoNow: boolean;
}

const ProductListVirtualized: React.FC<Props> = ({ prodotti, ordine, modificaQuantita, categoriaSelezionata, sessione, isPranzoNow }) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const handlersRef = useRef<Record<number, { inc: () => void; dec: () => void }>>({});

  const sessionIsAyce = !!sessione?.isAyce;

  // Applichiamo filtro per ayce/carta e pranzo/cena e applichiamo la regola prezzo (ayce -> prezzo 0 per categorie < 100)
  const prodottiWithPrezzo = useMemo(() => {
    return prodotti
      .filter((p) => {
        // menu match: se la sessione è ayce mostro i prodotti che hanno isAyce true (default true),
        // altrimenti mostro i prodotti con isCarta true (default true)
        const menuMatch = sessionIsAyce ? (p.isAyce ?? true) : (p.isCarta ?? true);

        // time match: se è pranzo mostra isPranzo true (default true), altrimenti isCena true (default true)
        const timeMatch = isPranzoNow ? (p.isPranzo ?? true) : (p.isCena ?? true);

        return menuMatch && timeMatch;
      })
      .map(p => {
        const catId = p?.categoria?.id ?? 0;
        // se sessione ayce e categoria < 100 -> prezzo mostrato 0
        const prezzo = (sessionIsAyce && catId < 100) ? 0 : (p.prezzo ?? 0);
        return { ...p, prezzo };
      });
  }, [prodotti, sessionIsAyce, isPranzoNow]);

  // Popolo handlersRef
  useMemo(() => {
    const current = handlersRef.current;
    for (const p of prodottiWithPrezzo) {
      const id = p.id;
      if (!current[id]) {
        current[id] = {
          inc: () => modificaQuantita(id, 1, p.categoria?.id ?? 0),
          dec: () => modificaQuantita(id, -1, p.categoria?.id ?? 0)
        };
      }
    }
    for (const key of Object.keys(current)) {
      if (!prodottiWithPrezzo.find(p => p.id === Number(key))) delete current[Number(key)];
    }
  }, [prodottiWithPrezzo, modificaQuantita]);

const flatItems = useMemo(() => {
  const map: Record<number, any[]> = {};
  for (const p of prodottiWithPrezzo) {
    const id = p.categoria?.id ?? 0;
    if (!map[id]) map[id] = [];
    map[id].push(p);
  }
  const sortedCategorie = Object.keys(map).map(Number).sort((a, b) => a - b); // categorie più piccole in cima
  const categorieDaMostrare = categoriaSelezionata === 'all' ? sortedCategorie : [categoriaSelezionata];
  const out: Array<any> = [];
  for (const catId of categorieDaMostrare) {
    const prods = (map[catId] || []).sort((a, b) => a.id - b.id); // prodotti ordinati per id crescente
    if (prods.length === 0) continue;
    const headerNome = prods[0]?.categoria?.nome || `Categoria ${catId}`;
    out.push({ type: 'header', categoriaId: catId, nome: headerNome });
    for (const p of prods) out.push({ type: 'product', prodotto: p });
  }
  return out;
}, [prodottiWithPrezzo, categoriaSelezionata]);



  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: index => {
  const item = flatItems[index];
  if (item?.type === 'header') return 48;
  return 380; 
},

    overscan: 6,
  });

  return (
    <Box ref={parentRef} component="main" sx={{ flexGrow: 1, overflowY: "auto", maxWidth: "md", mx: "auto", width: "100%", px: 2, py: 2 }}>
      <Box sx={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const item = flatItems[virtualRow.index];
          const top = virtualRow.start;
          if (!item) return null;

          if (item.type === 'header') {
  // prima lettera maiuscola
  const nomeCategoria = item.nome.charAt(0).toUpperCase() + item.nome.slice(1);
  
  return (
    <Box
      key={`h-${item.categoriaId}`}
      sx={{
        position: 'absolute',
        top,
        left: 0,
        width: '100%',
        height: virtualRow.size,
        px: 1,
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Box
        component="h6"
        sx={{
          color: 'primary.main',
          fontSize: '1.2rem', // dimensione più grande
          fontWeight: 600
        }}
      >
        {nomeCategoria}
      </Box>
    </Box>
  );
}
 else {
            const prodotto = item.prodotto;
            const h = handlersRef.current[prodotto.id];
            return (
              <Box key={`p-${prodotto.id}`} sx={{ 
    position: 'absolute', 
    top, 
    left: 0, 
    width: '100%', 
    px: 1 
}}>
  <ProductCard
    prodotto={prodotto}
    quantita={ordine[prodotto.id] || 0}
    onIncrement={h?.inc}
    onDecrement={h?.dec}
    sessionIsAyce={sessionIsAyce} 
  />
</Box>

            );
          }
        })}
      </Box>
    </Box>
  );
};

export default ProductListVirtualized;
