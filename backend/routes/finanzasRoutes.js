import express from 'express';
import { agregarMovimiento, obtenerResumen, crearProducto, actualizarProducto, eliminarProducto, reactivarProducto } from '../controllers/finanzasController.js';

const router = express.Router();

router.get('/', obtenerResumen);
router.post('/', agregarMovimiento);
router.post('/producto', crearProducto);
router.put('/producto/:id', actualizarProducto); 
router.delete('/producto/:id', eliminarProducto);
router.put('/producto/:id/activar', reactivarProducto);

export default router;