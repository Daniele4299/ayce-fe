'use client';

import React from 'react';
import Image from 'next/image';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import { useParams } from 'next/navigation';

interface Props {
  sessione: any;
  categoriaSelezionata: number | 'all';
  setCategoriaSelezionata: (val: any) => void;
  prodotti: any[];
  capitalize: (s?: string) => string;
}

const HeaderTavolo: React.FC<Props> = ({ sessione, categoriaSelezionata, setCategoriaSelezionata, prodotti, capitalize }) => {
  const params = useParams();
  const numTavolo = sessione?.tavoloNum ?? params.numTavolo;

  // Categorie
  const categorieMap: Record<number, string> = {};
  prodotti.forEach(p => {
    const id = p.categoria?.id ?? 0;
    if (!categorieMap[id]) categorieMap[id] = p.categoria?.nome ?? `Categoria ${id}`;
  });
  const categorieList = Object.keys(categorieMap).map(id => ({ id: Number(id), nome: categorieMap[Number(id)] }));

  return (
    <Box component="header" sx={{ py: 2, px: 3, bgcolor: theme => theme.palette.background.paper, borderBottom: "1px solid #333", position: "sticky", top: 0, zIndex: 1000 }}>
      <Box sx={{ maxWidth: "md", mx: "auto", display: "flex", flexDirection: "column", gap: 1, py: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, width: "100%" }}>
          <Image
            src="/images/logos/logo.png"
            alt="Logo ristorante"
            width={120}
            height={60}
            priority
            style={{ objectFit: "contain" }}
          />
          <Box sx={{ display: "flex", flexDirection: "column", textAlign: "left", flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme => theme.palette.primary.main, lineHeight: 1.2, fontSize: '1rem' }}>
              🍽️ Benvenuto — Tavolo {numTavolo}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: '0.75rem' }}>
              Sfoglia le categorie e ordina facilmente dall’app
            </Typography>
          </Box>
        </Box>
        <Box sx={{ width: "100%", mt: 1 }}>
          <Select
            size="small"
            value={categoriaSelezionata}
            onChange={e => setCategoriaSelezionata(e.target.value as any)}
            sx={{ width: "100%", bgcolor: "background.default", borderRadius: 2 }}
          >
            <MenuItem value="all">Tutte le categorie</MenuItem>
            {categorieList.map(c => <MenuItem key={c.id} value={c.id}>{capitalize(c.nome)}</MenuItem>)}
          </Select>
        </Box>
      </Box>
    </Box>
  );
};

export default HeaderTavolo;
