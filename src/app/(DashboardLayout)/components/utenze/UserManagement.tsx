'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Chip,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';

interface Utente {
  id: number;
  username: string;
  password?: string;
  livello: number;
}

const ruoloLabel = (livello: number) => {
  switch (livello) {
    case 0:
      return <Chip label="Amministratore" color="primary" />;
    case 1:
      return <Chip label="Dipendente" color="secondary" />;
    default:
      return <Chip label={`Ruolo ${livello}`} />;
  }
};

const UserManagement = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Utente | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    livello: 0
  });

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchUtenti = async () => {
    const res = await fetch(`${backendUrl}/api/utenti`, {
      credentials: 'include',
    });
    const data = await res.json();
    setUtenti(data);
  };

  useEffect(() => {
    fetchUtenti();
  }, []);

  const handleDelete = async (id: number) => {
    await fetch(`${backendUrl}/api/utenti/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    fetchUtenti();
  };

  const handleOpenForm = (utente?: Utente) => {
    if (utente) {
      setEditingUser(utente);
      setFormData({ username: utente.username, password: '', livello: utente.livello });
    } else {
      setEditingUser(null);
      setFormData({ username: '', password: '', livello: 0 });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const method = editingUser ? 'PUT' : 'POST';
    const url = editingUser
      ? `${backendUrl}/api/utenti/${editingUser.id}`
      : `${backendUrl}/api/utenti`;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...formData, livello: parseInt(`${formData.livello}`) }),
    });

    handleClose();
    fetchUtenti();
  };

  return (
    <Box>
      <Typography variant="h5" mb={2} fontWeight={600}>
        Gestione Utenze
      </Typography>

      {!readOnly && (
        <Button variant="contained" onClick={() => handleOpenForm()} sx={{ mb: 2 }}>
          Aggiungi Utente
        </Button>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Ruolo</TableCell>
            { !readOnly && <TableCell>Azioni</TableCell> }
          </TableRow>
        </TableHead>
        <TableBody>
          {utenti.map((utente) => (
            <TableRow key={utente.id}>
              <TableCell>{utente.username}</TableCell>
              <TableCell>{ruoloLabel(utente.livello)}</TableCell>
              {!readOnly && (
                <TableCell>
                  <IconButton onClick={() => handleOpenForm(utente)}><Edit /></IconButton>
                  <IconButton onClick={() => handleDelete(utente.id)}><Delete /></IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingUser ? 'Modifica Utente' : 'Nuovo Utente'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            helperText={editingUser ? 'Lascia vuoto per non cambiare la password' : ''}
          />
          <TextField
            label="Livello"
            name="livello"
            type="number"
            value={formData.livello}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annulla</Button>
          <Button onClick={handleSubmit} variant="contained">Salva</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
