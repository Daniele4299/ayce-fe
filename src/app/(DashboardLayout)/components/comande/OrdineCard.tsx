'use client';
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { useState, useEffect } from 'react';

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
  onRemove?: () => void; // callback per rimuovere dopo animazione
  nascondiConsegnati: boolean; // ← nuova prop
}


const OrdineCard: React.FC<OrdineCardProps> = ({ ordine, mode, onToggle, onRemove, nascondiConsegnati }) => {
  const [checked, setChecked] = useState(ordine.flagConsegnato);
  const [pendingRemoval, setPendingRemoval] = useState(false);

  const orario = new Date(ordine.orario).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleChange = (val: boolean) => {
    setChecked(val);
    // rimuove la riga solo se nascondi consegnati è attivo
    if (val && onRemove && nascondiConsegnati) {
      setPendingRemoval(true);
      setTimeout(() => {
        onRemove();
      }, 1000);
    }
    onToggle(val);
  };


  useEffect(() => {
  setChecked(ordine.flagConsegnato);
}, [ordine.flagConsegnato]);


  return (
    <Box
      sx={{
        display: pendingRemoval ? 'grid' : 'grid',
        gridTemplateColumns:
          mode === 'prodotto'
            ? '60px 60px 60px 1fr 60px'
            : '200px 60px 60px 60px 60px',
        alignItems: 'center',
        py: 0.5,
        px: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: pendingRemoval ? 0.6 : 1, // leggero fade out visivo
        transition: 'opacity 0.3s',
      }}
    >
      {mode === 'prodotto' ? (
        <>
          <Typography>{ordine.tavolo?.numero ?? '-'}</Typography>
          <Typography>{orario}</Typography>
          <Typography>{ordine.numeroPartecipanti ?? '-'}</Typography>
          <Typography>{ordine.quantita}</Typography>
        </>
      ) : (
        <>
          <Typography>{ordine.prodotto?.nome ?? '-'}</Typography>
          <Typography>{orario}</Typography>
          <Typography>{ordine.numeroPartecipanti ?? '-'}</Typography>
          <Typography>{ordine.quantita}</Typography>
        </>
      )}
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => handleChange(e.target.checked)}
          />
        }
        label=""
      />
    </Box>
  );
};

export default OrdineCard;
