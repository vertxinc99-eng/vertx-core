const VERTX_BUILD='7.18.0';
// VERTX CORE v5.8 NEXT UI + BILLING
const VERTX_SESSION_KEY='vertx_core_company_session';
let supabaseClient=null;
let cloudReady=false;
let cloudUser=null;
let cloudHydrating=false;
let billingConfig={configured:false,standardPriceLabel:'Stripeで設定',proPriceLabel:'Stripeで設定'};
function nativeGet(k){return window.localStorage.getItem(k)}
function nativeSet(k,v){return window.localStorage.setItem(k,v)}
function nativeRemove(k){return window.localStorage.removeItem(k)}
function getCompanySession(){try{return JSON.parse(nativeGet(VERTX_SESSION_KEY)||'null')}catch{return null}}
const DEV_TEST_ROLE_KEY='vertx_core_dev_test_role';
function getActualRole(){return getCompanySession()?.role||'member'}
function getDevTestRole(){const actual=getActualRole();if(actual!=='owner')return '';const v=nativeGet(DEV_TEST_ROLE_KEY)||'';return ['owner','admin','member','viewer'].includes(v)?v:''}
function getEffectiveRole(){return getDevTestRole()||getActualRole()}
function isDevTestMode(){return Boolean(getDevTestRole())}
function setDevTestRole(role=''){
  if(getActualRole()!=='owner')return toast('開発者テストは社長アカウントのみ利用できます');
  if(role&& !['owner','admin','member','viewer'].includes(role))return;
  if(role)nativeSet(DEV_TEST_ROLE_KEY,role);else nativeRemove(DEV_TEST_ROLE_KEY);
  audit('権限テスト',role?`${roleLabel(role)}として表示`:'通常モードへ復帰');
  applyRoleUi();updateDashboard();renderDevTestPanel();updateDevTestBanner();
  go('home');
  toast(role?`${roleLabel(role)}表示に切り替えました`:'通常の社長モードに戻しました');
}
function updateDevTestBanner(){
  const el=$('#devTestBanner');if(!el)return;const role=getDevTestRole();
  el.classList.toggle('hidden',!role);
  if(role&&$('#devTestBannerRole'))$('#devTestBannerRole').textContent=roleLabel(role);
}
function renderDevTestPanel(){
  const root=$('#devTestPanel');if(!root)return;
  const actual=getActualRole(),active=getDevTestRole();
  if(actual!=='owner'){root.innerHTML='<div class="card empty">社長 / Owner専用です</div>';return}
  const roles=[['owner','社長','全機能'],['admin','管理者','運営・承認'],['member','職長','現場・注文'],['viewer','閲覧','確認のみ']];
  root.innerHTML=`<div class="dev-test-status"><span>DB上の本当の権限</span><strong>${escapeHtml(roleLabel(actual))}</strong><small>テスト表示ではDBの権限自体は変更しません。</small></div><div class="dev-role-grid">${roles.map(([r,label,sub])=>`<button data-test-role="${r}" class="${(active||actual)===r?'active':''}"><span>${label}</span><small>${sub}</small></button>`).join('')}</div><button id="devTestExitBtn" class="secondary-btn full">通常の社長モードに戻す</button><button id="runSystemCheckBtn" class="primary-btn full">システム診断を実行</button><div id="systemCheckResult" class="dev-check-result">会社データ・資材マスタ・AI接続設定・下書き保存を簡易診断できます。</div>`;
  root.querySelectorAll('[data-test-role]').forEach(b=>b.onclick=()=>setDevTestRole(b.dataset.testRole));
  root.querySelector('#devTestExitBtn').onclick=()=>setDevTestRole('');
  root.querySelector('#runSystemCheckBtn').onclick=runSystemCheck;
}
async function runSystemCheck(){
  const out=$('#systemCheckResult');if(!out)return;out.textContent='診断中…';
  const checks=[];const s=getCompanySession();
  checks.push(['会社セッション',Boolean(s?.orgId),s?.company||'会社未選択']);
  const ids=MATERIALS.map(x=>String(x.id)),names=MATERIALS.map(x=>String(x.name).trim());
  checks.push(['資材ID重複',new Set(ids).size===ids.length,`${ids.length}件`]);
  checks.push(['資材名重複',new Set(names).size===names.length,`${names.length}件`]);
  checks.push(['注文下書き',true,Object.keys(state.cart||{}).length?`${Object.keys(state.cart).length}種類保存中`:'空']);
  try{const r=await fetch('/api/config',{cache:'no-store'});const cfg=await r.json();checks.push(['クラウド設定',Boolean(cfg.configured),cfg.configured?'Supabase OK':'設定不足']);checks.push(['AI/課金API',r.ok,r.ok?'API応答OK':'API応答エラー']);}catch(e){checks.push(['API接続',false,'接続できません']) }
  out.innerHTML=checks.map(([n,ok,d])=>`<div class="dev-check-row ${ok?'ok':'ng'}"><span>${ok?'✓':'!'} ${escapeHtml(n)}</span><small>${escapeHtml(d)}</small></div>`).join('');
  audit('システム診断',checks.every(x=>x[1])?'PASS':'要確認');
}
const VERTX_IDENTITY_KEY='vertx_core_identity';
function getSavedIdentity(){try{return JSON.parse(nativeGet(VERTX_IDENTITY_KEY)||'null')||{}}catch{return {}}}
function saveIdentity(company,user){const prev=getSavedIdentity();nativeSet(VERTX_IDENTITY_KEY,JSON.stringify({company:company||prev.company||'',user:user||prev.user||'',updatedAt:new Date().toISOString()}))}
function prefillSavedIdentity(){const x=getSavedIdentity();if($('#tenantCompanyName')&&!$('#tenantCompanyName').value)$('#tenantCompanyName').value=x.company||'';if($('#tenantUserName')&&!$('#tenantUserName').value)$('#tenantUserName').value=x.user||''}
function normalizeCompanyCode(v=''){return String(v).trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,24)}
function tenantKey(k){const s=getCompanySession();return s?.code?`${k}__${s.code}`:k}
function lsGet(k){return nativeGet(tenantKey(k))}
function lsSet(k,v){nativeSet(tenantKey(k),v);if(cloudReady&&!cloudHydrating)cloudSet(k,v);return v}
function lsRemove(k){nativeRemove(tenantKey(k));if(cloudReady&&!cloudHydrating)cloudRemove(k)}
async function cloudSet(key,value){
  const orgId=getCompanySession()?.orgId;if(!supabaseClient||!orgId)return;
  try{await supabaseClient.from('tenant_store').upsert({organization_id:orgId,key,value:String(value),updated_at:new Date().toISOString()},{onConflict:'organization_id,key'})}catch(e){console.warn('cloudSet',e)}
}
async function cloudRemove(key){const orgId=getCompanySession()?.orgId;if(!supabaseClient||!orgId)return;try{await supabaseClient.from('tenant_store').delete().eq('organization_id',orgId).eq('key',key)}catch(e){console.warn('cloudRemove',e)}}
async function hydrateCloudStore(){
  const orgId=getCompanySession()?.orgId;if(!supabaseClient||!orgId)return;
  cloudHydrating=true;
  try{
    const {data,error}=await supabaseClient.from('tenant_store').select('key,value').eq('organization_id',orgId);
    if(error)throw error;
    if((data||[]).length){
      data.forEach(r=>nativeSet(tenantKey(r.key),r.value));
    }else{
      // First cloud login: migrate the existing company data from this browser.
      const code=getCompanySession()?.code||'';const suffix=`__${code}`;const rows=[];
      for(let i=0;i<localStorage.length;i++){const full=localStorage.key(i);if(full&&full.endsWith(suffix)){const key=full.slice(0,-suffix.length);rows.push({organization_id:orgId,key,value:localStorage.getItem(full)||'',updated_at:new Date().toISOString()})}}
      if(rows.length){const {error:upErr}=await supabaseClient.from('tenant_store').upsert(rows,{onConflict:'organization_id,key'});if(upErr)console.warn('local migration',upErr)}
    }
  }finally{cloudHydrating=false}
}
const DEFAULT_MATERIALS = [{"id":"frame_1200","name":"枠 1224","category":"枠足場用","weight":15.8,"unit":"枚","aliases":"1219枠 / W1219×H1700"},{"id":"frame_900","name":"枠 914","category":"枠足場用","weight":14.0,"unit":"枚","aliases":"914枠 / W914×H1700"},{"id":"frame_600","name":"枠 610","category":"枠足場用","weight":13.0,"unit":"枚","aliases":"610枠 / W610×H1700"},{"id":"anti_18","name":"アンチ 1.8","category":"アンチ","weight":15.6,"unit":"枚","aliases":"1.8m / 床付き布板"},{"id":"anti_15","name":"アンチ 1.5","category":"アンチ","weight":13.0,"unit":"枚","aliases":"1.5m / 床付き布板"},{"id":"anti_12","name":"アンチ 1.2","category":"アンチ","weight":11.0,"unit":"枚","aliases":"1.2m / 床付き布板"},{"id":"anti_09","name":"アンチ 0.9","category":"アンチ","weight":8.5,"unit":"枚","aliases":"0.9m / 床付き布板"},{"id":"anti_06","name":"アンチ 0.6","category":"アンチ","weight":7.2,"unit":"枚","aliases":"0.6m / 床付き布板"},{"id":"halfanti_18","name":"ハーフアンチ 1.8","category":"ハーフアンチ","weight":8.5,"unit":"枚","aliases":"1.8m / ハーフ"},{"id":"halfanti_15","name":"ハーフアンチ 1.5","category":"ハーフアンチ","weight":7.0,"unit":"枚","aliases":"1.5m / ハーフ"},{"id":"halfanti_12","name":"ハーフアンチ 1.2","category":"ハーフアンチ","weight":6.0,"unit":"枚","aliases":"1.2m / ハーフ"},{"id":"halfanti_09","name":"ハーフアンチ 0.9","category":"ハーフアンチ","weight":5.0,"unit":"枚","aliases":"0.9m / ハーフ"},{"id":"halfanti_06","name":"ハーフアンチ 0.6","category":"ハーフアンチ","weight":3.4,"unit":"枚","aliases":"0.6m / ハーフ"},{"id":"brace_18","name":"ブレス 1829","category":"ブレス","weight":3.7,"unit":"本","aliases":"筋違 / 1.8m"},{"id":"brace_15","name":"ブレス 1519","category":"ブレス","weight":3.1,"unit":"本","aliases":"筋違 / 1.5m"},{"id":"brace_12","name":"ブレス 1224","category":"ブレス","weight":2.6,"unit":"本","aliases":"筋違 / 1.2m"},{"id":"brace_09","name":"ブレス 914","category":"ブレス","weight":2.0,"unit":"本","aliases":"筋違 / 0.9m"},{"id":"brace_06","name":"ブレス 610","category":"ブレス","weight":1.4,"unit":"本","aliases":"筋違 / 0.6m"},{"id":"shitasan_18","name":"下さん 1.8","category":"下さん","weight":2.2,"unit":"本","aliases":"下桟 / 1.8m"},{"id":"shitasan_15","name":"下さん 1.5","category":"下さん","weight":1.9,"unit":"本","aliases":"下桟 / 1.5m"},{"id":"shitasan_12","name":"下さん 1.2","category":"下さん","weight":1.6,"unit":"本","aliases":"下桟 / 1.2m"},{"id":"shitasan_09","name":"下さん 0.9","category":"下さん","weight":1.2,"unit":"本","aliases":"下桟 / 0.9m"},{"id":"shitasan_06","name":"下さん 0.6","category":"下さん","weight":0.9,"unit":"本","aliases":"下桟 / 0.6m"},{"id":"toeboard_18","name":"幅木 1.8","category":"幅木","weight":4.6,"unit":"枚","aliases":"クイック幅木 / 1.8m"},{"id":"toeboard_15","name":"幅木 1.5","category":"幅木","weight":4.1,"unit":"枚","aliases":"クイック幅木 / 1.5m"},{"id":"toeboard_12","name":"幅木 1.2","category":"幅木","weight":3.5,"unit":"枚","aliases":"クイック幅木 / 1.2m"},{"id":"toeboard_09","name":"幅木 0.9","category":"幅木","weight":3.0,"unit":"枚","aliases":"クイック幅木 / 0.9m"},{"id":"toeboard_06","name":"幅木 0.6","category":"幅木","weight":2.5,"unit":"枚","aliases":"クイック幅木 / 0.6m"},{"id":"stair_alumi","name":"階段（アルミ）","category":"階段・昇降","weight":11.9,"unit":"台","aliases":"階段枠 / アルミ階段"},{"id":"stair_handrail","name":"階段手摺","category":"階段・昇降","weight":3.0,"unit":"本","aliases":"階段用手摺"},{"id":"hatch_anti_18","name":"ハッチアンチ 1.8","category":"階段・昇降","weight":13.5,"unit":"枚","aliases":"ハッチ付きアンチ / タラップボード"},{"id":"jack_base","name":"ジャッキベース","category":"ジャッキ・ベース","weight":4.5,"unit":"個","aliases":"棒ジャッキ / ベースジャッキ"},{"id":"frame_base","name":"枠用ベース","category":"ジャッキ・ベース","weight":1.0,"unit":"個","aliases":"固定ベース / 枠足場ベース"},{"id":"pipe_05","name":"かんざしパイプ 0.5m","category":"単管足場用","weight":1.64,"unit":"本","aliases":"かんざし / 500"},{"id":"pipe_10","name":"単管パイプ 1.0m","category":"単管足場用","weight":2.73,"unit":"本","aliases":"単管 1.0m / φ48.6"},{"id":"pipe_15","name":"単管パイプ 1.5m","category":"単管足場用","weight":4.1,"unit":"本","aliases":"単管 1.5m / φ48.6"},{"id":"pipe_20","name":"単管パイプ 2.0m","category":"単管足場用","weight":5.46,"unit":"本","aliases":"単管 2.0m / φ48.6"},{"id":"pipe_25","name":"単管パイプ 2.5m","category":"単管足場用","weight":6.83,"unit":"本","aliases":"単管 2.5m / φ48.6"},{"id":"pipe_30","name":"単管パイプ 3.0m","category":"単管足場用","weight":8.19,"unit":"本","aliases":"単管 3.0m / φ48.6"},{"id":"pipe_35","name":"単管パイプ 3.5m","category":"単管足場用","weight":9.56,"unit":"本","aliases":"単管 3.5m / φ48.6"},{"id":"pipe_40","name":"単管パイプ 4.0m","category":"単管足場用","weight":10.92,"unit":"本","aliases":"単管 4.0m / φ48.6"},{"id":"pipe_45","name":"単管パイプ 4.5m","category":"単管足場用","weight":12.29,"unit":"本","aliases":"単管 4.5m / φ48.6"},{"id":"pipe_50","name":"単管パイプ 5.0m","category":"単管足場用","weight":13.65,"unit":"本","aliases":"単管 5.0m / φ48.6"},{"id":"pipe_55","name":"単管パイプ 5.5m","category":"単管足場用","weight":15.02,"unit":"本","aliases":"単管 5.5m / φ48.6"},{"id":"pipe_60","name":"単管パイプ 6.0m","category":"単管足場用","weight":16.38,"unit":"本","aliases":"単管 6.0m / φ48.6"},{"id":"tankan_base","name":"単管ベース","category":"単管足場用","weight":0.7,"unit":"個","aliases":"固定ベース / 単管用ベース / ベースプレート"},{"id":"clamp_right","name":"直交クランプ","category":"クランプ類","weight":0.7,"unit":"個","aliases":"兼用直交 / 直交"},{"id":"clamp_swivel","name":"自在クランプ","category":"クランプ類","weight":0.7,"unit":"個","aliases":"兼用自在 / 自在"},{"id":"clamp_triple","name":"三つ爪クランプ","category":"クランプ類","weight":1.2,"unit":"個","aliases":"三連クランプ / 三爪"},{"id":"pipe_joint","name":"単管ジョイント","category":"クランプ類","weight":0.6,"unit":"個","aliases":"直線ジョイント / パイプジョイント"},{"id":"catch_fixed","name":"キャッチクランプ 固定","category":"クランプ類","weight":1.0,"unit":"個","aliases":"キャッチ固定"},{"id":"catch_swivel","name":"キャッチクランプ 自在","category":"クランプ類","weight":1.0,"unit":"個","aliases":"キャッチ自在"},{"id":"bracket_500","name":"ブラケット 500","category":"ブラケット","weight":3.6,"unit":"個","aliases":"300〜500"},{"id":"bracket_750","name":"ブラケット 750","category":"ブラケット","weight":4.8,"unit":"個","aliases":"500〜750"},{"id":"bracket_1000","name":"ブラケット 1000","category":"ブラケット","weight":6.7,"unit":"個","aliases":"750〜1000"},{"id":"walltie_250","name":"壁つなぎ 250","category":"壁つなぎ","weight":1.2,"unit":"本","aliases":"つなぎ / 250mm"},{"id":"walltie_350","name":"壁つなぎ 350","category":"壁つなぎ","weight":1.4,"unit":"本","aliases":"つなぎ / 350mm"},{"id":"walltie_450","name":"壁つなぎ 450","category":"壁つなぎ","weight":1.6,"unit":"本","aliases":"つなぎ / 450mm"},{"id":"walltie_600","name":"壁つなぎ 600","category":"壁つなぎ","weight":1.9,"unit":"本","aliases":"つなぎ / 600mm"},{"id":"walltie_800","name":"壁つなぎ 800","category":"壁つなぎ","weight":2.3,"unit":"本","aliases":"つなぎ / 800mm"},{"id":"walltie_1000","name":"壁つなぎ 1000","category":"壁つなぎ","weight":2.7,"unit":"本","aliases":"つなぎ / 1000mm"},{"id":"alumi_board_1","name":"アルミ足場板 1m","category":"足場板","weight":4.0,"unit":"枚","aliases":"アルミ板 / 1m"},{"id":"alumi_board_2","name":"アルミ足場板 2m","category":"足場板","weight":7.0,"unit":"枚","aliases":"アルミ板 / 2m"},{"id":"alumi_board_3","name":"アルミ足場板 3m","category":"足場板","weight":10.0,"unit":"枚","aliases":"アルミ板 / 3m"},{"id":"alumi_board_4","name":"アルミ足場板 4m","category":"足場板","weight":13.0,"unit":"枚","aliases":"アルミ板 / 4m"},{"id":"soundpanel_18","name":"防音パネル 1.8m","category":"防音パネル","weight":13.0,"unit":"枚","aliases":"BG / 1.8パネル"},{"id":"soundpanel_15","name":"防音パネル 1.5m","category":"防音パネル","weight":11.0,"unit":"枚","aliases":"BG / 1.5パネル"},{"id":"soundpanel_12","name":"防音パネル 1.2m","category":"防音パネル","weight":9.0,"unit":"枚","aliases":"BG / 1.2パネル"},{"id":"soundpanel_09","name":"防音パネル 0.9m","category":"防音パネル","weight":7.0,"unit":"枚","aliases":"BG / 0.9パネル"},{"id":"soundpanel_06","name":"防音パネル 0.6m","category":"防音パネル","weight":5.0,"unit":"枚","aliases":"BG / 0.6パネル"},{"id":"soundpanel_corner","name":"防音パネル コーナー","category":"防音パネル","weight":6.5,"unit":"枚","aliases":"コーナーパネル"},{"id":"sound_clamp","name":"養生クランプ","category":"防音パネル","weight":0.5,"unit":"個","aliases":"防音パネル用クランプ / 日本セーフティー"},{"id":"sound_clamp_corner","name":"養生クランプ コーナー","category":"防音パネル","weight":0.45,"unit":"個","aliases":"コーナー用 / 防音パネル"},{"id":"graynet_1x10","name":"グレーネット 1×10","category":"グレーネット","weight":3.3,"unit":"枚","aliases":"日本セーフティー / 垂直養生ネット / グレー / 15mm目"},{"id":"graynet_4x12","name":"グレーネット 4×12","category":"グレーネット","weight":10.8,"unit":"枚","aliases":"日本セーフティー / 垂直養生ネット / グレー / 15mm目"},{"id":"graynet_6x6","name":"グレーネット 6×6","category":"グレーネット","weight":8.0,"unit":"枚","aliases":"日本セーフティー / 垂直養生ネット / グレー / 15mm目"},{"id":"graynet_6x10","name":"グレーネット 6×10","category":"グレーネット","weight":13.0,"unit":"枚","aliases":"日本セーフティー / 垂直養生ネット / グレー / 15mm目"},{"id":"graynet_6x12","name":"グレーネット 6×12","category":"グレーネット","weight":15.7,"unit":"枚","aliases":"日本セーフティー / 垂直養生ネット / グレー / 15mm目"},{"id":"net_rope","name":"ジョイントロープ（ネット用）","category":"グレーネット","weight":0.0,"unit":"本","aliases":"ネット結束 / 日本セーフティー"},{"id":"sound_sheet_1851","name":"認定防音シート 1.8×5.1","category":"シート・養生","weight":10.1,"unit":"枚","aliases":"日本セーフティー / 縦横兼用"},{"id":"sheet_clamp","name":"シートクランプ","category":"シート・養生","weight":0.4,"unit":"個","aliases":"日本セーフティー / メッシュシート用"},{"id":"sheet_rope","name":"ジョイントロープ（シート用）","category":"シート・養生","weight":0.0,"unit":"本","aliases":"600mm / 100本束"},{"id":"ns_asagao_frame_l","name":"朝顔 フレームL＋斜材","category":"朝顔材","weight":10.7,"unit":"本","aliases":"日本セーフティー / ALASLE"},{"id":"ns_asagao_frame_r","name":"朝顔 フレームR＋斜材","category":"朝顔材","weight":10.7,"unit":"本","aliases":"日本セーフティー / ALASRE"},{"id":"ns_asagao_upper_1800","name":"朝顔 万能板受け上 1.8","category":"朝顔材","weight":4.2,"unit":"本","aliases":"日本セーフティー / ALAM6A"},{"id":"ns_asagao_lower_1800","name":"朝顔 万能板受け下 1.8","category":"朝顔材","weight":3.7,"unit":"本","aliases":"日本セーフティー / ALAM6DN"},{"id":"ns_asagao_press_1800","name":"朝顔 万能板押え 1.8","category":"朝顔材","weight":1.8,"unit":"本","aliases":"日本セーフティー / ALAM6B"},{"id":"ns_asagao_stay_1800","name":"朝顔 振れ止め 1.8","category":"朝顔材","weight":2.1,"unit":"本","aliases":"日本セーフティー / ALAM6C"},{"id":"ns_asagao_mount","name":"朝顔 取付金具","category":"朝顔材","weight":2.9,"unit":"個","aliases":"日本セーフティー / ALAK"},{"id":"ns_asagao_frp","name":"朝顔 FRP製万能板","category":"朝顔材","weight":5.0,"unit":"枚","aliases":"日本セーフティー / ALAF / 青パネル"},{"id":"adflat_white_3m","name":"アドフラット 3m","category":"仮囲い","weight":18.0,"unit":"枚","aliases":"W500×H3000"},{"id":"adflat_white_2m","name":"アドフラット 2m","category":"仮囲い","weight":12.0,"unit":"枚","aliases":"W500×H2000"},{"id":"adflat_adjust_3m","name":"アドフラット 幅調整パネル 3m","category":"仮囲い","weight":17.0,"unit":"枚","aliases":"幅調整"},{"id":"adflat_corner_3m","name":"アドフラット コーナーパネル 3m","category":"仮囲い","weight":18.0,"unit":"枚","aliases":"コーナー"},{"id":"adflat_minidoor_3m","name":"アドフラット ミニドア 3m","category":"仮囲い","weight":23.5,"unit":"枚","aliases":"ミニドア"},{"id":"adflat_jhook","name":"Jフック","category":"仮囲い金物","weight":0.1,"unit":"個","aliases":"アドフラット用"},{"id":"adflat_joint_l","name":"ジョイント金具 L","category":"仮囲い金物","weight":0.18,"unit":"個","aliases":"アドフラット用"},{"id":"adflat_joint_s","name":"ジョイント金具 S","category":"仮囲い金物","weight":0.07,"unit":"個","aliases":"アドフラット用"},{"id":"lifeline_post","name":"先行親綱支柱","category":"安全設備","weight":4.9,"unit":"本","aliases":"日本セーフティー / 一般枠組足場用"},{"id":"lifeline_10","name":"親綱 10m","category":"安全設備","weight":1.9,"unit":"本","aliases":"日本セーフティー / φ16 / 青テープ"},{"id":"lifeline_20","name":"親綱 20m","category":"安全設備","weight":3.3,"unit":"本","aliases":"日本セーフティー / φ16 / 赤テープ"},{"id":"tensioner","name":"セイフティー緊張器","category":"安全設備","weight":1.1,"unit":"個","aliases":"日本セーフティー / 親綱緊張器 / 仮設工業会認定品"},{"id":"ns_sound_sheet_1851","name":"防音シート 1.8×5.1","category":"シート・養生","weight":9.4,"unit":"枚","aliases":"日本セーフティー / 縦横兼用"},{"id":"ns_sound_sheet_cert_1834","name":"認定防音シート 1.8×3.4","category":"シート・養生","weight":6.7,"unit":"枚","aliases":"日本セーフティー / 仮設工業会認定品"},{"id":"ns_daylight_sound_1851","name":"認定採光防音シート 1.8×5.1","category":"シート・養生","weight":0,"unit":"枚","aliases":"日本セーフティー / 採光タイプ / 縦横兼用"},{"id":"ns_daylight_sound_1834","name":"認定採光防音シート 1.8×3.4","category":"シート・養生","weight":0,"unit":"枚","aliases":"日本セーフティー / 採光タイプ"},{"id":"ns_paint_sheet","name":"塗装シート","category":"シート・養生","weight":0,"unit":"枚","aliases":"日本セーフティー / 改修工事用"},{"id":"ns_fire_sheet2","name":"防炎シート 2類","category":"シート・養生","weight":0,"unit":"枚","aliases":"日本セーフティー / 防水養生"},{"id":"ns_sound_clamp_next_straight","name":"次世代足場用養生クランプ 直線","category":"防音パネル","weight":0,"unit":"個","aliases":"日本セーフティー / φ42.6・48.6兼用"},{"id":"ns_sound_clamp_next_straight_plate","name":"次世代足場用養生クランプ 直線プレート付","category":"防音パネル","weight":0,"unit":"個","aliases":"日本セーフティー / φ42.6・48.6兼用"},{"id":"ns_sound_clamp_next_corner","name":"次世代足場用養生クランプ コーナー","category":"防音パネル","weight":0,"unit":"個","aliases":"日本セーフティー / φ42.6・48.6兼用"},{"id":"ns_sound_clamp_next_corner_plate","name":"次世代足場用養生クランプ コーナープレート付","category":"防音パネル","weight":0,"unit":"個","aliases":"日本セーフティー / φ42.6・48.6兼用"},{"id":"ns_shinobigaeshi_bracket","name":"忍び返しブラケット","category":"安全設備","weight":0,"unit":"個","aliases":"日本セーフティー / 解体飛散防止"},{"id":"ns_lifeline_6","name":"親綱 6m","category":"安全設備","weight":1.4,"unit":"本","aliases":"日本セーフティー / φ16 / 黒テープ"},{"id":"ns_lifeline_8","name":"親綱 8m","category":"安全設備","weight":1.6,"unit":"本","aliases":"日本セーフティー / φ16 / 緑テープ"},{"id":"ns_lifeline_12","name":"親綱 12m","category":"安全設備","weight":2.2,"unit":"本","aliases":"日本セーフティー / φ16 / 白テープ"},{"id":"ns_lifeline_15","name":"親綱 15m","category":"安全設備","weight":2.6,"unit":"本","aliases":"日本セーフティー / φ16 / 黄テープ"},{"id":"ns_safety_block_10","name":"セイフティーブロックU型 10m","category":"安全設備","weight":4.9,"unit":"台","aliases":"日本セーフティー / ウルトラロック"},{"id":"ns_safety_block_15","name":"セイフティーブロックU型 15m","category":"安全設備","weight":6.3,"unit":"台","aliases":"日本セーフティー / ウルトラロック"},{"id":"ns_safety_block_20","name":"セイフティーブロックU型 20m","category":"安全設備","weight":6.7,"unit":"台","aliases":"日本セーフティー / ウルトラロック"},{"id":"ns_safety_block_25","name":"セイフティーブロックU型 25m","category":"安全設備","weight":13.1,"unit":"台","aliases":"日本セーフティー / ウルトラロック"},{"id":"ns_safety_block_ladder_frame","name":"梯子用安全ブロック取付枠","category":"安全設備","weight":0,"unit":"台","aliases":"日本セーフティー / 昇降用はしご"},{"id":"ns_rebar_lifeline_post","name":"鉄筋用親綱支柱","category":"安全設備","weight":10.54,"unit":"本","aliases":"日本セーフティー / D19〜D41"},{"id":"ns_shoring_lifeline_post","name":"山留親綱支柱","category":"安全設備","weight":12.4,"unit":"本","aliases":"日本セーフティー / 腹起しH鋼用 / 平行・直交兼用"},{"id":"ns_adflat_r","name":"アドフラットRパネル","category":"仮囲い","weight":0,"unit":"枚","aliases":"日本セーフティー / 仮囲い"},{"id":"ns_adflat_door_button","name":"アドフラット ドア ボタン錠","category":"仮囲い","weight":0,"unit":"台","aliases":"日本セーフティー / 仮設ドア"},{"id":"ns_adflat_sliding_door","name":"アドフラット 引違い戸","category":"仮囲い","weight":0,"unit":"台","aliases":"日本セーフティー / 仮設引戸"},{"id":"ns_adflat_toeboard","name":"アドフラット用巾木","category":"仮囲い金物","weight":0,"unit":"本","aliases":"日本セーフティー / 仮囲い"},{"id":"ns_base_anchor","name":"ベースアンカー","category":"仮囲い金物","weight":0,"unit":"個","aliases":"日本セーフティー / 足場・仮囲い固定"},{"id":"ns_tankan_pile","name":"単管杭","category":"仮囲い金物","weight":0,"unit":"本","aliases":"日本セーフティー / 仮囲い"},{"id":"ns_guardfence_toeboard","name":"ガードフェンス巾木 W1800","category":"仮囲い","weight":0,"unit":"枚","aliases":"日本セーフティー / ホワイト"},{"id":"russell_net_05x6","name":"ラッセルネット 0.5×6","category":"グレーネット","weight":0.0,"unit":"枚","aliases":"小巾ネット 0.5×6 / ラッセル / 日本セーフティー"},{"id":"russell_net_1x6","name":"ラッセルネット 1×6","category":"グレーネット","weight":0.0,"unit":"枚","aliases":"小巾ネット 1×6 / ラッセル / 日本セーフティー"},{"id":"russell_net_2x6","name":"ラッセルネット 2×6","category":"グレーネット","weight":0.0,"unit":"枚","aliases":"小巾ネット 2×6 / ラッセル / 日本セーフティー"},{"id":"russell_br_s","name":"ラッセルブラ S","category":"ブラケット","weight":0.0,"unit":"個","aliases":"ネットブラケット S / 小巾ネット用 / 日本セーフティー"},{"id":"russell_br_l","name":"ラッセルブラ L","category":"ブラケット","weight":0.0,"unit":"個","aliases":"ネットブラケット L / 小巾ネット用 / 日本セーフティー"},{"id":"net_wing_300","name":"ネットウイング 300","category":"グレーネット","weight":1.4,"unit":"個","aliases":"日本セーフティー / ネットウィング300"},{"id":"net_wing_500","name":"ネットウイング 500","category":"グレーネット","weight":1.7,"unit":"個","aliases":"日本セーフティー / ネットウィング500"},{"id":"hagaita_clamp","name":"羽子板クランプ","category":"クランプ類","weight":0.0,"unit":"個","aliases":"羽子板 / ハゴイタ / 羽子板金具"},{"id":"misc_bansen","name":"番線","category":"その他","weight":0.0,"unit":"束","aliases":"なまし番線 / 結束番線"},{"id":"misc_anchor","name":"アンカー","category":"その他","weight":0.0,"unit":"本","aliases":"足場アンカー / アンカーボルト"},{"id":"misc_binding_wire","name":"結束線","category":"その他","weight":0.0,"unit":"束","aliases":"結束ワイヤー"},{"id":"misc_sheet_tie","name":"シート紐","category":"その他","weight":0.0,"unit":"本","aliases":"シートひも / 養生シート紐 / 防音シート紐 / 1本"}];

const DEPRECATED_MATERIAL_RE = /(ロック\s*付?\s*連結ピン|軽量足場板|^手摺[\s　]*(?:0[.．]6|0[.．]9|1[.．]2|1[.．]5|1[.．]8)$)/;
function cleanMaterialMaster(list){
  const out=[]; const seen=new Set();
  for(const m of (Array.isArray(list)?list:[])){
    const name=String(m?.name||'').trim();
    if(!name||DEPRECATED_MATERIAL_RE.test(name)) continue;
    const key=name.replace(/\s+/g,'').toLowerCase();
    if(seen.has(key)) continue; seen.add(key); out.push(m);
  }
  return out;
}

function loadMaterialMaster(){
  try{
    const saved=JSON.parse(lsGet('vertx_core_materials')||'null');
    if(Array.isArray(saved)&&saved.length){
      const byId=new Map(saved.map(x=>[x.id,x]));
      const merged=DEFAULT_MATERIALS.map(d=>byId.has(d.id)?{...d,...byId.get(d.id)}:{...d});
      const cleaned=cleanMaterialMaster(merged);
      lsSet('vertx_core_materials',JSON.stringify(cleaned));
      return cleaned;
    }
  }catch(e){}
  return cleanMaterialMaster(DEFAULT_MATERIALS.map(x=>({...x})));
}
let MATERIALS=cleanMaterialMaster(loadMaterialMaster());
const FRIENDLY_MATERIAL_MIGRATION="v7.9-sheet-tie";
(function migrateCuratedMaterialMaster(){
  if(lsGet("vertx_core_material_migration")===FRIENDLY_MATERIAL_MIGRATION)return;
  const savedById=new Map(MATERIALS.map(m=>[m.id,m]));
  MATERIALS=DEFAULT_MATERIALS.map(d=>savedById.has(d.id)?{...d,...savedById.get(d.id)}:{...d});
  MATERIALS=cleanMaterialMaster(MATERIALS);
  lsSet('vertx_core_materials',JSON.stringify(MATERIALS));
  lsSet('vertx_core_material_migration',FRIENDLY_MATERIAL_MIGRATION);
})();
// v7.6: normalize standard field labels/categories once, while keeping company-specific weights/hidden state.
const MATERIAL_MENU_MIGRATION="v7.6-menu-fix";
(function migrateV76MaterialMenu(){
  if(lsGet('vertx_core_material_menu_migration')===MATERIAL_MENU_MIGRATION)return;
  const rename={
    frame_600:'枠 610',frame_900:'枠 914',frame_1200:'枠 1224',
    brace_06:'ブレス 610',brace_09:'ブレス 914',brace_12:'ブレス 1224',brace_15:'ブレス 1519',brace_18:'ブレス 1829'
  };
  MATERIALS=MATERIALS.map(m=>{
    const x={...m};
    if(rename[x.id])x.name=rename[x.id];
    if(/^frame_/.test(x.id))x.category='枠足場用';
    if(/^ns_asagao_/.test(x.id))x.category='朝顔材';
    return x;
  });
  lsSet('vertx_core_materials',JSON.stringify(MATERIALS));
  lsSet('vertx_core_material_menu_migration',MATERIAL_MENU_MIGRATION);
})();
const state={cart:(()=>{try{return JSON.parse(lsGet('vertx_core_draft_cart')||'{}')}catch{return {}}})(),category:'すべて',search:'',selectedSite:lsGet('vertx_core_last_site')||'',selectedDrawingId:null,aiSource:null,favorites:new Set(JSON.parse(lsGet('vertx_core_favorites')||'[]'))};

const RECENT_MATERIAL_KEY='vertx_core_recent_materials_v715';
const SITE_PATTERN_KEY='vertx_core_site_patterns_v715';
const AUDIT_LOG_KEY='vertx_core_audit_log_v715';
const ORDER_META_KEY='vertx_core_order_meta_v715';
const RETURN_META_KEY='vertx_core_return_meta_v715';
function getOrderMeta(){try{return JSON.parse(lsGet(ORDER_META_KEY)||'{}')}catch{return {}}}
function saveOrderMeta(){const v={date:$('#deliveryDate')?.value||'',time:$('#deliveryTime')?.value||'',memo:$('#orderMemo')?.value||'',supplier:$('#confirmSupplier')?.value||''};lsSet(ORDER_META_KEY,JSON.stringify(v))}
function restoreOrderMeta(){const v=getOrderMeta();if($('#deliveryDate'))$('#deliveryDate').value=v.date||$('#deliveryDate').value;if($('#deliveryTime'))$('#deliveryTime').value=v.time||'';if($('#orderMemo'))$('#orderMemo').value=v.memo||'';if($('#confirmSupplier')&&v.supplier)$('#confirmSupplier').value=v.supplier}
function getReturnMeta(){try{return JSON.parse(lsGet(RETURN_META_KEY)||'{}')}catch{return {}}}
function saveReturnMeta(){const v={truck:$('#loadTruckCapacity')?.value||'3000',custom:$('#loadCustomCapacity')?.value||'',site:$('#returnTruckSite')?.value||'',date:$('#returnTruckDate')?.value||'',time:$('#returnTruckTime')?.value||'',memo:$('#returnTruckMemo')?.value||''};lsSet(RETURN_META_KEY,JSON.stringify(v))}
function restoreReturnMeta(){const v=getReturnMeta();if($('#loadTruckCapacity')&&v.truck)$('#loadTruckCapacity').value=v.truck;if($('#loadCustomCapacity'))$('#loadCustomCapacity').value=v.custom||'';if($('#returnTruckSite')&&v.site)$('#returnTruckSite').value=v.site;if($('#returnTruckDate')&&v.date)$('#returnTruckDate').value=v.date;if($('#returnTruckMemo'))$('#returnTruckMemo').value=v.memo||''}
const FIELD_ALIAS_MAP={
  '4板':['alumi_board_4'],'四板':['alumi_board_4'],'2板':['alumi_board_2'],'二板':['alumi_board_2'],
  '3板':['alumi_board_3'],'三板':['alumi_board_3'],'1板':['alumi_board_1'],'一板':['alumi_board_1'],
  '羽子板':['hagaita_clamp'],'ハゴイタ':['hagaita_clamp'],'かんざし':['pipe_05'],
  'ラッセルブラ':['russell_br_s','russell_br_l'],'ラッセル':['russell_net_05x6','russell_net_1x6','russell_net_2x6'],
  'シートひも':['misc_sheet_tie'],'シート紐':['misc_sheet_tie']
};
function getRecentMaterials(){try{return JSON.parse(lsGet(RECENT_MATERIAL_KEY)||'[]')}catch{return []}}
function rememberMaterial(id){const a=getRecentMaterials().filter(x=>String(x)!==String(id));a.unshift(id);lsSet(RECENT_MATERIAL_KEY,JSON.stringify(a.slice(0,12)))}
function getSitePatterns(){try{return JSON.parse(lsGet(SITE_PATTERN_KEY)||'{}')}catch{return {}}}
function saveSitePatterns(v){lsSet(SITE_PATTERN_KEY,JSON.stringify(v))}
function learnSitePattern(order){if(!order?.site||order.site==='現場名未入力'||!order.items?.length)return;const d=getSitePatterns();const row=d[order.site]||{orders:0,items:{}};row.orders=(row.orders||0)+1;for(const i of order.items){const r=row.items[i.id]||{sum:0,count:0,lastQty:0,lastAt:''};r.sum+=Number(i.qty)||0;r.count+=1;r.lastQty=Number(i.qty)||0;r.lastAt=new Date().toISOString();row.items[i.id]=r}row.updatedAt=new Date().toISOString();d[order.site]=row;saveSitePatterns(d)}
function getAuditLog(){try{return JSON.parse(lsGet(AUDIT_LOG_KEY)||'[]')}catch{return []}}
function audit(action,detail=''){const s=getCompanySession()||{};const a=getAuditLog();a.unshift({id:Date.now(),action,detail,user:s.user||cloudUser?.email||'',role:s.role||'',at:new Date().toISOString()});lsSet(AUDIT_LOG_KEY,JSON.stringify(a.slice(0,300)))}
function renderAuditLog(){const root=$('#auditLogList');if(!root)return;const a=getAuditLog();root.innerHTML=a.length?a.map(x=>`<article class="card audit-row"><div><b>${escapeHtml(x.action)}</b><small>${escapeHtml(x.detail||'')}</small></div><div><strong>${escapeHtml(x.user||'-')}</strong><small>${formatDate(x.at)}</small></div></article>`).join(''):'<div class="card empty">操作履歴はまだありません</div>'}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function applyV4MaterialCleanup(){
  const removeIds=new Set(['nk_043','nk_065','nk_068','nk_071','nk_074','nk_075']);
  MATERIALS=cleanMaterialMaster(MATERIALS).filter(m=>!removeIds.has(m.id));
  const seen=new Set();
  MATERIALS=MATERIALS.filter(m=>{const key=(m.name||'').trim();if(seen.has(key))return false;seen.add(key);return true});
  lsSet('vertx_core_materials',JSON.stringify(MATERIALS));
}
applyV4MaterialCleanup();
// v5: always persist the cleaned master so legacy browser/cloud data cannot reappear.
MATERIALS=cleanMaterialMaster(MATERIALS);
lsSet('vertx_core_materials',JSON.stringify(MATERIALS));
let photoAiFiles=[],photoAiCandidates=[];


function go(screenId){
  if(screenId!=='home'&&!canOpenScreen(screenId)){toast('この機能を使う権限がありません');return false}
  try{lsSet('vertx_core_last_screen',screenId)}catch{}
  document.body.dataset.screen=screenId;
  $$('.screen').forEach(el=>el.classList.toggle('active',el.id===screenId));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.go===screenId || (screenId==='confirm'&&el.dataset.go==='order')));
  if(screenId==='history')renderHistory(); if(screenId==='more')updateLearningCount(); if(screenId==='confirm')renderConfirm(); if(screenId==='sites')renderSites(); if(screenId==='favorites')renderFavorites(); if(screenId==='materialsMaster')renderMaterialMaster(); if(screenId==='drawings')renderDrawings();if(screenId==='assist')loadAssistDrawings();if(screenId==='siteStock')renderSiteStock();if(screenId==='shortage')renderShortage();if(screenId==='sets')renderSets();if(screenId==='dispatch')renderDispatch();if(screenId==='compare')loadCompareDrawings();if(screenId==='siteDashboard')renderSiteDashboard();if(screenId==='analytics')renderAnalytics();if(screenId==='members')renderMembers();if(screenId==='plans')renderPlans();if(screenId==='returns')renderReturns();if(screenId==='returnLoad')renderReturnLoad();if(screenId==='siteCosts')renderSiteCosts();if(screenId==='siteQr')renderSiteQr();if(screenId==='suppliers')renderSuppliers();if(screenId==='auditLog')renderAuditLog();if(screenId==='devTest')renderDevTestPanel();if(screenId==='dailyReport')renderDailyReport();if(screenId==='siteAlbum')renderSiteAlbum();if(screenId==='clientShare')renderClientShare();
  window.scrollTo({top:0,behavior:'instant'});
}
function totals(){return MATERIALS.reduce((a,m)=>{const q=state.cart[m.id]||0;a.qty+=q;a.weight+=q*Number(m.weight||0);return a},{qty:0,weight:0})}
function selectedItems(){return MATERIALS.filter(m=>(state.cart[m.id]||0)>0).map(m=>({...m,qty:state.cart[m.id]}))}
function truckFor(weightKg){const tons=weightKg/1000;if(tons<=0.35)return '軽トラ';if(tons<=2)return '2t車';if(tons<=3)return '3t車';if(tons<=4)return '4t車';if(tons<=6)return '6t車';if(tons<=8)return '8t車';if(tons<=10)return '10t車';return '10t車以上／複数便'}
function formatWeight(weightKg){return `${Number(weightKg).toFixed(1)}kg / ${(Number(weightKg)/1000).toFixed(2)}t`}

const CATEGORY_ORDER=['枠足場用','アンチ','ハーフアンチ','ブレス','下さん','幅木','階段・昇降','ジャッキ・ベース','単管足場用','クランプ類','ブラケット','壁つなぎ','足場板','防音パネル','グレーネット','シート・養生','朝顔材','仮囲い','仮囲い金物','安全設備'];
const GROUP_ORDER=['枠足場用','単管足場用','クランプ類','ジャッキ・ベース','壁つなぎ','防音パネル','朝顔材','仮囲い・アドフラット','シート・養生類','安全設備','階段・昇降','その他'];
function materialGroup(m){
  const n=`${m.name} ${m.aliases||''}`;
  if(m.category==='枠足場用') return '枠足場用';
  if(m.category==='朝顔材'||/朝顔/.test(n)) return '朝顔材';
  if(m.category==='クランプ・金物'||/クランプ|キャッチ/.test(n)) return 'クランプ類';
  if(m.category==='ジャッキ・ベース'||/ジャッキ|固定ベース|ベース/.test(n)) return 'ジャッキ・ベース';
  if(m.category==='壁つなぎ'||/壁つなぎ|壁繋/.test(n)) return '壁つなぎ';
  if(m.category==='防音パネル'||/防音パネル|透過パネル|フラットパネル/.test(n)) return '防音パネル';
  if(['仮囲い','仮囲い金物'].includes(m.category)||/アドフラット|Jフック|ジョイント金具/.test(n)) return '仮囲い・アドフラット';
  if(['グレーネット','シート・養生','養生・ネット'].includes(m.category)||/シート|ネット|メッシュ|養生/.test(n)) return 'シート・養生類';
  if(m.category==='安全設備'||/親綱|セイフティーブロック|安全ブロック|忍び返し/.test(n)) return '安全設備';
  if(m.category==='階段・昇降'||/階段|タラップ|梯子|はしご/.test(n)) return '階段・昇降';
  if(m.category==='単管足場用'||m.category==='単管'||/単管|ブラケット|くい丸|杭/.test(n)) return '単管足場用';
  if(['枠足場用','枠','枠組','アンチ','ハーフアンチ','ブレス','下さん','幅木','足場板','手摺・下さん','布板・足場板','梁・補強'].includes(m.category)||/建枠|調整枠|アンチ|ブレス|筋違|手摺|下さん|布板|足場板|幅木|連結ピン/.test(n)) return '枠足場用';
  return 'その他';
}
function renderCategories(){const cats=['すべて',...GROUP_ORDER];$('#categoryChips').innerHTML=cats.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');$$('#categoryChips .chip').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;renderCategories();renderMaterials()})}
function preferredLengthRank(name,category){
  const n=String(name).replace(/０/g,'0').replace(/１/g,'1').replace(/２/g,'2').replace(/３/g,'3').replace(/４/g,'4').replace(/５/g,'5').replace(/６/g,'6').replace(/７/g,'7').replace(/８/g,'8').replace(/９/g,'9').replace(/．/g,'.');
  if(category==='枠'||category==='枠足場用'){
    if(/(?:枠|^).*610/.test(n)) return 10;
    if(/(?:枠|^).*914/.test(n)) return 20;
    if(/(?:枠|^).*1224/.test(n)) return 30;
  }
  if(['アンチ','ハーフアンチ','ブレス','下さん','幅木','手摺・下さん','防音パネル'].includes(category)){
    const mmOrder=['1829','1519','1224','914','610'];
    for(let i=0;i<mmOrder.length;i++) if(n.includes(mmOrder[i])) return 10+i;
    const metricOrder=[1.8,1.5,1.2,0.9,0.6];
    for(let i=0;i<metricOrder.length;i++) if(new RegExp(`(?:^|\s)${String(metricOrder[i]).replace('.', '\.')}(?:m|$|\s)`).test(n)) return 10+i;
  }
  if(category==='単管'){
    const m=n.match(/([0-9]+(?:\.[0-9]+)?)\s*m/i); if(m) return 100+Number(m[1]);
  }
  if(category==='壁つなぎ'){
    const m=n.match(/([0-9]{2,4})/); if(m) return 100+Number(m[1])/1000;
  }
  return 999;
}
function materialSort(a,b){
  const ai=CATEGORY_ORDER.indexOf(a.category),bi=CATEGORY_ORDER.indexOf(b.category),ap=ai<0?999:ai,bp=bi<0?999:bi;
  if(ap!==bp) return ap-bp;
  const ar=preferredLengthRank(a.name,a.category),br=preferredLengthRank(b.name,b.category);
  if(ar!==br) return ar-br;
  return a.name.localeCompare(b.name,'ja',{numeric:true});
}
function orderedMaterials(list){
  return (list||[]).slice().sort((a,b)=>{
    const ga=GROUP_ORDER.indexOf(materialGroup(a)),gb=GROUP_ORDER.indexOf(materialGroup(b));
    const gap=ga<0?999:ga,gbp=gb<0?999:gb;
    if(gap!==gbp)return gap-gbp;
    return materialSort(a,b);
  });
}
function materialOptionsByOrder(list){
  const groups={};orderedMaterials(list).forEach(m=>{const g=materialGroup(m);(groups[g]||(groups[g]=[])).push(m)});
  return GROUP_ORDER.filter(g=>groups[g]?.length).map(g=>`<optgroup label="${escapeHtml(g)}">${groups[g].map(m=>`<option value="${m.id}">${escapeHtml(m.name)}｜${Number(m.weight||0).toFixed(2)}kg/${escapeHtml(m.unit||'')}</option>`).join('')}</optgroup>`).join('');
}
function materialCard(m){const q=state.cart[m.id]||0,f=state.favorites.has(m.id);const spec=(m.aliases||'').trim();return `<article class="material ${q?'selected':''}"><div class="material-actions"><button class="fav-btn ${f?'active':''}" data-fav="${m.id}" aria-label="お気に入り" title="お気に入り">☆</button><button class="material-more" data-material-edit="${m.id}" aria-label="資材名・単重・カテゴリーを変更"><span>•••</span><small>編集</small></button></div><div class="material-info"><b>${escapeHtml(m.name)}</b>${spec?`<small class="material-spec">${escapeHtml(spec)}</small>`:''}<small>${escapeHtml(m.category)} · ${Number(m.weight).toFixed(2)}kg/${escapeHtml(m.unit)}</small></div><div class="qty-control"><button data-action="minus" data-id="${m.id}">−</button><input data-qty="${m.id}" inputmode="numeric" value="${q}" aria-label="${escapeHtml(m.name)}数量"><button data-action="plus" data-id="${m.id}">＋</button></div></article>`}
function bindMaterialControls(root=document){root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>changeQty(b.dataset.id,b.dataset.action==='plus'?1:-1));root.querySelectorAll('[data-qty]').forEach(i=>i.onchange=()=>setQty(i.dataset.qty,Number(i.value)));root.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav));root.querySelectorAll('[data-material-edit]').forEach(b=>b.onclick=()=>openMaterialQuickEdit(b.dataset.materialEdit))}
function openMaterialQuickEdit(id){const m=MATERIALS.find(x=>String(x.id)===String(id));const modal=$('#materialQuickEdit');if(!m||!modal)return;modal.dataset.materialId=m.id;$('#quickMaterialOriginal').textContent=`標準名 / ${m.aliases?.split('/')[0]?.trim()||m.name}`;$('#quickMaterialName').value=m.name;$('#quickMaterialWeight').value=Number(m.weight||0);$('#quickMaterialCategory').value=m.category||'その他';$('#quickMaterialHidden').checked=!!m.hidden;modal.classList.remove('hidden');document.body.classList.add('modal-open')}
function closeMaterialQuickEdit(){const modal=$('#materialQuickEdit');if(modal)modal.classList.add('hidden');document.body.classList.remove('modal-open')}
function saveMaterialQuickEdit(){const modal=$('#materialQuickEdit');const m=MATERIALS.find(x=>String(x.id)===String(modal?.dataset.materialId));if(!m)return;const name=$('#quickMaterialName').value.trim();if(!name)return toast('資材名を入力してください');m.name=name;m.weight=Math.max(0,Number($('#quickMaterialWeight').value)||0);m.category=$('#quickMaterialCategory').value.trim()||'その他';m.hidden=$('#quickMaterialHidden').checked;saveMaterialMaster();audit('資材設定変更',`${m.name} / ${m.category} / ${m.weight}kg`);closeMaterialQuickEdit();renderMaterials();toast('この会社の資材名を変更しました')}
function fieldAliasIds(query){const q=String(query||'').trim().toLowerCase();const out=[];for(const [k,ids] of Object.entries(FIELD_ALIAS_MAP)){if(q.includes(k.toLowerCase())||k.toLowerCase().includes(q))out.push(...ids)}return new Set(out)}
function renderRecentAndSiteSuggestions(){const recent=$('#recentMaterialsBar'),siteBox=$('#siteSmartSuggestions');if(recent){const ids=getRecentMaterials();const list=ids.map(id=>MATERIALS.find(m=>String(m.id)===String(id))).filter(m=>m&&!m.hidden).slice(0,8);recent.innerHTML=list.length?`<div class="quick-strip-title">最近使った資材</div><div class="quick-strip">${list.map(m=>`<button data-quick-add="${m.id}"><b>${escapeHtml(m.name)}</b><small>＋1</small></button>`).join('')}</div>`:'';recent.classList.toggle('hidden',!list.length)}if(siteBox){const d=getSitePatterns(),row=d[state.selectedSite];if(!state.selectedSite||!row){siteBox.classList.add('hidden');siteBox.innerHTML=''}else{const picks=Object.entries(row.items||{}).map(([id,x])=>({m:MATERIALS.find(mm=>String(mm.id)===String(id)),avg:Math.max(1,Math.round((Number(x.sum)||0)/(Number(x.count)||1))),score:Number(x.count)||0})).filter(x=>x.m&&!x.m.hidden).sort((a,b)=>b.score-a.score).slice(0,6);siteBox.classList.toggle('hidden',!picks.length);siteBox.innerHTML=picks.length?`<div class="smart-suggest-head"><div><span>この現場の定番</span><b>${escapeHtml(state.selectedSite)}</b></div><button id="applySitePatternBtn">まとめて追加</button></div><div class="quick-strip">${picks.map(x=>`<button data-site-smart="${x.m.id}" data-smart-qty="${x.avg}"><b>${escapeHtml(x.m.name)}</b><small>目安 ${x.avg}${escapeHtml(x.m.unit)}</small></button>`).join('')}</div>`:'';if($('#applySitePatternBtn'))$('#applySitePatternBtn').onclick=()=>{for(const x of picks){state.cart[x.m.id]=(state.cart[x.m.id]||0)+x.avg;rememberMaterial(x.m.id)}persistDraftState();renderMaterials();toast('この現場の定番を追加しました')};siteBox.querySelectorAll('[data-site-smart]').forEach(b=>b.onclick=()=>{const id=b.dataset.siteSmart,q=Number(b.dataset.smartQty)||1;state.cart[id]=(state.cart[id]||0)+q;rememberMaterial(id);persistDraftState();renderMaterials()})}}document.querySelectorAll('[data-quick-add]').forEach(b=>b.onclick=()=>{changeQty(b.dataset.quickAdd,1)})}
function renderMaterials(){
  const q=state.search.trim().toLowerCase();const aliasIds=fieldAliasIds(q);
  const list=orderedMaterials(MATERIALS.filter(m=>!m.hidden&&(state.category==='すべて'||materialGroup(m)===state.category)&&(!q||`${m.name} ${m.aliases||''}`.toLowerCase().includes(q)||aliasIds.has(m.id))));
  const root=$('#materialList');
  if(!list.length){root.innerHTML='<div class="card empty">該当する資材がありません</div>';}else{
    const groups={};list.forEach(m=>{const g=materialGroup(m);(groups[g]||(groups[g]=[])).push(m)});
    root.innerHTML=GROUP_ORDER.filter(g=>groups[g]?.length).map(g=>`<section class="material-group"><div class="material-group-title"><b>${escapeHtml(g)}</b><span>${groups[g].length}種類</span></div><div class="material-group-list">${groups[g].map(materialCard).join('')}</div></section>`).join('');
  }
  bindMaterialControls(root);renderOrderTotals();renderSiteBanner();renderRecentAndSiteSuggestions();
}
function renderFavorites(){const list=MATERIALS.filter(m=>state.favorites.has(m.id));$('#favoriteList').innerHTML=list.length?list.map(materialCard).join(''):'<div class="card empty">★を押した資材がここに表示されます</div>';bindMaterialControls($('#favoriteList'))}
function persistDraftState(){try{lsSet('vertx_core_draft_cart',JSON.stringify(state.cart||{}));lsSet('vertx_core_last_site',state.selectedSite||'')}catch{}}
function changeQty(id,d){state.cart[id]=Math.max(0,(state.cart[id]||0)+d);if(d>0)rememberMaterial(id);persistDraftState();renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function setQty(id,v){state.cart[id]=Math.max(0,Math.floor(Number.isFinite(v)?v:0));if(state.cart[id]>0)rememberMaterial(id);persistDraftState();renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function toggleFavorite(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);lsSet('vertx_core_favorites',JSON.stringify([...state.favorites]));renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites();toast('お気に入りを更新しました')}
function renderOrderTotals(){const t=totals();$('#totalQty').textContent=t.qty;$('#totalWeight').textContent=t.weight.toFixed(1);$('#totalTons').textContent=(t.weight/1000).toFixed(2);$('#toConfirmBtn').disabled=t.qty===0}
function renderSiteBanner(){const el=$('#selectedSiteBanner');if(state.selectedSite){el.classList.remove('hidden');el.innerHTML=`<span>現場</span><strong>${escapeHtml(state.selectedSite)}</strong><button id="clearSiteBtn">変更</button>`;$('#clearSiteBtn').onclick=()=>go('sites')}else el.classList.add('hidden')}

function getSites(){try{return JSON.parse(lsGet('vertx_core_sites')||'[]')}catch{return []}}
function saveSites(v){lsSet('vertx_core_sites',JSON.stringify(v))}
function renderSites(){const sites=getSites();$('#siteList').innerHTML=sites.length?sites.map((s,i)=>`<article class="card site-card"><button class="site-select" data-site="${escapeHtml(s)}"><span>📍</span><b>${escapeHtml(s)}</b><small>この現場で注文を作る</small></button><button class="site-delete" data-site-index="${i}">×</button></article>`).join(''):'<div class="card empty">現場を追加すると、ここからすぐ注文できます</div>';$$('[data-site]').forEach(b=>b.onclick=()=>{state.selectedSite=b.dataset.site;persistDraftState();$('#siteName').value=state.selectedSite;go('order')});$$('[data-site-index]').forEach(b=>b.onclick=()=>{const a=getSites();a.splice(Number(b.dataset.siteIndex),1);saveSites(a);renderSites()})}
function addSite(){const name=$('#newSiteName').value.trim();if(!name)return toast('現場名を入力してください');const sites=getSites();if(!sites.includes(name))sites.unshift(name);saveSites(sites);audit('現場追加',name);$('#newSiteName').value='';renderSites();toast('現場を追加しました')}

function currentDraft(){const items=selectedItems(),t=totals();return {id:'draft',site:$('#siteName')?.value.trim()||state.selectedSite||'現場名未入力',date:$('#deliveryDate')?.value||'',time:$('#deliveryTime')?.value||'',memo:$('#orderMemo')?.value.trim()||'',createdAt:new Date().toISOString(),items,qty:t.qty,weight:t.weight,truck:truckFor(t.weight),drawingId:state.selectedDrawingId,drawingName:$('#selectedDrawingName')?.textContent||'',supplierId:Number($('#confirmSupplier')?.value)||null,supplierName:getSuppliers().find(x=>Number(x.id)===Number($('#confirmSupplier')?.value))?.name||''}}
function renderConfirm(){if($('#confirmSupplier'))$('#confirmSupplier').innerHTML='<option value="">未選択</option>'+getSuppliers().map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');restoreOrderMeta();const o=currentDraft();$('#confirmItems').innerHTML=o.items.map(i=>`<div class="confirm-row"><span>${escapeHtml(i.name)}</span><strong>${i.qty}${escapeHtml(i.unit)} <small>(${(i.qty*i.weight).toFixed(1)}kg)</small></strong></div>`).join('')||'<div class="empty">資材が選択されていません</div>';$('#confirmQty').textContent=`${o.qty}点`;$('#confirmWeight').textContent=formatWeight(o.weight);$('#truckRecommendation').textContent=o.truck;renderMissingCheck(o.items);
  const drawBox=$('#confirmDrawing');
  if(drawBox){
    drawBox.innerHTML=o.drawingId?`<span>添付図面</span><strong>${escapeHtml(o.drawingName||'図面')}</strong>`:'<span>添付図面</span><strong>なし</strong>';
  }
}
function getHistory(){try{return JSON.parse(lsGet('vertx_core_orders')||'[]')}catch{return []}}
function saveHistory(v){lsSet('vertx_core_orders',JSON.stringify(v));updateDashboard()}
function submitOrder(){const order=currentDraft();if(!order.items.length){toast('資材を選択してください');go('order');return}order.id=Date.now();const role=getEffectiveRole();order.status=['owner','admin'].includes(role)?'発注済':'承認待ち';order.testRole=isDevTestMode()?role:'';order.requestedBy=getCompanySession()?.user||cloudUser?.email||'';const history=getHistory();history.unshift(order);saveHistory(history);order.items.forEach(i=>rememberMaterial(i.id));learnSitePattern(order);audit('注文作成',`${order.site} / ${order.qty}点 / ${formatWeight(order.weight)} / ${order.status}`);if(state.aiSource)saveAiLearningExample(state.aiSource);const sites=getSites();if(order.site!=='現場名未入力'&&!sites.includes(order.site)){sites.unshift(order.site);saveSites(sites)}state.cart={};state.selectedSite='';state.selectedDrawingId=null;state.aiSource=null;lsRemove('vertx_core_draft_cart');lsRemove('vertx_core_last_site');lsRemove(ORDER_META_KEY);$('#siteName').value='';$('#orderMemo').value='';renderMaterials();go('success')}
function renderHistory(){const h=getHistory();const canApprove=['owner','admin'].includes(getEffectiveRole());$('#historyList').innerHTML=h.length?h.map(o=>`<article class="card history-card"><header><div><h3>${escapeHtml(o.site)}</h3><div class="history-meta">${formatDate(o.createdAt)}${o.date?`・希望 ${escapeHtml(o.date)}`:''}</div></div><span class="order-status ${o.status==='承認待ち'?'pending':'approved'}">${escapeHtml(o.status||'発注済')}</span></header><div class="history-item-row"><span>推定重量</span><strong>${formatWeight(Number(o.weight))}</strong></div><div class="history-item-row"><span>乗る車</span><strong>${escapeHtml(o.truck||truckFor(Number(o.weight)))}</strong></div>${o.requestedBy?`<div class="history-item-row"><span>作成者</span><strong>${escapeHtml(o.requestedBy)}</strong></div>`:''}${o.drawingId?`<div class="history-item-row"><span>図面</span><button class="inline-link" data-open-drawing="${o.drawingId}">${escapeHtml(o.drawingName||'開く')}</button></div>`:''}<div class="history-actions">${canApprove&&o.status==='承認待ち'?`<button class="approve-btn" data-approve="${o.id}">✓ 承認して発注</button>`:''}<button data-reorder="${o.id}">コピー</button><button data-pdf="${o.id}">PDF</button><button data-line="${o.id}">LINE</button><button data-delete="${o.id}">削除</button></div></article>`).join(''):'<div class="card empty">まだ注文履歴がありません</div>';$$('[data-reorder]').forEach(b=>b.onclick=()=>reorder(Number(b.dataset.reorder)));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteOrder(Number(b.dataset.delete)));$$('[data-pdf]').forEach(b=>b.onclick=()=>printOrderById(Number(b.dataset.pdf)));$$('[data-line]').forEach(b=>b.onclick=()=>shareOrderById(Number(b.dataset.line)));$$('[data-open-drawing]').forEach(b=>b.onclick=()=>openDrawing(Number(b.dataset.openDrawing)));$$('[data-approve]').forEach(b=>b.onclick=()=>approveOrder(Number(b.dataset.approve)))}
function approveOrder(id){if(!['owner','admin'].includes(getEffectiveRole()))return toast('承認権限がありません');const h=getHistory();const o=h.find(x=>x.id===id);if(!o)return;o.status='発注済';o.approvedAt=new Date().toISOString();saveHistory(h);renderHistory();updateDashboard();toast('注文を承認しました')}

function reorder(id){const o=getHistory().find(x=>x.id===id);if(!o)return;state.cart={};o.items.forEach(i=>{if(MATERIALS.some(m=>m.id===i.id))state.cart[i.id]=i.qty});state.selectedSite=o.site;persistDraftState();renderMaterials();go('order');toast('前回注文をコピーしました')}
function deleteOrder(id){if(!confirm('この履歴を削除しますか？'))return;saveHistory(getHistory().filter(x=>x.id!==id));renderHistory()}
function updateDashboard(){const h=getHistory(),today=new Date().toDateString();$('#historyCount').textContent=h.length;$('#todayCount').textContent=h.filter(o=>new Date(o.createdAt).toDateString()===today).length;updateRoleHome();renderAdminOpsSummary()}
function renderAdminOpsSummary(){const root=$('#adminOpsSummary');if(!root)return;const role=getEffectiveRole();if(!['owner','admin'].includes(role)){root.classList.add('hidden');root.innerHTML='';return}const h=getHistory(),r=getReturnTruckRequests(),pending=h.filter(x=>x.status==='承認待ち').length,today=todayIso(),deliveries=h.filter(x=>x.date===today).length,returns=r.filter(x=>x.date===today&&x.status!=='返却完了').length,sites=getSites().length;root.classList.remove('hidden');root.innerHTML=`<div class="ops-summary-head"><span>CONTROL NOW</span><b>${role==='owner'?'社長ダッシュボード':'管理者ダッシュボード'}</b></div><div class="ops-summary-grid"><button data-go="history"><span>承認待ち</span><strong>${pending}</strong></button><button data-go="dispatch"><span>今日の搬入</span><strong>${deliveries}</strong></button><button data-go="dispatch"><span>今日の返却</span><strong>${returns}</strong></button><button data-go="sites"><span>登録現場</span><strong>${sites}</strong></button></div>`;root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go))}
function updateRoleHome(){const role=getEffectiveRole();const chip=$('#homeRoleChip'),headline=$('#homeHeadline'),lead=$('#homeRoleLead'),greet=$('#homeGreeting');if(!chip||!headline||!lead)return;const map={owner:{chip:'OWNER',headline:'会社全体を、ひと目で。',lead:'承認待ち・現場・原価・メンバー・契約をまとめて確認。'},admin:{chip:'ADMIN',headline:'今日の運営を、速く。',lead:'現場・注文承認・配車・メンバー運用をスムーズに。'},member:{chip:'FOREMAN',headline:'今日の現場を、迷わず。',lead:'現場・注文・搬入・在庫を最短で操作。'},viewer:{chip:'VIEW',headline:'必要な情報だけ、すぐ確認。',lead:'現場・履歴・在庫を閲覧できます。'}};const v=map[role]||map.member;chip.textContent=v.chip;headline.textContent=v.headline;lead.textContent=v.lead;if(greet)greet.textContent=role==='owner'?'お疲れさまです、社長。':role==='admin'?'お疲れさまです、管理者。':role==='viewer'?'VERTX CORE VIEW':'お疲れさまです、職長。';document.body.dataset.role=role}

function orderText(o){const lines=[`VERTX CORE 資材注文`,`現場：${o.site}`,o.date?`希望日：${o.date}`:'',`合計：${o.qty}点`,`重量：${formatWeight(o.weight)}`,`乗る車：${o.truck||truckFor(o.weight)}`,o.drawingId?`図面：${o.drawingName||'添付あり'}`:'','','【資材】',...o.items.map(i=>`${i.name} ${i.qty}${i.unit}`),o.memo?`\nメモ：${o.memo}`:''];return lines.filter(Boolean).join('\n')}
function shareOrderById(id){const o=getHistory().find(x=>x.id===id);if(o)shareToLine(o)}
function shareDraft(){const o=currentDraft();if(!o.items.length)return toast('資材を選択してください');shareToLine(o)}
function shareToLine(o){window.open(`https://line.me/R/share?text=${encodeURIComponent(orderText(o))}`,'_blank')}
function printOrderById(id){const o=getHistory().find(x=>x.id===id);if(o)printOrder(o)}
function printDraft(){const o=currentDraft();if(!o.items.length)return toast('資材を選択してください');printOrder(o)}
async function printOrder(o){
  const area=$('#printArea');
  area.innerHTML=`<div class="print-sheet" style="display:block;background:#fff;color:#111;width:794px;min-height:1123px;padding:48px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP','Yu Gothic',sans-serif"><h1 style="font-size:28px;margin:0 0 28px">VERTX CORE 資材注文書</h1><p>現場：<b>${escapeHtml(o.site)}</b></p>${o.date?`<p>希望日：${escapeHtml(o.date)}</p>`:''}<p>合計：<b>${o.qty}点</b>　合計重量：<b>${formatWeight(o.weight)}</b></p><p>推奨車両：<b>${escapeHtml(o.truck||truckFor(o.weight))}</b></p>${o.drawingId?`<p>添付図面：<b>${escapeHtml(o.drawingName||'図面')}</b></p>`:''}<table style="width:100%;border-collapse:collapse;margin-top:24px"><thead><tr><th style="border:1px solid #999;padding:9px;text-align:left">資材名</th><th style="border:1px solid #999;padding:9px">数量</th><th style="border:1px solid #999;padding:9px">単重</th><th style="border:1px solid #999;padding:9px">重量</th></tr></thead><tbody>${o.items.map(i=>`<tr><td style="border:1px solid #bbb;padding:9px">${escapeHtml(i.name)}</td><td style="border:1px solid #bbb;padding:9px;text-align:center">${i.qty}${escapeHtml(i.unit)}</td><td style="border:1px solid #bbb;padding:9px;text-align:right">${Number(i.weight).toFixed(2)}kg</td><td style="border:1px solid #bbb;padding:9px;text-align:right">${(i.qty*i.weight).toFixed(1)}kg</td></tr>`).join('')}</tbody></table>${o.memo?`<p style="margin-top:24px">メモ：${escapeHtml(o.memo)}</p>`:''}<p style="margin-top:32px;font-size:11px;color:#666">VERTX CORE v7.16</p></div>`;
  const sheet=area.firstElementChild;
  try{
    if(!window.html2canvas||!window.jspdf?.jsPDF)throw new Error('PDF機能の読み込みに失敗しました');
    area.style.cssText='display:block!important;position:fixed;left:-10000px;top:0;width:794px;z-index:-1;';
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const canvas=await html2canvas(sheet,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
    const {jsPDF}=window.jspdf; const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const img=canvas.toDataURL('image/jpeg',0.92), pw=210, ph=297, ih=canvas.height*pw/canvas.width;
    let y=0, left=ih; pdf.addImage(img,'JPEG',0,y,pw,ih,undefined,'FAST'); left-=ph;
    while(left>0){y=left-ih;pdf.addPage();pdf.addImage(img,'JPEG',0,y,pw,ih,undefined,'FAST');left-=ph}
    const safe=(o.site||'注文書').replace(/[\/:*?"<>|]/g,'_').slice(0,40); const name=`VERTX_注文書_${safe}_${new Date().toISOString().slice(0,10)}.pdf`;
    const blob=pdf.output('blob'); const file=new File([blob],name,{type:'application/pdf'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'VERTX 資材注文書'});toast('PDFを作成しました')}
    else{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('PDFを作成しました')}
  }catch(e){console.error(e);toast('PDF作成に失敗しました：'+(e?.message||e))}
  finally{area.style.cssText='';area.innerHTML=''}
}


// v1.0 不足チェック
function hasAny(items, terms){return items.some(i=>i.qty>0&&terms.some(t=>String(i.name).includes(t)))}
function renderMissingCheck(items){
  const root=$('#missingCheck'); if(!root)return;
  if(!items.length){root.innerHTML='<span class="muted">資材を選ぶと自動チェックします</span>';return}
  const warnings=[];
  const frame=hasAny(items,['建枠','調整枠']);
  const pipe=hasAny(items,['単管パイプ','かんざしパイプ']);
  const panel=hasAny(items,['防音パネル']);
  if(frame){
    if(!hasAny(items,['筋違','筋交','ブレス']))warnings.push('枠組：ブレスが注文に入っていません');
    if(!hasAny(items,['鋼製布板','足場板']))warnings.push('枠組：布板・足場板が注文に入っていません');
    if(!hasAny(items,['ジャッキ','ベース']))warnings.push('枠組：ジャッキ／ベース類が注文に入っていません');
    if(!hasAny(items,['壁つなぎ','壁繋']))warnings.push('枠組：壁つなぎが注文に入っていません');
  }
  if(pipe){
    if(!hasAny(items,['クランプ']))warnings.push('単管：クランプ類が注文に入っていません');
    if(!hasAny(items,['固定ベース','ジャッキベース','ベース']))warnings.push('単管：ベース類が注文に入っていません');
  }
  if(panel){
    if(!hasAny(items,['クランプ','キャッチ']))warnings.push('防音パネル：固定用クランプ／キャッチ類を確認してください');
    if(!hasAny(items,['下さん','下さん手摺']))warnings.push('防音パネル：下さんの要否を確認してください');
  }
  root.innerHTML=warnings.length?`<div class="missing-list">${warnings.map(w=>`<div class="missing-item"><span>!</span><span>${escapeHtml(w)}</span></div>`).join('')}</div><small class="assist-warning">CORE CHECK：過去の一般的な資材構成ルールから抜け候補を表示しています。最終判断は施工計画・現場条件を優先してください。</small>`:'<div class="missing-ok">✓ 基本項目に大きな抜けは見つかりません</div><small class="muted">施工計画・現場条件による追加材は別途確認してください。</small>';
}

// v1.0 図面アシスト（端末内の寸法入力から候補算出）
let assistCandidate=[];
function findMat(terms){return MATERIALS.find(m=>terms.every(t=>String(m.name).includes(t)))||MATERIALS.find(m=>terms.some(t=>String(m.name).includes(t)))}
function addCandidate(arr, mat, qty){if(!mat||qty<=0)return;const ex=arr.find(x=>x.id===mat.id);if(ex)ex.qty+=Math.ceil(qty);else arr.push({...mat,qty:Math.ceil(qty)})}
async function loadAssistDrawings(){
  const root=$('#assistDrawingList');if(!root)return;
  try{
    const list=await drawingList();
    root.innerHTML=list.length?list.map(d=>`<label class="drawing-check"><input type="checkbox" data-ai-drawing value="${d.id}" ${state.selectedDrawingId===d.id?'checked':''}><span><b>${escapeHtml(d.name)}</b><small>${String(d.type).includes('pdf')?'PDF':'画像'}・${(Number(d.size)/1024/1024).toFixed(2)}MB</small></span></label>`).join(''):'<div class="card empty">先に図面をアップロードしてください</div>';
    const all=$('#selectAllDrawings'),clear=$('#clearAllDrawings');
    if(all)all.onclick=()=>$$('[data-ai-drawing]').forEach(x=>x.checked=true);
    if(clear)clear.onclick=()=>$$('[data-ai-drawing]').forEach(x=>x.checked=false);
  }catch(e){root.innerHTML='<div class="card empty">図面一覧を読み込めませんでした</div>'}
}
function selectedAiDrawingIds(){return $$('[data-ai-drawing]:checked').map(x=>Number(x.value)).filter(Boolean)}
function toggleAssistOptions(){const box=$('#frameAssistOptions');if(box)box.classList.toggle('hidden',$('#assistType').value!=='frame')}
function runAssist(){
  const type=$('#assistType').value,spans=Math.max(1,Number($('#assistSpans').value)||1),levels=Math.max(1,Number($('#assistLevels').value)||1);const out=[];
  if(type==='frame'){
    const width=$('#assistFrameWidth').value,len=$('#assistSpanLength').value;
    const frame=findMat([`W${width}`, 'H1700'])||findMat([`${width}`, '建枠']);
    const brace=findMat(['ブレス',({1829:'1829',1519:'1519',1224:'1224',914:'914',610:'610'})[len]])||findMat(['筋違',len])||findMat(['ブレス'])||findMat(['筋違']);
    const deck=findMat(['アンチ',({1829:'1829',1519:'1519',1224:'1224',914:'914',610:'610'})[len]])||findMat(['鋼製布板',`L${len}`,'500'])||findMat(['鋼製布板',len]);
    const rail=findMat(['手摺',len])||findMat(['下さん手摺',len]);
    const jack=findMat(['ジャッキベース'])||findMat(['ジャッキ','ベース']);
    const tie=findMat(['壁つなぎ','330'])||findMat(['壁つなぎ']);
    addCandidate(out,frame,(spans+1)*levels);
    addCandidate(out,brace,spans*levels);
    addCandidate(out,deck,spans*levels);
    addCandidate(out,rail,spans*2);
    addCandidate(out,jack,spans+1);
    addCandidate(out,tie,Math.ceil(spans/3)*Math.ceil(levels/2));
    if($('#assistPanels').checked){const panel=findMat(['防音パネル','1.8'])||findMat(['防音パネル']);addCandidate(out,panel,spans*levels)}
  }else{
    const pipe2=findMat(['単管パイプ','２.０'])||findMat(['単管パイプ','2.0']);
    const pipe4=findMat(['単管パイプ','４.０'])||findMat(['単管パイプ','4.0']);
    const clamp=findMat(['直交','クランプ'])||findMat(['クランプ']);
    const base=findMat(['固定ベース'])||findMat(['ジャッキベース'])||findMat(['ベース']);
    const bracket=findMat(['ブラケット','500'])||findMat(['ブラケット']);
    addCandidate(out,pipe4,(spans+1)*levels);
    addCandidate(out,pipe2,spans*(levels+1));
    addCandidate(out,clamp,spans*levels*4);
    addCandidate(out,base,spans+1);
    if(type==='pipeBracket')addCandidate(out,bracket,spans*levels);
  }
  assistCandidate=out;
  const w=out.reduce((s,i)=>s+i.qty*Number(i.weight||0),0),q=out.reduce((s,i)=>s+i.qty,0);
  const root=$('#assistResult');root.classList.remove('empty');root.innerHTML=`<div class="assist-summary"><div><span>候補数量</span><b>${q}点</b></div><div><span>推定重量</span><b>${formatWeight(w)}</b></div><div><span>乗る車</span><b>${truckFor(w)}</b></div><div><span>スパン×段</span><b>${spans}×${levels}</b></div></div><div class="assist-items">${out.map(i=>`<div class="assist-item"><span>${escapeHtml(i.name)}</span><b>${i.qty}${escapeHtml(i.unit)}</b></div>`).join('')}</div><div class="assist-warning">候補値です。図面の納まり・開口・階段・朝顔・壁つなぎ・養生条件などで数量は変わります。</div>`;
  $('#applyAssistBtn').classList.toggle('hidden',!out.length);
}
function applyAssist(){if(!assistCandidate.length)return;state.cart={};assistCandidate.forEach(i=>state.cart[i.id]=i.qty);persistDraftState();const ids=selectedAiDrawingIds();if(ids.length){state.selectedDrawingId=ids[0];drawingGet(state.selectedDrawingId).then(x=>{if(x&&$('#selectedDrawingName'))$('#selectedDrawingName').textContent=x.name+(ids.length>1?` ＋他${ids.length-1}枚`:'')})}renderMaterials();go('order');toast('資材候補を注文に入れました')}


// AI図面解析（Vercel Serverless Function + OpenAI Responses API）
let aiCandidate=[];
function normalizeMatName(v=''){return String(v).toLowerCase().replace(/[\s　・･()（）\-_/]/g,'').replace(/ｍ/g,'m').replace(/㎜/g,'mm')}
function matchMaterialByAiName(name){
  const n=normalizeMatName(name);if(!n)return null;
  let exact=MATERIALS.find(m=>normalizeMatName(m.name)===n);if(exact)return exact;
  let includes=MATERIALS.filter(m=>{const x=normalizeMatName(m.name);return x.includes(n)||n.includes(x)}).sort((a,b)=>Math.abs(normalizeMatName(a.name).length-n.length)-Math.abs(normalizeMatName(b.name).length-n.length));
  if(includes.length)return includes[0];
  const tokens=String(name).toLowerCase().split(/[\s　・･()（）\-_/]+/).filter(x=>x.length>1);
  let scored=MATERIALS.map(m=>({m,score:tokens.reduce((s,t)=>s+(String(m.name).toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  return scored[0]?.m||null;
}
async function compressImageForAi(blob,mimeType='image/jpeg'){
  if(!blob || String(mimeType).includes('pdf')) return blob;
  if(blob.size<=1800000) return blob;
  const bitmap=await createImageBitmap(blob);
  const maxSide=1800, scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('写真の圧縮に失敗しました')),'image/jpeg',0.82));
}
function blobToBase64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
function setAiStatus(msg,type=''){const el=$('#aiStatus');if(!el)return;el.textContent=msg;el.className='ai-status'+(type?' '+type:'');el.classList.toggle('hidden',!msg)}
function compressImageBlob(blob,maxSide=1800,quality=.78){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(blob);img.onload=()=>{try{const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);c.toBlob(b=>{URL.revokeObjectURL(url);b?resolve(b):reject(new Error('画像圧縮に失敗しました'))},'image/jpeg',quality)}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('画像を読み込めませんでした'))};img.src=url})}
async function getAiLearningContext(){
  const local=(()=>{try{return JSON.parse(nativeGet(tenantKey('vertx_core_ai_learning_local'))||'[]')}catch{return []}})();
  try{
    const org=getCompanySession()?.orgId;if(!org||!cloudReady||!supabaseClient)return local.slice(0,12);
    const {data,error}=await supabaseClient.from('ai_learning_examples').select('source_type,context,corrected_materials,created_at').eq('organization_id',org).order('created_at',{ascending:false}).limit(12);
    if(error)throw error;
    const cloud=(data||[]).map(x=>({source_type:x.source_type,context:x.context,corrected_materials:x.corrected_materials,created_at:x.created_at}));
    return cloud.length?cloud:local.slice(0,12);
  }catch(e){console.warn('learning context',e);return local.slice(0,12)}
}
function aiCacheKey(drawings,mode,context){return JSON.stringify({ids:drawings.map(d=>[d.id,d.createdAt||'',d.size||0]),mode,context,learning:lsGet('vertx_core_ai_learning_version')||'0',build:VERTX_BUILD})}
function getAiCache(key){try{const all=JSON.parse(nativeGet(tenantKey('vertx_core_ai_cache'))||'{}');const hit=all[key];if(hit&&Date.now()-hit.ts<7*24*3600*1000)return hit.analysis}catch{}return null}
function setAiCache(key,analysis){try{let all=JSON.parse(nativeGet(tenantKey('vertx_core_ai_cache'))||'{}');all[key]={ts:Date.now(),analysis};const trimmed=Object.entries(all).sort((a,b)=>b[1].ts-a[1].ts).slice(0,5);nativeSet(tenantKey('vertx_core_ai_cache'),JSON.stringify(Object.fromEntries(trimmed)))}catch{}}
async function fetchJsonWithTimeout(url,options={},timeoutMs=70000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(url,{...options,signal:controller.signal});
    const data=await r.json().catch(()=>({}));
    return {r,data};
  }finally{clearTimeout(timer)}
}
async function runAiAnalysis(){
  const ids=selectedAiDrawingIds();if(!ids.length)return toast('解析する図面を1枚以上選んでください');
  if(ids.length>8)return toast('一度に解析できる図面は8枚までです');
  const drawings=(await Promise.all(ids.map(id=>drawingGet(id)))).filter(Boolean);if(!drawings.length)return toast('図面が見つかりません');
  const mode=$('#aiMode').value,baseContext=$('#aiContext').value.trim(),field=getLatestDailyForSite(state.selectedSite),fieldContext=field?`\n最新職長日報: 現状=${field.status||''} / 重点安全目標=${field.safetyGoal||''} / KY危険=${field.kyText||''} / KY対策=${field.kyMeasure||''} / 注意=${field.handover||''} / 明日=${field.tomorrow||''} / 必要資材=${field.needed||''}`:'',context=(baseContext+fieldContext).trim(),cacheKey=aiCacheKey(drawings,mode,context),cached=getAiCache(cacheKey);
  $('#runAiBtn').disabled=true;$('#applyAiBtn').classList.add('hidden');
  try{
    if(cached){renderAiResult(cached,{id:drawings[0].id,name:drawings.map(x=>x.name).join(' / ')});setAiStatus('学習済みキャッシュから即時表示しました。条件を変えた場合は再解析してください。');return}
    const maxSide=drawings.length>=5?1050:drawings.length>=3?1250:1450;
    const quality=drawings.length>=5?.56:drawings.length>=3?.62:.68;
    setAiStatus(`CORE AIが${drawings.length}枚を最適化中…`);
    const prepared=await Promise.all(drawings.map(async d=>{let aiBlob=d.blob;if((d.type||'').startsWith('image/')&&Number(d.size)>350*1024)aiBlob=await compressImageBlob(d.blob,maxSide,quality);return {d,aiBlob,bytes:Number(aiBlob.size||d.size||0)}}));
    const totalBytes=prepared.reduce((s,x)=>s+x.bytes,0);if(totalBytes>2.55*1024*1024)throw new Error('図面の合計サイズが大きすぎます。必要な立面・断面だけに絞ってください。');
    const [files,learningExamples]=await Promise.all([Promise.all(prepared.map(async({d,aiBlob})=>({filename:d.name,mimeType:d.type,dataBase64:await blobToBase64(aiBlob)}))),getAiLearningContext()]);
    const materialNames=MATERIALS.map(m=>m.name);
    const common={method:'POST',headers:{'Content-Type':'application/json'}};
    setAiStatus('CORE AIが図面を照合中… 失敗時は自動で軽量解析に切り替えます。');
    let r,data;
    try{
      ({r,data}=await fetchJsonWithTimeout('/api/analyze',{...common,body:JSON.stringify({files,mode,context,materialNames,learningExamples,companyVocabulary:MATERIALS.slice(0,450).map(m=>({name:m.name,aliases:m.aliases||'',category:m.category})),speedMode:'fast'})},70000));
    }catch(e){
      if(e?.name!=='AbortError'&&!/load failed|fetch failed|failed to fetch/i.test(String(e?.message||'')))throw e;
      r=null;data={error:'初回解析がタイムアウトしました'};
    }
    if(!r||!r.ok){
      setAiStatus('軽量モードで自動再解析しています…');
      const retryFiles=files.slice(0,Math.min(files.length,4));
      try{
        ({r,data}=await fetchJsonWithTimeout('/api/analyze',{...common,body:JSON.stringify({files:retryFiles,mode,context:context+'\n初回解析が失敗または時間超過したため、重要図面を優先して軽量再解析。',materialNames,learningExamples,companyVocabulary:MATERIALS.slice(0,450).map(m=>({name:m.name,aliases:m.aliases||'',category:m.category})),speedMode:'fallback'})},70000));
      }catch(e){
        if(e?.name==='AbortError')throw new Error('AI解析が混雑しています。図面を1〜4枚に絞ってもう一度お試しください。');
        throw e;
      }
    }
    if(!r.ok)throw new Error(data.error||`AI解析エラー (${r.status})`);
    setAiCache(cacheKey,data.analysis);renderAiResult(data.analysis,{id:drawings[0].id,name:drawings.map(x=>x.name).join(' / ')});
    setAiStatus(`解析完了。会社の確定例${learningExamples.length}件と資材呼称を参照しました。`);audit('AI図面解析',`${drawings.length}枚 / 学習例${learningExamples.length}件 / 候補${aiCandidate.length}種類`);
  }catch(e){const msg=e?.message||'AI解析に失敗しました';const friendly=/load failed|fetch failed|failed to fetch/i.test(msg)?'通信に失敗しました。図面を1〜4枚に絞って再試行してください。':msg;setAiStatus(friendly,'error');audit('AI図面解析エラー',friendly);$('#aiResult').classList.add('empty');$('#aiResult').textContent='AI解析に失敗しました。エラー表示を確認して、もう一度試してください。'}
  finally{$('#runAiBtn').disabled=false}
}

function renderAiResult(a,d){
  const rows=(a.materials||[]).filter(x=>Number(x.quantity)>0).map(x=>{const matched=matchMaterialByAiName(x.material_name);return {...x,matched}});
  aiCandidate=rows.filter(x=>x.matched).map(x=>({id:x.matched.id,name:x.matched.name,unit:x.matched.unit,weight:Number(x.matched.weight||0),qty:Math.max(0,Math.round(Number(x.quantity)||0)),confidence:Number(x.confidence||0),sourceName:x.material_name}));
  const w=aiCandidate.reduce((sum,x)=>sum+x.qty*x.weight,0),q=aiCandidate.reduce((sum,x)=>sum+x.qty,0),unmatched=rows.filter(x=>!x.matched);
  const root=$('#aiResult');root.classList.remove('empty');
  root.innerHTML=`<div class="ai-result-head"><div><span>判定</span><b>${escapeHtml(a.scaffold_type||'不明')}</b></div><div><span>図面</span><b>${escapeHtml(d.name)}</b></div></div><p>${escapeHtml(a.summary||'')}</p>${(a.dimensions||[]).length?`<div class="ai-dimensions"><b>読み取った寸法・条件</b><br>${a.dimensions.map(x=>`・${escapeHtml(x)}`).join('<br>')}</div>`:''}<div class="assist-summary"><div><span>マッチ済み</span><b>${aiCandidate.length}種類</b></div><div><span>候補数量</span><b>${q}点</b></div><div><span>推定重量</span><b>${formatWeight(w)}</b></div><div><span>乗る車</span><b>${truckFor(w)}</b></div></div><div class="ai-materials">${rows.map(x=>`<div class="ai-material"><div class="ai-material-top"><div><b>${escapeHtml(x.matched?.name||x.material_name)}</b><small>${x.matched&&x.matched.name!==x.material_name?`AI読取: ${escapeHtml(x.material_name)}`:''}</small></div><b>${Number(x.quantity)||0}${escapeHtml(x.matched?.unit||x.unit||'')}</b></div><span class="confidence">確信度 ${Math.round((Number(x.confidence)||0)*100)}%</span><small>${escapeHtml(x.reason||'')}</small>${!x.matched?'<div class="ai-unmatched">資材マスタに一致する項目がないため注文へは自動反映しません</div>':''}</div>`).join('')}</div>${unmatched.length?`<div class="ai-unmatched">未一致 ${unmatched.length}種類：資材マスタで名称を確認してください。</div>`:''}${(a.warnings||[]).length?`<ul class="ai-warning-list">${a.warnings.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}`;
  $('#applyAiBtn').classList.toggle('hidden',!aiCandidate.length);
  state.selectedDrawingId=d.id;if($('#selectedDrawingName'))$('#selectedDrawingName').textContent=d.name;
}
function applyAiCandidate(){if(!aiCandidate.length)return toast('注文へ入れられるAI候補がありません');state.cart={};state.aiSource='drawing';aiCandidate.forEach(x=>state.cart[x.id]=(state.cart[x.id]||0)+x.qty);persistDraftState();renderMaterials();go('order');toast('AI候補を注文へ入れました。数量を確認してください')}

// 資材マスタ編集（後から名前・カテゴリー・単重・単位を変更可能）
function renderMaterialMaster(){const root=$('#masterList');if(!root)return;const sorted=MATERIALS.map((m,i)=>({m,i})).sort((a,b)=>materialSort(a.m,b.m));root.innerHTML=sorted.map(({m,i})=>`<article class="card master-row"><input class="master-name" data-mi="${i}" data-mf="name" value="${escapeHtml(m.name)}"><div class="master-grid"><input data-mi="${i}" data-mf="category" value="${escapeHtml(m.category)}" aria-label="カテゴリー"><input type="number" step="0.01" min="0" data-mi="${i}" data-mf="weight" value="${Number(m.weight)}" aria-label="単重"><input data-mi="${i}" data-mf="unit" value="${escapeHtml(m.unit)}" aria-label="単位"></div><small>カテゴリー / 単重kg / 単位</small><button class="danger-link" data-master-delete="${i}">この資材を削除</button></article>`).join('');root.querySelectorAll('[data-mf]').forEach(inp=>inp.onchange=()=>{const i=Number(inp.dataset.mi),f=inp.dataset.mf;MATERIALS[i][f]=f==='weight'?Math.max(0,Number(inp.value)||0):inp.value.trim();saveMaterialMaster();renderCategories();renderMaterials()});root.querySelectorAll('[data-master-delete]').forEach(b=>b.onclick=()=>{if(confirm('この資材を削除しますか？')){MATERIALS.splice(Number(b.dataset.masterDelete),1);saveMaterialMaster();renderMaterialMaster();renderCategories();renderMaterials()}})}
function saveMaterialMaster(){lsSet('vertx_core_materials',JSON.stringify(MATERIALS));renderCategories();renderMaterials();toast('資材マスタを保存しました')}
function addCustomMaterial(){const n=$('#customName').value.trim(),c=$('#customCategory').value.trim()||'その他',w=Math.max(0,Number($('#customWeight').value)||0),u=$('#customUnit').value.trim()||'個';if(!n)return toast('資材名を入力してください');MATERIALS.push({id:`custom_${Date.now()}`,name:n,category:c,weight:w,unit:u,aliases:''});saveMaterialMaster();['#customName','#customWeight'].forEach(s=>$(s).value='');renderMaterialMaster()}
function resetMaterialMaster(){if(!confirm('資材マスタを初期状態に戻しますか？'))return;MATERIALS=DEFAULT_MATERIALS.map(x=>({...x}));lsRemove('vertx_core_materials');renderMaterialMaster();renderCategories();renderMaterials();toast('初期状態に戻しました')}


// 図面アップロード（クラウド優先 / 未接続時は端末内IndexedDB）
const DRAW_DB='vertx_core_drawings_db', DRAW_STORE='drawings';
function openDrawDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DRAW_DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DRAW_STORE))db.createObjectStore(DRAW_STORE,{keyPath:'id',autoIncrement:true})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function safeFileName(name='drawing'){return String(name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100)}
async function drawingPut(file){
  const orgId=getCompanySession()?.orgId;
  if(cloudReady&&supabaseClient&&orgId){
    const path=`${orgId}/${crypto.randomUUID()}_${safeFileName(file.name)}`;
    const {error:upErr}=await supabaseClient.storage.from('drawings').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
    if(upErr)throw upErr;
    const {data,error}=await supabaseClient.from('drawings').insert({organization_id:orgId,name:file.name,type:file.type||'application/octet-stream',size:file.size,storage_path:path}).select().single();
    if(error){await supabaseClient.storage.from('drawings').remove([path]);throw error}
    return data.id;
  }
  const db=await openDrawDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(DRAW_STORE,'readwrite'),st=tx.objectStore(DRAW_STORE);const req=st.add({name:file.name,type:file.type||'application/octet-stream',size:file.size,createdAt:new Date().toISOString(),blob:file});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
}
async function drawingList(){
  const orgId=getCompanySession()?.orgId;
  if(cloudReady&&supabaseClient&&orgId){const {data,error}=await supabaseClient.from('drawings').select('id,name,type,size,storage_path,created_at').eq('organization_id',orgId).order('id',{ascending:false});if(error)throw error;return (data||[]).map(x=>({...x,createdAt:x.created_at}))}
  const db=await openDrawDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(DRAW_STORE,'readonly'),req=tx.objectStore(DRAW_STORE).getAll();req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>b.id-a.id));req.onerror=()=>reject(req.error)});
}
async function drawingGet(id){
  const orgId=getCompanySession()?.orgId;
  if(cloudReady&&supabaseClient&&orgId){const {data,error}=await supabaseClient.from('drawings').select('*').eq('organization_id',orgId).eq('id',Number(id)).single();if(error)return null;const {data:blobData,error:dlErr}=await supabaseClient.storage.from('drawings').download(data.storage_path);if(dlErr)throw dlErr;return {...data,createdAt:data.created_at,blob:blobData}}
  const db=await openDrawDb();return new Promise((resolve,reject)=>{const req=db.transaction(DRAW_STORE,'readonly').objectStore(DRAW_STORE).get(Number(id));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
}
async function drawingDelete(id){
  const orgId=getCompanySession()?.orgId;
  if(cloudReady&&supabaseClient&&orgId){const {data}=await supabaseClient.from('drawings').select('storage_path').eq('organization_id',orgId).eq('id',Number(id)).single();if(data?.storage_path)await supabaseClient.storage.from('drawings').remove([data.storage_path]);const {error}=await supabaseClient.from('drawings').delete().eq('organization_id',orgId).eq('id',Number(id));if(error)throw error;return}
  const db=await openDrawDb();return new Promise((resolve,reject)=>{const req=db.transaction(DRAW_STORE,'readwrite').objectStore(DRAW_STORE).delete(Number(id));req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)});
}
async function uploadDrawings(files){
  if(!files||!files.length)return;
  const allowed=[...files].filter(f=>f.type.startsWith('image/')||f.type==='application/pdf');
  if(!allowed.length)return toast('PDFまたは画像を選んでください');
  for(const f of allowed){await drawingPut(f)}
  $('#drawingInput').value=''; await renderDrawings(); toast(`${allowed.length}件の図面を保存しました`);
}
async function uploadAiDrawings(files){
  if(!files||!files.length)return;
  const allowed=[...files].filter(f=>f.type.startsWith('image/')||f.type==='application/pdf');
  if(!allowed.length)return toast('PDFまたは画像を選んでください');
  const ids=[];
  for(const f of allowed){ids.push(await drawingPut(f))}
  const input=$('#aiDrawingInput');if(input)input.value='';
  await loadAssistDrawings();
  ids.forEach(id=>{const el=document.querySelector(`[data-ai-drawing="${id}"]`);if(el)el.checked=true});
  toast(`${allowed.length}件をAI解析用に追加しました`);
}
async function renderDrawings(){
  const root=$('#drawingList'); if(!root)return;
  try{
    const list=await drawingList();
    root.innerHTML=list.length?list.map(d=>`<article class="card drawing-card ${state.selectedDrawingId===d.id?'selected':''}">
      <div class="drawing-icon">${String(d.type).includes('pdf')?'PDF':'IMG'}</div>
      <div class="drawing-info"><b>${escapeHtml(d.name)}</b><small>${(Number(d.size)/1024/1024).toFixed(2)}MB・${formatDate(d.createdAt)}</small></div>
      <div class="drawing-actions"><button data-use-drawing="${d.id}">${state.selectedDrawingId===d.id?'選択中':'注文に添付'}</button><button data-view-drawing="${d.id}">開く</button><button data-delete-drawing="${d.id}">削除</button></div>
    </article>`).join(''):'<div class="card empty">PDFまたは現場図面の写真をアップロードできます</div>';
    $$('[data-use-drawing]').forEach(b=>b.onclick=async()=>{state.selectedDrawingId=Number(b.dataset.useDrawing);const d=await drawingGet(state.selectedDrawingId);if($('#selectedDrawingName'))$('#selectedDrawingName').textContent=d?.name||'';renderDrawings();toast('注文に図面を添付しました')});
    $$('[data-view-drawing]').forEach(b=>b.onclick=()=>openDrawing(Number(b.dataset.viewDrawing)));
    $$('[data-delete-drawing]').forEach(b=>b.onclick=async()=>{const id=Number(b.dataset.deleteDrawing);if(!confirm('この図面を削除しますか？'))return;await drawingDelete(id);if(state.selectedDrawingId===id)state.selectedDrawingId=null;renderDrawings()});
  }catch(e){root.innerHTML='<div class="card empty">このブラウザでは図面保存を利用できません</div>'}
}
async function openDrawing(id){
  const d=await drawingGet(id);if(!d)return toast('図面が見つかりません');
  const url=URL.createObjectURL(d.blob);window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),60000);
}


function optionMaterials(){return MATERIALS.slice().sort(materialSort).map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
function optionSites(){const a=getSites();return a.length?a.map(x=>`<option>${escapeHtml(x)}</option>`).join(''):'<option>現場未登録</option>'}
function getStock(){try{return JSON.parse(lsGet('vertx_core_stock')||'[]')}catch{return []}}
function saveStockRows(v){lsSet('vertx_core_stock',JSON.stringify(v))}
function applyOrderToStock(order){
  if(!order||order.inventoryApplied||!Array.isArray(order.items)||!order.items.length)return false;
  const rows=getStock();
  order.items.forEach(item=>{
    const i=rows.findIndex(r=>r.site===order.site&&r.materialId===item.id);
    if(i>=0){
      rows[i].qty=(Number(rows[i].qty)||0)+(Number(item.qty)||0);
      rows[i].updatedAt=new Date().toISOString();
      rows[i].memo=rows[i].memo||'注文から自動反映';
    }else{
      rows.unshift({site:order.site,materialId:item.id,materialName:item.name,qty:Number(item.qty)||0,memo:'注文から自動反映',updatedAt:new Date().toISOString()});
    }
  });
  saveStockRows(rows);
  order.inventoryApplied=true;
  order.inventoryAppliedAt=new Date().toISOString();
  return true;
}
function renderSiteStock(){
  $('#stockSite').innerHTML=optionSites(); $('#stockMaterial').innerHTML=optionMaterials();
  const rows=getStock();
  const summary={};
  rows.forEach(r=>{const m=MATERIALS.find(x=>x.id===r.materialId);const qty=Number(r.qty)||0;const weight=Number(m?.weight)||0;const site=r.site||'現場未設定';if(!summary[site])summary[site]={weight:0,qty:0,kinds:0};summary[site].weight+=qty*weight;summary[site].qty+=qty;summary[site].kinds+=1;});
  const summaryEl=$('#stockSummary');
  if(summaryEl){summaryEl.innerHTML=Object.keys(summary).length?Object.entries(summary).sort((a,b)=>a[0].localeCompare(b[0],'ja')).map(([site,v])=>`<article class="stock-summary-card"><div><b>${escapeHtml(site)}</b><small>${v.kinds}種類・${v.qty.toLocaleString()}点</small></div><div class="stock-summary-weight"><strong>${(v.weight/1000).toFixed(2)}t</strong><span>${Math.round(v.weight).toLocaleString()}kg</span></div></article>`).join(''):'<div class="card empty">在庫が入ると現場ごとの総重量を自動表示します</div>';}
  $('#stockList').innerHTML=rows.length?rows.map((r,i)=>{const m=MATERIALS.find(x=>x.id===r.materialId);const itemWeight=(Number(r.qty)||0)*(Number(m?.weight)||0);return `<article class="card stock-row"><div class="stock-grid"><div><b>${escapeHtml(r.site)}</b><small>${escapeHtml(m?.name||r.materialName)}</small></div><strong>${r.qty}${escapeHtml(m?.unit||'')}</strong></div><small>重量 ${(itemWeight/1000).toFixed(3)}t / ${Math.round(itemWeight).toLocaleString()}kg</small>${r.memo?`<small>${escapeHtml(r.memo)}</small>`:''}<div class="quick-actions"><button data-stock-order="${i}">この資材を注文</button><button data-stock-delete="${i}">削除</button></div></article>`}).join(''):'<div class="card empty">現場資材はまだ登録されていません</div>';
  $$('[data-stock-delete]').forEach(b=>b.onclick=()=>{const a=getStock();a.splice(Number(b.dataset.stockDelete),1);saveStockRows(a);renderSiteStock()});
  $$('[data-stock-order]').forEach(b=>b.onclick=()=>{const r=getStock()[Number(b.dataset.stockOrder)];if(!r)return;state.selectedSite=r.site;state.cart[r.materialId]=(state.cart[r.materialId]||0)+1;persistDraftState();renderMaterials();go('order');toast('注文に追加しました')});
}
function saveStockEntry(){const site=$('#stockSite').value,id=$('#stockMaterial').value,qty=Math.max(0,Number($('#stockQty').value)||0),memo=$('#stockMemo').value.trim();const m=MATERIALS.find(x=>x.id===id);if(!site||!m)return;const a=getStock();const i=a.findIndex(x=>x.site===site&&x.materialId===id);const row={site,materialId:id,materialName:m.name,qty,memo,updatedAt:new Date().toISOString()};if(i>=0)a[i]=row;else a.unshift(row);saveStockRows(a);renderSiteStock();toast('現場資材を保存しました')}
// v5.8 NEXT UI -------------------------------------------------------------
function todayIso(){return new Date().toISOString().slice(0,10)}
function getReturns(){try{return JSON.parse(lsGet('vertx_core_returns')||'[]')}catch{return []}}
function saveReturns(v){lsSet('vertx_core_returns',JSON.stringify(v))}
function returnStockRow(site,id){return getStock().find(r=>r.site===site&&String(r.materialId)===String(id))}
function updateReturnAvailable(){const site=$('#returnSite')?.value,id=$('#returnMaterial')?.value,row=returnStockRow(site,id),m=MATERIALS.find(x=>String(x.id)===String(id));const el=$('#returnAvailable');if(el)el.innerHTML=`現在庫 <strong>${Number(row?.qty||0).toLocaleString()}${escapeHtml(m?.unit||'')}</strong>`}
function renderReturns(){
  if(!$('#returnSite'))return;$('#returnSite').innerHTML=optionSites();$('#returnMaterial').innerHTML=optionMaterials();if(!$('#returnDate').value)$('#returnDate').value=todayIso();
  $('#returnSite').onchange=updateReturnAvailable;$('#returnMaterial').onchange=updateReturnAvailable;updateReturnAvailable();
  const a=getReturns();$('#returnList').innerHTML=a.length?a.map((r,i)=>`<article class="card ops-row"><div class="ops-row-head"><div><b>${escapeHtml(r.site)}</b><small>${escapeHtml(r.date||'')}</small></div><strong>−${Number(r.qty).toLocaleString()}${escapeHtml(r.unit||'')}</strong></div><p>${escapeHtml(r.materialName)}</p>${r.memo?`<small>${escapeHtml(r.memo)}</small>`:''}<button class="danger-link" data-return-delete="${i}">記録を取り消す</button></article>`).join(''):'<div class="card empty">返却履歴はまだありません</div>';
  $$('[data-return-delete]').forEach(b=>b.onclick=()=>undoReturn(Number(b.dataset.returnDelete)));
}
function saveReturnEntry(){const site=$('#returnSite').value,id=$('#returnMaterial').value,qty=Math.max(1,Number($('#returnQty').value)||1),date=$('#returnDate').value||todayIso(),memo=$('#returnMemo').value.trim(),m=MATERIALS.find(x=>String(x.id)===String(id));if(!site||!m)return toast('現場と資材を選択してください');const rows=getStock(),i=rows.findIndex(r=>r.site===site&&String(r.materialId)===String(id)),available=i>=0?Number(rows[i].qty)||0:0;if(qty>available)return toast(`現在庫は ${available}${m.unit||''} です`);rows[i].qty=available-qty;rows[i].updatedAt=new Date().toISOString();saveStockRows(rows);const a=getReturns();a.unshift({id:Date.now(),site,materialId:id,materialName:m.name,unit:m.unit,qty,date,memo,createdAt:new Date().toISOString()});saveReturns(a);audit('返却記録',`${site} / ${m.name} ${qty}${m.unit}`);$('#returnQty').value=1;$('#returnMemo').value='';renderReturns();toast('返却を記録して在庫を減らしました')}
function undoReturn(index){const a=getReturns(),r=a[index];if(!r)return;if(!confirm('この返却記録を取り消して在庫を戻しますか？'))return;const rows=getStock(),i=rows.findIndex(x=>x.site===r.site&&String(x.materialId)===String(r.materialId));if(i>=0)rows[i].qty=(Number(rows[i].qty)||0)+Number(r.qty||0);else rows.unshift({site:r.site,materialId:r.materialId,materialName:r.materialName,qty:Number(r.qty)||0,memo:'返却取消で復元',updatedAt:new Date().toISOString()});saveStockRows(rows);a.splice(index,1);saveReturns(a);renderReturns();toast('返却を取り消しました')}

const RETURN_LOAD_KEY='vertx_return_load_v711';
function getReturnLoad(){try{return JSON.parse(localStorage.getItem(RETURN_LOAD_KEY)||'[]')||[]}catch(e){return []}}
function saveReturnLoad(a){localStorage.setItem(RETURN_LOAD_KEY,JSON.stringify(a))}
function returnLoadCapacity(){const custom=Math.max(0,Number($('#loadCustomCapacity')?.value)||0);return custom||Math.max(1,Number($('#loadTruckCapacity')?.value)||3000)}
function renderReturnLoad(){
  if(!$('#loadMaterial'))return;
  const truckSite=$('#returnTruckSite');if(truckSite){const sites=getSites();const prev=truckSite.value||state.selectedSite;truckSite.innerHTML=sites.length?sites.map(x=>`<option>${escapeHtml(x)}</option>`).join(''):'<option>現場未登録</option>';if(prev&&sites.includes(prev))truckSite.value=prev;}
  if($('#returnTruckDate')&&!$('#returnTruckDate').value)$('#returnTruckDate').value=todayIso();restoreReturnMeta();
  const visible=orderedMaterials(MATERIALS.filter(m=>!m.hidden));
  const materialSelect=$('#loadMaterial');
  const prevMaterial=materialSelect.value;
  materialSelect.innerHTML=visible.length?materialOptionsByOrder(visible):'<option value="">資材がありません</option>';
  if(prevMaterial&&visible.some(m=>String(m.id)===String(prevMaterial)))materialSelect.value=prevMaterial;
  const rows=getReturnLoad();
  let total=0,qty=0;rows.forEach(r=>{total+=(Number(r.weight)||0)*(Number(r.qty)||0);qty+=Number(r.qty)||0});
  const cap=returnLoadCapacity(),remaining=cap-total,ratio=cap?total/cap:0;
  let cls='ok',msg=`積載目安内です。残り約 ${Math.max(0,remaining).toFixed(0)}kg`;
  if(ratio>1){cls='over';msg=`最大積載量を約 ${Math.abs(remaining).toFixed(0)}kg 超えています`}
  else if(ratio>=.9){cls='warn';msg=`最大積載量の90%以上です。実車・荷姿を必ず確認してください`}
  const trips=Math.max(1,Math.ceil(total/cap));const singleOptions=[2000,3000,4000,8000,10000];const single=singleOptions.find(x=>total<=x);const splitText=total<=cap?`選択車両1台で計算上は重量内です。`:single&&single!==cap?`1台で行くなら ${single/1000}t級が重量目安。${cap/1000}t車なら ${trips}台/便。`:`${cap/1000}t車なら重量上 ${trips}台/便に分ける目安です。`;
  $('#loadSummary').innerHTML=`<div class="load-kpis"><div class="load-kpi"><span>総数量</span><strong>${qty.toLocaleString()}点</strong></div><div class="load-kpi"><span>総重量</span><strong>${total.toFixed(1)}kg</strong></div><div class="load-kpi"><span>最大積載量</span><strong>${cap.toLocaleString()}kg</strong></div><div class="load-kpi"><span>使用率</span><strong>${Math.round(ratio*100)}%</strong></div></div><div class="load-status ${cls}">${msg}</div><div class="load-plan"><span>積載分割の目安</span><b>${splitText}</b><small>重量だけの目安です。荷台寸法・長物・荷重バランス・車検証を優先してください。</small></div>`;
  $('#loadList').innerHTML=rows.length?rows.map((r,i)=>`<article class="load-row"><div><b>${escapeHtml(r.name)}</b><small>${Number(r.weight).toFixed(2)}kg/${escapeHtml(r.unit||'')} × ${Number(r.qty).toLocaleString()}</small></div><strong>${((Number(r.weight)||0)*(Number(r.qty)||0)).toFixed(1)}kg</strong><button data-load-del="${i}" aria-label="削除">×</button></article>`).join(''):'<div class="card empty">返却する資材を追加してください</div>';
  $$('[data-load-del]').forEach(b=>b.onclick=()=>{const a=getReturnLoad();a.splice(Number(b.dataset.loadDel),1);saveReturnLoad(a);renderReturnLoad()});
}
function addReturnLoadItem(){const m=MATERIALS.find(x=>String(x.id)===String($('#loadMaterial')?.value)),q=Math.max(1,Number($('#loadQty')?.value)||1);if(!m)return toast('資材を選択してください');const a=getReturnLoad(),same=a.find(x=>String(x.materialId)===String(m.id));if(same)same.qty=(Number(same.qty)||0)+q;else a.push({materialId:m.id,name:m.name,unit:m.unit,weight:Number(m.weight)||0,qty:q});saveReturnLoad(a);$('#loadQty').value=1;renderReturnLoad();toast('積載リストに追加しました')}
function clearReturnLoad(){if(!getReturnLoad().length)return;if(confirm('返却重量計算のリストをクリアしますか？')){saveReturnLoad([]);renderReturnLoad()}}

const RETURN_TRUCK_KEY='vertx_return_truck_requests_v712';
function getReturnTruckRequests(){try{return JSON.parse(lsGet(RETURN_TRUCK_KEY)||'[]')||[]}catch{return []}}
function saveReturnTruckRequests(v){lsSet(RETURN_TRUCK_KEY,JSON.stringify(v))}
function returnTruckLabel(){
  const custom=Math.max(0,Number($('#loadCustomCapacity')?.value)||0);
  if(custom)return `最大積載量 ${custom.toLocaleString()}kg車`;
  const sel=$('#loadTruckCapacity');
  return sel?.options?.[sel.selectedIndex]?.textContent||`${returnLoadCapacity().toLocaleString()}kg車`;
}
function returnTruckRequestText(req){
  const items=(req.items||[]).map(x=>`${x.name} ${Number(x.qty).toLocaleString()}${x.unit||''}`).join('\n');
  return `【返却車 手配依頼】\n現場：${req.site}\n返却希望日：${req.date}\n車両：${req.truck}\n返却材重量：約${Number(req.weight).toFixed(1)}kg\n\n${items}${req.memo?`\n\nメモ：${req.memo}`:''}`;
}
async function requestReturnTruck(){
  const items=getReturnLoad();
  if(!items.length)return toast('先に返却する資材を追加してください');
  const site=$('#returnTruckSite')?.value||state.selectedSite||'';
  if(!site||site==='現場未登録')return toast('返却する現場を選択してください');
  const date=$('#returnTruckDate')?.value||todayIso();
  const time=$('#returnTruckTime')?.value||'';
  const memo=$('#returnTruckMemo')?.value.trim()||'';
  const weight=items.reduce((a,x)=>a+(Number(x.weight)||0)*(Number(x.qty)||0),0);
  const capacity=returnLoadCapacity();
  if(weight>capacity&&!confirm(`計算上、最大積載量を約 ${(weight-capacity).toFixed(0)}kg 超えています。それでも返却車を手配しますか？`))return;
  const req={id:Date.now(),type:'return',site,date,time,memo,weight,capacity,truck:returnTruckLabel(),status:'返却依頼',items:items.map(x=>({...x})),createdAt:new Date().toISOString()};
  const a=getReturnTruckRequests();a.unshift(req);saveReturnTruckRequests(a);audit('返却車手配',`${site} / ${req.truck} / ${weight.toFixed(1)}kg`);
  const status=$('#returnTruckStatus');if(status)status.innerHTML=`<div class="card return-request-saved"><b>✓ 返却車を手配リストへ追加しました</b><small>${escapeHtml(site)} / ${escapeHtml(date)} / ${escapeHtml(req.truck)} / 約${weight.toFixed(1)}kg</small></div>`;
  renderDispatch();
  const text=returnTruckRequestText(req);
  try{
    if(navigator.share)await navigator.share({title:`${site} 返却車手配`,text});
    else{await navigator.clipboard.writeText(text);toast('返却依頼を保存して文面をコピーしました')}
  }catch(e){if(e?.name!=='AbortError'){try{await navigator.clipboard.writeText(text);toast('返却依頼を保存して文面をコピーしました')}catch{prompt('この返却依頼をコピーしてください',text)}}}
}


function getSiteCostData(){try{return JSON.parse(lsGet('vertx_core_site_costs')||'{"revenues":{},"entries":[]}')}catch{return {revenues:{},entries:[]}}}
function saveSiteCostData(v){lsSet('vertx_core_site_costs',JSON.stringify(v))}
function renderSiteCosts(){if(!$('#costSite'))return;const sites=getSites(),prev=$('#costSite').value;$('#costSite').innerHTML=sites.length?sites.map(s=>`<option>${escapeHtml(s)}</option>`).join(''):'<option>現場未登録</option>';if(prev&&sites.includes(prev))$('#costSite').value=prev;const site=$('#costSite').value,data=getSiteCostData(),revenue=Number(data.revenues?.[site]||0),entries=(data.entries||[]).filter(x=>x.site===site),cost=entries.reduce((a,x)=>a+Number(x.amount||0),0),profit=revenue-cost,margin=revenue?profit/revenue*100:0;$('#costRevenue').value=revenue||'';$('#costSummary').innerHTML=`<div class="profit-grid"><article><span>売上</span><strong>¥${revenue.toLocaleString()}</strong></article><article><span>原価</span><strong>¥${cost.toLocaleString()}</strong></article><article class="${profit<0?'loss':'gain'}"><span>粗利</span><strong>¥${profit.toLocaleString()}</strong></article><article><span>粗利率</span><strong>${margin.toFixed(1)}%</strong></article></div>`;$('#costList').innerHTML=entries.length?entries.map(x=>`<article class="card ops-row"><div class="ops-row-head"><div><b>${escapeHtml(x.category)}</b><small>${escapeHtml(x.memo||x.date||'')}</small></div><strong>¥${Number(x.amount).toLocaleString()}</strong></div><button class="danger-link" data-cost-delete="${x.id}">削除</button></article>`).join(''):'<div class="card empty">原価明細はまだありません</div>';$('#costSite').onchange=renderSiteCosts;$$('[data-cost-delete]').forEach(b=>b.onclick=()=>deleteCost(Number(b.dataset.costDelete)))}
function saveRevenue(){const site=$('#costSite').value,amount=Math.max(0,Number($('#costRevenue').value)||0),d=getSiteCostData();d.revenues=d.revenues||{};d.revenues[site]=amount;saveSiteCostData(d);audit('現場売上更新',`${site} / ¥${amount.toLocaleString()}`);renderSiteCosts();toast('売上を保存しました')}
function addCost(){const site=$('#costSite').value,category=$('#costCategory').value,amount=Math.max(0,Number($('#costAmount').value)||0),memo=$('#costMemo').value.trim();if(!amount)return toast('金額を入力してください');const d=getSiteCostData();d.entries=d.entries||[];d.entries.unshift({id:Date.now(),site,category,amount,memo,date:todayIso()});saveSiteCostData(d);audit('現場原価追加',`${site} / ${category} / ¥${amount.toLocaleString()}`);$('#costAmount').value='';$('#costMemo').value='';renderSiteCosts();toast('原価を追加しました')}
function deleteCost(id){const d=getSiteCostData();d.entries=(d.entries||[]).filter(x=>Number(x.id)!==Number(id));saveSiteCostData(d);renderSiteCosts()}

function siteDeepLink(site){const u=new URL(location.origin+location.pathname);u.searchParams.set('site',site);return u.toString()}
function renderSiteQr(){if(!$('#qrSite'))return;const prev=$('#qrSite').value;$('#qrSite').innerHTML=optionSites();if(prev)$('#qrSite').value=prev}
function makeSiteQr(){const site=$('#qrSite').value;if(!site||site==='現場未登録')return toast('先に現場を登録してください');const url=siteDeepLink(site),img=`https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=16&data=${encodeURIComponent(url)}`;$('#qrResult').classList.remove('empty');$('#qrResult').innerHTML=`<span class="qr-label">${escapeHtml(site)}</span><img src="${img}" alt="${escapeHtml(site)}のQRコード"><code>${escapeHtml(url)}</code><div class="action-grid"><button id="copyQrUrlBtn" class="secondary-btn full">URLコピー</button><button id="shareQrBtn" class="primary-btn full">共有</button></div>`;$('#copyQrUrlBtn').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('現場URLをコピーしました')}catch{prompt('コピーしてください',url)}};$('#shareQrBtn').onclick=async()=>{if(navigator.share)await navigator.share({title:`${site} | VERTX CORE`,text:'現場ページ',url});else await navigator.clipboard.writeText(url)}}
function prefillSiteFromUrl(){const u=new URL(location.href),site=u.searchParams.get('site');if(!site)return;state.selectedSite=site;persistDraftState();if($('#siteName'))$('#siteName').value=site;u.searchParams.delete('site');history.replaceState({},'',u.toString());setTimeout(()=>{go('order');toast(`${site} を選択しました`)},100)}

function getSuppliers(){try{return JSON.parse(lsGet('vertx_core_suppliers')||'[]')}catch{return []}}
function saveSuppliers(v){lsSet('vertx_core_suppliers',JSON.stringify(v))}
function renderSuppliers(){const a=getSuppliers();$('#supplierList').innerHTML=a.length?a.map((s,i)=>`<article class="card ops-row"><div class="ops-row-head"><div><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.channel==='email'?'メール':s.channel==='phone'?'電話':'LINE / 共有')} ${escapeHtml(s.contact||'')}</small></div><span class="supplier-badge">発注先</span></div><p>${escapeHtml((s.template||'').slice(0,90))}</p><button class="danger-link" data-supplier-delete="${i}">削除</button></article>`).join(''):'<div class="card empty">リース会社・資材屋を登録できます</div>';$$('[data-supplier-delete]').forEach(b=>b.onclick=()=>{const x=getSuppliers();x.splice(Number(b.dataset.supplierDelete),1);saveSuppliers(x);renderSuppliers()})}
function addSupplier(){const name=$('#supplierName').value.trim(),channel=$('#supplierChannel').value,contact=$('#supplierContact').value.trim(),template=$('#supplierTemplate').value.trim();if(!name)return toast('会社名を入力してください');const a=getSuppliers();a.unshift({id:Date.now(),name,channel,contact,template:template||'お疲れ様です。\n{site}の資材注文です。\n\n{items}\n\n希望日：{date}\n重量：{weight}\n車両目安：{truck}\n{memo}'});saveSuppliers(a);$('#supplierName').value='';$('#supplierContact').value='';$('#supplierTemplate').value='';renderSuppliers();toast('発注先を保存しました')}
function supplierOrderText(order,supplier){const items=(order.items||[]).map(i=>`${i.name} ${i.qty}${i.unit||''}`).join('\n');return String(supplier?.template||'{site}\n{items}\n希望日：{date}').replaceAll('{site}',order.site||'').replaceAll('{date}',order.date||'未設定').replaceAll('{items}',items).replaceAll('{weight}',formatWeight(order.weight||0)).replaceAll('{truck}',order.truck||truckFor(order.weight||0)).replaceAll('{memo}',order.memo||'')}
async function copySupplierOrder(){const id=Number($('#confirmSupplier')?.value),s=getSuppliers().find(x=>Number(x.id)===id);if(!s)return toast('発注先を選択してください');const text=supplierOrderText(currentDraft(),s);try{await navigator.clipboard.writeText(text);toast(`${s.name}用の発注文をコピーしました`)}catch{prompt('この発注文をコピーしてください',text)}}
// ---------------------------------------------------------------------------
function renderShortage(){$('#shortageSite').innerHTML=optionSites();$('#shortageMaterial').innerHTML=optionMaterials()}
function addShortage(){const site=$('#shortageSite').value,id=$('#shortageMaterial').value,q=Math.max(1,Number($('#shortageQty').value)||1);state.selectedSite=site;state.cart[id]=(state.cart[id]||0)+q;persistDraftState();renderMaterials();go('order');toast(`不足分 ${q} を注文に追加しました`)}
function getSets(){try{return JSON.parse(lsGet('vertx_core_sets')||'[]')}catch{return []}}
function saveSets(v){lsSet('vertx_core_sets',JSON.stringify(v))}
function saveCurrentSet(){const name=$('#setName').value.trim(),items=selectedItems();if(!name)return toast('セット名を入力してください');if(!items.length)return toast('先に注文画面で資材を選んでください');const a=getSets();a.unshift({id:Date.now(),name,items:items.map(x=>({id:x.id,qty:x.qty}))});saveSets(a);$('#setName').value='';renderSets();toast('セットを保存しました')}
function renderSets(){const a=getSets();$('#setList').innerHTML=a.length?a.map((x,i)=>`<article class="card set-row"><b>${escapeHtml(x.name)}</b><small>${x.items.length}種類</small><div class="quick-actions"><button data-set-apply="${i}">注文に入れる</button><button data-set-del="${i}">削除</button></div></article>`).join(''):'<div class="card empty">よく使う組み合わせを保存できます</div>';$$('[data-set-apply]').forEach(b=>b.onclick=()=>{const x=getSets()[Number(b.dataset.setApply)];if(!x)return;x.items.forEach(i=>state.cart[i.id]=(state.cart[i.id]||0)+i.qty);persistDraftState();renderMaterials();go('order');toast('セットを注文に追加しました')});$$('[data-set-del]').forEach(b=>b.onclick=()=>{const a=getSets();a.splice(Number(b.dataset.setDel),1);saveSets(a);renderSets()})}
const ORDER_STATUSES=['発注済','準備中','配送中','納品済'];
function nextStatus(v){const i=ORDER_STATUSES.indexOf(v);return ORDER_STATUSES[(i<0?0:i+1)%ORDER_STATUSES.length]}
function renderDispatch(){
  if(!$('#dispatchList'))return;const returns=getReturnTruckRequests(),orders=getHistory();const events=[];
  returns.forEach(r=>events.push({kind:'return',date:r.date||'',createdAt:r.createdAt||'',data:r}));orders.forEach(o=>events.push({kind:'delivery',date:o.date||'',createdAt:o.createdAt||'',data:o}));
  events.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.createdAt).localeCompare(String(b.createdAt)));
  const today=todayIso(),upcoming=events.filter(e=>e.date>=today).slice(0,4);const summary=$('#dispatchTimelineSummary');if(summary)summary.innerHTML=upcoming.length?upcoming.map(e=>`<div class="timeline-mini"><span>${e.kind==='return'?'↩ 返却':'🚚 搬入'}</span><b>${escapeHtml(e.data.site||'')}</b><small>${escapeHtml(e.date||'日付未設定')} · ${escapeHtml(e.data.truck||truckFor(e.data.weight||0))}</small></div>`).join(''):'<div class="empty">今後の搬入・返却予定はありません</div>';
  $('#dispatchList').innerHTML=events.length?events.map(e=>{const x=e.data;if(e.kind==='return')return `<article class="card dispatch-row return-dispatch"><div class="stock-grid"><div><b>↩ ${escapeHtml(x.site)}</b><small>${escapeHtml(x.date||'日付未設定')}</small></div><span class="status-pill">${escapeHtml(x.status||'返却依頼')}</span></div><div class="history-item-row"><span>返却車</span><strong>${escapeHtml(x.truck||'')}</strong></div><div class="history-item-row"><span>返却重量</span><strong>${formatWeight(x.weight||0)}</strong></div><button data-return-truck-share="${x.id}" class="secondary-btn full">返却依頼を共有</button><button data-return-truck-done="${x.id}" class="text-btn full">${x.status==='返却完了'?'返却完了済み':'返却完了にする'}</button></article>`;return `<article class="card dispatch-row"><div class="stock-grid"><div><b>🚚 ${escapeHtml(x.site)}</b><small>${escapeHtml(x.date||'日付未設定')}</small></div><span class="status-pill">${escapeHtml(x.status||'発注済')}</span></div><div class="history-item-row"><span>車両</span><strong>${escapeHtml(x.truck||truckFor(x.weight))}</strong></div><div class="history-item-row"><span>重量</span><strong>${formatWeight(x.weight)}</strong></div>${x.inventoryApplied?'<div class="history-item-row"><span>在庫</span><strong>✓ 自動反映済み</strong></div>':''}<button data-status="${x.id}" class="secondary-btn full">ステータスを進める</button></article>`}).join(''):'<div class="card empty">注文または返却車の手配をすると配車予定に表示されます</div>';
  $$('[data-status]').forEach(b=>b.onclick=()=>{const a=getHistory(),o=a.find(x=>x.id===Number(b.dataset.status));if(o){const before=o.status||'発注済';o.status=nextStatus(before);let applied=false;if(o.status==='納品済')applied=applyOrderToStock(o);saveHistory(a);audit('注文ステータス変更',`${o.site} / ${before} → ${o.status}`);renderDispatch();if(applied){renderSiteStock();toast('納品済み：現場在庫へ自動反映しました')}}});
  $$('[data-return-truck-share]').forEach(b=>b.onclick=async()=>{const r=getReturnTruckRequests().find(x=>Number(x.id)===Number(b.dataset.returnTruckShare));if(!r)return;const text=returnTruckRequestText(r);try{if(navigator.share)await navigator.share({title:`${r.site} 返却車手配`,text});else{await navigator.clipboard.writeText(text);toast('返却依頼をコピーしました')}}catch(e){if(e?.name!=='AbortError')prompt('この返却依頼をコピーしてください',text)}});
  $$('[data-return-truck-done]').forEach(b=>b.onclick=()=>{const a=getReturnTruckRequests(),r=a.find(x=>Number(x.id)===Number(b.dataset.returnTruckDone));if(!r)return;r.status='返却完了';saveReturnTruckRequests(a);audit('返却完了',`${r.site} / ${r.truck}`);renderDispatch();toast('返却完了にしました')});
}



async function loadCompareDrawings(){const a=await drawingList();const opts='<option value="">図面を選択</option>'+a.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');$('#compareOld').innerHTML=opts;$('#compareNew').innerHTML=opts}
async function runCompare(){const oldId=Number($('#compareOld').value),newId=Number($('#compareNew').value);if(!oldId||!newId||oldId===newId)return toast('旧図面と新図面を別々に選んでください');const oldD=await drawingGet(oldId),newD=await drawingGet(newId);if(!oldD||!newD)return toast('図面が見つかりません');const st=$('#compareStatus');st.classList.remove('hidden');st.textContent='AIが新旧図面を比較しています…';$('#compareResult').innerHTML='';try{let oldBlob=oldD.blob,newBlob=newD.blob;if(!String(oldD.type).includes('pdf'))oldBlob=await compressImageForAi(oldBlob,oldD.type);if(!String(newD.type).includes('pdf'))newBlob=await compressImageForAi(newBlob,newD.type);const body={old:{filename:oldD.name,mimeType:oldD.type,dataBase64:await blobToBase64(oldBlob)},newer:{filename:newD.name,mimeType:newD.type,dataBase64:await blobToBase64(newBlob)},context:$('#compareContext').value.trim()};const r=await fetch('/api/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'比較に失敗しました');const a=data.analysis;$('#compareResult').innerHTML=`<h3>${escapeHtml(a.summary||'比較結果')}</h3>${(a.changes||[]).map(x=>`<div class="compare-change"><b>${escapeHtml(x.area||'変更')}</b><p>${escapeHtml(x.change||'')}</p><small>${escapeHtml(x.impact||'')}</small></div>`).join('')}${(a.warnings||[]).length?`<div class="ai-warning"><b>注意</b>${a.warnings.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</div>`:''}`;st.textContent='比較完了';audit('AI図面比較',`${oldD.name} → ${newD.name}`)}catch(e){st.textContent=e.message;$('#compareResult').textContent='AI比較に失敗しました'} }

function normalizeVoiceText(v=''){
  return String(v).toLowerCase()
    .replace(/[，、]/g,',').replace(/[。]/g,' ')
    .replace(/点/g,'.').replace(/ｍ/g,'m').replace(/メートル/g,'m')
    .replace(/枚|本|個|台|点/g,m=>m).replace(/\s+/g,' ')
    .trim();
}
function voiceMaterialNames(m){
  const a=[m.name,...String(m.aliases||'').split('/')].map(x=>normalizeVoiceText(x).trim()).filter(Boolean);
  // 現場でよく使う短縮名も追加
  if(m.name.startsWith('アンチ '))a.push(m.name.replace('アンチ ','アンチ'));
  if(m.name.startsWith('ハーフアンチ '))a.push(m.name.replace('ハーフアンチ ','ハーフアンチ'));
  if(m.name.startsWith('ブレス '))a.push(m.name.replace('ブレス ','ブレス'));
  if(m.name.startsWith('枠 '))a.push(m.name.replace('枠 ','枠'));
  if(m.name.startsWith('下さん '))a.push(m.name.replace('下さん ','下さん'));
  for(const [alias,ids] of Object.entries(FIELD_ALIAS_MAP))if(ids.map(String).includes(String(m.id)))a.push(normalizeVoiceText(alias));
  return [...new Set(a)].sort((x,y)=>y.length-x.length);
}
function parseVoiceOrder(){
  const raw=$('#voiceText').value.trim();if(!raw)return toast('内容を入力してください');
  const text=normalizeVoiceText(raw);const found=new Map();
  for(const m of MATERIALS){
    for(const name of voiceMaterialNames(m)){
      const esc=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*');
      const patterns=[
        new RegExp(esc+'\\s*(?:を|が|は)?\\s*(\\d+)\\s*(?:枚|本|個|台|点)?','i'),
        new RegExp('(\\d+)\\s*(?:枚|本|個|台|点)?\\s*(?:の)?\\s*'+esc,'i')
      ];
      let mm=null;for(const re of patterns){mm=text.match(re);if(mm)break}
      if(mm){found.set(m.id,{m,qty:Number(mm[1])});break}
    }
  }
  const hits=[...found.values()];
  hits.forEach(x=>state.cart[x.m.id]=(state.cart[x.m.id]||0)+x.qty);
  $('#voiceResult').innerHTML=hits.length?hits.map(x=>`<div class="history-item-row"><span>${escapeHtml(x.m.name)}</span><strong>${x.qty}${escapeHtml(x.m.unit)}</strong></div>`).join(''):'資材名と数量を認識できませんでした。例：アンチ1.8を50枚、枠610を30枚';
  if(hits.length){renderMaterials();toast(`${hits.length}種類を注文候補に追加しました`)}
}
let voiceRecorder=null,voiceChunks=[],voiceStream=null;
async function transcribeRecordedAudio(blob){
  if(blob.size>3.2*1024*1024)throw new Error('録音が長すぎます。短く区切って話してください');
  const dataBase64=await blobToBase64(blob);
  const r=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mimeType:blob.type||'audio/webm',dataBase64})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'音声変換に失敗しました');return data.text||'';
}
async function startRecordedVoice(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return toast('この端末ではマイク録音を利用できません');
  const btn=$('#voiceStartBtn');
  if(voiceRecorder&&voiceRecorder.state==='recording'){voiceRecorder.stop();btn.textContent='⏳ 音声を変換中…';btn.disabled=true;return}
  try{
    voiceStream=await navigator.mediaDevices.getUserMedia({audio:true});voiceChunks=[];
    const types=['audio/mp4','audio/webm;codecs=opus','audio/webm'];const type=types.find(t=>MediaRecorder.isTypeSupported?.(t))||'';
    voiceRecorder=new MediaRecorder(voiceStream,type?{mimeType:type}:undefined);
    voiceRecorder.ondataavailable=e=>{if(e.data?.size)voiceChunks.push(e.data)};
    voiceRecorder.onerror=()=>toast('録音に失敗しました');
    voiceRecorder.onstop=async()=>{try{voiceStream?.getTracks().forEach(t=>t.stop());const blob=new Blob(voiceChunks,{type:voiceRecorder.mimeType||'audio/webm'});const text=await transcribeRecordedAudio(blob);$('#voiceText').value=text;if(text)parseVoiceOrder();else toast('音声を認識できませんでした')}catch(e){toast('音声入力エラー：'+(e.message||e))}finally{btn.disabled=false;btn.textContent='🎙 音声入力を開始'}};
    voiceRecorder.start();btn.textContent='■ 録音停止して注文に変換';toast('話してください。終わったらもう一度ボタンを押してください');
  }catch(e){toast(e?.name==='NotAllowedError'?'マイクの使用を許可してください':'マイクを開始できませんでした')}
}
function startVoiceOrder(){
  // Chrome/Edge等は端末内Web Speechを優先。iPhone/Safari等は録音→OpenAI文字起こしへフォールバック。
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return startRecordedVoice();
  try{
    const r=new SR();r.lang='ja-JP';r.interimResults=true;r.continuous=false;
    const btn=$('#voiceStartBtn');btn.textContent='🎙 聞き取り中…';btn.disabled=true;
    r.onresult=e=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;$('#voiceText').value=t};
    r.onend=()=>{btn.disabled=false;btn.textContent='🎙 音声入力を開始';if($('#voiceText').value.trim())parseVoiceOrder()};
    r.onerror=e=>{btn.disabled=false;btn.textContent='🎙 音声入力を開始';if(['not-allowed','service-not-allowed'].includes(e.error))toast('マイクの使用を許可してください');else startRecordedVoice()};
    r.start();toast('話してください');
  }catch(e){startRecordedVoice()}
}
function renderSiteDashboard(){const sites=getSites();$('#dashSite').innerHTML='<option value="">現場を選択</option>'+sites.map(s=>`<option>${escapeHtml(s)}</option>`).join('');$('#dashSite').onchange=renderSiteDashboardBody;renderSiteDashboardBody()}
function renderSiteDashboardBody(){const site=$('#dashSite')?.value||getSites()[0]||'';if($('#dashSite')&&site)$('#dashSite').value=site;const stock=getStock().filter(x=>x.site===site),orders=getHistory().filter(x=>x.site===site);let w=0,q=0;stock.forEach(r=>{const m=MATERIALS.find(x=>x.id===r.materialId);q+=Number(r.qty)||0;w+=(Number(r.qty)||0)*(Number(m?.weight)||0)});$('#siteDashboardBody').innerHTML=site?`<div class="stats-grid"><article class="card stat"><span>現場在庫</span><strong>${q.toLocaleString()}点</strong></article><article class="card stat"><span>在庫重量</span><strong>${(w/1000).toFixed(2)}t</strong></article><article class="card stat"><span>注文回数</span><strong>${orders.length}</strong></article><article class="card stat"><span>最新搬入</span><strong>${escapeHtml(orders[0]?.date||'-')}</strong></article></div><div class="card"><h3>${escapeHtml(site)}</h3>${stock.slice(0,12).map(r=>`<div class="history-item-row"><span>${escapeHtml(r.materialName)}</span><strong>${Number(r.qty).toLocaleString()}</strong></div>`).join('')||'<p class="muted">在庫なし</p>'}</div>`:'<div class="card empty">現場を登録すると表示されます</div>'}
function renderAnalytics(){const h=getHistory();const totalW=h.reduce((a,o)=>a+(Number(o.weight)||0),0),items=h.reduce((a,o)=>a+(o.items||[]).reduce((s,i)=>s+(Number(i.qty)||0),0),0);const sites=new Set(h.map(x=>x.site).filter(Boolean)).size;$('#analyticsBody').innerHTML=`<div class="stats-grid"><article class="card stat"><span>注文</span><strong>${h.length}件</strong></article><article class="card stat"><span>注文数量</span><strong>${items.toLocaleString()}点</strong></article><article class="card stat"><span>搬入重量</span><strong>${(totalW/1000).toFixed(2)}t</strong></article><article class="card stat"><span>稼働現場</span><strong>${sites}</strong></article></div><div class="card"><h3>車両目安</h3>${Object.entries(h.reduce((a,o)=>{const t=o.truck||truckFor(o.weight||0);a[t]=(a[t]||0)+1;return a},{})).map(([k,v])=>`<div class="history-item-row"><span>${escapeHtml(k)}</span><strong>${v}回</strong></div>`).join('')||'<p class="muted">データなし</p>'}</div>`}
let roleInviteTokens={admin:null,member:null,viewer:null};
async function renderMembers(){
  const s=getCompanySession(),root=$('#memberRoleBody');if(!root)return;
  root.innerHTML=`<div class="company-profile"><span>現在の権限</span><strong>${escapeHtml(roleLabel(s?.role))}</strong></div><p class="muted">読み込み中…</p>`;
  if(!supabaseClient||!s?.orgId)return;
  try{const {data:toks,error:tErr}=await supabaseClient.rpc('get_organization_role_invites',{p_org:s.orgId});if(!tErr&&toks?.[0])roleInviteTokens={admin:toks[0].admin_token||null,member:toks[0].member_token||null,viewer:toks[0].viewer_token||null};}catch(e){console.warn('invite token load',e)}
  const {data,error}=await supabaseClient.rpc('list_organization_members',{p_org:s.orgId});
  if(error){root.innerHTML+=`<div class="member-error"><b>メンバー機能のDB更新が必要です</b><p>SUPABASE_V5_1_MIGRATION.sql をSupabase SQL Editorで1回実行してください。</p><small>${escapeHtml(error.message)}</small></div>`;return}
  const canManage=['owner','admin'].includes(s.role);
  document.querySelectorAll('[data-invite-role]').forEach(btn=>{const role=btn.dataset.inviteRole;btn.style.display=(canManage&&(role!=='admin'||s.role==='owner'))?'':'none';});
  root.innerHTML=`<div class="company-profile"><span>現在の権限</span><strong>${escapeHtml(roleLabel(s.role))}</strong></div>`+(data||[]).map(m=>`<div class="history-item-row"><span>${escapeHtml(m.email||'メンバー')}<small>${escapeHtml(roleLabel(m.role))}</small></span>${canManage&&m.role!=='owner'?`<select data-member-user="${m.user_id}"><option value="admin" ${m.role==='admin'?'selected':''}>管理者</option><option value="member" ${m.role==='member'?'selected':''}>職長</option><option value="viewer" ${m.role==='viewer'?'selected':''}>閲覧</option></select>`:`<strong>${escapeHtml(roleLabel(m.role))}</strong>`}</div>`).join('');
  root.querySelectorAll('[data-member-user]').forEach(sel=>sel.onchange=async()=>{const {error}=await supabaseClient.rpc('set_organization_member_role',{p_org:s.orgId,p_user:sel.dataset.memberUser,p_role:sel.value});if(error){toast('権限変更失敗：'+error.message);await renderMembers()}else toast('権限を変更しました')});
}
function roleLabel(r){return ({owner:'社長 / Owner',admin:'管理者 / Admin',member:'職長 / Member',viewer:'閲覧'})[r]||r||'職長 / Member'}
function canOpenScreen(screenId){const actual=getActualRole();if(screenId==='devTest')return actual==='owner';const r=getEffectiveRole();if(r==='owner')return true;if(r==='admin')return !['plans','devTest'].includes(screenId);if(r==='member')return !['materialsMaster','members','plans','analytics','companySettings','siteCosts','suppliers','auditLog','devTest'].includes(screenId);if(r==='viewer')return ['home','more','history','favorites','drawings','siteStock','siteDashboard','siteQr','companySettings','manual','returnLoad'].includes(screenId);return false}
function applyRoleUi(){document.querySelectorAll('[data-go]').forEach(el=>{const target=el.dataset.go;if(!target||target==='home')return;const allowed=canOpenScreen(target);if(el.classList.contains('menu-card')||el.closest('.control-section'))el.style.display=allowed?'':'none';});const r=getEffectiveRole();if($('#memberInviteBtn'))$('#memberInviteBtn').style.display=['owner','admin'].includes(r)?'':'none';const dev=$('[data-go="devTest"]');if(dev)dev.style.display=getActualRole()==='owner'?'':'none';updateDevTestBanner();}


async function saveAiLearningExample(source='drawing'){
  try{
    const finalItems=Object.entries(state.cart||{}).map(([id,qty])=>{const m=MATERIALS.find(x=>String(x.id)===String(id));return m&&Number(qty)>0?{material_name:m.name,quantity:Number(qty),unit:m.unit}:null}).filter(Boolean);
    if(!finalItems.length)return;
    const example={source_type:source,context:($('#aiContext')?.value||$('#photoAiContext')?.value||'').trim(),corrected_materials:finalItems,created_at:new Date().toISOString()};
    try{const key=tenantKey('vertx_core_ai_learning_local');const prev=JSON.parse(nativeGet(key)||'[]');nativeSet(key,JSON.stringify([example,...prev].slice(0,30)))}catch{}
    const org=getCompanySession()?.orgId;if(org&&cloudReady&&supabaseClient){const {error}=await supabaseClient.from('ai_learning_examples').insert({organization_id:org,source_type:example.source_type,context:example.context,corrected_materials:example.corrected_materials});if(error)console.warn('cloud learning save failed',error)}
    lsSet('vertx_core_ai_learning_version',String(Date.now()));updateLearningCount();
  }catch(e){console.warn('learning save failed',e)}
}
async function updateLearningCount(){
  try{const org=getCompanySession()?.orgId;if(!org||!cloudReady)return;const {count}=await supabaseClient.from('ai_learning_examples').select('*',{count:'exact',head:true}).eq('organization_id',org);document.querySelectorAll('[data-learning-count]').forEach(x=>x.textContent=String(count||0));}catch{}}
function renderPlans(){
  const s=getCompanySession();const plan=s?.plan||'free';
  document.querySelectorAll('.plan-card').forEach(x=>{x.classList.toggle('current',x.dataset.plan===plan);const b=x.querySelector('button');if(b)b.onclick=e=>{e.stopPropagation();selectPlan(x.dataset.plan)}});
  if($('#standardPrice'))$('#standardPrice').textContent=billingConfig.standardPriceLabel;
  if($('#proPrice'))$('#proPrice').textContent=billingConfig.proPriceLabel;
  const statusLabel=({trial:'トライアル',active:'契約中',past_due:'支払い確認が必要',canceled:'解約済み'})[s?.subscriptionStatus]||s?.subscriptionStatus||'未契約';
  const note=$('#planChangeStatus');if(note)note.innerHTML=`<b>${planLabel(plan)}</b> / ${statusLabel}${s?.billingPeriodEnd?`<small>次回更新目安 ${new Date(s.billingPeriodEnd).toLocaleDateString('ja-JP')}</small>`:''}`;
  const portal=$('#billingPortalBtn');if(portal){portal.classList.toggle('hidden',!s?.billingCustomerId);portal.onclick=openBillingPortal}
  const cfg=$('#billingSetupNote');if(cfg)cfg.classList.toggle('hidden',billingConfig.configured);
  updateLearningCount();
}
function planLabel(p){return ({free:'Free',standard:'Standard',pro:'Pro'})[p]||p}
async function authAccessToken(){const {data}=await supabaseClient.auth.getSession();return data?.session?.access_token||''}
async function selectPlan(nextPlan){
  const s=getCompanySession();if(!s?.orgId)return toast('会社情報を取得できません');if(s.role!=='owner')return toast('プラン変更は社長アカウントのみ可能です');if(!['free','standard','pro'].includes(nextPlan))return;
  if(nextPlan===s.plan&&s.subscriptionStatus==='active')return toast(`${planLabel(nextPlan)} を利用中です`);
  if(nextPlan==='free'){if(s.billingCustomerId)return openBillingPortal();return toast('Freeプランを利用中です')}
  if(!billingConfig.configured)return toast('Stripe設定がまだ完了していません');
  if(!confirm(`${planLabel(nextPlan)} の申込み画面へ進みますか？`))return;
  const status=$('#planChangeStatus');if(status)status.textContent='Stripe決済画面を準備中…';
  try{const token=await authAccessToken();const r=await fetch('/api/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orgId:s.orgId,plan:nextPlan,returnUrl:location.origin})});const data=await r.json();if(!r.ok)throw new Error(data.error||'決済を開始できません');location.href=data.url}catch(e){if(status)status.textContent='決済を開始できません：'+e.message;toast(e.message)}
}
async function openBillingPortal(){const s=getCompanySession();if(!s?.orgId)return;try{const token=await authAccessToken();const r=await fetch('/api/create-billing-portal',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orgId:s.orgId,returnUrl:location.origin})});const data=await r.json();if(!r.ok)throw new Error(data.error||'契約管理画面を開けません');location.href=data.url}catch(e){toast(e.message)}}
function applyPlanUi(){
  const p=getCompanySession()?.plan||'standard';document.body.dataset.plan=p;
  // 本番決済接続前は画面を消さず、プラン状態のみ反映する。決済導入時に機能ゲートへ切替可能。
}
async function runPhotoAi(){if(!photoAiFiles.length)return toast('写真を選択してください');const st=$('#photoAiStatus');st.classList.remove('hidden');st.textContent='CORE AIが写真を最適化しています…';const started=performance.now();try{const selected=photoAiFiles.slice(0,6);const [drawings,learningExamples]=await Promise.all([Promise.all(selected.map(async f=>{const b=await compressImageForAi(f,f.type);return {filename:f.name,mimeType:f.type,dataBase64:await blobToBase64(b)}})),getAiLearningContext()]);st.textContent='CORE AIが現場写真を確認しています…';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),75000);let r;try{r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({files:drawings,materialNames:MATERIALS.map(m=>m.name),companyVocabulary:MATERIALS.slice(0,450).map(m=>({name:m.name,aliases:m.aliases||'',category:m.category})),learningExamples,mode:'photo',speedMode:'fast',context:$('#photoAiContext').value.trim()+' 現場写真です。写っている足場資材を候補として抽出してください。数量に自信がない場合は低いconfidenceで返してください。'})})}finally{clearTimeout(timer)}const data=await r.json();if(!r.ok)throw new Error(data.error||'写真解析に失敗しました');const a=data.analysis||data;photoAiCandidates=a.materials||a.candidates||[];$('#photoAiResult').innerHTML=`<h3>${escapeHtml(a.summary||'写真AI結果')}</h3>`+photoAiCandidates.map(x=>`<div class="history-item-row"><span>${escapeHtml(x.material_name||x.name||x.material||'資材')}</span><strong>${Number(x.qty||x.quantity||0)||'?'} </strong></div>`).join('');$('#applyPhotoAiBtn').classList.toggle('hidden',!photoAiCandidates.length);$('#applyPhotoReturnBtn')?.classList.toggle('hidden',!photoAiCandidates.length);const sec=((performance.now()-started)/1000).toFixed(1);st.textContent=`解析完了 ${sec}秒 / 学習例${learningExamples.length}件参照`;audit('写真AI解析',`${selected.length}枚 / ${sec}秒 / 候補${photoAiCandidates.length}種類`)}catch(e){const msg=e?.name==='AbortError'?'写真AIが時間超過しました。写真を1〜3枚に絞って再試行してください。':(e.message||'写真解析に失敗しました');st.textContent=msg;$('#photoAiResult').textContent='解析できませんでした';audit('写真AIエラー',msg)}}

function applyPhotoAi(){let n=0;state.aiSource='photo';for(const x of photoAiCandidates){const name=x.material_name||x.name||x.material||'';const m=MATERIALS.find(y=>y.name===name)||matchMaterialLoose(name);const q=Number(x.qty||x.quantity||0);if(m&&q>0){state.cart[m.id]=(state.cart[m.id]||0)+q;n++}}persistDraftState();renderMaterials();go('order');toast(`${n}種類を注文へ追加しました`)}
function matchMaterialLoose(name=''){const q=normalizeVoiceText(name);let best=null,bestScore=0;for(const m of MATERIALS){for(const n of voiceMaterialNames(m)){if(q===n)return m;if(q.includes(n)||n.includes(q)){const sc=Math.min(q.length,n.length);if(sc>bestScore){best=m;bestScore=sc}}}}return best}
function applyPhotoAiToReturnLoad(){let n=0;const rows=getReturnLoad();for(const x of photoAiCandidates){const name=x.material_name||x.name||x.material||'';const m=MATERIALS.find(y=>y.name===name)||matchMaterialLoose(name);const q=Math.max(0,Number(x.qty||x.quantity||0));if(!m||!q)continue;const same=rows.find(r=>String(r.materialId)===String(m.id));if(same)same.qty=(Number(same.qty)||0)+q;else rows.push({materialId:m.id,name:m.name,unit:m.unit,weight:Number(m.weight)||0,qty:q});n++}saveReturnLoad(rows);if(n){audit('写真AI→重量計算',`${n}種類を返却重量へ追加`);go('returnLoad');toast(`${n}種類を返却重量計算へ追加しました`)}else toast('返却重量へ追加できる候補がありませんでした')}

function formatDate(v){return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}


function renderCompanyIdentity(){
  const s=getCompanySession();
  const gate=$('#companyGate');
  if(!s?.orgId){gate?.classList.remove('hidden');return false}
  gate?.classList.add('hidden');
  if($('#companyBadge'))$('#companyBadge').textContent=s.company||s.code;
  if($('#companyNameView'))$('#companyNameView').textContent=s.company||'-';
  if($('#companyCodeView'))$('#companyCodeView').textContent=s.code||'-';
  if($('#companyUserView'))$('#companyUserView').textContent=s.user||cloudUser?.email||'-';
  document.body.dataset.role=getEffectiveRole();applyRoleUi();applyPlanUi();updateDevTestBanner();
  return true;
}
function setAuthStatus(msg){const el=$('#authStatus');if(el)el.textContent=msg}
async function initSupabase(){
  try{
    const r=await fetch('/api/config',{cache:'no-store'}),cfg=await r.json();billingConfig={configured:Boolean(cfg.billingConfigured),standardPriceLabel:cfg.standardPriceLabel||'¥4,980/月',proPriceLabel:cfg.proPriceLabel||'¥9,800/月'};
    if(!cfg.configured)throw new Error('VercelにSUPABASE_URL / SUPABASE_ANON_KEYを設定してください');
    if(!window.supabase?.createClient)throw new Error('Supabaseライブラリを読み込めませんでした');
    supabaseClient=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return true;
  }catch(e){setAuthStatus(e.message);return false}
}
async function authLogin(){
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value;
  if(!email||!password)return setAuthStatus('メールアドレスとパスワードを入力してください');
  setAuthStatus('ログイン中…');
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error)return setAuthStatus('ログインできません：'+error.message);
  location.reload();
}
async function authSignup(){
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value;
  if(!email||password.length<8)return setAuthStatus('メールと8文字以上のパスワードを入力してください');
  setAuthStatus('登録中…');
  const {data,error}=await supabaseClient.auth.signUp({email,password});
  if(error)return setAuthStatus('登録できません：'+error.message);
  if(!data.session)setAuthStatus('確認メールを送りました。メール内のリンクを押してからログインしてください。');
  else location.reload();
}
async function getMemberships(){
  if(!supabaseClient||!cloudUser)return [];
  const {data,error}=await supabaseClient.from('memberships').select('role,organizations(id,name,code,invite_token,plan,subscription_status,trial_ends_at,billing_customer_id,billing_subscription_id,billing_period_end,cancel_at_period_end)').eq('user_id',cloudUser.id);
  if(error){console.warn(error);return null}
  return (data||[]).filter(x=>x.organizations);
}
function sessionFromMembership(m){return {orgId:m.organizations.id,company:m.organizations.name,code:m.organizations.code,user:getSavedIdentity().user||cloudUser?.email||'',role:m.role,inviteToken:m.organizations.invite_token,plan:m.organizations.plan||'free',subscriptionStatus:m.organizations.subscription_status||'trial',trialEndsAt:m.organizations.trial_ends_at||null,billingCustomerId:m.organizations.billing_customer_id||null,billingSubscriptionId:m.organizations.billing_subscription_id||null,billingPeriodEnd:m.organizations.billing_period_end||null,cancelAtPeriodEnd:Boolean(m.organizations.cancel_at_period_end),loginAt:new Date().toISOString()}}
async function activateMembership(m){const sm=sessionFromMembership(m);saveIdentity(sm.company,getSavedIdentity().user||sm.user);nativeSet(VERTX_SESSION_KEY,JSON.stringify(sm));await hydrateCloudStore();cloudReady=true;reloadTenantState();renderCompanyIdentity();startApp()}
function reloadTenantState(){
  MATERIALS=cleanMaterialMaster(loadMaterialMaster());
  lsSet('vertx_core_materials',JSON.stringify(MATERIALS));
  try{state.cart=JSON.parse(lsGet('vertx_core_draft_cart')||'{}')}catch{state.cart={}}
  state.category='すべて';state.search='';state.selectedSite=lsGet('vertx_core_last_site')||state.selectedSite||'';state.selectedDrawingId=null;
  try{state.favorites=new Set(JSON.parse(lsGet('vertx_core_favorites')||'[]'))}catch{state.favorites=new Set()}
}
async function resolveInviteRole(teamToken,urlRole=''){
  if(['admin','member','viewer'].includes(urlRole))return urlRole;
  if(!teamToken||!supabaseClient)return '';
  try{const {data,error}=await supabaseClient.rpc('resolve_organization_role_invite',{p_token:teamToken});if(!error&&data)return String(data)}catch(e){console.warn('invite role resolve',e)}
  return '';
}
function clearInviteParams(){const u=new URL(location.href);['team_invite','invite','invite_role'].forEach(k=>u.searchParams.delete(k));history.replaceState({},'',u.toString())}
async function guardInviteAccount(){
  const u=new URL(location.href),teamToken=u.searchParams.get('team_invite');
  if(!teamToken||!cloudUser)return false;
  const intended=await resolveInviteRole(teamToken,u.searchParams.get('invite_role')||'');
  if(!intended)return false;
  const memberships=await getMemberships();
  const sameTokenOrg=Array.isArray(memberships)?memberships.find(m=>m?.organizations):null;
  const currentRole=sameTokenOrg?.role||getCompanySession()?.role||'';
  if(['owner','admin'].includes(currentRole)&&currentRole!==intended){
    const label=intended==='admin'?'管理者':intended==='viewer'?'閲覧':'社員・職長';
    const current=currentRole==='owner'?'社長':'管理者';
    const switchAccount=confirm(`このURLは「${label}用」です。
現在は${current}アカウントでログイン中です。

社員本人のアカウントで参加するため、一度ログアウトしますか？`);
    if(switchAccount){await supabaseClient.auth.signOut();nativeRemove(VERTX_SESSION_KEY);location.reload();return true}
    clearInviteParams();toast(`${current}アカウントのまま開きました`);return true;
  }
  return false;
}
async function joinInviteIfPresent(){
  const u0=new URL(location.href);const teamToken=u0.searchParams.get('team_invite');const legacy=u0.searchParams.get('invite');
  if(!teamToken&&!legacy)return false;
  let error=null;
  if(teamToken){({error}=await supabaseClient.rpc('join_organization_by_role_invite',{p_token:teamToken}));}
  else{({error}=await supabaseClient.rpc('join_organization_by_invite',{p_token:legacy}));}
  if(error){const el=$('#companyGateStatus');if(el)el.textContent='招待参加に失敗しました：'+error.message;return false}
  clearInviteParams();return true;
}
async function chooseOrganization(){
  $('#cloudAuthGate')?.classList.add('hidden');
  const joined=await joinInviteIfPresent();
  const memberships=await getMemberships();
  const existing=getCompanySession();
  if(memberships===null&&existing?.orgId){cloudReady=false;reloadTenantState();renderCompanyIdentity();return startApp()}
  const safeMemberships=memberships||[];
  if(existing?.orgId){const hit=safeMemberships.find(m=>m.organizations.id===existing.orgId);if(hit)return activateMembership(hit);if(!safeMemberships.length){cloudReady=false;reloadTenantState();renderCompanyIdentity();return startApp()}}
  if(safeMemberships.length===1)return activateMembership(safeMemberships[0]);
  const gate=$('#companyGate');gate?.classList.remove('hidden');
  const card=gate?.querySelector('.company-gate-card');
  card?.querySelectorAll('.org-choice-list').forEach(x=>x.remove());
  if(safeMemberships.length){
    const list=document.createElement('div');list.className='org-choice-list';
    list.innerHTML='<b>参加中の会社</b>'+safeMemberships.map((m,i)=>`<button class="secondary-btn full" data-org-choice="${i}">${escapeHtml(m.organizations.name)} <small>${escapeHtml(m.organizations.code)}</small></button>`).join('');
    card?.insertBefore(list,card.querySelector('label'));
    list.querySelectorAll('[data-org-choice]').forEach(btn=>btn.onclick=()=>activateMembership(safeMemberships[Number(btn.dataset.orgChoice)]));
  }
  if(joined&&safeMemberships.length)toast('招待された会社に参加しました');
}
function makeAutoCompanyCode(){
  const tail=Date.now().toString(36).slice(-6).toUpperCase();
  return `VX${tail}`;
}
async function companyLogin(){
  const company=$('#tenantCompanyName')?.value.trim()||'';
  const rawCode=$('#tenantCompanyCode')?.value.trim()||'';
  let code=normalizeCompanyCode(rawCode);
  const user=$('#tenantUserName')?.value.trim()||'';
  const st=$('#companyGateStatus');
  const btn=$('#tenantLoginBtn');
  const setGateStatus=(msg,type='')=>{if(!st)return;st.classList.remove('error','success');if(type)st.classList.add(type);st.textContent=msg};
  saveIdentity(company,user);
  if(!company){setGateStatus('会社名を入力してください。','error');return toast('会社名を入力してください')}
  if(!supabaseClient||!cloudUser){setGateStatus('ログイン情報を確認できません。画面を更新して、もう一度ログインしてください。','error');return}
  // 会社コードは完全任意。日本語・空欄・記号だけの場合も自動発行して止めない。
  if(!code)code=makeAutoCompanyCode();
  setGateStatus(`会社ワークスペースを作成しています… ${code}`);
  if(btn){btn.disabled=true;btn.innerHTML='<span class="btn-spinner"></span> 作成中…'}
  try{
    const createOnce=(nextCode)=>supabaseClient.rpc('create_organization',{p_name:company,p_code:nextCode});
    const withTimeout=(promise,ms=15000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('通信がタイムアウトしました。電波を確認してもう一度押してください。')),ms))]);
    let result=await withTimeout(createOnce(code));
    if(result.error && /duplicate|unique|already exists/i.test(result.error.message||'')){
      code=makeAutoCompanyCode();
      result=await withTimeout(createOnce(code));
    }
    const {data,error}=result||{};
    if(error)throw error;
    if(!data)throw new Error('会社IDを取得できませんでした。');

    // RPCが成功した時点でOwnerセッションを作成する。
    // membershipsの反映待ちで入口に取り残されないようにする。
    const sess={
      orgId:data,company,code,user:user||getSavedIdentity().user||cloudUser?.email||'',role:'owner',inviteToken:null,
      plan:'free',subscriptionStatus:'trial',trialEndsAt:null,billingCustomerId:null,
      billingSubscriptionId:null,billingPeriodEnd:null,cancelAtPeriodEnd:false,loginAt:new Date().toISOString()
    };
    nativeSet(VERTX_SESSION_KEY,JSON.stringify(sess));
    // 作成成功後はDB再読込を待たずに入口を確実に閉じてCOREへ進む。
    document.querySelector('#companyGate')?.classList.add('hidden');
    document.querySelector('#cloudAuthGate')?.classList.add('hidden');
    cloudReady=true;
    reloadTenantState();
    setGateStatus('作成完了。COREを起動します。','success');
    renderCompanyIdentity();
    startApp();
    // クラウド保存済みデータの読込は画面遷移後に行い、失敗しても入口へ戻さない。
    hydrateCloudStore().then(()=>{reloadTenantState();updateDashboard();}).catch(e=>console.warn('post-create hydrate',e));

    // 画面を先に開いた後で、DB側の正式なmembership情報を同期。
    getMemberships().then(async memberships=>{
      const hit=memberships.find(m=>m.organizations.id===data||m.organizations.code===code);
      if(hit){nativeSet(VERTX_SESSION_KEY,JSON.stringify({...sessionFromMembership(hit),user:user||getSavedIdentity().user||cloudUser?.email||''}));renderCompanyIdentity()}
    }).catch(()=>{});
  }catch(error){
    console.error('company create',error);
    const msg=error?.message||'不明なエラー';
    setGateStatus('作成できません：'+msg,'error');
    toast('会社を作成できませんでした');
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='COREを起動 <span>→</span>'}
  }
}
async function switchCompany(){nativeRemove(VERTX_SESSION_KEY);location.reload()}
function companyInviteUrl(){const s=getCompanySession();const u=new URL(location.origin+location.pathname);if(s?.inviteToken)u.searchParams.set('invite',s.inviteToken);return u.toString()}
function companyRoleInviteUrl(role){const token=roleInviteTokens?.[role];if(!token)return '';const u=new URL(location.origin+location.pathname);u.searchParams.set('team_invite',token);u.searchParams.set('invite_role',role);return u.toString()}
async function copyRoleInvite(role){const s=getCompanySession();if(!['owner','admin'].includes(s?.role||''))return toast('招待URLは社長・管理者のみ発行できます');if(role==='admin'&&s.role!=='owner')return toast('人事・管理者用URLは社長のみ発行できます');const url=companyRoleInviteUrl(role);if(!url)return toast('招待URLがまだ作成されていません。V5.3のSQLを実行してください');try{await navigator.clipboard.writeText(url);toast((role==='admin'?'人事・管理者用':role==='viewer'?'閲覧用':'社員・職長用')+'URLをコピーしました')}catch{prompt('このURLをコピーしてください',url)}}
async function copyCompanyInvite(){const s=getCompanySession();if(!s?.inviteToken)return toast('招待URLを取得できません');try{await navigator.clipboard.writeText(companyInviteUrl());toast('招待URLをコピーしました')}catch{prompt('このURLをコピーしてください',companyInviteUrl())}}
async function signOut(){if(supabaseClient)await supabaseClient.auth.signOut();nativeRemove(VERTX_SESSION_KEY);location.reload()}
function prefillCompanyFromUrl(){const code=normalizeCompanyCode(new URL(location.href).searchParams.get('company')||'');if(code&&$('#tenantCompanyCode'))$('#tenantCompanyCode').value=code}
let appStarted=false;
function applyViewportGuards(){
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  document.body.classList.toggle('browser-mode',!standalone);
  const vv=window.visualViewport;
  const update=()=>{const obscured=vv?Math.max(0,window.innerHeight-vv.height-vv.offsetTop):0;document.documentElement.style.setProperty('--browser-obscured-bottom',`${Math.min(96,Math.max(0,obscured))}px`)};
  update();vv?.addEventListener('resize',update);vv?.addEventListener('scroll',update);
}
applyViewportGuards();


// v7.18 KY INPUT ------------------------------------------------------------
const DAILY_REPORT_KEY='vertx_core_daily_reports_v717';
const SITE_ALBUM_KEY='vertx_core_site_album_v717';
const CLIENT_SHARE_KEY='vertx_core_client_share_v717';
let handoverBg='',handoverActions=[],handoverTool='pen',handoverDrawing=false,handoverStart=null,handoverDraft=null;
function splitWorkerNames(v){return String(v||'').split(/[、,\/\n]/).map(x=>x.trim()).filter(Boolean)}
function getDailyReports(){try{return JSON.parse(lsGet(DAILY_REPORT_KEY)||'[]')}catch{return []}}
function saveDailyReports(v){lsSet(DAILY_REPORT_KEY,JSON.stringify(v.slice(0,60)))}
function getSiteAlbum(){try{return JSON.parse(lsGet(SITE_ALBUM_KEY)||'[]')}catch{return []}}
function saveSiteAlbum(v){lsSet(SITE_ALBUM_KEY,JSON.stringify(v.slice(0,24)))}
function getClientShareMeta(){try{return JSON.parse(lsGet(CLIENT_SHARE_KEY)||'{}')}catch{return {}}}
function saveClientShareMeta(v){lsSet(CLIENT_SHARE_KEY,JSON.stringify(v))}
function getLatestDailyForSite(site){if(!site)return null;return getDailyReports().filter(x=>x.site===site).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id)-Number(a.id))[0]||null}
function fillSiteSelect(el,value=''){if(!el)return;const sites=getSites();el.innerHTML='<option value="">現場を選択</option>'+sites.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');if(value&&sites.includes(value))el.value=value}
function dayDispatch(site,date){const orders=getHistory().filter(x=>x.site===site&&x.date===date).map(x=>({kind:'搬入',time:x.time||'',truck:x.truck||truckFor(x.weight||0),status:x.status||'',weight:x.weight||0,detail:`${x.qty||0}点`}));const returns=getReturnTruckRequests().filter(x=>x.site===site&&x.date===date).map(x=>({kind:'返却',time:x.time||'',truck:x.truck||'',status:x.status||'',weight:x.weight||0,detail:'返却'}));return [...orders,...returns].sort((a,b)=>String(a.time).localeCompare(String(b.time)))}
function renderDailyTruck(){const root=$('#dailyTruckTimeline');if(!root)return;const rows=dayDispatch($('#dailySite')?.value||'', $('#dailyDate')?.value||'');root.innerHTML=rows.length?rows.map(x=>`<div class="daily-truck-row"><span>${escapeHtml(x.time||'時間未設定')}</span><b>${escapeHtml(x.kind)} · ${escapeHtml(x.truck||'車両未設定')}</b><small>${escapeHtml(x.status)} · ${formatWeight(x.weight||0)}</small></div>`).join(''):'<div class="empty compact-empty">この日の搬入・返却予定はありません</div>'}
function updateDailyCountFromNames(){const n=splitWorkerNames($('#dailyWorkerNames')?.value).length;if(n&&$('#dailyWorkerCount'))$('#dailyWorkerCount').value=n}
async function compactImageData(file,maxSide=760,quality=.52){const b=await compressImageBlob(file,maxSide,quality);return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(b)})}
function handoverPoint(e,c){const r=c.getBoundingClientRect(),p=e.touches?.[0]||e;return {x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height}}
function drawHandoverArrow(ctx,a,b){const ang=Math.atan2(b.y-a.y,b.x-a.x),head=20;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-head*Math.cos(ang-Math.PI/6),b.y-head*Math.sin(ang-Math.PI/6));ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-head*Math.cos(ang+Math.PI/6),b.y-head*Math.sin(ang+Math.PI/6));ctx.stroke()}
function drawHandoverAction(ctx,x){ctx.save();ctx.strokeStyle='#ef4444';ctx.fillStyle='#ef4444';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';if(x.type==='pen'){ctx.beginPath();(x.points||[]).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}else if(x.type==='circle'){const cx=(x.a.x+x.b.x)/2,cy=(x.a.y+x.b.y)/2,rx=Math.abs(x.b.x-x.a.x)/2,ry=Math.abs(x.b.y-x.a.y)/2;ctx.beginPath();ctx.ellipse(cx,cy,Math.max(2,rx),Math.max(2,ry),0,0,Math.PI*2);ctx.stroke()}else if(x.type==='arrow'){drawHandoverArrow(ctx,x.a,x.b)}else if(x.type==='text'){ctx.font='bold 30px -apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif';ctx.lineWidth=5;ctx.strokeStyle='rgba(255,255,255,.96)';ctx.strokeText(x.text,x.x,x.y);ctx.fillText(x.text,x.x,x.y)}ctx.restore()}
function renderHandoverCanvas(preview=null){const c=$('#handoverCanvas');if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,c.width,c.height);const finish=()=>{handoverActions.forEach(x=>drawHandoverAction(ctx,x));if(preview)drawHandoverAction(ctx,preview)};if(handoverBg){const im=new Image();im.onload=()=>{const scale=Math.min(c.width/im.width,c.height/im.height),w=im.width*scale,h=im.height*scale,x=(c.width-w)/2,y=(c.height-h)/2;ctx.fillStyle='#111827';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,x,y,w,h);finish()};im.src=handoverBg}else finish()}
function setupHandoverCanvas(){const c=$('#handoverCanvas');if(!c||c.dataset.bound==='1')return;c.dataset.bound='1';const start=e=>{e.preventDefault();const p=handoverPoint(e,c);if(handoverTool==='text'){const text=prompt('写真に入れる文字を入力してください');if(text?.trim()){handoverActions.push({type:'text',x:p.x,y:p.y,text:text.trim().slice(0,40)});renderHandoverCanvas()}return}handoverDrawing=true;handoverStart=p;handoverDraft=handoverTool==='pen'?{type:'pen',points:[p]}:{type:handoverTool,a:p,b:p}};const move=e=>{if(!handoverDrawing)return;e.preventDefault();const p=handoverPoint(e,c);if(handoverDraft.type==='pen')handoverDraft.points.push(p);else handoverDraft.b=p;renderHandoverCanvas(handoverDraft)};const end=e=>{if(!handoverDrawing)return;e?.preventDefault?.();handoverDrawing=false;if(handoverDraft){handoverActions.push(handoverDraft);handoverDraft=null;renderHandoverCanvas()}};c.addEventListener('pointerdown',start);c.addEventListener('pointermove',move);c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end)}
async function loadHandoverPhoto(file){if(!file)return;try{handoverBg=await compactImageData(file,900,.62);handoverActions=[];$('#handoverMarkupEditor')?.classList.remove('hidden');setupHandoverCanvas();renderHandoverCanvas();toast('引継ぎ写真を読み込みました')}catch(e){toast('写真を読み込めませんでした: '+(e.message||e))}}
function setHandoverTool(tool){handoverTool=tool;document.querySelectorAll('[data-handover-tool]').forEach(b=>b.classList.toggle('active',b.dataset.handoverTool===tool))}
function undoHandoverMarkup(){if(handoverActions.length){handoverActions.pop();renderHandoverCanvas()}}
function clearHandoverMarkup(){if(!handoverBg)return;handoverActions=[];renderHandoverCanvas();toast('書き込みだけ消しました')}
function getHandoverMarkupImage(){const c=$('#handoverCanvas');return handoverBg&&c?c.toDataURL('image/jpeg',.62):''}
function resetHandoverMarkup(){handoverBg='';handoverActions=[];handoverDraft=null;$('#handoverMarkupEditor')?.classList.add('hidden');if($('#handoverPhotoInput'))$('#handoverPhotoInput').value='';renderHandoverCanvas()}
function getKyRiskRows(){
  const rows=[];
  for(let i=0;i<3;i++){
    const hazard=document.querySelector(`[data-ky-hazard="${i}"]`)?.value.trim()||'';
    const cause=document.querySelector(`[data-ky-cause="${i}"]`)?.value.trim()||'';
    const measure=document.querySelector(`[data-ky-measure="${i}"]`)?.value.trim()||'';
    const freq=Math.max(1,Math.min(3,Number(document.querySelector(`[data-ky-freq="${i}"]`)?.value)||1));
    const severity=Math.max(1,Math.min(3,Number(document.querySelector(`[data-ky-sev="${i}"]`)?.value)||1));
    if(hazard||cause||measure)rows.push({hazard,cause,measure,freq,severity,risk:freq*severity});
  }
  return rows;
}
function updateKyRiskScores(){
  for(let i=0;i<3;i++){
    const f=Math.max(1,Number(document.querySelector(`[data-ky-freq="${i}"]`)?.value)||1),v=Math.max(1,Number(document.querySelector(`[data-ky-sev="${i}"]`)?.value)||1),score=f*v,el=document.querySelector(`[data-ky-score="${i}"]`);
    if(el){el.textContent=`リスク ${score}`;el.classList.toggle('mid',score>=3&&score<6);el.classList.toggle('high',score>=6)}
  }
}
function bindKyRiskInputs(){
  document.querySelectorAll('[data-ky-freq],[data-ky-sev]').forEach(el=>{if(el.dataset.boundKy)return;el.dataset.boundKy='1';el.addEventListener('change',updateKyRiskScores)});updateKyRiskScores();
}
function kyRowsToText(rows){return rows.map((r,i)=>`${i+1}. ${r.hazard}${r.cause?' / '+r.cause:''} (頻度${r.freq}×重大性${r.severity}=リスク${r.risk})`).join('\n')}
function kyRowsToMeasure(rows){return rows.map((r,i)=>`${i+1}. ${r.measure||'対策未入力'}`).join('\n')}
function renderDailyReport(){bindKyRiskInputs();const current=$('#dailySite')?.value||state.selectedSite||lsGet('vertx_core_last_site')||'';fillSiteSelect($('#dailySite'),current);if($('#dailyDate')&&!$('#dailyDate').value)$('#dailyDate').value=todayIso();if($('#dailyReportDateLabel'))$('#dailyReportDateLabel').textContent=$('#dailyDate').value||todayIso();renderDailyTruck();const root=$('#dailyReportList');if(!root)return;const rows=getDailyReports();root.innerHTML=rows.length?rows.map(x=>`<article class="card daily-report-card"><div class="daily-report-head"><div><span>${escapeHtml(x.date)}</span><b>${escapeHtml(x.site)}</b></div><em>${Number(x.workerCount)||0}名</em></div><p><b>作業者</b> ${escapeHtml(x.workerNames||'未入力')}</p><p><b>作業</b> ${escapeHtml(x.work||'未入力')}</p><p><b>現状</b> ${escapeHtml(x.status||'未入力')}</p>${x.safetyGoal?`<div class="daily-safety-goal">重点安全目標：${escapeHtml(x.safetyGoal)}</div>`:''}<div class="daily-ky-summary">${Array.isArray(x.kyRisks)&&x.kyRisks.length?x.kyRisks.map((r,i)=>`<p><b>KY ${i+1}</b> ${escapeHtml(r.hazard||'')} <small>リスク${Number(r.risk)||0}</small><br><span>${escapeHtml(r.measure||'')}</span></p>`).join(''):`<p><b>KY・危険ポイント</b> ${escapeHtml(x.kyText||'未入力')}</p><p><b>対策・周知事項</b> ${escapeHtml(x.kyMeasure||'未入力')}</p>`}</div>${x.handoverImage?`<div class="handover-photo-note"><span>引継ぎ写真メモ</span><img src="${x.handoverImage}" alt="引継ぎ写真メモ"></div>`:''}${x.handoverTo?`<div class="handover-chip">引継ぎ → ${escapeHtml(x.handoverTo)} / ${escapeHtml(x.handoverStatus||'未確認')}</div>`:''}${x.handoverTo&&x.handoverStatus!=='確認済み'?`<button class="secondary-btn full" data-confirm-daily="${x.id}">引継ぎを確認済みにする</button>`:''}</article>`).join(''):'<div class="card empty">まだ日報はありません</div>';root.querySelectorAll('[data-confirm-daily]').forEach(b=>b.onclick=()=>confirmDaily(Number(b.dataset.confirmDaily)))}
function saveDailyReport(){const site=$('#dailySite')?.value||'';if(!site)return toast('現場を選択してください');const workerNames=$('#dailyWorkerNames')?.value.trim()||'',autoCount=splitWorkerNames(workerNames).length,kyRisks=getKyRiskRows(),kyText=kyRowsToText(kyRisks),kyMeasure=kyRowsToMeasure(kyRisks),report={id:Date.now(),site,date:$('#dailyDate')?.value||todayIso(),workerCount:Math.max(0,Number($('#dailyWorkerCount')?.value)||autoCount),workerNames,work:$('#dailyWork')?.value.trim()||'',status:$('#dailyStatus')?.value.trim()||'',safetyGoal:$('#dailySafetyGoal')?.value.trim()||'',kyRisks,kyText,kyMeasure,kyImage:'',handoverImage:getHandoverMarkupImage(),handover:$('#dailyHandover')?.value.trim()||'',handoverTo:$('#dailyHandoverTo')?.value.trim()||'',handoverStatus:$('#dailyHandoverStatus')?.value||'未確認',tomorrow:$('#dailyTomorrow')?.value.trim()||'',needed:$('#dailyNeeded')?.value.trim()||'',dispatch:dayDispatch(site,$('#dailyDate')?.value||todayIso()),createdBy:getCompanySession()?.user||cloudUser?.email||'',createdAt:new Date().toISOString(),confirmedBy:'',confirmedAt:''};const rows=getDailyReports();rows.unshift(report);saveDailyReports(rows);audit('職長日報',`${site} / ${report.workerCount}名${report.handoverTo?' / 引継ぎ:'+report.handoverTo:''}`);renderDailyReport();resetHandoverMarkup();toast('日報・KYを保存しました')}
function confirmDaily(id){const rows=getDailyReports(),x=rows.find(r=>Number(r.id)===Number(id));if(!x)return;x.handoverStatus='確認済み';x.confirmedBy=getCompanySession()?.user||cloudUser?.email||'';x.confirmedAt=new Date().toISOString();saveDailyReports(rows);audit('引継ぎ確認',`${x.site} / ${x.date}`);renderDailyReport();toast('確認済みにしました')}
function renderSiteAlbum(){const current=$('#albumSite')?.value||state.selectedSite||lsGet('vertx_core_last_site')||'';fillSiteSelect($('#albumSite'),current);const root=$('#albumGrid');if(!root)return;const site=$('#albumSite')?.value||'';const rows=getSiteAlbum().filter(x=>!site||x.site===site);root.innerHTML=rows.length?rows.map(x=>`<article class="album-card"><img src="${x.dataUrl}" alt="${escapeHtml(x.tag)}"><div><span>${escapeHtml(x.tag)} · ${new Date(x.createdAt).toLocaleString('ja-JP')}</span><b>${escapeHtml(x.comment||'コメントなし')}</b><div class="album-actions"><button class="mini-pill ${x.share?'on':''}" data-album-share="${x.id}">${x.share?'共有ON':'社内のみ'}</button><button class="text-btn" data-album-delete="${x.id}">削除</button></div></div></article>`).join(''):'<div class="card empty">この現場の写真はまだありません</div>';root.querySelectorAll('[data-album-share]').forEach(b=>b.onclick=()=>{const a=getSiteAlbum(),x=a.find(r=>Number(r.id)===Number(b.dataset.albumShare));if(x){x.share=!x.share;saveSiteAlbum(a);renderSiteAlbum();audit('現場写真共有',`${x.site} / ${x.share?'ON':'OFF'}`)}});root.querySelectorAll('[data-album-delete]').forEach(b=>b.onclick=()=>{if(!confirm('この写真を削除しますか？'))return;saveSiteAlbum(getSiteAlbum().filter(x=>Number(x.id)!==Number(b.dataset.albumDelete)));renderSiteAlbum()})}
async function addSiteAlbumPhotos(files){const site=$('#albumSite')?.value||'';if(!site)return toast('現場を選択してください');const list=[...(files||[])].slice(0,5);if(!list.length)return;const tag=$('#albumTag')?.value||'施工中',share=$('#albumShare')?.value!=='no',comment=$('#albumComment')?.value.trim()||'';try{const data=await Promise.all(list.map(f=>compactImageData(f,720,.52)));const rows=getSiteAlbum();data.forEach((url,i)=>rows.unshift({id:Date.now()+i,site,tag,share,comment,dataUrl:url,createdAt:new Date().toISOString(),createdBy:getCompanySession()?.user||''}));saveSiteAlbum(rows);audit('現場写真追加',`${site} / ${data.length}枚`);renderSiteAlbum();toast(`${data.length}枚追加しました`)}catch(e){toast('写真追加に失敗しました: '+(e.message||e))}}
function buildClientSnapshot(site,notice=''){const daily=getLatestDailyForSite(site),photos=getSiteAlbum().filter(x=>x.site===site&&x.share).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,5),today=todayIso(),orders=getHistory().filter(x=>x.site===site).slice(0,4),deliveries=getHistory().filter(x=>x.site===site&&String(x.date||'')>=today).slice(0,6),returns=getReturnTruckRequests().filter(x=>x.site===site&&String(x.date||'')>=today&&x.status!=='返却完了').slice(0,6);return {site,status:daily?.status||'',notice,photos:photos.map(x=>({tag:x.tag,comment:x.comment,dataUrl:x.dataUrl,createdAt:x.createdAt})),deliveries:deliveries.map(x=>({date:x.date,time:x.time||'',truck:x.truck||truckFor(x.weight||0),status:x.status||'',weight:x.weight||0})),returns:returns.map(x=>({date:x.date,time:x.time||'',truck:x.truck||'',status:x.status||'',weight:x.weight||0})),orders:orders.map(o=>({date:o.date||'',status:o.status||'',items:(o.items||[]).slice(0,30).map(i=>({name:i.name,qty:i.qty,unit:i.unit}))})),updatedAt:new Date().toISOString()}}
function renderClientShare(){const current=$('#shareSite')?.value||state.selectedSite||'';fillSiteSelect($('#shareSite'),current);const site=$('#shareSite')?.value||'',meta=getClientShareMeta()[site]||{};if($('#shareNotice'))$('#shareNotice').value=meta.notice||'';if($('#shareUrlBox')){$('#shareUrlBox').classList.toggle('hidden',!meta.url);$('#shareUrlBox').innerHTML=meta.url?`<b>共有URL</b><input value="${escapeHtml(meta.url)}" readonly><button class="secondary-btn full" data-copy-client-share>URLをコピー</button>`:'';$('#shareUrlBox').querySelector('[data-copy-client-share]')?.addEventListener('click',()=>copyClientShareUrl(meta.url))}renderClientPreview(site?buildClientSnapshot(site,$('#shareNotice')?.value||''):null)}
function renderClientPreview(p){const root=$('#sharePreview');if(!root)return;if(!p){root.innerHTML='';return}root.innerHTML=`<div class="public-preview-head"><span>共有プレビュー</span><h3>${escapeHtml(p.site)}</h3><p>${escapeHtml(p.status||'現場状況未入力')}</p></div><div class="public-photo-grid">${p.photos.map(x=>`<figure><img src="${x.dataUrl}"><figcaption>${escapeHtml(x.tag)} ${escapeHtml(x.comment||'')}</figcaption></figure>`).join('')}</div>`}
async function publishClientShare(){const site=$('#shareSite')?.value||'';if(!site)return toast('現場を選択してください');if(!cloudReady||!supabaseClient||!getCompanySession()?.orgId)return toast('元請け共有はクラウド接続時に利用できます');const all=getClientShareMeta(),old=all[site]||{},token=old.token||crypto.randomUUID(),notice=$('#shareNotice')?.value.trim()||'',payload=buildClientSnapshot(site,notice),row={token,organization_id:getCompanySession().orgId,site_name:site,payload,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('site_public_shares').upsert(row,{onConflict:'token'});if(error)return toast('共有ページ更新失敗: '+error.message);const url=`${location.origin}${location.pathname}?site_share=${encodeURIComponent(token)}`;all[site]={token,url,notice};saveClientShareMeta(all);renderClientShare();audit('元請け共有更新',site);toast('共有ページを更新しました')}
async function copyClientShareUrl(url){try{await navigator.clipboard.writeText(url);toast('共有URLをコピーしました')}catch{prompt('このURLをコピーしてください',url)}}
async function openPublicSiteShare(token){document.querySelector('#cloudAuthGate')?.classList.add('hidden');document.querySelector('#companyGate')?.classList.add('hidden');document.querySelector('.topbar')?.classList.add('hidden');document.querySelector('.bottom-nav')?.classList.add('hidden');document.querySelectorAll('section.screen').forEach(x=>x.classList.remove('active'));$('#publicSiteShare')?.classList.add('active');const root=$('#publicSiteShareContent');try{const {data,error}=await supabaseClient.rpc('get_public_site_share',{p_token:token});if(error)throw error;const p=Array.isArray(data)?data[0]?.payload:data?.payload||data;if(!p)throw new Error('共有ページが見つかりません');root.innerHTML=`<div class="public-share-brand"><b>VERTX CORE</b><span>現場共有</span></div><div class="public-site-head"><span>現場の今</span><h1>${escapeHtml(p.site||'現場')}</h1><small>最終更新 ${new Date(p.updatedAt||Date.now()).toLocaleString('ja-JP')}</small></div><section class="public-block"><h2>現場の現状</h2><p>${escapeHtml(p.status||'更新待ち')}</p>${p.notice?`<div class="public-notice">${escapeHtml(p.notice)}</div>`:''}</section><section class="public-block"><h2>現場写真</h2><div class="public-photo-grid">${(p.photos||[]).slice(0,5).map(x=>`<figure><img src="${x.dataUrl}"><figcaption><b>${escapeHtml(x.tag||'')}</b> ${escapeHtml(x.comment||'')}</figcaption></figure>`).join('')||'<p>共有写真はありません</p>'}</div></section><section class="public-block"><h2>搬入予定</h2>${(p.deliveries||[]).map(x=>`<div class="public-row"><b>${escapeHtml(x.date||'')} ${escapeHtml(x.time||'')}</b><span>${escapeHtml(x.truck||'')} · ${escapeHtml(x.status||'')}</span></div>`).join('')||'<p>予定なし</p>'}</section><section class="public-block"><h2>返却・搬出予定</h2>${(p.returns||[]).map(x=>`<div class="public-row"><b>${escapeHtml(x.date||'')} ${escapeHtml(x.time||'')}</b><span>${escapeHtml(x.truck||'')} · ${escapeHtml(x.status||'')}</span></div>`).join('')||'<p>予定なし</p>'}</section><section class="public-block"><h2>最近の注文</h2>${(p.orders||[]).slice(0,3).map(o=>`<div class="public-order"><b>${escapeHtml(o.date||'')} ${escapeHtml(o.status||'')}</b><p>${(o.items||[]).map(i=>`${escapeHtml(i.name)} ${Number(i.qty)||0}${escapeHtml(i.unit||'')}`).join(' / ')}</p></div>`).join('')||'<p>注文情報なし</p>'}</section><footer>VERTX CORE · 現場共有</footer>`}catch(e){root.innerHTML=`<div class="card empty">共有ページを読み込めませんでした。${escapeHtml(e.message||'')}</div>`}}
function runCoreSelfCheck(){const issues=[];const ids=new Set(),names=new Set();for(const m of MATERIALS){if(ids.has(String(m.id)))issues.push('資材ID重複:'+m.id);ids.add(String(m.id));const n=normalizeMatName(m.name);if(names.has(n))issues.push('資材名重複:'+m.name);names.add(n)}['dailyReport','handoverCanvas','handoverPhotoInput','siteAlbum','clientShare','publicSiteShare','returnLoad','manual'].forEach(id=>{if(!document.getElementById(id))issues.push('画面不足:'+id)});if(issues.length)console.warn('CORE SELF CHECK',issues);else console.info('CORE SELF CHECK PASS v7.20');return issues}

function startApp(){if(appStarted)return;appStarted=true;const d=new Date();d.setDate(d.getDate()+1);if($('#deliveryDate')&&!getOrderMeta().date)$('#deliveryDate').value=d.toISOString().slice(0,10);restoreOrderMeta();if(state.selectedSite&&$('#siteName'))$('#siteName').value=state.selectedSite;renderCategories();renderMaterials();updateDashboard();updateDevTestBanner();toggleAssistOptions();const last=lsGet('vertx_core_last_screen')||'home';go(canOpenScreen(last)?last:'home');prefillSiteFromUrl()}
async function cloudBoot(){
  prefillSavedIdentity();
  prefillCompanyFromUrl();
  const ok=await initSupabase();if(!ok)return;
  const shareToken=new URLSearchParams(location.search).get('site_share');
  if(shareToken){await openPublicSiteShare(shareToken);return;}
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){$('#cloudAuthGate')?.classList.remove('hidden');$('#companyGate')?.classList.add('hidden');return}
  cloudUser=session.user;$('#cloudAuthGate')?.classList.add('hidden');
  if(await guardInviteAccount())return;
  await chooseOrganization();
}

$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));$$('[data-manual-open]').forEach(b=>b.onclick=()=>{const el=document.getElementById(b.dataset.manualOpen);if(el){el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'})}});if($('#siteName'))$('#siteName').oninput=e=>{state.selectedSite=e.target.value.trim();persistDraftState()};$('#saveStockBtn').onclick=saveStockEntry;$('#addShortageBtn').onclick=addShortage;$('#saveSetBtn').onclick=saveCurrentSet;$('#runCompareBtn').onclick=runCompare;$('#searchInput').oninput=e=>{state.search=e.target.value;renderMaterials()};$('#toConfirmBtn').onclick=()=>go('confirm');$('#submitOrderBtn').onclick=submitOrder;$('#addSiteBtn').onclick=addSite;$('#newSiteName').onkeydown=e=>{if(e.key==='Enter')addSite()};$('#printDraftBtn').onclick=printDraft;$('#lineDraftBtn').onclick=shareDraft;$('#addCustomMaterialBtn').onclick=addCustomMaterial;$('#resetMaterialsBtn').onclick=resetMaterialMaster;$('#drawingInput').onchange=e=>uploadDrawings(e.target.files);if($('#aiDrawingInput'))$('#aiDrawingInput').onchange=e=>uploadAiDrawings(e.target.files);$('#assistType').onchange=toggleAssistOptions;$('#runAssistBtn').onclick=runAssist;$('#applyAssistBtn').onclick=applyAssist;$('#runAiBtn').onclick=runAiAnalysis;$('#applyAiBtn').onclick=applyAiCandidate;
document.querySelectorAll('[data-invite-role]').forEach(btn=>btn.onclick=()=>copyRoleInvite(btn.dataset.inviteRole));if($('#voiceStartBtn'))$('#voiceStartBtn').onclick=startVoiceOrder;if($('#voiceParseBtn'))$('#voiceParseBtn').onclick=parseVoiceOrder;if($('#photoAiInput'))$('#photoAiInput').onchange=e=>{photoAiFiles=[...e.target.files];$('#photoAiFiles').textContent=photoAiFiles.map(x=>x.name).join(' / ')||'写真未選択'};if($('#runPhotoAiBtn'))$('#runPhotoAiBtn').onclick=runPhotoAi;if($('#applyPhotoAiBtn'))$('#applyPhotoAiBtn').onclick=applyPhotoAi;if($('#applyPhotoReturnBtn'))$('#applyPhotoReturnBtn').onclick=applyPhotoAiToReturnLoad;if($('#memberInviteBtn'))$('#memberInviteBtn').onclick=copyCompanyInvite;if($('#tenantLoginBtn'))$('#tenantLoginBtn').onclick=companyLogin;if($('#switchCompanyBtn'))$('#switchCompanyBtn').onclick=switchCompany;if($('#copyInviteBtn'))$('#copyInviteBtn').onclick=copyCompanyInvite;if($('#companyBadge'))$('#companyBadge').onclick=()=>go('companySettings');if($('#authLoginBtn'))$('#authLoginBtn').onclick=authLogin;if($('#authSignupBtn'))$('#authSignupBtn').onclick=authSignup;if($('#signOutBtn'))$('#signOutBtn').onclick=signOut;
if($('#saveQuickMaterialBtn'))$('#saveQuickMaterialBtn').onclick=saveMaterialQuickEdit;if($('#closeQuickMaterialBtn'))$('#closeQuickMaterialBtn').onclick=closeMaterialQuickEdit;if($('#cancelQuickMaterialBtn'))$('#cancelQuickMaterialBtn').onclick=closeMaterialQuickEdit;if($('#materialQuickEdit'))$('#materialQuickEdit').onclick=e=>{if(e.target.id==='materialQuickEdit')closeMaterialQuickEdit()};
if($('#saveReturnBtn'))$('#saveReturnBtn').onclick=saveReturnEntry;if($('#addLoadItemBtn'))$('#addLoadItemBtn').onclick=addReturnLoadItem;if($('#requestReturnTruckBtn'))$('#requestReturnTruckBtn').onclick=requestReturnTruck;if($('#clearLoadBtn'))$('#clearLoadBtn').onclick=clearReturnLoad;if($('#loadTruckCapacity'))$('#loadTruckCapacity').onchange=()=>{saveReturnMeta();renderReturnLoad()};if($('#loadCustomCapacity'))$('#loadCustomCapacity').oninput=()=>{saveReturnMeta();renderReturnLoad()};['#returnTruckSite','#returnTruckDate','#returnTruckTime','#returnTruckMemo'].forEach(sel=>{const el=$(sel);if(el){el.onchange=saveReturnMeta;el.oninput=saveReturnMeta}});['#deliveryDate','#deliveryTime','#orderMemo','#confirmSupplier'].forEach(sel=>{const el=$(sel);if(el){el.onchange=saveOrderMeta;el.oninput=saveOrderMeta}});if($('#saveRevenueBtn'))$('#saveRevenueBtn').onclick=saveRevenue;if($('#addCostBtn'))$('#addCostBtn').onclick=addCost;if($('#makeQrBtn'))$('#makeQrBtn').onclick=makeSiteQr;if($('#addSupplierBtn'))$('#addSupplierBtn').onclick=addSupplier;if($('#copySupplierOrderBtn'))$('#copySupplierOrderBtn').onclick=copySupplierOrder;
$('#resetBtn').onclick=()=>{if(confirm('注文履歴・現場・お気に入り・選択中数量を初期化しますか？（資材マスタは残ります）')){['vertx_core_orders','vertx_core_sites','vertx_core_favorites'].forEach(k=>lsRemove(k));state.cart={};state.favorites=new Set();state.selectedSite='';renderMaterials();updateDashboard();toast('初期化しました')}};
(function bindV717(){
  if($('#dailyWorkerNames'))$('#dailyWorkerNames').oninput=updateDailyCountFromNames;
  if($('#dailySite'))$('#dailySite').onchange=renderDailyTruck;
  if($('#dailyDate'))$('#dailyDate').onchange=()=>{if($('#dailyReportDateLabel'))$('#dailyReportDateLabel').textContent=$('#dailyDate').value;renderDailyTruck()};
  if($('#saveDailyReportBtn'))$('#saveDailyReportBtn').onclick=saveDailyReport;
  if($('#handoverPhotoInput'))$('#handoverPhotoInput').onchange=e=>loadHandoverPhoto(e.target.files?.[0]);
  document.querySelectorAll('[data-handover-tool]').forEach(b=>b.onclick=()=>setHandoverTool(b.dataset.handoverTool));
  if($('#handoverUndoBtn'))$('#handoverUndoBtn').onclick=undoHandoverMarkup;
  if($('#handoverClearBtn'))$('#handoverClearBtn').onclick=clearHandoverMarkup;
  setupHandoverCanvas();
  if($('#albumSite'))$('#albumSite').onchange=renderSiteAlbum;
  if($('#albumPhotoInput'))$('#albumPhotoInput').onchange=e=>addSiteAlbumPhotos(e.target.files);
  if($('#shareSite'))$('#shareSite').onchange=renderClientShare;
  if($('#shareNotice'))$('#shareNotice').oninput=()=>{const site=$('#shareSite')?.value;if(site)renderClientPreview(buildClientSnapshot(site,$('#shareNotice').value))};
  if($('#publishShareBtn'))$('#publishShareBtn').onclick=publishClientShare;
  runCoreSelfCheck();
})();

cloudBoot();
