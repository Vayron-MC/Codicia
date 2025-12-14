import supabase from '../config/supabase.js';

export const agregarMovimiento = async (req, res) => {
  const { descripcion, monto, tipo, producto_id, cantidad, fecha, usuario } = req.body; 
  const cantidadNum = parseInt(cantidad) || 0;

  if (tipo === 'ingreso' && producto_id) {
    const { data: prod } = await supabase.from('productos').select('stock, nombre').eq('id', producto_id).single();
    
    if (prod.stock < cantidadNum) {
      return res.status(400).json({ 
        error: `STOCK INSUFICIENTE: Solo hay ${prod.stock} unidades de ${prod.nombre}.` 
      });
    }
  }

  const { data, error } = await supabase
    .from('movimientos')
    .insert([{ 
      descripcion, 
      monto, 
      tipo, 
      producto_id, 
      cantidad: cantidadNum, 
      creado_en: fecha || new Date(),
      usuario: usuario || 'sistema' 
    }])
    .select();

  if (error) return res.status(400).json({ error: error.message });

  if (producto_id) {
    const { data: prod } = await supabase.from('productos').select('stock').eq('id', producto_id).single();
    let nuevoStock = prod.stock;
    
    if (tipo === 'ingreso') nuevoStock = prod.stock - cantidadNum;
    else nuevoStock = prod.stock + cantidadNum; 

    await supabase.from('productos').update({ stock: nuevoStock }).eq('id', producto_id);
  }

  res.json({ mensaje: 'Ok', datos: data });
};

export const obtenerResumen = async (req, res) => {
  const { fecha } = req.query;
  const fechaBase = fecha ? new Date(fecha + 'T00:00:00') : new Date();
  const inicioDia = new Date(fechaBase); inicioDia.setHours(0,0,0,0);
  const finDia = new Date(fechaBase); finDia.setHours(23,59,59,999);

  const { data: movimientos } = await supabase.from('movimientos').select('*, productos(nombre)');
  const { data: inventario } = await supabase.from('productos').select('*').order('nombre');

  let ingresosDia = 0;
  let gastosDia = 0;
  let historialDia = [];

  let balanceGlobal = 0;

  if (movimientos) {
    movimientos.forEach(m => {
      const valor = parseFloat(m.monto);
      const fechaMov = new Date(m.creado_en);

      if (m.tipo === 'ingreso') balanceGlobal += valor;
      else balanceGlobal -= valor;

      if (fechaMov >= inicioDia && fechaMov <= finDia) {
        if (m.tipo === 'ingreso') ingresosDia += valor;
        else gastosDia += valor;
        historialDia.push(m);
      }
    });
  }

  res.json({
    balanceGlobal, 
    balanceDia: ingresosDia - gastosDia,
    ingresosDia,
    gastosDia,
    historial: historialDia.reverse(),
    inventario
  });
};

export const crearProducto = async (req, res) => {
  const { nombre, precio, stock } = req.body;
  const { data, error } = await supabase.from('productos').insert([{ nombre, precio, stock }]);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

export const actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, stock } = req.body;
  const { data, error } = await supabase.from('productos').update({ nombre, precio, stock }).eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ mensaje: "Actualizado" });
};

export const eliminarProducto = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ mensaje: "Producto archivado" });
};

export const reactivarProducto = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('productos').update({ activo: true }).eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ mensaje: "Producto reactivado" });
};