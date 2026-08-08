const DEFAULT_MATERIALS = [
  // 枠組足場（主に解体で使う610枠系）
  {id:'frame610_1700',name:'610枠 1700',category:'枠組',weight:12.3,unit:'枚',aliases:'建枠 610 AC-617'},
  {id:'adjustFrame610x490',name:'調整枠 610×490',category:'枠組',weight:7.0,unit:'枚',aliases:'調整枠490 490枠'},
  {id:'jointPin',name:'連結ピン（建枠用）',category:'枠組',weight:0.6,unit:'本',aliases:'枠ピン KJ-80'},
  {id:'brace610',name:'筋交（ブレス）610',category:'枠組',weight:2.0,unit:'本',aliases:'ブレス610 筋交610'},
  {id:'brace914',name:'筋交（ブレス）914',category:'枠組',weight:2.4,unit:'本',aliases:'ブレス914 筋交914'},
  {id:'brace1219',name:'筋交（ブレス）1219',category:'枠組',weight:2.7,unit:'本',aliases:'ブレス1219 筋交1219'},
  {id:'brace1524',name:'筋交（ブレス）1524',category:'枠組',weight:3.5,unit:'本',aliases:'ブレス1524 筋交1524'},
  {id:'brace1829',name:'筋交（ブレス）1829',category:'枠組',weight:4.0,unit:'本',aliases:'ブレス1829 筋交1829 A-14'},
  {id:'frameHandrail',name:'枠用手摺 1829',category:'枠組',weight:1.9,unit:'本',aliases:'手摺 羽根手摺 ライト手摺'},
  {id:'endHandrail',name:'末端手摺',category:'枠組',weight:1.9,unit:'本',aliases:'端部手摺'},
  {id:'lowerRail',name:'下さん',category:'枠組',weight:2.5,unit:'本',aliases:'下桟'},

  // アンチ・鋼製布板
  {id:'anti610',name:'アンチ 610',category:'アンチ・布板',weight:4.0,unit:'枚'},
  {id:'anti914',name:'アンチ 914',category:'アンチ・布板',weight:5.5,unit:'枚'},
  {id:'anti1219',name:'アンチ 1219',category:'アンチ・布板',weight:6.8,unit:'枚'},
  {id:'anti1524',name:'アンチ 1524',category:'アンチ・布板',weight:7.3,unit:'枚'},
  {id:'anti1829',name:'アンチ 1829',category:'アンチ・布板',weight:9.7,unit:'枚'},
  {id:'steel240_2m',name:'2板（鋼製足場板 2m）',category:'アンチ・布板',weight:7.2,unit:'枚',aliases:'2板 2m板'},
  {id:'steel240_4m',name:'4板（鋼製足場板 4m）',category:'アンチ・布板',weight:14.4,unit:'枚',aliases:'4板 4m板'},

  // 単管 φ48.6（メーカー公表値ベース）
  {id:'pipe0_5m',name:'単管パイプ 0.5m',category:'単管',weight:1.37,unit:'本',aliases:'500 かんざし'},
  {id:'pipe1m',name:'単管パイプ 1.0m',category:'単管',weight:2.73,unit:'本'},
  {id:'pipe1_5m',name:'単管パイプ 1.5m',category:'単管',weight:4.10,unit:'本'},
  {id:'pipe2m',name:'単管パイプ 2.0m',category:'単管',weight:5.46,unit:'本',aliases:'2mパイプ'},
  {id:'pipe2_5m',name:'単管パイプ 2.5m',category:'単管',weight:6.83,unit:'本'},
  {id:'pipe3m',name:'単管パイプ 3.0m',category:'単管',weight:8.19,unit:'本'},
  {id:'pipe4m',name:'単管パイプ 4.0m',category:'単管',weight:10.92,unit:'本',aliases:'4mパイプ'},
  {id:'pipe5m',name:'単管パイプ 5.0m',category:'単管',weight:13.65,unit:'本'},
  {id:'pipe6m',name:'単管パイプ 6.0m',category:'単管',weight:16.38,unit:'本'},
  {id:'kanzashiPipe',name:'かんざしパイプ 0.5m',category:'単管',weight:1.37,unit:'本',aliases:'かんざし 500mm'},
  {id:'negaramiPipe',name:'根がらみ単管 2.0m',category:'単管',weight:5.46,unit:'本'},
  {id:'topPipe',name:'頭つなぎパイプ 2.0m',category:'単管',weight:5.46,unit:'本'},

  // クランプ・ジョイント・金物
  {id:'fixedClamp',name:'直交クランプ',category:'クランプ・金物',weight:0.74,unit:'個'},
  {id:'swivelClamp',name:'自在クランプ',category:'クランプ・金物',weight:0.74,unit:'個'},
  {id:'tripleFixedClamp',name:'三連クランプ 直交',category:'クランプ・金物',weight:1.10,unit:'個',aliases:'三つ爪クランプ'},
  {id:'tripleSwivelClamp',name:'三連クランプ 自在',category:'クランプ・金物',weight:1.10,unit:'個'},
  {id:'singleClamp',name:'単クランプ',category:'クランプ・金物',weight:0.40,unit:'個'},
  {id:'straightJoint',name:'直線ジョイント',category:'クランプ・金物',weight:0.60,unit:'個',aliases:'単管ジョイント'},
  {id:'bonJoint',name:'ボンジョイント',category:'クランプ・金物',weight:0.60,unit:'個'},
  {id:'stopper',name:'ストッパー',category:'クランプ・金物',weight:2.70,unit:'本',aliases:'エンドストッパー'},
  {id:'hagoita',name:'羽子板',category:'クランプ・金物',weight:2.0,unit:'個'},
  {id:'oniClamp',name:'鬼クラ',category:'クランプ・金物',weight:0.9,unit:'個',aliases:'鬼クランプ'},

  // ジャッキ・ベース
  {id:'jackBase380',name:'ジャッキベース 380',category:'ジャッキ・ベース',weight:3.3,unit:'個'},
  {id:'jackBase600',name:'ジャッキベース 600',category:'ジャッキ・ベース',weight:4.6,unit:'個'},
  {id:'fixedBase486',name:'固定ベース φ48.6',category:'ジャッキ・ベース',weight:0.75,unit:'個'},
  {id:'flexBase486',name:'自在ベース φ48.6',category:'ジャッキ・ベース',weight:1.54,unit:'個'},
  {id:'uJack400',name:'Uヘッドジャッキ 400',category:'ジャッキ・ベース',weight:4.8,unit:'個'},
  {id:'uJack600',name:'Uヘッドジャッキ 600',category:'ジャッキ・ベース',weight:6.0,unit:'個'},

  // 壁つなぎ
  {id:'wallTie14_17',name:'壁つなぎ 140〜165mm',category:'壁つなぎ',weight:0.8,unit:'本'},
  {id:'wallTie16_20',name:'壁つなぎ 160〜200mm',category:'壁つなぎ',weight:0.9,unit:'本'},
  {id:'wallTie19_25',name:'壁つなぎ 190〜250mm',category:'壁つなぎ',weight:0.95,unit:'本'},
  {id:'wallTie24_34',name:'壁つなぎ 240〜340mm',category:'壁つなぎ',weight:1.14,unit:'本'},
  {id:'wallTie33_52',name:'壁つなぎ 330〜520mm',category:'壁つなぎ',weight:1.51,unit:'本'},
  {id:'wallTie50_72',name:'壁つなぎ 500〜720mm',category:'壁つなぎ',weight:2.05,unit:'本'},
  {id:'wallTie70_92',name:'壁つなぎ 700〜920mm',category:'壁つなぎ',weight:2.53,unit:'本'},
  {id:'wallTie90_112',name:'壁つなぎ 900〜1120mm',category:'壁つなぎ',weight:2.94,unit:'本'},

  // ブラケット
  {id:'bracket500',name:'伸縮ブラケット 500',category:'ブラケット',weight:3.4,unit:'個',aliases:'ブラケット500'},
  {id:'bracket750',name:'伸縮ブラケット 750',category:'ブラケット',weight:4.4,unit:'個',aliases:'ブラケット750'},
  {id:'bracket1000',name:'伸縮ブラケット 1000',category:'ブラケット',weight:6.5,unit:'個',aliases:'ブラケット1000'},

  // 階段・昇降
  {id:'stair1800',name:'昇降階段 1800',category:'階段・昇降',weight:17.4,unit:'台'},
  {id:'alStair1800',name:'アルミ昇降階段 1800',category:'階段・昇降',weight:12.3,unit:'台'},
  {id:'hatchStair600',name:'600枠 ハッチ式昇降階段',category:'階段・昇降',weight:22.0,unit:'台'},
  {id:'stairHandrail',name:'階段手摺',category:'階段・昇降',weight:7.1,unit:'本'},
  {id:'ladder1800',name:'昇降タラップ 1.8m',category:'階段・昇降',weight:11.6,unit:'本'},
  {id:'ladder2700',name:'昇降タラップ 2.7m',category:'階段・昇降',weight:17.1,unit:'本'},
  {id:'ladder3600',name:'昇降タラップ 3.6m',category:'階段・昇降',weight:22.8,unit:'本'},

  // 養生
  {id:'soundPanel1800',name:'防音パネル 1.8m',category:'養生',weight:13.0,unit:'枚',aliases:'1.8パネル 1800'},
  {id:'soundPanel1500',name:'防音パネル 1.5m',category:'養生',weight:11.0,unit:'枚',aliases:'1.5パネル 1500'},
  {id:'soundPanel1200',name:'防音パネル 1.2m',category:'養生',weight:9.0,unit:'枚',aliases:'1.2パネル 1200'},
  {id:'soundPanel900',name:'防音パネル 0.9m',category:'養生',weight:7.0,unit:'枚',aliases:'0.9パネル 900'},
  {id:'soundPanel600',name:'防音パネル 0.6m',category:'養生',weight:5.0,unit:'枚',aliases:'0.6パネル 600パネル'},
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
  {id:'plywood',name:'合板 12mm',category:'その他',weight:12.0,unit:'枚'}
];

function loadMaterialMaster(){
  try{
    const saved=JSON.parse(localStorage.getItem('vertx_core_materials')||'null');
    if(Array.isArray(saved)&&saved.length)return saved;
  }catch(e){}
  return DEFAULT_MATERIALS.map(x=>({...x}));
}
let MATERIALS=loadMaterialMaster();
const state={cart:{},category:'すべて',search:'',selectedSite:'',favorites:new Set(JSON.parse(localStorage.getItem('vertx_core_favorites')||'[]'))};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function go(screenId){
  $$('.screen').forEach(el=>el.classList.toggle('active',el.id===screenId));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.go===screenId || (screenId==='confirm'&&el.dataset.go==='order')));
  if(screenId==='history')renderHistory(); if(screenId==='confirm')renderConfirm(); if(screenId==='sites')renderSites(); if(screenId==='favorites')renderFavorites(); if(screenId==='materialsMaster')renderMaterialMaster();
  window.scrollTo({top:0,behavior:'instant'});
}
function totals(){return MATERIALS.reduce((a,m)=>{const q=state.cart[m.id]||0;a.qty+=q;a.weight+=q*Number(m.weight||0);return a},{qty:0,weight:0})}
function selectedItems(){return MATERIALS.filter(m=>(state.cart[m.id]||0)>0).map(m=>({...m,qty:state.cart[m.id]}))}
function truckFor(weightKg){const tons=weightKg/1000;if(tons<=0.35)return '軽トラ';if(tons<=2)return '2t車';if(tons<=3)return '3t車';if(tons<=4)return '4t車';if(tons<=6)return '6t車';if(tons<=8)return '8t車';if(tons<=10)return '10t車';return '10t車以上／複数便'}
function formatWeight(weightKg){return `${Number(weightKg).toFixed(1)}kg / ${(Number(weightKg)/1000).toFixed(2)}t`}

function renderCategories(){const cats=['すべて',...new Set(MATERIALS.map(m=>m.category))];$('#categoryChips').innerHTML=cats.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');$$('#categoryChips .chip').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;renderCategories();renderMaterials()})}
function materialCard(m){const q=state.cart[m.id]||0,f=state.favorites.has(m.id);return `<article class="material"><button class="fav-btn ${f?'active':''}" data-fav="${m.id}" aria-label="お気に入り">★</button><div class="material-info"><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.category)}・単重 ${Number(m.weight).toFixed(2)}kg/${escapeHtml(m.unit)}</small></div><div class="qty-control"><button data-action="minus" data-id="${m.id}">−</button><input data-qty="${m.id}" inputmode="numeric" value="${q}" aria-label="${escapeHtml(m.name)}数量"><button data-action="plus" data-id="${m.id}">＋</button></div></article>`}
function bindMaterialControls(root=document){root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>changeQty(b.dataset.id,b.dataset.action==='plus'?1:-1));root.querySelectorAll('[data-qty]').forEach(i=>i.onchange=()=>setQty(i.dataset.qty,Number(i.value)));root.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav))}
function renderMaterials(){const q=state.search.trim().toLowerCase();const list=MATERIALS.filter(m=>(state.category==='すべて'||m.category===state.category)&&`${m.name} ${m.aliases||''}`.toLowerCase().includes(q));$('#materialList').innerHTML=list.length?list.map(materialCard).join(''):'<div class="card empty">該当する資材がありません</div>';bindMaterialControls($('#materialList'));renderOrderTotals();renderSiteBanner()}
function renderFavorites(){const list=MATERIALS.filter(m=>state.favorites.has(m.id));$('#favoriteList').innerHTML=list.length?list.map(materialCard).join(''):'<div class="card empty">★を押した資材がここに表示されます</div>';bindMaterialControls($('#favoriteList'))}
function changeQty(id,d){state.cart[id]=Math.max(0,(state.cart[id]||0)+d);renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function setQty(id,v){state.cart[id]=Math.max(0,Math.floor(Number.isFinite(v)?v:0));renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function toggleFavorite(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);localStorage.setItem('vertx_core_favorites',JSON.stringify([...state.favorites]));renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites();toast('お気に入りを更新しました')}
function renderOrderTotals(){const t=totals();$('#totalQty').textContent=t.qty;$('#totalWeight').textContent=t.weight.toFixed(1);$('#totalTons').textContent=(t.weight/1000).toFixed(2);$('#toConfirmBtn').disabled=t.qty===0}
function renderSiteBanner(){const el=$('#selectedSiteBanner');if(state.selectedSite){el.classList.remove('hidden');el.innerHTML=`<span>現場</span><strong>${escapeHtml(state.selectedSite)}</strong><button id="clearSiteBtn">変更</button>`;$('#clearSiteBtn').onclick=()=>go('sites')}else el.classList.add('hidden')}

function getSites(){try{return JSON.parse(localStorage.getItem('vertx_core_sites')||'[]')}catch{return []}}
function saveSites(v){localStorage.setItem('vertx_core_sites',JSON.stringify(v))}
function renderSites(){const sites=getSites();$('#siteList').innerHTML=sites.length?sites.map((s,i)=>`<article class="card site-card"><button class="site-select" data-site="${escapeHtml(s)}"><span>📍</span><b>${escapeHtml(s)}</b><small>この現場で注文を作る</small></button><button class="site-delete" data-site-index="${i}">×</button></article>`).join(''):'<div class="card empty">現場を追加すると、ここからすぐ注文できます</div>';$$('[data-site]').forEach(b=>b.onclick=()=>{state.selectedSite=b.dataset.site;$('#siteName').value=state.selectedSite;go('order')});$$('[data-site-index]').forEach(b=>b.onclick=()=>{const a=getSites();a.splice(Number(b.dataset.siteIndex),1);saveSites(a);renderSites()})}
function addSite(){const name=$('#newSiteName').value.trim();if(!name)return toast('現場名を入力してください');const sites=getSites();if(!sites.includes(name))sites.unshift(name);saveSites(sites);$('#newSiteName').value='';renderSites();toast('現場を追加しました')}

function currentDraft(){const items=selectedItems(),t=totals();return {id:'draft',site:$('#siteName')?.value.trim()||state.selectedSite||'現場名未入力',date:$('#deliveryDate')?.value||'',memo:$('#orderMemo')?.value.trim()||'',createdAt:new Date().toISOString(),items,qty:t.qty,weight:t.weight,truck:truckFor(t.weight)}}
function renderConfirm(){const o=currentDraft();$('#confirmItems').innerHTML=o.items.map(i=>`<div class="confirm-row"><span>${escapeHtml(i.name)}</span><strong>${i.qty}${escapeHtml(i.unit)} <small>(${(i.qty*i.weight).toFixed(1)}kg)</small></strong></div>`).join('')||'<div class="empty">資材が選択されていません</div>';$('#confirmQty').textContent=`${o.qty}点`;$('#confirmWeight').textContent=formatWeight(o.weight);$('#truckRecommendation').textContent=o.truck}
function getHistory(){try{return JSON.parse(localStorage.getItem('vertx_core_orders')||'[]')}catch{return []}}
function saveHistory(v){localStorage.setItem('vertx_core_orders',JSON.stringify(v));updateDashboard()}
function submitOrder(){const order=currentDraft();if(!order.items.length){toast('資材を選択してください');go('order');return}order.id=Date.now();const history=getHistory();history.unshift(order);saveHistory(history);const sites=getSites();if(order.site!=='現場名未入力'&&!sites.includes(order.site)){sites.unshift(order.site);saveSites(sites)}state.cart={};state.selectedSite='';$('#siteName').value='';$('#orderMemo').value='';renderMaterials();go('success')}
function renderHistory(){const h=getHistory();$('#historyList').innerHTML=h.length?h.map(o=>`<article class="card history-card"><header><div><h3>${escapeHtml(o.site)}</h3><div class="history-meta">${formatDate(o.createdAt)}${o.date?`・希望 ${escapeHtml(o.date)}`:''}</div></div><span class="badge">${o.qty}点</span></header><div class="history-item-row"><span>推定重量</span><strong>${formatWeight(Number(o.weight))}</strong></div><div class="history-item-row"><span>乗る車</span><strong>${escapeHtml(o.truck||truckFor(Number(o.weight)))}</strong></div><div class="history-actions"><button data-reorder="${o.id}">前回コピー</button><button data-pdf="${o.id}">PDF</button><button data-line="${o.id}">LINE</button><button data-delete="${o.id}">削除</button></div></article>`).join(''):'<div class="card empty">まだ注文履歴がありません</div>';$$('[data-reorder]').forEach(b=>b.onclick=()=>reorder(Number(b.dataset.reorder)));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteOrder(Number(b.dataset.delete)));$$('[data-pdf]').forEach(b=>b.onclick=()=>printOrderById(Number(b.dataset.pdf)));$$('[data-line]').forEach(b=>b.onclick=()=>shareOrderById(Number(b.dataset.line)))}
function reorder(id){const o=getHistory().find(x=>x.id===id);if(!o)return;state.cart={};o.items.forEach(i=>{if(MATERIALS.some(m=>m.id===i.id))state.cart[i.id]=i.qty});state.selectedSite=o.site;renderMaterials();go('order');toast('前回注文をコピーしました')}
function deleteOrder(id){if(!confirm('この履歴を削除しますか？'))return;saveHistory(getHistory().filter(x=>x.id!==id));renderHistory()}
function updateDashboard(){const h=getHistory(),today=new Date().toDateString();$('#historyCount').textContent=h.length;$('#todayCount').textContent=h.filter(o=>new Date(o.createdAt).toDateString()===today).length}

function orderText(o){const lines=[`VERTX CORE 資材注文`,`現場：${o.site}`,o.date?`希望日：${o.date}`:'',`合計：${o.qty}点`,`重量：${formatWeight(o.weight)}`,`乗る車：${o.truck||truckFor(o.weight)}`,'','【資材】',...o.items.map(i=>`${i.name} ${i.qty}${i.unit}`),o.memo?`\nメモ：${o.memo}`:''];return lines.filter(Boolean).join('\n')}
function shareOrderById(id){const o=getHistory().find(x=>x.id===id);if(o)shareToLine(o)}
function shareDraft(){const o=currentDraft();if(!o.items.length)return toast('資材を選択してください');shareToLine(o)}
function shareToLine(o){window.open(`https://line.me/R/share?text=${encodeURIComponent(orderText(o))}`,'_blank')}
function printOrderById(id){const o=getHistory().find(x=>x.id===id);if(o)printOrder(o)}
function printDraft(){const o=currentDraft();if(!o.items.length)return toast('資材を選択してください');printOrder(o)}
function printOrder(o){const area=$('#printArea');area.innerHTML=`<div class="print-sheet"><h1>VERTX CORE 資材注文書</h1><p>現場：<b>${escapeHtml(o.site)}</b></p>${o.date?`<p>希望日：${escapeHtml(o.date)}</p>`:''}<p>合計重量：<b>${formatWeight(o.weight)}</b>　乗る車：<b>${escapeHtml(o.truck||truckFor(o.weight))}</b></p><table><thead><tr><th>資材名</th><th>数量</th><th>単重</th><th>重量</th></tr></thead><tbody>${o.items.map(i=>`<tr><td>${escapeHtml(i.name)}</td><td>${i.qty}${escapeHtml(i.unit)}</td><td>${Number(i.weight).toFixed(2)}kg</td><td>${(i.qty*i.weight).toFixed(1)}kg</td></tr>`).join('')}</tbody></table>${o.memo?`<p>メモ：${escapeHtml(o.memo)}</p>`:''}<p class="print-note">VERTX CORE β0.6</p></div>`;window.print()}

// 資材マスタ編集（後から名前・カテゴリー・単重・単位を変更可能）
function renderMaterialMaster(){const root=$('#masterList');if(!root)return;root.innerHTML=MATERIALS.map((m,i)=>`<article class="card master-row"><input class="master-name" data-mi="${i}" data-mf="name" value="${escapeHtml(m.name)}"><div class="master-grid"><input data-mi="${i}" data-mf="category" value="${escapeHtml(m.category)}" aria-label="カテゴリー"><input type="number" step="0.01" min="0" data-mi="${i}" data-mf="weight" value="${Number(m.weight)}" aria-label="単重"><input data-mi="${i}" data-mf="unit" value="${escapeHtml(m.unit)}" aria-label="単位"></div><small>カテゴリー / 単重kg / 単位</small><button class="danger-link" data-master-delete="${i}">この資材を削除</button></article>`).join('');root.querySelectorAll('[data-mf]').forEach(inp=>inp.onchange=()=>{const i=Number(inp.dataset.mi),f=inp.dataset.mf;MATERIALS[i][f]=f==='weight'?Math.max(0,Number(inp.value)||0):inp.value.trim();saveMaterialMaster()});root.querySelectorAll('[data-master-delete]').forEach(b=>b.onclick=()=>{if(confirm('この資材を削除しますか？')){MATERIALS.splice(Number(b.dataset.masterDelete),1);saveMaterialMaster();renderMaterialMaster()}})}
function saveMaterialMaster(){localStorage.setItem('vertx_core_materials',JSON.stringify(MATERIALS));renderCategories();renderMaterials();toast('資材マスタを保存しました')}
function addCustomMaterial(){const n=$('#customName').value.trim(),c=$('#customCategory').value.trim()||'その他',w=Math.max(0,Number($('#customWeight').value)||0),u=$('#customUnit').value.trim()||'個';if(!n)return toast('資材名を入力してください');MATERIALS.push({id:`custom_${Date.now()}`,name:n,category:c,weight:w,unit:u,aliases:''});saveMaterialMaster();['#customName','#customWeight'].forEach(s=>$(s).value='');renderMaterialMaster()}
function resetMaterialMaster(){if(!confirm('資材マスタを初期状態に戻しますか？'))return;MATERIALS=DEFAULT_MATERIALS.map(x=>({...x}));localStorage.removeItem('vertx_core_materials');renderMaterialMaster();renderCategories();renderMaterials();toast('初期状態に戻しました')}

function formatDate(v){return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}

$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));$('#searchInput').oninput=e=>{state.search=e.target.value;renderMaterials()};$('#toConfirmBtn').onclick=()=>go('confirm');$('#submitOrderBtn').onclick=submitOrder;$('#addSiteBtn').onclick=addSite;$('#newSiteName').onkeydown=e=>{if(e.key==='Enter')addSite()};$('#printDraftBtn').onclick=printDraft;$('#lineDraftBtn').onclick=shareDraft;$('#addCustomMaterialBtn').onclick=addCustomMaterial;$('#resetMaterialsBtn').onclick=resetMaterialMaster;
$('#resetBtn').onclick=()=>{if(confirm('注文履歴・現場・お気に入り・選択中数量を初期化しますか？（資材マスタは残ります）')){['vertx_core_orders','vertx_core_sites','vertx_core_favorites'].forEach(k=>localStorage.removeItem(k));state.cart={};state.favorites=new Set();state.selectedSite='';renderMaterials();updateDashboard();toast('初期化しました')}};
(function init(){const d=new Date();d.setDate(d.getDate()+1);$('#deliveryDate').value=d.toISOString().slice(0,10);renderCategories();renderMaterials();updateDashboard();go('home')})();
