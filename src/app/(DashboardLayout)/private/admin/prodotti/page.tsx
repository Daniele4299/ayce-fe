'use client';
import { Typography, Grid, CardContent } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import BlankCard from '@/app/(DashboardLayout)/components/shared/BlankCard';
import ProductManagementForm from '@/app/(DashboardLayout)/components/prodotti/ProductManagementForm';



const TypographyPage = () => {
  return (
    <PageContainer title="Gestione Prodotti" description="Gestione Prodotti">
          <Grid container spacing={3}>
            <Grid
              size={{
                sm: 12
              }}>

            </Grid>
            <Grid
              size={{ sm: 12  }}>
              <Grid size={{ sm: 12 }}>
                <ProductManagementForm />
              </Grid>

            </Grid>
          </Grid >
    </PageContainer>
  );
};

export default TypographyPage;
