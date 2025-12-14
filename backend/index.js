
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import finanzasRoutes from './routes/finanzasRoutes.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/finanzas', finanzasRoutes);

app.listen(port, () => {
  console.log(`Servidor PROFESIONAL corriendo en http://localhost:${port}`);
});