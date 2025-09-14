'use client';

import React from 'react';
import { Box, Button, Badge, IconButton, Collapse } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface Props {
  disableInvio: boolean;
  cooldown: number | null;
  inviaOrdine: () => void;
  fetchStorico: () => void;
  totalPortate: number | undefined;
  maxPortate: number | undefined;
}

const FooterOrdine: React.FC<Props> = ({
  disableInvio,
  cooldown,
  inviaOrdine,
  fetchStorico,
  totalPortate,
  maxPortate,
}) => {
  const [footerOpen, setFooterOpen] = React.useState(true);
  const [page, setPage] = React.useState<0 | 1>(0); // 0 = ordini, 1 = allergeni

  const togglePage = () => setPage(page === 0 ? 1 : 0);

  return (
    <>
      <Collapse in={footerOpen}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            py: 2,
            borderTop: '1px solid #333',
            display: 'flex',
            gap: 2,
            px: 2,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
          }}
        >

          {/* Bottone unico con i pallini */}
          <Button
            onClick={togglePage}
            variant="outlined"
            sx={{
              minWidth: 36,
              width: 36,
              height: 36,
              borderRadius: '50%',
              p: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: page === 0 ? 'primary.main' : 'grey.400',
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: page === 1 ? 'primary.main' : 'grey.400',
              }}
            />
          </Button>

          {/* Bottoni variabili */}
          {page === 0 ? (
            <>
              <Badge
                badgeContent={
                  cooldown !== null
                    ? `${Math.floor(cooldown / 60)}:${(cooldown % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : 0
                }
                color="secondary"
                invisible={cooldown === null}
              >
                <Button
                  variant="contained"
                  color="primary"
                  disabled={disableInvio}
                  onClick={inviaOrdine}
                >
                  Invia Ordine
                </Button>
              </Badge>

              <Button variant="outlined" color="secondary" onClick={fetchStorico}>
                Storico
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              color="warning"
              onClick={() => window.open('/documents/allergeni.pdf', '_blank')}
            >
              Allergeni
            </Button>
          )}



          {/* Contatore portate (sempre visibile) */}
          {totalPortate !== undefined && maxPortate !== undefined && (
            <Box sx={{ fontWeight: 'bold' }}>
              {totalPortate}/{maxPortate}
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Bottone toggle footer */}
      <IconButton
        sx={{
          position: 'fixed',
          bottom: footerOpen ? 80 : 20,
          right: 20,
          bgcolor: 'background.paper',
          border: '1px solid #333',
          boxShadow: 1,
          zIndex: 1300,
        }}
        onClick={() => setFooterOpen(!footerOpen)}
      >
        {footerOpen ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
      </IconButton>
    </>
  );
};

export default FooterOrdine;
