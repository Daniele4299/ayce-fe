'use client';
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { Stack, Typography, CircularProgress, Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

interface AffluenzaEntry {
  label: string;
  carta: number;
  cartaPersone: number;
  aycePranzo: number;
  aycePranzoPersone: number;
  ayceCena: number;
  ayceCenaPersone: number;
}

const Affluenza = () => {
  const theme = useTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [view, setView] = useState<'year' | 'month'>('year');
  const [data, setData] = useState<AffluenzaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAffluenza = async () => {
    setLoading(true);
    try {
      if (view === 'year') {
        // dati mensili
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const results = await Promise.all(months.map(async (m) => {
          const from = new Date(year, m - 1, 1, 0, 0, 0);
          const to = new Date(year, m - 1, new Date(year, m, 0).getDate(), 23, 59, 59);

          const res = await fetch(`${backendUrl}/api/stats/totali?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" });
          const json = await res.json();
          return {
            label: from.toLocaleString("it-IT", { month: "short" }),
            carta: json.sessioniCarta ?? 0,
            cartaPersone: json.personeCarta ?? 0,
            aycePranzo: json.aycePranzi ?? 0,
            aycePranzoPersone: json.personeAycePranzo ?? 0,
            ayceCena: json.ayceCene ?? 0,
            ayceCenaPersone: json.personeAyceCena ?? 0,
          } as AffluenzaEntry;
        }));
        setData(results);
      } else {
        // dati giornalieri per il mese selezionato
        const daysInMonth = new Date(year, month, 0).getDate();
        const results = await Promise.all(Array.from({ length: daysInMonth }, (_, i) => i + 1).map(async (d) => {
          const from = new Date(year, month - 1, d, 0, 0, 0);
          const to = new Date(year, month - 1, d, 23, 59, 59);

          const res = await fetch(`${backendUrl}/api/stats/totali?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" });
          const json = await res.json();
          return {
            label: d.toString(),
            carta: json.sessioniCarta ?? 0,
            cartaPersone: json.personeCarta ?? 0,
            aycePranzo: json.aycePranzi ?? 0,
            aycePranzoPersone: json.personeAycePranzo ?? 0,
            ayceCena: json.ayceCene ?? 0,
            ayceCenaPersone: json.personeAyceCena ?? 0,
          } as AffluenzaEntry;
        }));
        setData(results);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAffluenza(); }, [year, month, view]);

  // options con tooltip.custom che mostra anche i partecipanti leggendo i dati locali
  const options: any = {
    chart: {
      type: "bar",
      stacked: false,
      toolbar: { show: false },
      animations: { enabled: true },
    },
    plotOptions: { bar: { horizontal: false, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: { categories: data.map(d => d.label) },
    yaxis: { title: { text: "Numero sessioni" } },
    colors: [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.error.main],
    legend: { position: "top" },
    tooltip: {
      theme: theme.palette.mode,
      // custom tooltip: include partecipanti
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
        if (dataPointIndex == null) return '';
        const entry = data[dataPointIndex];
        if (!entry) return '';
        const serieName = w.globals.seriesNames[seriesIndex] ?? '';
        const value = series[seriesIndex][dataPointIndex] ?? 0;

        let partecipanti = 0;
        if (serieName === 'CARTA') {
          partecipanti = entry.cartaPersone ?? 0;
        } else if (serieName === 'AYCE Pranzo') {
          partecipanti = entry.aycePranzoPersone ?? 0;
        } else if (serieName === 'AYCE Cena') {
          partecipanti = entry.ayceCenaPersone ?? 0;
        }

        // HTML semplice e compatto
        return `
          <div style="padding:8px; min-width:120px; font-size:13px;">
            <div style="font-weight:600; margin-bottom:6px;">${serieName}</div>
            <div>Sessioni: <strong>${value}</strong></div>
            <div style="color:rgba(0,0,0,0.7); margin-top:4px;">Partecipanti: <strong>${partecipanti}</strong></div>
          </div>
        `;
      }
    }
  };

  const series = [
    { name: "CARTA", data: data.map(d => d.carta) },
    { name: "AYCE Pranzo", data: data.map(d => d.aycePranzo) },
    { name: "AYCE Cena", data: data.map(d => d.ayceCena) },
  ];

  return (
    <DashboardCard title="Affluenza">
      <Stack direction="row" spacing={2} mb={2}>
        <FormControl size="small">
          <InputLabel>Vista</InputLabel>
          <Select value={view} label="Vista" onChange={e => setView(e.target.value as 'year' | 'month')}>
            <MenuItem value="year">Anno</MenuItem>
            <MenuItem value="month">Mese</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Anno</InputLabel>
          <Select value={year.toString()} label="Anno" onChange={e => setYear(parseInt(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y =>
              <MenuItem key={y} value={y.toString()}>{y}</MenuItem>
            )}
          </Select>
        </FormControl>

        {view === 'month' &&
          <FormControl size="small">
            <InputLabel>Mese</InputLabel>
            <Select value={month.toString()} label="Mese" onChange={e => setMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                <MenuItem key={m} value={m.toString()}>{m}</MenuItem>
              )}
            </Select>
          </FormControl>
        }
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <Chart options={options} series={series} type="bar" height={300} />
      )}
    </DashboardCard>
  );
};

export default Affluenza;
