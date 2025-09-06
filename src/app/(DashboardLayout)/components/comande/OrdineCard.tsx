'use client';
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';

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
}

const OrdineCard: React.FC<OrdineCardProps> = ({ ordine, mode, onToggle }) => {
  const orario = new Date(ordine.orario).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns:
          mode === 'prodotto'
            ? '60px 60px 60px 1fr 60px'
            : '200px 60px 60px 60px 60px',
        alignItems: 'center',
        py: 0.5,
        px: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
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
            checked={ordine.flagConsegnato}
            onChange={(e) => onToggle(e.target.checked)}
          />
        }
        label=""
      />
    </Box>
  );
};

export default OrdineCard;
