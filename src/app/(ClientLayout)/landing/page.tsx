'use client';

import { Box, Typography, Paper, Link } from '@mui/material';

export default function LandingPage() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      sx={{ p: 2 }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 4,
          border: '2px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h3" gutterBottom color="primary">
          Blackout AYCE Software
        </Typography>

        <Typography variant="h6" gutterBottom color="text.secondary">
          Ing. D. B. – 2025
        </Typography>

        <Link
          href="https://www.danielebonadonna.it"
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          variant="body1"
          color="secondary"
          sx={{ fontWeight: 'bold' }}
        >
          www.danielebonadonna.it
        </Link>
      </Paper>
    </Box>
  );
}
