'use client';
import { useEffect, useState } from "react";
import { Typography, CircularProgress, List, ListItem, ListItemText, LinearProgress, Stack, FormControl, InputLabel, Select, MenuItem, TextField, Button } from "@mui/material";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Product { id: number; nome: string; quantita: number; }

const ProductPerformance = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.toISOString().slice(0,10);

  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState(currentDay);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<'top' | 'bottom'>('top');
  const [limit, setLimit] = useState(5);

  const getRange = () => {
    let from: string, to: string;
    if (period === 'year') {
      from = `${year}-01-01`;
      to = `${year}-12-31`;
    } else if (period === 'month') {
      const monthPadded = month.toString().padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      from = `${year}-${monthPadded}-01`;
      to = `${year}-${monthPadded}-${lastDay}`;
    } else { // day
      from = day;
      to = day;
    }
    return { from, to };
  }


  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { from, to } = getRange();
      const res = await fetch(`${backendUrl}/api/stats/prodotti/${viewType}?period=${period}&from=${from}&to=${to}&limit=${limit}`, { credentials: "include" });
      const json: Product[] = await res.json();
      // per worst seller invertiamo la lista così il meno venduto è in cima
      setProducts(viewType === 'bottom' ? json.reverse() : json);
    } catch(err) {
      console.error(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Effettua fetch automatico ogni volta che cambiano period/year/month/day/viewType/limit
  useEffect(() => {
    fetchProducts();
  }, [period, year, month, day, viewType, limit]);

  // max per barre proporzionali
  const max = products.length > 0 ? Math.max(...products.map(p => p.quantita)) : 0;

  return (
    <DashboardCard title="Product Performance">
      <Stack direction={{ xs:'column', sm:'row' }} spacing={2} mb={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Periodo</InputLabel>
          <Select value={period} label="Periodo" onChange={e => setPeriod(e.target.value as any)}>
            <MenuItem value="day">Giorno</MenuItem>
            <MenuItem value="month">Mese</MenuItem>
            <MenuItem value="year">Anno</MenuItem>
          </Select>
        </FormControl>

        {(period === 'year' || period === 'month') &&
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Anno</InputLabel>
            <Select value={year.toString()} label="Anno" onChange={e => setYear(parseInt(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y =>
                <MenuItem key={y} value={y.toString()}>{y}</MenuItem>
              )}
            </Select>
          </FormControl>
        }

        {period === 'month' &&
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Mese</InputLabel>
            <Select value={month.toString()} label="Mese" onChange={e => setMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i+1).map(m =>
                <MenuItem key={m} value={m.toString()}>{m}</MenuItem>
              )}
            </Select>
          </FormControl>
        }

        {period === 'day' &&
          <FormControl size="small">
            <TextField type="date" value={day} onChange={e => setDay(e.target.value)} size="small" />
          </FormControl>
        }

        <FormControl size="small" sx={{ minWidth: 80 }}>
          <TextField
            label="Mostra"
            type="number"
            size="small"
            value={limit}
            onChange={e => setLimit(Math.max(1, parseInt(e.target.value)))}
            inputProps={{ min: 1 }}
          />
        </FormControl>

        <Button variant={viewType==='top' ? 'contained':'outlined'} onClick={() => setViewType('top')}>Best Seller</Button>
        <Button variant={viewType==='bottom' ? 'contained':'outlined'} onClick={() => setViewType('bottom')}>Worst Seller</Button>
      </Stack>

      {loading ? <CircularProgress /> :
      <List>
        {products.map((p, idx) => (
          <ListItem key={`${p.id}-${idx}`} sx={{ flexDirection: "column", alignItems: "flex-start" }}>
            <ListItemText primary={<Typography variant="subtitle1">{p.nome}</Typography>} secondary={`Venduti: ${p.quantita}`} />
            <LinearProgress variant="determinate" value={max > 0 ? (p.quantita / max) * 100 : 0} sx={{ width: "100%", borderRadius: 2, mt: 1 }} />
          </ListItem>
        ))}
        {products.length === 0 && <Typography mt={2}>Nessun prodotto disponibile per il periodo selezionato.</Typography>}
      </List>}
    </DashboardCard>
  );
};

export default ProductPerformance;
