'use client';
import React, { useCallback } from 'react';
import { Box, TextField, MenuItem } from '@mui/material';

interface FiltersProps {
  categorie: any[];
  filters: { categoria:string, disponibilita:string, menu:string, searchText:string };
  setFilters: (f:any)=>void;
}

const disponibilitaOptions = ['tutto','pranzo','cena'];
const menuOptions = ['tutto','ayce','carta'];

const Filters: React.FC<FiltersProps> = ({ categorie, filters, setFilters }) => {
  const handleChange = useCallback((field: string, value: string) => {
    setFilters((prev: any) => ({ ...prev, [field]: value }));
  }, [setFilters]);

  // larghezza minima 200px per ciascun filtro
  const inputStyle = { minWidth: 200, flex: 1 };

  return (
    <Box mb={2} display="flex" gap={2} flexWrap="wrap">
      <TextField
        select
        label="Filtro per categoria"
        value={filters.categoria}
        onChange={e => handleChange('categoria', e.target.value)}
        sx={inputStyle}
      >
        <MenuItem value="tutti">Tutti</MenuItem>
        {categorie.map(cat => <MenuItem key={cat.id} value={String(cat.id)}>{cat.nome}</MenuItem>)}
      </TextField>

      <TextField
        select
        label="Filtro disponibilità"
        value={filters.disponibilita}
        onChange={e => handleChange('disponibilita', e.target.value)}
        sx={inputStyle}
      >
        {disponibilitaOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
      </TextField>

      <TextField
        select
        label="Filtro menu"
        value={filters.menu}
        onChange={e => handleChange('menu', e.target.value)}
        sx={inputStyle}
      >
        {menuOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
      </TextField>

      <TextField
        label="Cerca prodotto"
        value={filters.searchText}
        onChange={e => handleChange('searchText', e.target.value)}
        sx={inputStyle}
      />
    </Box>
  );
};

export default React.memo(Filters);
