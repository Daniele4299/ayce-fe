'use client';
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { Stack, Typography, CircularProgress, MenuItem, Select, FormControl, InputLabel, TextField } from "@mui/material";
import { IconCurrencyDollar } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Totali {
  lordo: number;
  netto: number;
  sessioniAyce: number;
  sessioniCarta: number;
  aycePranzi: number;
  ayceCene: number;
  personeAycePranzo: number;
  personeAyceCena: number;
  personeCarta: number;
}

const Breakup = () => {
  const theme = useTheme();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.toISOString().slice(0,10);

  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('year');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState(currentDay);
  const [data, setData] = useState<Totali | null>(null);
  const [loading, setLoading] = useState(true);

  const getRange = () => {
    if(period === 'year') {
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      return { from, to };
    } else if(period === 'month') {
      const monthPadded = month.toString().padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      return { from: `${year}-${monthPadded}-01`, to: `${year}-${monthPadded}-${lastDay}` };
    } else { // day
      return { from: day, to: day };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const range = getRange();
      const res = await fetch(
        `${backendUrl}/api/stats/totali?period=${period}&from=${range.from}&to=${range.to}`,
        { credentials: "include" }
      );
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchData(); }, [period, year, month, day]);

  const options: any = {
    chart: { type: "donut", sparkline: { enabled: true } },
    stroke: { show: false },
    legend: { show: false },
    labels: ["Netto", "Spese"],
    colors: [theme.palette.secondary.main, theme.palette.error.main],
    tooltip: { theme: theme.palette.mode },
  };

  const series = data ? [data.netto, data.lordo - data.netto] : [0, 0];

  const formatCurrency = (value: number) => (value < 0 ? `-€${Math.abs(value).toLocaleString()}` : `€${value.toLocaleString()}`);

  return (
    <DashboardCard title="Breakup Totali" action={<IconCurrencyDollar width={24} />}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
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
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                <MenuItem key={m} value={m.toString()}>{m}</MenuItem>
              )}
            </Select>
          </FormControl>
        }

        {period === 'day' &&
          <TextField
            label="Giorno"
            type="date"
            size="small"
            value={day}
            onChange={e => setDay(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        }
      </Stack>

      {loading ? <CircularProgress /> :
        <>
          <Chart options={options} series={series} type="donut" height={150} />

          <Typography variant="h5" fontWeight="700" mt={2}>
            Incasso lordo: {data ? formatCurrency(data.lordo) : '-'}
          </Typography>
          <Typography variant="h6" fontWeight="600" color={data && data.netto < 0 ? "error.main" : "textPrimary"}>
            Incasso netto: {data ? formatCurrency(data.netto) : '-'}
          </Typography>

          <Stack direction="column" spacing={0.5} mt={1}>
            <Typography variant="subtitle2" fontWeight="600">
              {data?.sessioniAyce ?? 0} sessioni AYCE: 
              ({data?.aycePranzi ?? 0} pranzi con {data?.personeAycePranzo ?? 0} partecipanti | 
              {data?.ayceCene ?? 0} cene con {data?.personeAyceCena ?? 0} partecipanti)
            </Typography>
            <Typography variant="subtitle2" fontWeight="600">
              {data?.sessioniCarta ?? 0} sessioni CARTA: ({data?.personeCarta ?? 0} partecipanti)
            </Typography>
          </Stack>


        </>
      }
    </DashboardCard>
  );
};

export default Breakup;
