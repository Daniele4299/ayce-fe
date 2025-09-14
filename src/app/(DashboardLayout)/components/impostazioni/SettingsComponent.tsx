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
  IconButton,
  Switch,
  TextField,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

interface Impostazione {
  chiave: string;
  valore: string;
  tipo: 'int' | 'boolean';
  minValue?: number;
  maxValue?: number;
  descrizione?: string;
}

// Ordine fisso delle impostazioni
const keyOrder = [
  'cucina_attiva',
  'ora_inizio_pranzo',
  'ora_inizio_cena',
  'tempo_cooldown',
  'portate_per_persona',
  'backup_database_attivo',
  'backup_schedule_day',
];

const SettingsComponent = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [settings, setSettings] = useState<Impostazione[]>([]);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchSettings = async () => {
    const res = await fetch(`${backendUrl}/api/impostazioni`, { credentials: 'include' });
    const data: Impostazione[] = await res.json();

    // Ordina secondo keyOrder
    data.sort((a, b) => keyOrder.indexOf(a.chiave) - keyOrder.indexOf(b.chiave));

    setSettings(data);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (chiave: string, valore: string) => {
    // invio raw, senza JSON.stringify
    await fetch(`${backendUrl}/api/impostazioni/${chiave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: valore,
    });
    fetchSettings();
  };

  const handleToggle = (setting: Impostazione) => {
    const newValue = setting.valore === '1' ? '0' : '1';
    updateSetting(setting.chiave, newValue);
  };

  const handleIncrement = (setting: Impostazione) => {
    let val = parseInt(setting.valore, 10);
    if (setting.maxValue !== undefined) val = Math.min(val + 1, setting.maxValue);
    updateSetting(setting.chiave, val.toString());
  };

  const handleDecrement = (setting: Impostazione) => {
    let val = parseInt(setting.valore, 10);
    if (setting.minValue !== undefined) val = Math.max(val - 1, setting.minValue);
    updateSetting(setting.chiave, val.toString());
  };

  return (
    <Box>
      <Typography variant="h5" mb={2} fontWeight={600}>
        Gestione Impostazioni
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Descrizione</TableCell>
            <TableCell>Valore</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {settings.map((setting) => (
            <TableRow key={setting.chiave}>
              <TableCell>{setting.descrizione}</TableCell>
              <TableCell>
                {setting.tipo === 'boolean' ? (
                  <Switch
                    checked={setting.valore === '1'}
                    onChange={() => handleToggle(setting)}
                    disabled={readOnly}
                  />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={() => handleDecrement(setting)} disabled={readOnly}>
                      <Remove />
                    </IconButton>
                    <TextField
                      value={setting.valore}
                      size="small"
                      inputProps={{ readOnly: true, style: { width: 50, textAlign: 'center' } }}
                    />
                    <IconButton onClick={() => handleIncrement(setting)} disabled={readOnly}>
                      <Add />
                    </IconButton>
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default SettingsComponent;
