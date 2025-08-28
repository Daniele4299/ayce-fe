'use client';
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

interface Ordine {
  id: number;
  tavolo?: { id: number; numero: number };
  prodotto?: { id: number; nome: string };
  quantita: number;
  orario: string;
  flagConsegnato: boolean;
  numeroPartecipanti?: number | null;
}

interface OrdineCardProps {
  ordine: Ordine;
  mode: 'prodotto' | 'tavolo';
  onToggle: (checked: boolean) => void;
  isNew?: boolean;
}

const OrdineCard: React.FC<OrdineCardProps> = ({ ordine, mode, onToggle, isNew }) => {
  const orario = new Date(ordine.orario).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [highlight, setHighlight] = useState(Boolean(isNew));

  useEffect(() => {
    if (isNew) {
      const timeout = setTimeout(() => setHighlight(false), 4000);
      return () => clearTimeout(timeout);
    }
  }, [isNew]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns:
          mode === 'prodotto' ? '90px 120px 120px 1fr 60px' : '1fr 120px 120px 80px 60px',
        columnGap: 2,
        alignItems: 'center',
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        whiteSpace: 'nowrap',
        backgroundColor: highlight ? 'rgba(255,255,0,0.4)' : 'transparent',
        transition: 'background-color 0.5s ease-in-out',
      }}
    >
      {mode === 'prodotto' ? (
        <>
          <Typography variant="body2">T{ordine.tavolo?.numero ?? '-'}</Typography>
          <Typography variant="body2">{orario}</Typography>
          <Typography variant="body2">{ordine.numeroPartecipanti ?? '-'}</Typography>
          <Typography variant="body2">{ordine.quantita}</Typography>
        </>
      ) : (
        <>
          <Typography variant="body2">{ordine.prodotto?.nome ?? '-'}</Typography>
          <Typography variant="body2">{orario}</Typography>
          <Typography variant="body2">{ordine.numeroPartecipanti ?? '-'}</Typography>
          <Typography variant="body2">{ordine.quantita}</Typography>
        </>
      )}
      <FormControlLabel
        sx={{ m: 0 }}
        control={<Checkbox checked={ordine.flagConsegnato} onChange={(e) => onToggle(e.target.checked)} />}
        label=""
      />
    </Box>
  );
};

export default OrdineCard;
