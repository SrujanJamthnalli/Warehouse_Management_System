const API = '/api'; // single-server

// --- helpers ---
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

function toast(msg, type='success') {
  const wrap = $('#toast');
  if (!wrap) return alert(msg);
  wrap.classList.remove('hidden');
  const n = document.createElement('div');
  n.className = `mb-2 rounded-xl shadow border px-4 py-3 bg-white ${type==='error'?'border-red-300':'border-green-300'}`;
  n.textContent = msg;
  wrap.appendChild(n);
  setTimeout(()=>{ n.remove(); if (!wrap.children.length) wrap.classList.add('hidden'); }, 2500);
}
function modal(contentHTML) {
  const root = document.createElement('div');
  root.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  root.innerHTML = `<div class="bg-white w-full max-w-2xl rounded-2xl shadow-xl border overflow-hidden">${contentHTML}</div>`;
  $('body').appendChild(root);
  const backdrop = $('#modal-backdrop');
  if (backdrop) backdrop.classList.remove('hidden');
  const close = ()=>{ root.remove(); if (backdrop) backdrop.classList.add('hidden'); };
  return { root, close };
}

// mobile + tabs
$('#mobile-menu')?.addEventListener('click', ()=>{
  const aside = document.querySelector('aside');
  aside.classList.toggle('hidden'); aside.classList.toggle('md:flex');
});
function activateTab(name) {
  $$('#sidebar-nav .nav-btn').forEach(b => b.classList.remove('bg-brand-50','text-brand-700'));
  $(`#sidebar-nav .nav-btn[data-tab="${name}"]`)?.classList.add('bg-brand-50','text-brand-700');
  $$('.tab').forEach(t => t.classList.add('hidden'));
  $(`#tab-${name}`)?.classList.remove('hidden');
  $('#page-title') && ($('#page-title').textContent = name[0].toUpperCase()+name.slice(1));
}
$$('#sidebar-nav .nav-btn').forEach(btn => btn.addEventListener('click', ()=>activateTab(btn.dataset.tab)));

// fetch utils
async function getJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function sendJSON(url, method, body){ const r = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

// loaders
async function loadProducts() {
  const data = await getJSON(`${API}/products`);
  const tbody = $('#tbl-products'); if (!tbody) return;
  const q = ($('#search-products')?.value || '').toLowerCase();
  const rows = data.filter(p => JSON.stringify(p).toLowerCase().includes(q));
  tbody.innerHTML = rows.map(p => `
    <tr class="hover:bg-gray-50">
      <td class="py-2 px-3 font-mono">${p.Product_id}</td>
      <td class="py-2 px-3">${p.name}</td>
      <td class="py-2 px-3">${p.quantity_on_hand}</td>
      <td class="py-2 px-3">${p.Warehouse_Location||''}</td>
      <td class="py-2 px-3">${p.Description||''}</td>
    </tr>
  `).join('');

  // KPIs & low stock
  $('#card-total-products') && ($('#card-total-products').textContent = data.length);
  $('#card-total-qty') && ($('#card-total-qty').textContent = data.reduce((a,b)=>a+(b.quantity_on_hand||0),0));
  const low = data.filter(p => (p.quantity_on_hand||0) <= 5).sort((a,b)=>a.quantity_on_hand-b.quantity_on_hand).slice(0,10);
  $('#tbl-lowstock') && ($('#tbl-lowstock').innerHTML = low.map(p=>`
    <tr><td class="py-2">${p.name} <span class="text-gray-400">(${p.Product_id})</span></td>
    <td class="py-2">${p.quantity_on_hand}</td><td class="py-2">${p.Warehouse_Location||''}</td></tr>
  `).join(''));

  // net prices
  if ($('#tbl-netprices')) {
    const net = await getJSON(`${API}/products/net-prices`);
    $('#tbl-netprices').innerHTML = net.map(r => `
      <tr class="hover:bg-gray-50"><td class="py-2">${r.name} <span class="text-gray-400">(${r.Product_id})</span></td>
      <td class="py-2">₹${Number(r.Unit_price).toFixed(2)}</td>
      <td class="py-2 font-semibold">₹${Number(r.Net_Price).toFixed(2)}</td></tr>
    `).join('');
  }
}
async function loadSuppliers(){
  const sup = await getJSON(`${API}/suppliers`);
  if ($('#tbl-suppliers')) {
    $('#tbl-suppliers').innerHTML = sup.map(s=>`
      <tr class="hover:bg-gray-50">
        <td class="py-2 px-3 font-mono">${s.Supplier_id}</td>
        <td class="py-2 px-3">${s.name}</td>
        <td class="py-2 px-3">${s.Contact_person||''}</td>
        <td class="py-2 px-3">${s.Bank_Account_No||''}</td>
        <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-xs ${s.Supplier_Status==='Active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}">${s.Supplier_Status}</span></td>
      </tr>
    `).join('');
  }
  $('#card-total-sup') && ($('#card-total-sup').textContent = sup.length);
}
async function loadPOs(){
  const pos = await getJSON(`${API}/purchase-orders`);
  if ($('#tbl-pos')) {
    $('#tbl-pos').innerHTML = pos.map(po=>`
      <tr class="hover:bg-gray-50">
        <td class="py-2 px-3 font-mono">${po.po_id}</td>
        <td class="py-2 px-3">${po.Supplier_Name}</td>
        <td class="py-2 px-3">${po.order_date?po.order_date.slice(0,10):''}</td>
        <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-xs ${po.Status==='Received'?'bg-green-100 text-green-700':po.Status==='Pending'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-700'}">${po.Status}</span></td>
        <td class="py-2 px-3">${po.Expected_delivery_date?po.Expected_delivery_date.slice(0,10):''}</td>
        <td class="py-2 px-3"><button data-action="mark-received" data-id="${po.po_id}" class="px-3 py-1 rounded-lg border hover:bg-gray-50">Mark Received</button></td>
      </tr>
    `).join('');
  }
  $('#card-open-pos') && ($('#card-open-pos').textContent = pos.filter(p=>p.Status!=='Received').length);
  if ($('#tbl-recent-pos')) {
    $('#tbl-recent-pos').innerHTML = pos.slice(0,8).map(po=>`
      <tr><td class="py-2">${po.po_id}</td><td class="py-2">${po.Supplier_Name}</td><td class="py-2">${po.order_date?po.order_date.slice(0,10):''}</td><td class="py-2">${po.Status}</td></tr>
    `).join('');
  }
}
async function loadSales(){
  const sales = await getJSON(`${API}/sales`);
  if ($('#tbl-sales')) {
    $('#tbl-sales').innerHTML = sales.map(s=>`
      <tr class="hover:bg-gray-50">
        <td class="py-2 px-3 font-mono">${s.So_id}</td>
        <td class="py-2 px-3">${s.Customer_name}</td>
        <td class="py-2 px-3">${s.order_date?s.order_date.slice(0,10):''}</td>
        <td class="py-2 px-3">${s.Status}</td>
        <td class="py-2 px-3">${s.Total_amount??''}</td>
      </tr>
    `).join('');
  }
}

// actions & hooks
$('#search-products')?.addEventListener('input', loadProducts);
$('#btn-refresh-pos')?.addEventListener('click', loadPOs);

$('#tab-pos')?.addEventListener('click', async (e)=>{
  if (e.target.dataset.action === 'mark-received') {
    try {
      await sendJSON(`${API}/purchase-orders/${e.target.dataset.id}/status`, 'PATCH', { Status: 'Received' });
      toast('PO marked as received');
      await Promise.all([loadPOs(), loadProducts()]);
    } catch (err) { toast(err.message, 'error'); }
  }
});

// modals
$('#open-add-product')?.addEventListener('click', ()=>{
  const m = modal(`
    <div class="p-4 border-b flex items-center justify-between">
      <h3 class="font-semibold">Add Product</h3>
      <button id="x" class="p-2 hover:bg-gray-100 rounded-lg"><span class="material-symbols-outlined">close</span></button>
    </div>
    <form id="f" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label>Product ID<input name="Product_id" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Name<input name="name" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Qty<input name="quantity_on_hand" type="number" min="0" value="0" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Location<input name="Warehouse_Location" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label class="md:col-span-2">Description<input name="Description" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <div class="md:col-span-2 text-right"><button class="px-4 py-2 bg-brand-600 text-white rounded-lg">Save</button></div>
    </form>
  `);
  $('#x', m.root).addEventListener('click', m.close);
  $('#f', m.root).addEventListener('submit', async (e)=>{
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.quantity_on_hand = Number(body.quantity_on_hand||0);
    try { await sendJSON(`${API}/products`, 'POST', body); m.close(); toast('Product added'); await Promise.all([loadProducts(), loadPOs(), loadSales()]); }
    catch(err){ toast(err.message,'error'); }
  });
});
$('#open-add-pricing')?.addEventListener('click', async ()=>{
  const products = await getJSON(`${API}/products`);
  const m = modal(`
    <div class="p-4 border-b flex items-center justify-between"><h3 class="font-semibold">Add Pricing</h3><button id="x" class="p-2 hover:bg-gray-100 rounded-lg"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label>Product<select name="Product_id" class="mt-1 w-full px-3 py-2 border rounded-lg">${products.map(p=>`<option value="${p.Product_id}">${p.Product_id} — ${p.name}</option>`).join('')}</select></label>
      <label>Unit Price<input name="Unit_price" type="number" step="0.01" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Discount (0-1)<input name="discount" type="number" step="0.01" value="0" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Tax (0-1)<input name="tax" type="number" step="0.01" value="0" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <div class="md:col-span-2 text-right"><button class="px-4 py-2 bg-gray-900 text-white rounded-lg">Save</button></div>
    </form>
  `);
  $('#x', m.root).addEventListener('click', m.close);
  $('#f', m.root).addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.Unit_price = Number(body.Unit_price); body.discount = Number(body.discount||0); body.tax = Number(body.tax||0);
    try { await sendJSON(`${API}/product-pricing`, 'POST', body); m.close(); toast('Pricing added'); await loadProducts(); }
    catch(err){ toast(err.message,'error'); }
  });
});
$('#open-add-supplier')?.addEventListener('click', ()=>{
  const m = modal(`
    <div class="p-4 border-b flex items-center justify-between"><h3 class="font-semibold">Add Supplier</h3><button id="x" class="p-2 hover:bg-gray-100 rounded-lg"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label>Supplier ID<input name="Supplier_id" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Name<input name="name" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Contact Person<input name="Contact_person" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Bank Account No<input name="Bank_Account_No" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label class="md:col-span-2">Status<input name="Supplier_Status" value="Active" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <div class="md:col-span-2 text-right"><button class="px-4 py-2 bg-brand-600 text-white rounded-lg">Save</button></div>
    </form>
  `);
  $('#x', m.root).addEventListener('click', m.close);
  $('#f', m.root).addEventListener('submit', async (e)=>{
    e.preventDefault();
    try { await sendJSON(`${API}/suppliers`, 'POST', Object.fromEntries(new FormData(e.target).entries())); m.close(); toast('Supplier added'); await loadSuppliers(); }
    catch(err){ toast(err.message,'error'); }
  });
});
$('#open-create-po')?.addEventListener('click', async ()=>{
  const sup = await getJSON(`${API}/suppliers`);
  const m = modal(`
    <div class="p-4 border-b flex items-center justify-between"><h3 class="font-semibold">Create Purchase Order</h3><button id="x" class="p-2 hover:bg-gray-100 rounded-lg"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label>PO ID<input name="po_id" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Supplier<select name="Supplier_id" class="mt-1 w-full px-3 py-2 border rounded-lg">${sup.map(s=>`<option value="${s.Supplier_id}">${s.Supplier_id} — ${s.name}</option>`).join('')}</select></label>
      <label>Order Date<input name="order_date" type="date" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Expected Delivery<input name="Expected_delivery_date" type="date" class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <div class="md:col-span-2 text-right"><button class="px-4 py-2 bg-brand-600 text-white rounded-lg">Create</button></div>
    </form>
  `);
  $('#x', m.root).addEventListener('click', m.close);
  $('#f', m.root).addEventListener('submit', async (e)=>{
    e.preventDefault();
    try { await sendJSON(`${API}/purchase-orders`, 'POST', Object.fromEntries(new FormData(e.target).entries())); m.close(); toast('PO created'); await loadPOs(); }
    catch(err){ toast(err.message,'error'); }
  });
});
$('#open-add-po-item')?.addEventListener('click', async ()=>{
  const pos = await getJSON(`${API}/purchase-orders`);
  const prods = await getJSON(`${API}/products`);
  const m = modal(`
    <div class="p-4 border-b flex items-center justify-between"><h3 class="font-semibold">Add PO Item</h3><button id="x" class="p-2 hover:bg-gray-100 rounded-lg"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label>PO<select name="po_id" class="mt-1 w-full px-3 py-2 border rounded-lg">${pos.map(p=>`<option value="${p.po_id}">${p.po_id}</option>`).join('')}</select></label>
      <label>Product<select name="Product_id" class="mt-1 w-full px-3 py-2 border rounded-lg">${prods.map(p=>`<option value="${p.Product_id}">${p.Product_id} — ${p.name}</option>`).join('')}</select></label>
      <label class="md:col-span-2">Quantity<input name="quantity" type="number" min="1" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <div class="md:col-span-2 text-right"><button class="px-4 py-2 bg-gray-900 text-white rounded-lg">Add</button></div>
    </form>
  `);
  $('#x', m.root).addEventListener('click', m.close);
  $('#f', m.root).addEventListener('submit', async (e)=>{
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.quantity = Number(body.quantity);
    try { await sendJSON(`${API}/purchase-order-items`, 'POST', body); m.close(); toast('PO item added'); }
    catch(err){ toast(err.message,'error'); }
  });
});
$('#open-process-sale')?.addEventListener('click', async ()=>{
  const products = await getJSON(`${API}/products`);
  const m = modal(`
    <div class="p-4 border-b flex items-center justify-between"><h3 class="font-semibold">Process Sale</h3><button id="x" class="p-2 hover:bg-gray-100 rounded-lg"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label>SO ID<input name="So_id" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Customer<input name="Customer_name" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label>Product<select name="Product_id" class="mt-1 w-full px-3 py-2 border rounded-lg">${products.map(p=>`<option value="${p.Product_id}">${p.Product_id} — ${p.name}</option>`).join('')}</select></label>
      <label>Quantity<input name="Quantity" type="number" min="1" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <label class="md:col-span-2">Unit Price<input name="Unit_Price" type="number" step="0.01" required class="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
      <div class="md:col-span-2 text-right"><button class="px-4 py-2 bg-brand-600 text-white rounded-lg">Process</button></div>
    </form>
  `);
  $('#x', m.root).addEventListener('click', m.close);
  $('#f', m.root).addEventListener('submit', async (e)=>{
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    body.Quantity = Number(body.Quantity); body.Unit_Price = Number(body.Unit_Price);
    try { await sendJSON(`${API}/sales/process`, 'POST', body); m.close(); toast('Sale processed'); await Promise.all([loadSales(), loadProducts()]); }
    catch(err){ toast(err.message,'error'); }
  });
});

// init
$('#search-products')?.addEventListener('input', loadProducts);
$('#btn-refresh-pos')?.addEventListener('click', loadPOs);

(async function init(){
  try {
    await Promise.all([loadProducts(), loadSuppliers(), loadPOs(), loadSales()]);
    activateTab('products'); // start on Products if you like; use 'dashboard' to default there
  } catch (e) {
    console.error(e); toast('Backend not reachable', 'error');
  }
})();
