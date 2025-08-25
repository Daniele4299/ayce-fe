'use client';

import React from 'react';
import { Grid } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ProductManagementForm from '@/app/(DashboardLayout)/components/prodotti/ProductManagementForm';

const Prodotti: React.FC = () => {
  return (
    <PageContainer title="Gestione Prodotti" description="Gestione Prodotti">
      <Grid container spacing={3}>
        <Grid size={{ sm: 12 }}>
        </Grid>
        <Grid size={{ sm: 12 }}>
          <Grid size={{ sm: 12 }}>
            <ProductManagementForm />
          </Grid>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Prodotti;
