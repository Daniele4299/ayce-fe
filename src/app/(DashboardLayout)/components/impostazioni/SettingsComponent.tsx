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
  tipo: 'int' | 'boolean' | 'double';
  minValue?: number;
  maxValue?: number;
  descrizione?: string;
}

const keyOrder = [
  'cucina_attiva',
  'ora_inizio_pranzo',
  'ora_inizio_cena',
  'prezzo_ayce_pranzo',
  'prezzo_ayce_cena',
  'tempo_cooldown',
  'portate_per_persona',
];

const SettingsComponent = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [settings, setSettings] = useState<Impostazione[]>([]);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchSettings = async () => {
    const res = await fetch(`${backendUrl}/api/impostazioni`, { credentials: 'include' });
    const data: Impostazione[] = await res.json();
    data.sort((a, b) => keyOrder.indexOf(a.chiave) - keyOrder.indexOf(b.chiave));
    setSettings(data);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (chiave: string, valore: string) => {
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
    if (setting.tipo === 'int') {
      let val = parseInt(setting.valore, 10);
      if (setting.maxValue !== undefined) val = Math.min(val + 1, setting.maxValue);
      updateSetting(setting.chiave, val.toString());
    } else if (setting.tipo === 'double') {
      let val = parseFloat(setting.valore);
      if (setting.maxValue !== undefined) val = Math.min(val + 1, setting.maxValue);
      updateSetting(setting.chiave, val.toFixed(2));
    }
  };

  const handleDecrement = (setting: Impostazione) => {
    if (setting.tipo === 'int') {
      let val = parseInt(setting.valore, 10);
      if (setting.minValue !== undefined) val = Math.max(val - 1, setting.minValue);
      updateSetting(setting.chiave, val.toString());
    } else if (setting.tipo === 'double') {
      let val = parseFloat(setting.valore);
      if (setting.minValue !== undefined) val = Math.max(val - 1, setting.minValue);
      updateSetting(setting.chiave, val.toFixed(2));
    }
  };

  const handleDoubleChange = (setting: Impostazione, newValue: string) => {
    // Rimuove eventuali caratteri non numerici tranne punto
    const sanitized = newValue.replace(/[^0-9.]/g, '');
    if (!sanitized) return;

    let val = parseFloat(sanitized);
    if (isNaN(val)) return;

    if (setting.minValue !== undefined) val = Math.max(val, setting.minValue);
    if (setting.maxValue !== undefined) val = Math.min(val, setting.maxValue);

    updateSetting(setting.chiave, val.toFixed(2));
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
                      onChange={(e) => {
                        if (setting.tipo === 'double') handleDoubleChange(setting, e.target.value);
                      }}
                      inputProps={{
                        style: { width: 60, textAlign: 'center' },
                        readOnly: readOnly && setting.tipo !== 'double', // i double restano editabili
                      }}
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
