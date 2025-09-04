'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Typography } from '@mui/material';

interface Props {
  open: boolean;
  storico: any[];
  onClose: () => void;
}

const StoricoDialog: React.FC<Props> = ({ open, storico, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Storico Ordini</DialogTitle>
      <DialogContent>
        <List>
          {storico.length > 0 ? storico.map(item => (
            <ListItem key={item.id}>
              <ListItemText
                primary={`${item.prodotto} x${item.quantita}`}
                secondary={`${new Date(item.orario).toLocaleString()} - ${item.stato}`}
              />
            </ListItem>
          )) : <Typography>Nessun ordine storico</Typography>}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default StoricoDialog;
