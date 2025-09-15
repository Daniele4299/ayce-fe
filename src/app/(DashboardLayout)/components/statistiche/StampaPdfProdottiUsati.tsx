'use client'

import { useState } from 'react';
import { Box, Button, TextField, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';

interface Props {
  onBack: () => void;
}

const StampaPdfProdottiUsati = ({ onBack }: Props) => {
  const [data, setData] = useState<string>('');

  const downloadPdf = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const url = data
      ? `${backendUrl}/api/prodotti/utilizzati/pdf?data=${data}`
      : `${backendUrl}/api/prodotti/utilizzati/pdf`;

    window.open(url, '_blank');
  }

  return (
    <DashboardCard>
      {/* Header con tasto indietro */}
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={onBack} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" ml={1}>
          Stampa PDF Prodotti Usati
        </Typography>
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
        <TextField
          type="date"
          label="Seleziona giorno"
          value={data}
          onChange={e => setData(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={downloadPdf}>
          Scarica PDF
        </Button>
      </Box>

      <Typography mt={2} variant="body2" color="textSecondary">
        Se non selezioni una data, verrà generato il PDF per la giornata odierna o per la sera precedente se orario è prima delle 7:00.
      </Typography>
    </DashboardCard>
  );
}

export default StampaPdfProdottiUsati;
