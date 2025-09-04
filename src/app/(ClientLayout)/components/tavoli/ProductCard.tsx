import React, { useCallback, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Image from 'next/image';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

interface ProductCardProps {
  prodotto: any;
  quantita: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  prodotto,
  quantita,
  onIncrement,
  onDecrement,
}) => {
  const getProductImage = useCallback((fileName: string | undefined) => {
    if (!fileName) return '/images/products/placeholder.png';
    return `${backendUrl}/images/prodotti/${fileName}_medium.jpeg`;
  }, []);

  const initialImage = getProductImage(prodotto?.immagine);
  const [imageSrc, setImageSrc] = useState<string>(initialImage);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(201,168,86,0.5)', // bordo dorato sottile
      }}
    >
      {/* Box immagine con altezza fissa */}
      <Box sx={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden' }}>
        <Image
          src={imageSrc}
          alt={prodotto.nome}
          fill
          style={{ objectFit: 'cover' }}
          onError={() => setImageSrc('/images/products/placeholder.png')}
          sizes="(max-width: 600px) 100vw, 50vw"
        />
      </Box>

      {/* Contenuto */}
      <CardContent sx={{ flexGrow: 1, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 600, mb: 0.5 }}>
            {prodotto.nome}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, minHeight: 36 }}>
            {prodotto.descrizione}
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '0.8rem', mb: 1 }}>
            € {prodotto.prezzo.toFixed(2)}
          </Typography>
        </Box>

        {/* Controlli quantità */}
        <Box display="flex" alignItems="center">
          <IconButton size="small" onClick={onDecrement}>
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ mx: 1, fontSize: '0.85rem' }}>{quantita}</Typography>
          <IconButton size="small" onClick={onIncrement}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default React.memo(ProductCard);
