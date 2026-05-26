import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';

const app = express();

// Middlewares globales
app.use(cors());
app.use(json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', env: process.env.NODE_ENV });
});

// Puerto
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} - Entorno: ${process.env.NODE_ENV}`);
});

export default app;
