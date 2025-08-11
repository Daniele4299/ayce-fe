'use client';
import { Paper, Grid } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import TavoloManagementForm from '@/app/(DashboardLayout)/components/tavoli/TavoloManagementForm';


const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body1,
  textAlign: 'center',
  color: theme.palette.text.secondary,
  height: 60,
  lineHeight: '60px',
}));

const darkTheme = createTheme({ palette: { mode: 'dark' } });
const lightTheme = createTheme({ palette: { mode: 'light' } });

const Shadow = () => {
  return (
    <PageContainer title="Gestione Tavoli" description="Gestione Tavoli">
      <Grid size={12}>
        <TavoloManagementForm />
      </Grid>
    </PageContainer>
  );
};

export default Shadow;
