
import { useState } from "react"

export default function App(){
  const [q,setQ]=useState("")
  const [productos,setProductos]=useState([])
  const [carrito,setCarrito]=useState([])

  const precioNum = (p) => {
    const v = p.precio_venta ?? p.precio ?? 0
    return Number(String(v).replace('$','')) || 0
  }

  const buscar = async () => {
    const r = await fetch('/api/inventario?q='+encodeURIComponent(q))
    setProductos(await r.json())
  }

  const agregar = (p) => {
    const precio = precioNum(p)
    setCarrito(prev=>{
      const i = prev.findIndex(x=>x.id===p.id)
      if(i>=0){
        const c=[...prev]
        c[i]={...c[i], cantidad:c[i].cantidad+1}
        return c
      }
      return [...prev,{id:p.id,nombre:p.nombre,precio,cantidad:1}]
    })
  }

  const unidades = carrito.reduce((s,c)=>s+c.cantidad,0)
  const total = carrito.reduce((s,c)=>s+Number(c.precio)*Number(c.cantidad),0)

  const cobrar = async()=>{
    if(!unidades) return
    const r=await fetch('/api/ventas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({total,productos:carrito,pago_con:total,cambio:0,forma_pago:'efectivo'})})
    const d=await r.json()
    if(r.ok){alert('Cobrado $'+total.toFixed(2)+' Folio:'+d.folio); setCarrito([])} else alert(d.error)
  }

  return(
    <div style={{display:'flex',gap:20,padding:20,fontFamily:'Arial'}}>
      <div style={{flex:1}}>
        <h2>Farmacia - Punto de Venta</h2>
        <div style={{display:'flex',gap:10}}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&buscar()} placeholder="Buscar..." style={{flex:1,padding:10}}/>
          <button onClick={buscar}>Buscar</button>
        </div>
        {productos.map(p=>(
          <div key={p.id} onClick={()=>agregar(p)} style={{border:'1px solid #ddd',padding:12,marginTop:10,borderRadius:8,cursor:'pointer'}}>
            <b>{p.nombre}</b><div>Stock: {p.stock}</div><div style={{color:'green'}}>Precio por unidad: $ {precioNum(p).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div style={{width:340,borderLeft:'1px solid #ddd',paddingLeft:20}}>
        <h3>Carrito ( {unidades} unidades)</h3>
        {carrito.map(c=>(
          <div key={c.id} style={{background:'#f9f9f9',padding:12,marginBottom:10,borderRadius:8}}>
            <b>{c.nombre}</b>
            <div style={{margin:'4px 0'}}>$ {c.precio.toFixed(2)} c/u x {c.cantidad} = <b>$ {(c.precio*c.cantidad).toFixed(2)}</b></div>
            
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}>
              <button onClick={()=>setCarrito(prev=>prev.map(x=>x.id===c.id?{...x,cantidad:Math.max(1,x.cantidad-1)}:x))} style={{width:32,height:32,borderRadius:6,border:'1px solid #ccc',cursor:'pointer',fontWeight:'bold'}}>-</button>
              <span style={{minWidth:20,textAlign:'center',fontWeight:'bold'}}>{c.cantidad}</span>
              <button onClick={()=>setCarrito(prev=>prev.map(x=>x.id===c.id?{...x,cantidad:x.cantidad+1}:x))} style={{width:32,height:32,borderRadius:6,border:'1px solid #ccc',cursor:'pointer',fontWeight:'bold'}}>+</button>
              <button onClick={()=>setCarrito(prev=>prev.filter(x=>x.id!==c.id))} style={{marginLeft:'auto',border:0,background:'none',color:'red',cursor:'pointer',fontSize:12}}>Quitar</button>
            </div>
          </div>
        ))}
        <div>Unidades totales: <b>{unidades}</b></div>
        <div>Total a cobrar: <b>$ {total.toFixed(2)}</b></div>
        <button onClick={cobrar} style={{width:'100%',background:'#16a34a',color:'white',padding:15,border:0,borderRadius:10,fontWeight:'bold',fontSize:18,marginTop:10}}>COBRAR $ {total.toFixed(2)}</button>
        <div onClick={()=>setCarrito([])} style={{textAlign:'center',marginTop:10,cursor:'pointer',fontSize:13}}>Limpiar carrito</div>
      </div>
    </div>
  )
}