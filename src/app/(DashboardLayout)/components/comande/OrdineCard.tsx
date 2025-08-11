'use client';

import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
} from '@mui/material';

interface OrdineCardProps {
  ordine: any;
  onConsegnato: (ordineId: number) => void;
}

const OrdineCard: React.FC<OrdineCardProps> = ({ ordine, onConsegnato }) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const marcaComeConsegnato = async () => {
    try {
      await fetch(`${backendUrl}/api/ordini/${ordine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...ordine, flagConsegnato: true }),
      });
      onConsegnato(ordine.id);
    } catch {
      alert('Errore nel marcare come consegnato.');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">
          Tavolo {ordine.tavolo?.numero ?? '-'} - {ordine.prodotto?.nome ?? 'Prodotto'}
        </Typography>
        <Typography variant="body1">
          Quantità: {ordine.quantita}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Orario: {new Date(ordine.orario).toLocaleTimeString()}
        </Typography>
        <Box mt={2}>
          <Button
            variant="contained"
            color="success"
            onClick={marcaComeConsegnato}
          >
            Consegnato
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrdineCard;
