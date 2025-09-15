'use client'

import { useEffect, useState } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';

interface Prodotto {
  id: number;
  nome: string;
  prezzo: number;
  costo?: number;
  stato?: 'vuoto' | 'modifica' | 'salvato';
}

interface Props {
  onBack: () => void;
}

const GestisciCostoProdotto = ({ onBack }: Props) => {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
  async function fetchProdotti() {
    const resProdotti = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/prodotti`, {
      credentials: 'include'
    });
    const data = await resProdotti.json();

    const resCosti = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/costo-prodotto`, {
      credentials: 'include'
    });
    const costi = await resCosti.json();

    const prodottiConCosti = data.map((p: any) => {
      const costoObj = costi.find((c: any) => c.prodotto.id === p.id);
      return { 
        ...p, 
        costo: costoObj?.costo ?? undefined,
        stato: costoObj?.costo !== undefined ? 'salvato' : 'vuoto'
      };
    });

    // Ordina per idCategoria (da 1 a 100 ecc.)
    prodottiConCosti.sort((a: { categoria: { id: number; }; }, b: { categoria: { id: number; }; }) => a.categoria.id - b.categoria.id);

    setProdotti(prodottiConCosti);
  }

  fetchProdotti();
}, []);


  const handleSave = async (prodottoId: number, costo: number | undefined) => {
    if (costo === undefined) return;
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/costo-prodotto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prodottoId, costo })
    });

    setProdotti(prev => prev.map(p => 
      p.id === prodottoId ? { ...p, costo, stato: 'salvato' } : p
    ));
  }

  const handleCostoChange = (id: number, value: string) => {
    const val = parseFloat(value);
    setProdotti(prev => prev.map(p => 
      p.id === id 
        ? { 
            ...p, 
            costo: isNaN(val) ? undefined : val, 
            stato: 'modifica' 
          } 
        : p
    ));
  }

  const filteredProdotti = prodotti.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));

  const getRowColor = (stato?: string) => {
    switch(stato) {
      case 'vuoto': return '#ffebeb';
      case 'modifica': return '#ffffff';
      case 'salvato': return '#d4edda';
      default: return 'transparent';
    }
  }

  return (
    <DashboardCard>
      {/* Header con tasto indietro */}
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={onBack} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" ml={1}>
          Gestisci Costo Prodotti
        </Typography>
      </Box>

      {/* Campo di ricerca */}
      <Box mb={2}>
        <TextField 
          label="Cerca prodotto" 
          variant="outlined" 
          size="small" 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          fullWidth
        />
      </Box>

      {/* Tabella prodotti */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Prodotto</TableCell>
            <TableCell>Prezzo di vendita</TableCell>
            <TableCell>Costo produzione</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredProdotti.map(p => (
            <TableRow key={p.id} sx={{ backgroundColor: getRowColor(p.stato) }}>
              <TableCell>{p.nome}</TableCell>
              <TableCell>€{p.prezzo}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={p.costo ?? ''}
                  onChange={e => handleCostoChange(p.id, e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Button 
                  variant="contained" 
                  onClick={() => handleSave(p.id, p.costo)}
                  disabled={p.stato === 'salvato'} // evita di salvare se già salvato
                >
                  Salva
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardCard>
  );
}

export default GestisciCostoProdotto;
