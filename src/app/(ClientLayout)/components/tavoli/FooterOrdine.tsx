'use client';

import React from 'react';
import { Box, Button, Badge } from '@mui/material';

interface Props {
  disableInvio: boolean;
  cooldown: number | null;
  inviaOrdine: () => void;
  fetchStorico: () => void;
}

const FooterOrdine: React.FC<Props> = ({ disableInvio, cooldown, inviaOrdine, fetchStorico }) => {
  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', py: 2, borderTop: '1px solid #333', display: 'flex', gap: 2, px: 2, justifyContent: 'center', zIndex: 1200 }}>
      <Badge badgeContent={cooldown !== null ? `${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2,'0')}` : 0} color="secondary" invisible={cooldown === null}>
        <Button variant="contained" color="primary" disabled={disableInvio} onClick={inviaOrdine}>Invia Ordine</Button>
      </Badge>
      <Button variant="outlined" color="secondary" onClick={fetchStorico}>Storico</Button>
    </Box>
  );
};

export default FooterOrdine;
