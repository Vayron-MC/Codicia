import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'; 
import Login from './Login'; 

const API_URL = 'https://codicia-production.up.railway.app/api/finanzas';

function App() {
  const [session, setSession] = useState(null);
  
  const [data, setData] = useState({ 
    balanceGlobal: 0, balanceDia: 0, ingresosDia: 0, gastosDia: 0, historial: [], inventario: [] 
  });
  
  const obtenerFechaHoyColombia = () => {
      const fecha = new Date();
      fecha.setHours(fecha.getHours() - 5); 
      return fecha.toISOString().split('T')[0];
  };

  const [fechaFiltro, setFechaFiltro] = useState(obtenerFechaHoyColombia());
  const [fondo, setFondo] = useState('');
  
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState('ingreso'); 
  const [prodId, setProdId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);

  const [carrito, setCarrito] = useState([]);

  const [busquedaVenta, setBusquedaVenta] = useState('');      
  const [busquedaInventario, setBusquedaInventario] = useState(''); 
  const [verEliminados, setVerEliminados] = useState(false); 

  const [verProdForm, setVerProdForm] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  const [prodEditId, setProdEditId] = useState(null);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', precio: '', stock: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const cargarDatos = () => {
    fetch(`${API_URL}?fecha=${fechaFiltro}`)
      .then(res => res.json())
      .then(d => setData(d))
      .catch(e => console.error(e));
  };

  useEffect(() => { if (session) cargarDatos(); }, [session, fechaFiltro]);

  const productosVenta = data.inventario.filter(p => {
    const texto = p.nombre.toLowerCase().includes(busquedaVenta.toLowerCase());
    const stock = tipo === 'ingreso' ? p.stock > 0 : true;
    return texto && stock && p.activo;
  });

  const inventarioFiltrado = data.inventario.filter(p => {
    const texto = p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase());
    return verEliminados ? (texto && !p.activo) : (texto && p.activo);
  });

  useEffect(() => {
    if (tipo === 'ingreso' && prodId) {
      const p = data.inventario.find(i => i.id == prodId);
      if (p) {
        setPrecioUnitario(p.precio);
        if (!descripcion && carrito.length === 0) setDescripcion(`Venta de ${p.nombre}`);
        setMonto(p.precio * cantidad);
        
        if (cantidad > p.stock) {
            setCantidad(p.stock);
            setMonto(p.precio * p.stock);
        }
      }
    } else if (tipo !== 'ingreso') { 
        setPrecioUnitario(0); 
    }
  }, [prodId, cantidad, tipo]); 

  useEffect(() => {
    setBusquedaVenta(''); setProdId(''); setDescripcion(''); setMonto(''); setCarrito([]); setCantidad(1);
  }, [tipo]);

  const cambiarCantidad = (e) => {
      let valor = parseInt(e.target.value);
      if (isNaN(valor) || valor < 1) valor = ''; 
      
      if (tipo === 'ingreso' && prodId) {
          const productoActual = data.inventario.find(p => p.id == prodId);
          if (productoActual && valor > productoActual.stock) {
              valor = productoActual.stock; 
          }
      }
      setCantidad(valor);
  };

  const agregarAlCarrito = () => {
      if (!prodId) return alert("Selecciona un producto primero.");
      const productoObj = data.inventario.find(p => p.id == prodId);
      
      if (cantidad > productoObj.stock) return alert(`No hay suficiente stock. Máx: ${productoObj.stock}`);

      const item = {
          id: Date.now(),
          producto_id: prodId,
          nombre: productoObj.nombre,
          cantidad: parseInt(cantidad),
          precioUnitario: precioUnitario,
          total: parseFloat(monto)
      };

      setCarrito([...carrito, item]);
      setProdId(''); setCantidad(1); setMonto(''); setBusquedaVenta(''); setDescripcion('');
  };

  const eliminarDelCarrito = (itemId) => {
      setCarrito(carrito.filter(item => item.id !== itemId));
  };

  const calcularTotalCarrito = () => {
      return carrito.reduce((acc, item) => acc + item.total, 0);
  };

  const obtenerFechaAjustadaParaEnvio = () => {
      const fecha = new Date();
      fecha.setHours(fecha.getHours() - 5); 
      return fecha.toISOString();
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();

    if (carrito.length > 0 && tipo === 'ingreso') {
        if(!confirm(`¿Cobrar $${calcularTotalCarrito().toLocaleString()} por ${carrito.length} productos?`)) return;

        for (const item of carrito) {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  descripcion: `Venta de ${item.nombre}`, 
                  monto: item.total, 
                  tipo: 'ingreso', 
                  cantidad: item.cantidad, 
                  producto_id: item.producto_id, 
                  fecha: obtenerFechaAjustadaParaEnvio(), 
                  usuario: session.user.email 
                })
            });
        }
        alert("✅ Venta registrada");
        setCarrito([]); cargarDatos();
        return;
    }

    if ((tipo === 'gasto_stock' || tipo === 'ingreso') && !prodId) return alert("⛔ Selecciona un producto.");

    if (tipo === 'ingreso' && prodId) {
        const prodCheck = data.inventario.find(p => p.id == prodId);
        if (prodCheck && cantidad > prodCheck.stock) return alert("Stock insuficiente.");
    }

    const tipoParaBD = (tipo === 'gasto_stock') ? 'gasto' : tipo;
    const prodFinal = (tipo === 'gasto') ? null : (prodId || null);
    
    let descripcionFinal = descripcion;
    if (tipo === 'gasto_stock' && prodId) {
        const prod = data.inventario.find(p => p.id == prodId);
        descripcionFinal = `Compra de ${prod.nombre}`;
    }

    const respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        descripcion: descripcionFinal, 
        monto: parseFloat(monto), 
        tipo: tipoParaBD, 
        cantidad: parseInt(cantidad), 
        producto_id: prodFinal, 
        fecha: obtenerFechaAjustadaParaEnvio(), 
        usuario: session.user.email 
      })
    });

    if (!respuesta.ok) return alert("Error al registrar");
    setDescripcion(''); setMonto(''); setProdId(''); setCantidad(1); setBusquedaVenta('');
    cargarDatos();
    alert("✅ Operación Registrada");
  };

  const procesarProducto = async () => {
    const url = esEdicion ? `${API_URL}/producto/${prodEditId}` : `${API_URL}/producto`;
    const method = esEdicion ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoProd) });
    setVerProdForm(false); setEsEdicion(false); setNuevoProd({ nombre: '', precio: '', stock: '' });
    cargarDatos();
  };

  const borrarProducto = async (id, nombre) => {
      if (window.confirm(`¿Borrar "${nombre}"?`)) await fetch(`${API_URL}/producto/${id}`, { method: 'DELETE' });
      cargarDatos();
  };

  const restaurarProducto = async (id, nombre) => {
      if (window.confirm(`¿Reactivar "${nombre}"?`)) {
          await fetch(`${API_URL}/producto/${id}/activar`, { method: 'PUT' });
          cargarDatos();
      }
  };

  const iniciarEdicion = (p) => {
    setNuevoProd({ nombre: p.nombre, precio: p.precio, stock: p.stock });
    setProdEditId(p.id); setEsEdicion(true); setVerProdForm(true);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (!session) return <Login setSession={setSession} />;

  return (
    <div className="min-h-screen p-6 transition-all" style={{ backgroundImage: fondo ? `url(${fondo})` : 'none', backgroundColor: '#f3f4f6', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className={`max-w-7xl mx-auto p-6 rounded-xl shadow-2xl ${fondo ? 'bg-black/90 text-white' : 'bg-white text-gray-800'}`}>
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4 gap-4">
          <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">CODICIA ERP</h1>
              <p className="text-xs opacity-60 flex items-center gap-1">👤 Operador: <span className="text-green-400 font-bold">{session.user.email}</span></p>
          </div>
          <div className="flex items-center gap-4 bg-gray-100/10 p-2 rounded-lg"><div className="text-right"><label className="text-[10px] uppercase block opacity-60 font-bold">📅 REPORTE DE:</label><input type="date" className="bg-transparent font-bold text-lg focus:outline-none cursor-pointer" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} /></div></div>
          <div className="flex flex-col items-end gap-1">
            <input type="text" placeholder="Pegar enlace de imagen..." className="bg-transparent border-b text-xs w-32" onChange={e => setFondo(e.target.value)} />
            <button onClick={cerrarSesion} className="text-red-500 text-xs font-bold hover:underline">CERRAR TURNO</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-800 text-white p-6 rounded-xl shadow-lg border border-indigo-400">
             <h3 className="opacity-80 text-xs font-bold uppercase tracking-widest">💰 CAJA GENERAL</h3><p className="text-3xl font-bold mt-1">${data.balanceGlobal?.toLocaleString()}</p>
          </div>
          <div className={`p-6 rounded-xl text-white shadow relative overflow-hidden ${data.balanceDia >= 0 ? 'bg-green-700' : 'bg-red-700'}`}>
            <h3 className="opacity-80 text-xs font-bold uppercase tracking-widest">BALANCE HOY</h3><p className="text-3xl font-bold mt-1">${data.balanceDia.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 text-white p-6 rounded-xl border-l-4 border-green-500"><h3 className="opacity-60 text-xs font-bold">INGRESOS HOY</h3> <p className="text-2xl text-green-400">+ ${data.ingresosDia.toLocaleString()}</p></div>
          <div className="bg-gray-800 text-white p-6 rounded-xl border-l-4 border-red-500"><h3 className="opacity-60 text-xs font-bold">GASTOS HOY</h3> <p className="text-2xl text-red-400">- ${data.gastosDia.toLocaleString()}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className={`lg:col-span-5 p-6 rounded-xl border ${fondo ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <h2 className="text-xl font-bold mb-4">📠 Operaciones</h2>
            <form onSubmit={guardarMovimiento} className="space-y-4">
              <div className="flex bg-gray-200 rounded p-1 gap-1">
                <button type="button" onClick={() => setTipo('ingreso')} className={`flex-1 py-1 rounded text-sm font-bold ${tipo === 'ingreso' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>VENTA</button>
                <button type="button" onClick={() => setTipo('gasto')} className={`flex-1 py-1 rounded text-sm font-bold ${tipo === 'gasto' ? 'bg-white shadow text-red-700' : 'text-gray-500'}`}>GASTO</button>
                <button type="button" onClick={() => setTipo('gasto_stock')} className={`flex-1 py-1 rounded text-sm font-bold ${tipo === 'gasto_stock' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>COMPRA</button>
              </div>

              {tipo === 'gasto' ? (
                <div className="animate-fadeIn space-y-4 p-4 border border-red-200 rounded bg-red-50/10">
                    <p className="text-xs text-red-500 font-bold text-center">📝 Gasto Operativo</p>
                    <input type="text" placeholder="Descripción..." className="w-full p-3 rounded text-black border" value={descripcion} onChange={e => setDescripcion(e.target.value)} required />
                    <input type="number" placeholder="Valor ($)" className="w-full p-3 rounded text-black border font-bold text-xl" value={monto} onChange={e => setMonto(e.target.value)} required />
                </div>
              ) : (
                <div className="animate-fadeIn space-y-3">
                    <div className="relative">
                        <label className="text-[10px] font-bold opacity-70">🔍 PRODUCTO:</label>
                        <input type="text" placeholder="Buscar..." className="w-full p-2 mb-1 rounded text-black border border-blue-300 focus:outline-none" value={busquedaVenta} onChange={e => setBusquedaVenta(e.target.value)} />
                    </div>
                    <div className="border rounded-lg max-h-48 overflow-y-auto bg-white shadow-inner">
                        {productosVenta.length === 0 ? (<div className="p-3 text-center text-sm text-gray-400">❌ No encontrado</div>) : (
                            productosVenta.map(p => (
                                <div key={p.id} onClick={() => setProdId(p.id)} className={`p-3 cursor-pointer border-b text-sm flex justify-between items-center transition-colors ${prodId == p.id ? 'bg-blue-100 border-l-4 border-blue-500 text-blue-800' : 'hover:bg-gray-50 text-gray-700'}`}>
                                    <div><span className="font-bold block">{p.nombre}</span><span className="text-xs opacity-70">{tipo === 'ingreso' ? `$${p.precio.toLocaleString()}` : `Existencia: ${p.stock}`}</span></div>
                                    {p.stock <= 5 && tipo === 'ingreso' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full">Pocos</span>}
                                </div>
                            ))
                        )}
                    </div>
                    
                    {prodId && <p className="text-xs text-center text-green-500 font-bold mt-1">✅ Seleccionado</p>}
                    
                    <div className="flex gap-2 mt-2">
                        <div className="w-24">
                            <label className="text-[10px] font-bold">CANT</label>
                            <input 
                                type="number" 
                                className="w-full p-2 rounded text-black border text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={cantidad} 
                                onChange={cambiarCantidad} 
                                min="1"
                            />
                        </div>
                        <div className="flex-1"><label className="text-[10px] font-bold">TOTAL ($)</label><input type="number" className="w-full p-2 rounded text-black border bg-gray-100 font-bold" value={monto} readOnly={tipo === 'ingreso'} onChange={e => setMonto(e.target.value)} /></div>
                    </div>
                    
                    {tipo === 'ingreso' && prodId && (
                        <button type="button" onClick={agregarAlCarrito} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded shadow mb-2">
                            🛒 AGREGAR A LA LISTA (+ ${parseFloat(monto || 0).toLocaleString()})
                        </button>
                    )}
                </div>
              )}

              {tipo === 'ingreso' && carrito.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mt-2">
                      <h4 className="text-xs font-bold text-gray-600 mb-2 border-b pb-1">🛒 CARRITO DE CLIENTE</h4>
                      <ul className="space-y-1 max-h-32 overflow-y-auto mb-2">
                          {carrito.map(item => (
                              <li key={item.id} className="flex justify-between text-sm text-gray-800 border-b border-gray-200 pb-1">
                                  <span><span className="font-bold">{item.cantidad}x</span> {item.nombre}</span>
                                  <div className="flex gap-2 items-center">
                                      <span className="font-bold">${item.total.toLocaleString()}</span>
                                      <button type="button" onClick={() => eliminarDelCarrito(item.id)} className="text-red-500 text-xs">❌</button>
                                  </div>
                              </li>
                          ))}
                      </ul>
                      <div className="flex justify-between items-center text-lg font-bold text-gray-800 mt-2">
                          <span>TOTAL A PAGAR:</span>
                          <span className="text-green-600">${calcularTotalCarrito().toLocaleString()}</span>
                      </div>
                  </div>
              )}

              <button type="submit" className={`w-full text-white font-bold py-4 rounded shadow-lg active:scale-95 transition-all ${tipo === 'ingreso' ? 'bg-green-600' : (tipo === 'gasto_stock' ? 'bg-blue-600' : 'bg-red-600')}`}>
                {tipo === 'ingreso' 
                    ? (carrito.length > 0 ? `COBRAR TODO ($${calcularTotalCarrito().toLocaleString()})` : 'COBRAR') 
                    : (tipo === 'gasto_stock' ? 'COMPRAR MERCANCÍA' : 'REGISTRAR')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className={`p-4 rounded-xl border flex-1 ${fondo ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col gap-2 mb-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold">📦 Mis Productos {verEliminados ? '(PAPELERA)' : ''}</h3>
                        <button onClick={() => {setEsEdicion(false); setNuevoProd({nombre:'',precio:'',stock:''}); setVerProdForm(!verProdForm);}} className="bg-purple-600 text-white px-3 py-1 rounded text-xs">+ CREAR</button>
                    </div>
                    <div className="flex gap-2 items-center">
                        <input type="text" placeholder="🔍 Buscar..." className="w-full p-2 text-sm rounded border bg-gray-50 text-black" value={busquedaInventario} onChange={e => setBusquedaInventario(e.target.value)} />
                        <label className="flex items-center gap-1 cursor-pointer text-xs bg-gray-200 p-2 rounded hover:bg-gray-300 text-black select-none"><input type="checkbox" checked={verEliminados} onChange={e => setVerEliminados(e.target.checked)} /><span>🗑️ Papelera</span></label>
                    </div>
                </div>

                {verProdForm && (<div className="mb-4 p-3 bg-purple-100 rounded text-black border border-purple-300"><div className="grid grid-cols-4 gap-2"><input placeholder="Nom" className="col-span-2 p-1 border rounded" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} /><input placeholder="$$" type="number" className="p-1 border rounded" value={nuevoProd.precio} onChange={e => setNuevoProd({...nuevoProd, precio: e.target.value})} /><input placeholder="#" type="number" className="p-1 border rounded" value={nuevoProd.stock} onChange={e => setNuevoProd({...nuevoProd, stock: e.target.value})} /></div><button onClick={procesarProducto} className="w-full mt-2 bg-purple-700 text-white font-bold py-1 rounded text-xs">{esEdicion ? 'ACTUALIZAR' : 'GUARDAR'}</button></div>)}
                
                <div className="overflow-auto max-h-56">
                    <table className="w-full text-sm"><thead className="opacity-60 text-xs border-b">
                        <tr><th>Producto</th><th>Precio</th><th>Existencias</th><th>Acciones</th></tr>
                    </thead>
                        <tbody>{inventarioFiltrado.map(p => (
                            <tr key={p.id} className="border-b border-gray-100">
                                <td className={`py-2 ${verEliminados ? 'line-through opacity-50' : ''}`}>{p.nombre}</td>
                                <td>${p.precio}</td>
                                <td className={`font-bold ${p.stock === 0 ? 'text-red-500' : ''}`}>{p.stock}</td>
                                <td className="flex gap-2 py-2">
                                    {verEliminados ? (
                                        <button onClick={() => restaurarProducto(p.id, p.nombre)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold hover:bg-green-200" title="Reactivar">♻️ Restaurar</button>
                                    ) : (
                                        <>
                                            <button onClick={() => iniciarEdicion(p)} className="text-blue-500" title="Editar">✏️</button>
                                            <button onClick={() => borrarProducto(p.id, p.nombre)} className="text-red-500" title="Eliminar">🗑️</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>

            <div className={`p-4 rounded-xl border flex-1 ${fondo ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className="font-bold mb-2">📅 Historial de Movimientos</h3>
                <div className="overflow-auto max-h-56">
                    <table className="w-full text-sm">
                        <thead className="opacity-60 text-xs border-b"><tr><th>Hora</th><th>User</th><th>Detalle</th><th>Monto</th></tr></thead>
                        <tbody>
                            {data.historial.length === 0 ? <tr><td colSpan="4" className="text-center py-4 opacity-50">Sin registros</td></tr> :
                            data.historial.map(m => (
                                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-500/5">
                                    <td className="py-2 text-xs opacity-60">{new Date(m.creado_en).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td className="text-xs font-bold text-blue-500" title={m.usuario}>{m.usuario ? m.usuario.split('@')[0] : 'Sis'}</td>
                                    <td className="text-xs">{m.descripcion}</td>
                                    <td className={`font-bold text-right ${m.tipo === 'ingreso' ? 'text-green-500' : 'text-red-500'}`}>${parseFloat(m.monto).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App