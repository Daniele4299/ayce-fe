'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  Paper,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

// Types

type Role = { idRuolo: number; codiceRuolo: string; descrizione: string };
type User = {
  idUtente: number;
  utenUsername: string;
  utenPassword?: string;
  utenNome: string;
  utenCognome: string;
  utenEmail: string;
  utenRuolo: Role;
  utenAttivo: boolean;
};

const UserManagementForm = () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<User>({
    idUtente: 0,
    utenUsername: '',
    utenPassword: '',
    utenNome: '',
    utenCognome: '',
    utenEmail: '',
    utenRuolo: { idRuolo: 0, codiceRuolo: '', descrizione: '' },
    utenAttivo: true,
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });

  useEffect(() => {
    async function fetchData() {
      const me = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });
      if (!me.ok) return;
      const meData = await me.json();
      setRole(meData.ruolo);
      if (meData.ruolo !== 'SYS') return;
      const [uRes, rRes] = await Promise.all([
        fetch(`${backendUrl}/api/utenti`, { credentials: 'include' }),
        fetch(`${backendUrl}/api/ruoli`, { credentials: 'include' }),
      ]);
      const [uData, rData] = await Promise.all([uRes.json(), rRes.json()]);
      setUsers(uData);
      setRoles(rData);
    }
    fetchData();
  }, [backendUrl]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.idUtente);
    setEditedUser({ ...user, utenPassword: '' });
  };

  const handleSave = async () => {
    if (!editedUser || editingUserId === null) return;
    const payload = { ...editedUser };
    if (!payload.utenPassword) delete payload.utenPassword;
    delete (payload as any).authorities;

    const res = await fetch(`${backendUrl}/api/utenti/${editingUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.idUtente === updated.idUtente ? updated : u));
      setEditingUserId(null);
      setEditedUser(null);
      showSnackbar('Utente aggiornato con successo', 'success');
    } else {
      const err = await res.text();
      showSnackbar(`Errore aggiornamento: ${err}`, 'error');
    }
  };

  const confirmDelete = (id: number) => {
    setConfirmDialog({ open: true, userId: id });
  };

  const handleDelete = async () => {
    if (confirmDialog.userId === null) return;
    const res = await fetch(`${backendUrl}/api/utenti/${confirmDialog.userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.idUtente !== confirmDialog.userId));
      showSnackbar('Utente eliminato con successo', 'success');
    } else {
      const err = await res.text();
      showSnackbar(`Errore eliminazione: ${err}`, 'error');
    }
    setConfirmDialog({ open: false, userId: null });
  };

  const handleAdd = async () => {
    const res = await fetch(`${backendUrl}/api/utenti`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      const created = await res.json();
      setUsers(prev => [...prev, created]);
      setNewUser({
        idUtente: 0,
        utenUsername: '',
        utenPassword: '',
        utenNome: '',
        utenCognome: '',
        utenEmail: '',
        utenRuolo: { idRuolo: 0, codiceRuolo: '', descrizione: '' },
        utenAttivo: true,
      });
      setShowAddForm(false);  // Nasconde form dopo aggiunta
      showSnackbar('Utente creato con successo', 'success');
    } else {
      const err = await res.text();
      showSnackbar(`Errore creazione: ${err}`, 'error');
    }
  };

  if (role !== 'SYS') return null;

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>Gestione Utenti</Typography>

      {users.map(user => (
        <Paper key={user.idUtente} sx={{ p: 2, mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          {editingUserId === user.idUtente && editedUser ? (
            <>
              <TextField label="ID" value={editedUser.idUtente} size="small" disabled />
              <TextField label="Username" value={editedUser.utenUsername} onChange={e => setEditedUser({ ...editedUser, utenUsername: e.target.value })} />
              <TextField label="Password" type="password" value={editedUser.utenPassword} onChange={e => setEditedUser({ ...editedUser, utenPassword: e.target.value })} />
              <TextField label="Nome" value={editedUser.utenNome} onChange={e => setEditedUser({ ...editedUser, utenNome: e.target.value })} />
              <TextField label="Cognome" value={editedUser.utenCognome} onChange={e => setEditedUser({ ...editedUser, utenCognome: e.target.value })} />
              <TextField label="Email" value={editedUser.utenEmail} onChange={e => setEditedUser({ ...editedUser, utenEmail: e.target.value })} />
              <FormControl size="small">
                <InputLabel>Ruolo</InputLabel>
                <Select label="Ruolo" value={editedUser.utenRuolo.idRuolo} onChange={e => {
                  const sel = roles.find(r => r.idRuolo === Number(e.target.value));
                  if (sel) setEditedUser({ ...editedUser, utenRuolo: sel });
                }}>
                  {roles.map(r => <MenuItem key={r.idRuolo} value={r.idRuolo}>{r.codiceRuolo}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControlLabel control={<Switch checked={editedUser.utenAttivo} onChange={e => setEditedUser({ ...editedUser, utenAttivo: e.target.checked })} />} label="Attivo" />
              <IconButton onClick={handleSave}><SaveIcon /></IconButton>
              <IconButton onClick={() => setEditingUserId(null)}><CancelIcon /></IconButton>
            </>
          ) : (
            <>
              <Box sx={{ flex: 1 }}>
                ID: {user.idUtente} - {user.utenUsername} - {user.utenNome} {user.utenCognome} - {user.utenEmail} - {user.utenRuolo.codiceRuolo} - {user.utenAttivo ? 'Attivo' : 'Disattivo'}
              </Box>
              <IconButton onClick={() => handleEdit(user)}><EditIcon /></IconButton>
              <IconButton onClick={() => confirmDelete(user.idUtente)}><DeleteIcon /></IconButton>
            </>
          )}
        </Paper>
      ))}

      {/* Bottone per mostrare form di aggiunta solo se è nascosto */}
      {!showAddForm && (
        <Box mt={3}>
          <Button variant="contained" onClick={() => setShowAddForm(true)}>Aggiungi nuovo utente</Button>
        </Box>
      )}

      {/* Form di aggiunta nuovo utente */}
      {showAddForm && (
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>Aggiungi nuovo utente</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField label="Username" size="small" fullWidth value={newUser.utenUsername} onChange={e => setNewUser({ ...newUser, utenUsername: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField label="Password" type="password" size="small" fullWidth value={newUser.utenPassword} onChange={e => setNewUser({ ...newUser, utenPassword: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField label="Nome" size="small" fullWidth value={newUser.utenNome} onChange={e => setNewUser({ ...newUser, utenNome: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField label="Cognome" size="small" fullWidth value={newUser.utenCognome} onChange={e => setNewUser({ ...newUser, utenCognome: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField label="Email" size="small" fullWidth value={newUser.utenEmail} onChange={e => setNewUser({ ...newUser, utenEmail: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Ruolo</InputLabel>
                <Select label="Ruolo" value={newUser.utenRuolo.idRuolo} onChange={e => {
                  const sel = roles.find(r => r.idRuolo === Number(e.target.value));
                  if (sel) setNewUser({ ...newUser, utenRuolo: sel });
                }}>
                  {roles.map(r => <MenuItem key={r.idRuolo} value={r.idRuolo}>{r.codiceRuolo}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 1 }}>
              <FormControlLabel control={<Switch checked={newUser.utenAttivo} onChange={e => setNewUser({ ...newUser, utenAttivo: e.target.checked })} />} label="Attivo" />
            </Grid>
            <Grid size={{ xs: 12, md: 1 }}>
              <Button variant="contained" onClick={handleAdd}>Aggiungi</Button>
              <Button sx={{ ml: 1 }} onClick={() => setShowAddForm(false)}>Annulla</Button>
            </Grid>
          </Grid>
        </Box>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, userId: null })}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <DialogContentText>Sei sicuro di voler eliminare questo utente?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, userId: null })}>Annulla</Button>
          <Button color="error" onClick={handleDelete}>Elimina</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementForm;
