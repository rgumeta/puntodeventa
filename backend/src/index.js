import express from 'express';
import cors from 'cors';
import pg from 'pg';
const { Pool } = pg;
const app = express();
app.use(cors());
app.use(express.json());
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/api/inventario', async (req,res)=>{
  try{
    const q = req.query.q || '';
    const { rows } = await pool.query("SELECT * FROM productos WHERE nombre ILIKE $1 LIMIT 50", ['%'+q+'%']);
    res.json(rows);
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/check', async (req,res)=>{ res.json({alerta:'ACTIVA'}); });

// NUEVO - ESTO HACE QUE COBRAR DESCUENTE STOCK REAL
app.post('/api/ventas', async (req, res) => {
  const client = await pool.connect();
  try {
    const { total, productos, pago_con, cambio, forma_pago } = req.body;
    await client.query('BEGIN');

    // Generar folio único
    const folio = 'VTA-' + Date.now().toString().slice(-6);

    const venta = await client.query(
      'INSERT INTO ventas(folio, total, pago_con, cambio, forma_pago) VALUES($1,$2,$3,$4,$5) RETURNING id, folio',
      [folio, total, pago_con || total, cambio || 0, forma_pago || 'efectivo']
    );
    const ventaId = venta.rows[0].id;
    const folioReal = venta.rows[0].folio;

    for (const p of productos) {
      const precio = p.precio || p.precio_venta;
      const sub = p.cantidad * precio;
      // Guardamos en las 3 columnas para compatibilidad
      await client.query(
        'INSERT INTO venta_detalle(venta_id, producto_id, cantidad, precio_unitario, precio, subtotal) VALUES($1,$2,$3,$4,$5,$6)',
        [ventaId, p.id, p.cantidad, precio, precio, sub]
      );
      await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [p.cantidad, p.id]);
    }
    await client.query('COMMIT');
    res.json({ id: ventaId, folio: folioReal });
  } catch (e) {
    await client.query('ROLLBACK');
    console.log(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.listen(3000, ()=> console.log('API 3000 lista CON VENTAS'));