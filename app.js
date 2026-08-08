const MATERIALS = [
  // 枠組
  {id:'frame405',name:'建枠 405',category:'建枠',weight:8.4,unit:'枚'},
  {id:'frame610',name:'建枠 610',category:'建枠',weight:9.6,unit:'枚'},
  {id:'frame914',name:'建枠 914',category:'建枠',weight:11.2,unit:'枚'},
  {id:'frame1219',name:'建枠 1219',category:'建枠',weight:12.8,unit:'枚'},
  {id:'frame1524',name:'建枠 1524',category:'建枠',weight:14.6,unit:'枚'},
  {id:'frame1829',name:'建枠 1829',category:'建枠',weight:16.2,unit:'枚'},

  // アンチ・布板
  {id:'anti610',name:'アンチ 610',category:'アンチ・布板',weight:4.8,unit:'枚'},
  {id:'anti914',name:'アンチ 914',category:'アンチ・布板',weight:6.8,unit:'枚'},
  {id:'anti1219',name:'アンチ 1219',category:'アンチ・布板',weight:8.0,unit:'枚'},
  {id:'anti1524',name:'アンチ 1524',category:'アンチ・布板',weight:10.0,unit:'枚'},
  {id:'anti1829',name:'アンチ 1829',category:'アンチ・布板',weight:11.5,unit:'枚'},
  {id:'steel240_2m',name:'2板（鋼製足場板 2m）',category:'アンチ・布板',weight:7.2,unit:'枚',aliases:'2板 2m板 足場板'},
  {id:'steel240_4m',name:'4板（鋼製足場板 4m）',category:'アンチ・布板',weight:14.4,unit:'枚',aliases:'4板 4m板 足場板'},
  {id:'steel500',name:'鋼製布板 500',category:'アンチ・布板',weight:8.0,unit:'枚'},

  // 筋交・手摺
  {id:'brace610',name:'筋交 610',category:'筋交・手摺',weight:2.8,unit:'本'},
  {id:'brace914',name:'筋交 914',category:'筋交・手摺',weight:3.4,unit:'本'},
  {id:'brace1219',name:'筋交 1219',category:'筋交・手摺',weight:4.1,unit:'本'},
  {id:'brace1524',name:'筋交 1524',category:'筋交・手摺',weight:4.9,unit:'本'},
  {id:'brace1829',name:'筋交 1829',category:'筋交・手摺',weight:5.7,unit:'本'},
  {id:'handrail610',name:'手摺 610',category:'筋交・手摺',weight:1.8,unit:'本'},
  {id:'handrail914',name:'手摺 914',category:'筋交・手摺',weight:2.4,unit:'本'},
  {id:'handrail1219',name:'手摺 1219',category:'筋交・手摺',weight:3.0,unit:'本'},
  {id:'handrail1524',name:'手摺 1524',category:'筋交・手摺',weight:3.7,unit:'本'},
  {id:'handrail1829',name:'手摺 1829',category:'筋交・手摺',weight:4.4,unit:'本'},
  {id:'lowerRail',name:'下さん',category:'筋交・手摺',weight:2.5,unit:'本',aliases:'下桟 したさん'},
  {id:'topPipe',name:'頭つなぎパイプ',category:'筋交・手摺',weight:5.5,unit:'本'},

  // ジャッキ・ベース
  {id:'jackBase',name:'ジャッキベース',category:'ジャッキ・ベース',weight:4.2,unit:'個'},
  {id:'fixedBase',name:'固定ベース',category:'ジャッキ・ベース',weight:1.5,unit:'個'},
  {id:'basePlate',name:'ベースプレート',category:'ジャッキ・ベース',weight:1.0,unit:'枚'},
  {id:'uHeadJack',name:'Uヘッドジャッキ',category:'ジャッキ・ベース',weight:5.5,unit:'個'},

  // 単管
  {id:'pipe1m',name:'単管パイプ 1m',category:'単管',weight:2.7,unit:'本'},
  {id:'pipe1_5m',name:'単管パイプ 1.5m',category:'単管',weight:4.1,unit:'本'},
  {id:'pipe2m',name:'単管パイプ 2m',category:'単管',weight:5.5,unit:'本',aliases:'2mパイプ'},
  {id:'pipe2_5m',name:'単管パイプ 2.5m',category:'単管',weight:6.8,unit:'本'},
  {id:'pipe3m',name:'単管パイプ 3m',category:'単管',weight:8.2,unit:'本'},
  {id:'pipe4m',name:'単管パイプ 4m',category:'単管',weight:10.9,unit:'本',aliases:'4mパイプ'},
  {id:'pipe5m',name:'単管パイプ 5m',category:'単管',weight:13.6,unit:'本'},
  {id:'pipe6m',name:'単管パイプ 6m',category:'単管',weight:16.4,unit:'本'},
  {id:'kanzashiPipe',name:'かんざしパイプ',category:'単管',weight:5.5,unit:'本'},
  {id:'negaramiPipe',name:'根がらみ単管',category:'単管',weight:5.5,unit:'本'},

  // クランプ・金物
  {id:'fixedClamp',name:'直交クランプ',category:'クランプ・金物',weight:0.7,unit:'個'},
  {id:'swivelClamp',name:'自在クランプ',category:'クランプ・金物',weight:0.7,unit:'個'},
  {id:'tripleClamp',name:'三つ爪クランプ',category:'クランプ・金物',weight:1.0,unit:'個'},
  {id:'oniClamp',name:'鬼クラ',category:'クランプ・金物',weight:0.9,unit:'個',aliases:'鬼クランプ'},
  {id:'joint',name:'単管ジョイント',category:'クランプ・金物',weight:0.6,unit:'個'},
  {id:'stopper',name:'ストッパー',category:'クランプ・金物',weight:1.2,unit:'本'},
  {id:'hagoita',name:'羽子板',category:'クランプ・金物',weight:2.0,unit:'個'},
  {id:'wallTie',name:'壁つなぎ',category:'クランプ・金物',weight:1.8,unit:'本'},
  {id:'anchor',name:'壁つなぎアンカー',category:'クランプ・金物',weight:0.3,unit:'本'},

  // ブラケット・張出し
  {id:'bracket250',name:'ブラケット 250',category:'ブラケット',weight:3.5,unit:'個'},
  {id:'bracket350',name:'ブラケット 350',category:'ブラケット',weight:4.3,unit:'個'},
  {id:'bracket500',name:'ブラケット 500',category:'ブラケット',weight:5.2,unit:'個'},
  {id:'bracket650',name:'ブラケット 650',category:'ブラケット',weight:6.0,unit:'個'},
  {id:'bracket',name:'ブラケット（標準）',category:'ブラケット',weight:6.0,unit:'個'},

  // 階段・昇降
  {id:'stair',name:'昇降階段',category:'階段・昇降',weight:18.0,unit:'台'},
  {id:'hatchStair',name:'ハッチ式昇降階段',category:'階段・昇降',weight:22.0,unit:'台'},
  {id:'stairHandrail',name:'階段手摺',category:'階段・昇降',weight:5.0,unit:'本'},

  // 養生
  {id:'soundPanel1800',name:'防音パネル 1.8m',category:'養生',weight:13.0,unit:'枚',aliases:'1.8パネル'},
  {id:'soundPanel1500',name:'防音パネル 1.5m',category:'養生',weight:11.0,unit:'枚',aliases:'1.5パネル'},
  {id:'soundPanel1200',name:'防音パネル 1.2m',category:'養生',weight:9.0,unit:'枚',aliases:'1.2パネル'},
  {id:'soundPanel900',name:'防音パネル 0.9m',category:'養生',weight:7.0,unit:'枚',aliases:'0.9パネル'},
  {id:'cornerPanel',name:'コーナーパネル',category:'養生',weight:6.5,unit:'枚'},
  {id:'clearPanel',name:'透過パネル',category:'養生',weight:10.0,unit:'枚'},
  {id:'soundSheet18',name:'防音シート 1.8',category:'養生',weight:5.0,unit:'枚'},
  {id:'verticalNet',name:'垂直ネット',category:'養生',weight:4.0,unit:'枚'},
  {id:'meshSheet',name:'メッシュシート',category:'養生',weight:3.5,unit:'枚'},
  {id:'rope',name:'シート紐',category:'養生',weight:0.03,unit:'本',aliases:'紐'},

  // 朝顔・その他
  {id:'asagaoPanel',name:'朝顔パネル',category:'朝顔',weight:14.0,unit:'枚'},
  {id:'asagaoArm',name:'朝顔アーム',category:'朝顔',weight:11.0,unit:'本'},
  {id:'asagaoClamp',name:'朝顔クランプ',category:'朝顔',weight:1.1,unit:'個'},
  {id:'oyazuna',name:'親綱 10m',category:'その他',weight:2.0,unit:'本'},
  {id:'flatPanel3m',name:'フラットパネル H=3m',category:'その他',weight:18.0,unit:'枚'},
  {id:'plywood',name:'合板',category:'その他',weight:12.0,unit:'枚'}
];

const state={cart:{},category:'すべて',search:'',selectedSite:'',favorites:new Set(JSON.parse(localStorage.getItem('vertx_core_favorites')||'[]'))};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function go(screenId){
  $$('.screen').forEach(el=>el.classList.toggle('active',el.id===screenId));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.go===screenId || (screenId==='confirm'&&el.dataset.go==='order')));
  if(screenId==='history')renderHistory(); if(screenId==='confirm')renderConfirm(); if(screenId==='sites')renderSites(); if(screenId==='favorites')renderFavorites();
  window.scrollTo({top:0,behavior:'instant'});
}
function totals(){return MATERIALS.reduce((a,m)=>{const q=state.cart[m.id]||0;a.qty+=q;a.weight+=q*m.weight;return a},{qty:0,weight:0})}
function selectedItems(){return MATERIALS.filter(m=>(state.cart[m.id]||0)>0).map(m=>({...m,qty:state.cart[m.id]}))}

// 「乗る最小クラス」だけ表示。実車の最大積載量は車検証で最終確認。
function truckFor(weightKg){
  const tons=weightKg/1000;
  if(tons<=0.35)return '軽トラ';
  if(tons<=2)return '2t車';
  if(tons<=3)return '3t車';
  if(tons<=4)return '4t車';
  if(tons<=6)return '6t車';
  if(tons<=8)return '8t車';
  if(tons<=10)return '10t車';
  return '10t車以上／複数便';
}
function formatWeight(weightKg){return `${weightKg.toFixed(1)}kg / ${(weightKg/1000).toFixed(2)}t`}

function renderCategories(){const cats=['すべて',...new Set(MATERIALS.map(m=>m.category))];$('#categoryChips').innerHTML=cats.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${c}">${c}</button>`).join('');$$('#categoryChips .chip').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;renderCategories();renderMaterials()})}
function materialCard(m){const q=state.cart[m.id]||0,f=state.favorites.has(m.id);return `<article class="material">
  <button class="fav-btn ${f?'active':''}" data-fav="${m.id}" aria-label="お気に入り">★</button>
  <div class="material-info"><b>${m.name}</b><small>${m.category}・単重 ${m.weight.toFixed(2)}kg/${m.unit}</small></div>
  <div class="qty-control"><button data-action="minus" data-id="${m.id}">−</button><input data-qty="${m.id}" inputmode="numeric" value="${q}" aria-label="${m.name}数量"><button data-action="plus" data-id="${m.id}">＋</button></div>
</article>`}
function bindMaterialControls(root=document){root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>changeQty(b.dataset.id,b.dataset.action==='plus'?1:-1));root.querySelectorAll('[data-qty]').forEach(i=>i.onchange=()=>setQty(i.dataset.qty,Number(i.value)));root.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav))}
function renderMaterials(){const q=state.search.trim().toLowerCase();const list=MATERIALS.filter(m=>(state.category==='すべて'||m.category===state.category)&&`${m.name} ${m.aliases||''}`.toLowerCase().includes(q));$('#materialList').innerHTML=list.length?list.map(materialCard).join(''):'<div class="card empty">該当する資材がありません</div>';bindMaterialControls($('#materialList'));renderOrderTotals();renderSiteBanner()}
function renderFavorites(){const list=MATERIALS.filter(m=>state.favorites.has(m.id));$('#favoriteList').innerHTML=list.length?list.map(materialCard).join(''):'<div class="card empty">★を押した資材がここに表示されます</div>';bindMaterialControls($('#favoriteList'))}
function changeQty(id,d){state.cart[id]=Math.max(0,(state.cart[id]||0)+d);renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function setQty(id,v){state.cart[id]=Math.max(0,Math.floor(Number.isFinite(v)?v:0));renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function toggleFavorite(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);localStorage.setItem('vertx_core_favorites',JSON.stringify([...state.favorites]));renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites();toast('お気に入りを更新しました')}
function renderOrderTotals(){const t=totals();$('#totalQty').textContent=t.qty;$('#totalWeight').textContent=t.weight.toFixed(1);const ton=$('#totalTons');if(ton)ton.textContent=(t.weight/1000).toFixed(2);$('#toConfirmBtn').disabled=t.qty===0}
function renderSiteBanner(){const el=$('#selectedSiteBanner');if(state.selectedSite){el.classList.remove('hidden');el.innerHTML=`<span>現場</span><strong>${escapeHtml(state.selectedSite)}</strong><button id="clearSiteBtn">変更</button>`;$('#clearSiteBtn').onclick=()=>go('sites')}else el.classList.add('hidden')}

function getSites(){try{return JSON.parse(localStorage.getItem('vertx_core_sites')||'[]')}catch{return []}}
function saveSites(v){localStorage.setItem('vertx_core_sites',JSON.stringify(v))}
function renderSites(){const sites=getSites();$('#siteList').innerHTML=sites.length?sites.map((s,i)=>`<article class="card site-card"><button class="site-select" data-site="${escapeHtml(s)}"><span>📍</span><b>${escapeHtml(s)}</b><small>この現場で注文を作る</small></button><button class="site-delete" data-site-index="${i}">×</button></article>`).join(''):'<div class="card empty">現場を追加すると、ここからすぐ注文できます</div>';$$('[data-site]').forEach(b=>b.onclick=()=>{state.selectedSite=b.dataset.site;$('#siteName').value=state.selectedSite;go('order')});$$('[data-site-index]').forEach(b=>b.onclick=()=>{const a=getSites();a.splice(Number(b.dataset.siteIndex),1);saveSites(a);renderSites()})}
function addSite(){const name=$('#newSiteName').value.trim();if(!name)return toast('現場名を入力してください');const sites=getSites();if(!sites.includes(name))sites.unshift(name);saveSites(sites);$('#newSiteName').value='';renderSites();toast('現場を追加しました')}

function renderConfirm(){const items=selectedItems(),t=totals();if(state.selectedSite)$('#siteName').value=state.selectedSite;$('#confirmItems').innerHTML=items.map(i=>`<div class="confirm-row"><span>${i.name}</span><strong>${i.qty}${i.unit} <small>(${(i.qty*i.weight).toFixed(1)}kg)</small></strong></div>`).join('')||'<div class="empty">資材が選択されていません</div>';$('#confirmQty').textContent=`${t.qty}点`;$('#confirmWeight').textContent=formatWeight(t.weight);$('#truckRecommendation').textContent=truckFor(t.weight)}
function getHistory(){try{return JSON.parse(localStorage.getItem('vertx_core_orders')||'[]')}catch{return []}}
function saveHistory(v){localStorage.setItem('vertx_core_orders',JSON.stringify(v));updateDashboard()}
function submitOrder(){const items=selectedItems(),t=totals();if(!items.length){toast('資材を選択してください');go('order');return}const site=$('#siteName').value.trim()||'現場名未入力';const order={id:Date.now(),site,date:$('#deliveryDate').value||'',memo:$('#orderMemo').value.trim(),createdAt:new Date().toISOString(),items,qty:t.qty,weight:t.weight,truck:truckFor(t.weight)};const history=getHistory();history.unshift(order);saveHistory(history);const sites=getSites();if(site!=='現場名未入力'&&!sites.includes(site)){sites.unshift(site);saveSites(sites)}state.cart={};state.selectedSite='';$('#siteName').value='';$('#orderMemo').value='';renderMaterials();go('success')}
function renderHistory(){const h=getHistory();$('#historyList').innerHTML=h.length?h.map(o=>`<article class="card history-card"><header><div><h3>${escapeHtml(o.site)}</h3><div class="history-meta">${formatDate(o.createdAt)}${o.date?`・希望 ${escapeHtml(o.date)}`:''}</div></div><span class="badge">${o.qty}点</span></header><div class="history-item-row"><span>推定重量</span><strong>${formatWeight(Number(o.weight))}</strong></div><div class="history-item-row"><span>推奨車両</span><strong>${escapeHtml(o.truck||truckFor(Number(o.weight)))}</strong></div><div class="history-actions"><button data-reorder="${o.id}">再注文</button><button data-delete="${o.id}">削除</button></div></article>`).join(''):'<div class="card empty">まだ注文履歴がありません</div>';$$('[data-reorder]').forEach(b=>b.onclick=()=>reorder(Number(b.dataset.reorder)));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteOrder(Number(b.dataset.delete)))}
function reorder(id){const o=getHistory().find(x=>x.id===id);if(!o)return;state.cart={};o.items.forEach(i=>state.cart[i.id]=i.qty);state.selectedSite=o.site;renderMaterials();go('order');toast('注文内容を復元しました')}
function deleteOrder(id){if(!confirm('この履歴を削除しますか？'))return;saveHistory(getHistory().filter(x=>x.id!==id));renderHistory()}
function updateDashboard(){const h=getHistory(),today=new Date().toDateString();$('#historyCount').textContent=h.length;$('#todayCount').textContent=h.filter(o=>new Date(o.createdAt).toDateString()===today).length}
function formatDate(v){return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}

$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));$('#searchInput').oninput=e=>{state.search=e.target.value;renderMaterials()};$('#toConfirmBtn').onclick=()=>go('confirm');$('#submitOrderBtn').onclick=submitOrder;$('#addSiteBtn').onclick=addSite;$('#newSiteName').onkeydown=e=>{if(e.key==='Enter')addSite()};$('#resetBtn').onclick=()=>{if(confirm('注文履歴・現場・お気に入り・選択中数量をすべて初期化しますか？')){['vertx_core_orders','vertx_core_sites','vertx_core_favorites'].forEach(k=>localStorage.removeItem(k));state.cart={};state.favorites=new Set();state.selectedSite='';renderMaterials();updateDashboard();toast('初期化しました')}};
(function init(){const d=new Date();d.setDate(d.getDate()+1);$('#deliveryDate').value=d.toISOString().slice(0,10);renderCategories();renderMaterials();updateDashboard();go('home')})();
