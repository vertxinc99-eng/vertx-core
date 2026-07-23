const MATERIALS = [
  {id:'frame405',name:'建枠 405',category:'建枠',weight:8.4},
  {id:'frame610',name:'建枠 610',category:'建枠',weight:9.6},
  {id:'frame914',name:'建枠 914',category:'建枠',weight:11.2},
  {id:'anti1829',name:'アンチ 1829',category:'アンチ',weight:13.2},
  {id:'anti1524',name:'アンチ 1524',category:'アンチ',weight:11.4},
  {id:'jack',name:'ジャッキベース',category:'ジャッキ',weight:4.2},
  {id:'handrail1829',name:'手摺 1829',category:'手摺',weight:4.4},
  {id:'brace1829',name:'筋交 1829',category:'筋交',weight:5.7}
];

const state = {cart:{},category:'すべて',search:''};
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];

function go(screenId){
  $$('.screen').forEach(el=>el.classList.toggle('active',el.id===screenId));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.go===screenId || (screenId==='confirm'&&el.dataset.go==='order')));
  if(screenId==='history') renderHistory();
  if(screenId==='confirm') renderConfirm();
  window.scrollTo({top:0,behavior:'instant'});
}

function totals(){
  return MATERIALS.reduce((a,m)=>{const q=state.cart[m.id]||0;a.qty+=q;a.weight+=q*m.weight;return a},{qty:0,weight:0});
}

function renderCategories(){
  const cats=['すべて',...new Set(MATERIALS.map(m=>m.category))];
  $('#categoryChips').innerHTML=cats.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${c}">${c}</button>`).join('');
  $$('#categoryChips .chip').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;renderCategories();renderMaterials();}));
}

function renderMaterials(){
  const q=state.search.trim().toLowerCase();
  const list=MATERIALS.filter(m=>(state.category==='すべて'||m.category===state.category)&&m.name.toLowerCase().includes(q));
  $('#materialList').innerHTML=list.length?list.map(m=>`<article class="material">
    <div class="material-info"><b>${m.name}</b><small>${m.category}・${m.weight.toFixed(1)}kg/個</small></div>
    <div class="stepper"><button data-action="minus" data-id="${m.id}" aria-label="${m.name}を減らす">−</button><output>${state.cart[m.id]||0}</output><button data-action="plus" data-id="${m.id}" aria-label="${m.name}を増やす">＋</button></div>
  </article>`).join(''):`<div class="card empty">該当する資材がありません</div>`;
  $$('#materialList button').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.id,b.dataset.action==='plus'?1:-1)));
  renderOrderTotals();
}

function changeQty(id,delta){state.cart[id]=Math.max(0,(state.cart[id]||0)+delta);renderMaterials();}
function renderOrderTotals(){const t=totals();$('#totalQty').textContent=t.qty;$('#totalWeight').textContent=t.weight.toFixed(1);$('#toConfirmBtn').disabled=t.qty===0;}

function selectedItems(){return MATERIALS.filter(m=>(state.cart[m.id]||0)>0).map(m=>({...m,qty:state.cart[m.id]}));}
function renderConfirm(){
  const items=selectedItems(),t=totals();
  $('#confirmItems').innerHTML=items.map(i=>`<div class="confirm-row"><span>${i.name}</span><strong>${i.qty}個</strong></div>`).join('')||'<div class="empty">資材が選択されていません</div>';
  $('#confirmQty').textContent=`${t.qty}点`;$('#confirmWeight').textContent=`${t.weight.toFixed(1)}kg`;
}

function getHistory(){try{return JSON.parse(localStorage.getItem('vertx_core_orders')||'[]')}catch{return []}}
function saveHistory(v){localStorage.setItem('vertx_core_orders',JSON.stringify(v));updateDashboard();}
function submitOrder(){
  const items=selectedItems(),t=totals();
  if(!items.length){toast('資材を選択してください');go('order');return}
  const order={id:Date.now(),site:$('#siteName').value.trim()||'現場名未入力',date:$('#deliveryDate').value||'',memo:$('#orderMemo').value.trim(),createdAt:new Date().toISOString(),items,qty:t.qty,weight:t.weight};
  const history=getHistory();history.unshift(order);saveHistory(history);
  state.cart={};$('#siteName').value='';$('#orderMemo').value='';renderMaterials();go('success');
}

function renderHistory(){
  const history=getHistory();
  $('#historyList').innerHTML=history.length?history.map(o=>`<article class="card history-card">
    <header><div><h3>${escapeHtml(o.site)}</h3><div class="history-meta">${formatDate(o.createdAt)}${o.date?`・希望 ${escapeHtml(o.date)}`:''}</div></div><span class="badge">${o.qty}点</span></header>
    <div class="history-item-row"><span>推定重量</span><strong>${Number(o.weight).toFixed(1)}kg</strong></div>
    <div class="history-actions"><button data-reorder="${o.id}">再注文</button><button data-delete="${o.id}">削除</button></div>
  </article>`).join(''):'<div class="card empty">まだ注文履歴がありません</div>';
  $$('[data-reorder]').forEach(b=>b.addEventListener('click',()=>reorder(Number(b.dataset.reorder))));
  $$('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteOrder(Number(b.dataset.delete))));
}
function reorder(id){const o=getHistory().find(x=>x.id===id);if(!o)return;state.cart={};o.items.forEach(i=>state.cart[i.id]=i.qty);renderMaterials();go('order');toast('注文内容を復元しました');}
function deleteOrder(id){if(!confirm('この履歴を削除しますか？'))return;saveHistory(getHistory().filter(x=>x.id!==id));renderHistory();}
function updateDashboard(){const h=getHistory(),today=new Date().toDateString();$('#historyCount').textContent=h.length;$('#todayCount').textContent=h.filter(o=>new Date(o.createdAt).toDateString()===today).length;}
function formatDate(v){return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}

$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
$('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderMaterials()});
$('#toConfirmBtn').addEventListener('click',()=>go('confirm'));
$('#submitOrderBtn').addEventListener('click',submitOrder);
$('#resetBtn').addEventListener('click',()=>{if(confirm('注文履歴と選択中の数量をすべて初期化しますか？')){localStorage.removeItem('vertx_core_orders');state.cart={};renderMaterials();updateDashboard();toast('初期化しました')}});

(function init(){
  const d=new Date();d.setDate(d.getDate()+1);$('#deliveryDate').value=d.toISOString().slice(0,10);
  renderCategories();renderMaterials();updateDashboard();go('home');
})();
