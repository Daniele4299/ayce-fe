import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const ProductCard = ({
  prodotto,
  quantita,
  onIncrement,
  onDecrement,
}: {
  prodotto: any;
  quantita: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) => {
  // URL immagine con fallback a placeholder
  const imageUrl = prodotto.id
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/prodotti/${prodotto.id}/immagine`
    : '/images/products/placeholder.png';

  return (
    <Card sx={{ height: '100%' }}>
      <CardMedia
        component="img"
        height="160"
        image={imageUrl}
        alt={prodotto.nome}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/images/products/placeholder.png';
        }}
      />
      <CardContent>
        <Typography variant="h6">{prodotto.nome}</Typography>
        <Typography variant="body2" color="text.secondary">
          {prodotto.descrizione}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          € {prodotto.prezzo.toFixed(2)}
        </Typography>
        <Box display="flex" alignItems="center" mt={1}>
          <IconButton onClick={onDecrement}>
            <RemoveIcon />
          </IconButton>
          <Typography>{quantita}</Typography>
          <IconButton onClick={onIncrement}>
            <AddIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
