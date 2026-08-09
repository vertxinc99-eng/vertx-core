// VERTX CORE v5.3 TEAM + MANUAL + UI
const VERTX_SESSION_KEY='vertx_core_company_session';
let supabaseClient=null;
let cloudReady=false;
let cloudUser=null;
let cloudHydrating=false;
function nativeGet(k){return window.localStorage.getItem(k)}
function nativeSet(k,v){return window.localStorage.setItem(k,v)}
function nativeRemove(k){return window.localStorage.removeItem(k)}
function getCompanySession(){try{return JSON.parse(nativeGet(VERTX_SESSION_KEY)||'null')}catch{return null}}
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
const DEFAULT_MATERIALS = [{"id":"adflat_white_3m","name":"アドフラット 3m","category":"仮囲い","weight":18.0,"unit":"枚","aliases":"アドフラットホワイト / W500×H3000 / 仮囲い鋼板"},{"id":"adflat_white_2m","name":"アドフラット 2m","category":"仮囲い","weight":12.0,"unit":"枚","aliases":"アドフラットホワイト / W500×H2000 / 仮囲い鋼板"},{"id":"adflat_sound_3m","name":"防音アドフラット 3m","category":"仮囲い","weight":22.3,"unit":"枚","aliases":"W500×H3000 / 防音仮囲い"},{"id":"adflat_sound_2m","name":"防音アドフラット 2m","category":"仮囲い","weight":14.8,"unit":"枚","aliases":"W500×H2000 / 防音仮囲い"},{"id":"adflat_jhook","name":"Jフック","category":"仮囲い金物","weight":0.1,"unit":"個","aliases":"アドフラット用Jフック / フックボルト / 固定金具"},{"id":"adflat_joint_l","name":"ジョイント金具 L","category":"仮囲い金物","weight":0.18,"unit":"個","aliases":"アドフラット用 / コーナーパネル / 幅調整パネル"},{"id":"adflat_joint_s","name":"ジョイント金具 S","category":"仮囲い金物","weight":0.07,"unit":"個","aliases":"アドフラット用 / 幅調整パネル下部"},{"id":"adflat_adjust_3m","name":"アドフラット 幅調整パネル 3m","category":"仮囲い","weight":17.0,"unit":"枚","aliases":"W520×H3000 / 幅調整"},{"id":"adflat_adjust_2m","name":"アドフラット 幅調整パネル 2m","category":"仮囲い","weight":11.3,"unit":"枚","aliases":"W520×H2000 / 幅調整"},{"id":"adflat_corner_3m","name":"アドフラット コーナーパネル 3m","category":"仮囲い","weight":18.0,"unit":"枚","aliases":"コーナーパネル ワイド / H3000"},{"id":"adflat_corner_2m","name":"アドフラット コーナーパネル 2m","category":"仮囲い","weight":12.0,"unit":"枚","aliases":"コーナーパネル ワイド / H2000"},{"id":"adflat_minidoor_3m","name":"アドフラット ミニドア 3m","category":"仮囲い","weight":23.5,"unit":"枚","aliases":"ミニドアパネル H3000"},{"id":"adflat_minidoor_2m","name":"アドフラット ミニドア 2m","category":"仮囲い","weight":17.5,"unit":"枚","aliases":"ミニドアパネル H2000"},{"id":"alumi_board_1m","name":"アルミ足場板 1m","category":"布板・足場板","weight":4.0,"unit":"枚","aliases":"アルミ板 / 軽量足場板 1m / 250巾"},{"id":"alumi_board_2m","name":"アルミ足場板 2m","category":"布板・足場板","weight":7.0,"unit":"枚","aliases":"アルミ板 / 軽量足場板 2m / 250巾"},{"id":"alumi_board_3m","name":"アルミ足場板 3m","category":"布板・足場板","weight":10.0,"unit":"枚","aliases":"アルミ板 / 軽量足場板 3m / 250巾"},{"id":"alumi_board_4m","name":"アルミ足場板 4m","category":"布板・足場板","weight":13.0,"unit":"枚","aliases":"アルミ板 / 軽量足場板 4m / 250巾"},{"id":"hatch_anti_18","name":"ハッチアンチ 1.8","category":"階段・昇降","weight":13.5,"unit":"枚","aliases":"全開閉式床付き布板 / ALTH518S / L1829×W500 / ハッチ付きアンチ"},{"id":"sanwa_frame1219_1700","name":"枠 1200","category":"枠","weight":15.8,"unit":"枚","aliases":"W1219×H1700 / A-4055B / 1219枠"},{"id":"sanwa_frame914_1700","name":"枠 900","category":"枠","weight":14.0,"unit":"枚","aliases":"W914×H1700 / A-3055A / 914枠"},{"id":"sanwa_frame610_1700","name":"枠 600","category":"枠","weight":13.0,"unit":"枚","aliases":"W610×H1700 / A-6117M / 610枠"},{"id":"kanzashi05","name":"かんざしパイプ 0.5m","category":"単管","weight":1.64,"unit":"本","aliases":"かんざし 500"},{"id":"soundPanel1800","name":"防音パネル 1.8m","category":"防音パネル","weight":13.0,"unit":"枚","aliases":"1.8パネル 1800"},{"id":"soundPanel1500","name":"防音パネル 1.5m","category":"防音パネル","weight":11.0,"unit":"枚","aliases":"1.5パネル 1500"},{"id":"soundPanel1200","name":"防音パネル 1.2m","category":"防音パネル","weight":9.0,"unit":"枚","aliases":"1.2パネル 1200"},{"id":"soundPanel900","name":"防音パネル 0.9m","category":"防音パネル","weight":7.0,"unit":"枚","aliases":"0.9パネル 900"},{"id":"soundPanel600","name":"防音パネル 0.6m","category":"防音パネル","weight":5.0,"unit":"枚","aliases":"0.6パネル 600"},{"id":"cornerPanel","name":"コーナーパネル","category":"防音パネル","weight":6.5,"unit":"枚","aliases":"コーナー"},{"id":"nk_001","name":"梯子型建枠１２１５(W1219H1524)","category":"枠組","weight":15.8,"unit":"台","aliases":""},{"id":"nk_002","name":"筋違 Ａ－０７(H1.2×L0.91)","category":"筋違・手摺・幅木","weight":2.4,"unit":"本","aliases":""},{"id":"nk_003","name":"ロング大引受パイプジャッキ","category":"ジャッキ・ベース","weight":6.5,"unit":"個","aliases":""},{"id":"nk_004","name":"梯子型建枠１２１２(W1219H1219)","category":"枠組","weight":14.0,"unit":"台","aliases":""},{"id":"nk_005","name":"筋違 Ａ－０９(H1.2×L0.61)","category":"筋違・手摺・幅木","weight":2.1,"unit":"本","aliases":""},{"id":"nk_006","name":"ジャッキサポート","category":"ジャッキ・ベース","weight":10.4,"unit":"個","aliases":""},{"id":"nk_007","name":"梯子型建枠１２０９(W1219H914)","category":"枠組","weight":11.0,"unit":"台","aliases":""},{"id":"nk_008","name":"ブレス 1.8","category":"ブレス","weight":3.7,"unit":"本","aliases":"筋違 / L1.82m / H0.9m"},{"id":"nk_009","name":"棒ジャッキ","category":"ジャッキ・ベース","weight":4.5,"unit":"個","aliases":""},{"id":"nk_010","name":"梯子型建枠０９１５(W914H1524)","category":"枠組","weight":13.0,"unit":"台","aliases":""},{"id":"nk_011","name":"ブレス 1.5","category":"ブレス","weight":3.1,"unit":"本","aliases":"筋違 / L1.52m / H0.9m"},{"id":"nk_012","name":"ピポットジャッキ","category":"ジャッキ・ベース","weight":4.1,"unit":"個","aliases":""},{"id":"nk_013","name":"梯子型建枠０９１２(W914H1219)","category":"枠組","weight":11.9,"unit":"台","aliases":""},{"id":"nk_014","name":"筋違 Ａ－０６(H0.9×L0.61)","category":"筋違・手摺・幅木","weight":1.7,"unit":"本","aliases":""},{"id":"nk_015","name":"枠用ベース","category":"ジャッキ・ベース","weight":1.0,"unit":"個","aliases":""},{"id":"nk_016","name":"梯子型建枠０９０９(W914H914)","category":"枠組","weight":9.2,"unit":"台","aliases":""},{"id":"nk_017","name":"筋違 Ａ－１６Ｓ(H0.5×L1.82)","category":"筋違・手摺・幅木","weight":3.5,"unit":"本","aliases":""},{"id":"nk_018","name":"Ｕ字ベース","category":"ジャッキ・ベース","weight":0.7,"unit":"個","aliases":""},{"id":"nk_019","name":"梯子型建枠６１７(W614Ｈ1700)","category":"枠組","weight":13.0,"unit":"台","aliases":""},{"id":"nk_020","name":"筋違 Ａ－１６(H0.5×L1.52)","category":"筋違・手摺・幅木","weight":3.0,"unit":"本","aliases":""},{"id":"nk_021","name":"梯子型建枠１５１５(W1524H1524)","category":"枠組","weight":19.0,"unit":"台","aliases":""},{"id":"nk_022","name":"ブレス 1.2","category":"ブレス","weight":2.6,"unit":"本","aliases":"筋違 / L1.22m / H0.5m"},{"id":"nk_023","name":"杉足場板（２４０巾）１．４ｍ","category":"布板・足場板","weight":7.0,"unit":"枚","aliases":""},{"id":"nk_024","name":"調整枠 ０６１２(W614H1219)","category":"枠組","weight":11.7,"unit":"本","aliases":""},{"id":"nk_025","name":"ブレス 0.9","category":"ブレス","weight":2.0,"unit":"本","aliases":"筋違 / L0.91m / H0.5m"},{"id":"nk_026","name":"杉足場板（２４０巾）２ｍ","category":"布板・足場板","weight":7.0,"unit":"枚","aliases":""},{"id":"nk_027","name":"調整枠 ０６０９(W614H914)","category":"枠組","weight":9.0,"unit":"本","aliases":""},{"id":"nk_028","name":"ブレス 0.6","category":"ブレス","weight":1.4,"unit":"本","aliases":"筋違 / L0.61m / H0.5m"},{"id":"nk_029","name":"杉足場板（２４０巾）４ｍ","category":"布板・足場板","weight":14.0,"unit":"枚","aliases":""},{"id":"nk_030","name":"調整枠 Ａ－４１７(W1219H490)","category":"枠組","weight":9.1,"unit":"本","aliases":""},{"id":"nk_032","name":"調整枠 Ａ－３１７(W914H490)","category":"枠組","weight":8.5,"unit":"本","aliases":""},{"id":"nk_033","name":"先行手摺 ライフガード ＢＲＡ１８ＡＧ","category":"筋違・手摺・幅木","weight":13.1,"unit":"本","aliases":""},{"id":"nk_035","name":"調整枠 Ｎ－２１７(W610H490)","category":"枠組","weight":7.5,"unit":"本","aliases":""},{"id":"nk_036","name":"先行手摺 ライフガード ＢＲＡ１５ＡＧ","category":"筋違・手摺・幅木","weight":12.2,"unit":"本","aliases":""},{"id":"nk_038","name":"ブラケット枠6117(W610→W914)","category":"枠組","weight":17.0,"unit":"個","aliases":""},{"id":"nk_039","name":"先行手摺 ライフガード ＢＲＡ１２ＡＧ","category":"筋違・手摺・幅木","weight":11.3,"unit":"本","aliases":""},{"id":"nk_041","name":"ブラケット枠9117(W914→W1219)","category":"枠組","weight":18.2,"unit":"個","aliases":""},{"id":"nk_042","name":"先行手摺 ライフガード ＢＲＡ０９ＡＧ","category":"筋違・手摺・幅木","weight":10.4,"unit":"本","aliases":""},{"id":"nk_044","name":"先行手摺 ライフガード ＢＲＡ０６ＡＧ","category":"筋違・手摺・幅木","weight":9.6,"unit":"本","aliases":""},{"id":"nk_045","name":"クイック幅木 １８","category":"筋違・手摺・幅木","weight":4.6,"unit":"枚","aliases":""},{"id":"nk_046","name":"下さん 1.8","category":"手摺・下さん","weight":2.2,"unit":"本","aliases":"1829 / 下さん手摺"},{"id":"nk_047","name":"クイック幅木 １５","category":"筋違・手摺・幅木","weight":4.1,"unit":"枚","aliases":""},{"id":"nk_048","name":"アンチ 1.8","category":"アンチ","weight":15.6,"unit":"枚","aliases":"W500×L1829 / SKN-6 / 1829"},{"id":"nk_049","name":"下さん 1.5","category":"手摺・下さん","weight":1.9,"unit":"本","aliases":"1524 / 下さん手摺"},{"id":"nk_050","name":"クイック幅木 １２","category":"筋違・手摺・幅木","weight":3.5,"unit":"枚","aliases":""},{"id":"nk_051","name":"アンチ 1.5","category":"アンチ","weight":13.0,"unit":"枚","aliases":"W500×L1524 / SKN-5 / 1524"},{"id":"nk_052","name":"下さん 1.2","category":"手摺・下さん","weight":1.6,"unit":"本","aliases":"1219 / 下さん手摺"},{"id":"nk_053","name":"クイック幅木 ０９","category":"筋違・手摺・幅木","weight":3.0,"unit":"枚","aliases":""},{"id":"nk_054","name":"アンチ 1.2","category":"アンチ","weight":11.0,"unit":"枚","aliases":"W500×L1219 / SKN-4 / 1219"},{"id":"nk_055","name":"下さん 0.9","category":"手摺・下さん","weight":1.2,"unit":"本","aliases":"914 / 下さん手摺"},{"id":"nk_056","name":"クイック幅木 ０６","category":"筋違・手摺・幅木","weight":2.5,"unit":"枚","aliases":""},{"id":"nk_057","name":"アンチ 0.9","category":"アンチ","weight":8.5,"unit":"枚","aliases":"W500×L914 / SKN-3 / 914"},{"id":"nk_058","name":"下さん 0.6","category":"手摺・下さん","weight":0.9,"unit":"本","aliases":"610 / 下さん手摺"},{"id":"nk_059","name":"妻側幅木 １２１９","category":"筋違・手摺・幅木","weight":2.5,"unit":"枚","aliases":""},{"id":"nk_060","name":"アンチ 0.6","category":"アンチ","weight":7.2,"unit":"枚","aliases":"W500×L610 / SKN-2 / 610"},{"id":"nk_061","name":"妻側幅木 ９１４","category":"筋違・手摺・幅木","weight":2.0,"unit":"枚","aliases":""},{"id":"nk_062","name":"ハーフアンチ 1.8","category":"ハーフアンチ","weight":8.5,"unit":"枚","aliases":"W240×L1829 / BKN-624 / 1829"},{"id":"nk_063","name":"手摺柱１２１９","category":"筋違・手摺・幅木","weight":2.48,"unit":"本","aliases":""},{"id":"nk_064","name":"ハーフアンチ 1.5","category":"ハーフアンチ","weight":7.0,"unit":"枚","aliases":"W240×L1524 / BKN-524 / 1524"},{"id":"nk_066","name":"アルスピーダー4ｍ","category":"その他","weight":3.5,"unit":"本","aliases":""},{"id":"nk_067","name":"ハーフアンチ 1.2","category":"ハーフアンチ","weight":6.0,"unit":"枚","aliases":"W240×L1219 / BKN-424 / 1219"},{"id":"nk_069","name":"アルスピーダー2ｍ","category":"その他","weight":1.8,"unit":"本","aliases":""},{"id":"nk_070","name":"ハーフアンチ 0.9","category":"ハーフアンチ","weight":5.0,"unit":"枚","aliases":"W240×L914 / BKN-324 / 914"},{"id":"nk_072","name":"アルスピーダー用ホルダー","category":"その他","weight":0.6,"unit":"個","aliases":""},{"id":"nk_073","name":"ハーフアンチ 0.6","category":"ハーフアンチ","weight":3.4,"unit":"枚","aliases":"W240×L610 / BKN-224 / 610"},{"id":"nk_076","name":"杉足場板 幅木用４.０ｍ(販売)","category":"筋違・手摺・幅木","weight":8.0,"unit":"枚","aliases":""},{"id":"nk_077","name":"階段（アルミ製）","category":"階段・昇降","weight":11.9,"unit":"台","aliases":""},{"id":"nk_078","name":"敷板 ２ｍ","category":"布板・足場板","weight":6.0,"unit":"枚","aliases":""},{"id":"nk_079","name":"杉足場板 幅木用２.０ｍ(販売)","category":"筋違・手摺・幅木","weight":4.0,"unit":"枚","aliases":""},{"id":"nk_080","name":"階段手摺","category":"筋違・手摺・幅木","weight":3.0,"unit":"台","aliases":""},{"id":"nk_081","name":"敷板 ４ｍ","category":"布板・足場板","weight":12.0,"unit":"枚","aliases":""},{"id":"nk_082","name":"セフティーガード","category":"その他","weight":13.0,"unit":"本","aliases":""},{"id":"nk_083","name":"カット足場板(販売)","category":"布板・足場板","weight":1.0,"unit":"枚","aliases":""},{"id":"nk_084","name":"単管パイプ ０.６～０.７ｍ","category":"単管","weight":2.0,"unit":"本","aliases":""},{"id":"nk_085","name":"垂直梯子 H1700","category":"階段・昇降","weight":9.7,"unit":"台","aliases":""},{"id":"nk_086","name":"吊りメッシュパレット","category":"養生・ネット","weight":110.0,"unit":"本","aliases":""},{"id":"nk_087","name":"単管パイプ １.０ｍ","category":"単管","weight":2.73,"unit":"本","aliases":""},{"id":"nk_088","name":"モンキーヘッド","category":"その他","weight":2.0,"unit":"本","aliases":""},{"id":"nk_089","name":"単管パイプ １.５ｍ","category":"単管","weight":4.1,"unit":"本","aliases":""},{"id":"nk_090","name":"一連ハシゴ ３ｍ","category":"階段・昇降","weight":7.2,"unit":"台","aliases":""},{"id":"nk_091","name":"単管パイプ ２.０ｍ","category":"単管","weight":5.46,"unit":"本","aliases":""},{"id":"nk_092","name":"一連ハシゴ ４ｍ","category":"階段・昇降","weight":8.4,"unit":"台","aliases":""},{"id":"nk_093","name":"タラップボード １８Ａ","category":"階段・昇降","weight":13.5,"unit":"台","aliases":""},{"id":"nk_094","name":"単管パイプ ２.５ｍ","category":"単管","weight":6.83,"unit":"本","aliases":""},{"id":"nk_095","name":"一連ハシゴ ５ｍ","category":"階段・昇降","weight":11.1,"unit":"台","aliases":""},{"id":"nk_096","name":"タラップボード １５Ａ","category":"階段・昇降","weight":11.4,"unit":"台","aliases":""},{"id":"nk_097","name":"単管パイプ ３.０ｍ","category":"単管","weight":8.19,"unit":"本","aliases":""},{"id":"nk_098","name":"一連ハシゴ ６ｍ","category":"階段・昇降","weight":12.0,"unit":"台","aliases":""},{"id":"nk_099","name":"タラップボード １２Ａ","category":"階段・昇降","weight":9.7,"unit":"台","aliases":""},{"id":"nk_100","name":"単管パイプ ３.５ｍ","category":"単管","weight":9.56,"unit":"本","aliases":""},{"id":"nk_101","name":"二連ハシゴ ８ｍ","category":"階段・昇降","weight":20.8,"unit":"台","aliases":""},{"id":"nk_102","name":"タラップボード ０９Ａ","category":"階段・昇降","weight":8.0,"unit":"台","aliases":""},{"id":"nk_103","name":"単管パイプ ４.０ｍ","category":"単管","weight":10.92,"unit":"本","aliases":""},{"id":"nk_104","name":"ラダーブラケット","category":"ブラケット","weight":4.4,"unit":"個","aliases":""},{"id":"nk_105","name":"タラップ","category":"階段・昇降","weight":4.0,"unit":"台","aliases":""},{"id":"nk_106","name":"単管パイプ ４.５ｍ","category":"単管","weight":12.29,"unit":"本","aliases":""},{"id":"nk_107","name":"キャタツ ３尺","category":"その他","weight":7.0,"unit":"本","aliases":""},{"id":"nk_108","name":"単管パイプ ５.０ｍ","category":"単管","weight":13.65,"unit":"本","aliases":""},{"id":"nk_109","name":"キャタツ ４尺","category":"その他","weight":11.0,"unit":"本","aliases":""},{"id":"nk_110","name":"クリフステアー（３８）","category":"階段・昇降","weight":30.0,"unit":"台","aliases":""},{"id":"nk_111","name":"単管パイプ ５.５ｍ","category":"単管","weight":15.02,"unit":"本","aliases":""},{"id":"nk_112","name":"キャタツ ６尺","category":"その他","weight":15.0,"unit":"本","aliases":""},{"id":"nk_113","name":"クリフステアー（２４）","category":"階段・昇降","weight":20.0,"unit":"台","aliases":""},{"id":"nk_114","name":"単管パイプ ６.０ｍ","category":"単管","weight":16.38,"unit":"本","aliases":""},{"id":"nk_115","name":"ﾏｲﾃｨｰﾍﾞｰｽ 180TD（1417～1777）","category":"その他","weight":24.4,"unit":"本","aliases":""},{"id":"nk_116","name":"クリフステアー（１４）","category":"階段・昇降","weight":13.0,"unit":"台","aliases":""},{"id":"nk_117","name":"直交クランプ（兼用）","category":"クランプ・金物","weight":0.7,"unit":"個","aliases":""},{"id":"nk_118","name":"ﾏｲﾃｨｰﾍﾞｰｽ 160TD（1204～1565）","category":"その他","weight":18.3,"unit":"本","aliases":""},{"id":"nk_119","name":"クリフステアー手摺（２４）","category":"筋違・手摺・幅木","weight":4.0,"unit":"台","aliases":""},{"id":"nk_120","name":"自在クランプ（兼用）","category":"クランプ・金物","weight":0.7,"unit":"個","aliases":""},{"id":"nk_121","name":"ﾏｲﾃｨｰﾍﾞｰｽ 130D（925～1238）","category":"その他","weight":13.2,"unit":"本","aliases":""},{"id":"nk_122","name":"クリフステアー手摺（１４）","category":"筋違・手摺・幅木","weight":3.0,"unit":"台","aliases":""},{"id":"nk_123","name":"直線ジョイント","category":"クランプ・金物","weight":0.6,"unit":"個","aliases":""},{"id":"nk_124","name":"ﾏｲﾃｨｰﾍﾞｰｽ 100D（646～959）","category":"その他","weight":11.5,"unit":"本","aliases":""},{"id":"nk_125","name":"スキマステップ（５００巾）","category":"布板・足場板","weight":7.4,"unit":"本","aliases":""},{"id":"nk_126","name":"ゴムバンド（販売）","category":"その他","weight":0.0,"unit":"本","aliases":""},{"id":"nk_127","name":"スキマステップ（２４０巾）","category":"布板・足場板","weight":4.1,"unit":"本","aliases":""},{"id":"nk_128","name":"メッシュグレー １.８２ｘ５.１","category":"養生・ネット","weight":5.0,"unit":"本","aliases":""},{"id":"nk_129","name":"キャッチクランプ（固定）","category":"クランプ・金物","weight":1.0,"unit":"個","aliases":""},{"id":"nk_130","name":"ベランダステップ本体","category":"その他","weight":19.0,"unit":"本","aliases":""},{"id":"nk_131","name":"メッシュグレー １.５２ｘ５.１","category":"養生・ネット","weight":4.5,"unit":"本","aliases":""},{"id":"nk_132","name":"キャッチクランプ（自在）","category":"クランプ・金物","weight":1.0,"unit":"個","aliases":""},{"id":"nk_133","name":"ベランダステップ手摺","category":"筋違・手摺・幅木","weight":5.5,"unit":"本","aliases":""},{"id":"nk_134","name":"メッシュグレー １.２１ｘ５.１","category":"養生・ネット","weight":4.0,"unit":"本","aliases":""},{"id":"nk_135","name":"自在ステップ（メッシュ）","category":"養生・ネット","weight":5.6,"unit":"本","aliases":""},{"id":"nk_136","name":"ベランダステップ水平材","category":"その他","weight":6.5,"unit":"本","aliases":""},{"id":"nk_137","name":"メッシュグレー ０.９１ｘ５.１","category":"養生・ネット","weight":3.0,"unit":"本","aliases":""},{"id":"nk_138","name":"鋼製スライドストッパー 0612","category":"クランプ・金物","weight":2.7,"unit":"本","aliases":""},{"id":"nk_139","name":"ベランダステップ手摺枠","category":"筋違・手摺・幅木","weight":12.0,"unit":"本","aliases":""},{"id":"nk_140","name":"メッシュグレー ０.６１ｘ５.１","category":"養生・ネット","weight":2.0,"unit":"本","aliases":""},{"id":"nk_141","name":"シートクランプ","category":"クランプ・金物","weight":0.4,"unit":"枚","aliases":""},{"id":"nk_142","name":"ベランダステップ補助梯子","category":"階段・昇降","weight":11.0,"unit":"台","aliases":""},{"id":"nk_143","name":"メッシュグレー ０.３０ｘ５.１","category":"養生・ネット","weight":0.9,"unit":"本","aliases":""},{"id":"nk_144","name":"ネットハンガー","category":"クランプ・金物","weight":1.0,"unit":"枚","aliases":""},{"id":"nk_145","name":"防炎シート１.８２ｘ５.１(販売)","category":"養生・ネット","weight":3.6,"unit":"枚","aliases":""},{"id":"nk_146","name":"三連クランプ","category":"クランプ・金物","weight":1.2,"unit":"個","aliases":""},{"id":"nk_147","name":"かべつなぎ L-130（130～160）","category":"壁つなぎ","weight":0.7,"unit":"本","aliases":""},{"id":"nk_148","name":"防炎シート１.５２ｘ５.１(販売)","category":"養生・ネット","weight":3.0,"unit":"枚","aliases":""},{"id":"nk_149","name":"足場チェーン ２ｍ","category":"クランプ・金物","weight":1.4,"unit":"本","aliases":""},{"id":"nk_150","name":"かべつなぎ L-160（160～200）","category":"壁つなぎ","weight":0.75,"unit":"本","aliases":""},{"id":"nk_151","name":"防炎シート１.２１ｘ５.１(販売)","category":"養生・ネット","weight":2.4,"unit":"枚","aliases":""},{"id":"nk_152","name":"足場チェーン ３ｍ","category":"クランプ・金物","weight":2.0,"unit":"本","aliases":""},{"id":"nk_153","name":"かべつなぎ L-200（200～240）","category":"壁つなぎ","weight":0.85,"unit":"本","aliases":""},{"id":"nk_154","name":"防炎シート０.９１ｘ５.１(販売)","category":"養生・ネット","weight":1.8,"unit":"枚","aliases":""},{"id":"nk_155","name":"足場チェーン ４ｍ","category":"クランプ・金物","weight":2.8,"unit":"本","aliases":""},{"id":"nk_156","name":"かべつなぎ L-300（240～320）","category":"壁つなぎ","weight":0.95,"unit":"本","aliases":""},{"id":"nk_157","name":"防炎シート０.６１ｘ５.１(販売)","category":"養生・ネット","weight":1.2,"unit":"枚","aliases":""},{"id":"nk_158","name":"足場チェーン ５ｍ","category":"クランプ・金物","weight":3.6,"unit":"本","aliases":""},{"id":"nk_159","name":"かべつなぎ L-350（280～400）","category":"壁つなぎ","weight":1.0,"unit":"本","aliases":""},{"id":"nk_160","name":"防音シート グレー 1.8×3.4","category":"養生・ネット","weight":10.0,"unit":"枚","aliases":""},{"id":"nk_161","name":"チェーンクランプ","category":"クランプ・金物","weight":0.85,"unit":"個","aliases":""},{"id":"nk_162","name":"かべつなぎ L-400（320～480）","category":"壁つなぎ","weight":1.15,"unit":"本","aliases":""},{"id":"nk_163","name":"防音シート グレー 1.5×3.4","category":"養生・ネット","weight":8.3,"unit":"枚","aliases":""},{"id":"nk_164","name":"アウトリガー","category":"その他","weight":10.5,"unit":"台","aliases":""},{"id":"nk_165","name":"かべつなぎ L-600（480～670）","category":"壁つなぎ","weight":1.5,"unit":"本","aliases":""},{"id":"nk_166","name":"防音シート グレー 1.2×3.4","category":"養生・ネット","weight":6.7,"unit":"枚","aliases":""},{"id":"nk_167","name":"アウトリガーロングジャッキ","category":"ジャッキ・ベース","weight":6.0,"unit":"台","aliases":""},{"id":"nk_168","name":"かべつなぎ L-800（670～860）","category":"壁つなぎ","weight":1.7,"unit":"本","aliases":""},{"id":"nk_169","name":"防音シート グレー 0.9×3.4","category":"養生・ネット","weight":5.0,"unit":"枚","aliases":""},{"id":"nk_170","name":"アウトリガー用自在クランプ","category":"クランプ・金物","weight":0.75,"unit":"台","aliases":""},{"id":"nk_171","name":"かべつなぎ L-1000（860～1050）","category":"壁つなぎ","weight":2.0,"unit":"本","aliases":""},{"id":"nk_172","name":"防音シート グレー 0.6×3.4","category":"養生・ネット","weight":3.3,"unit":"枚","aliases":""},{"id":"nk_173","name":"ブラケット 500型（300～500）","category":"ブラケット","weight":3.6,"unit":"個","aliases":""},{"id":"nk_174","name":"ラッセルネット０.５ｍｘ６ｍ","category":"養生・ネット","weight":2.0,"unit":"枚","aliases":""},{"id":"nk_175","name":"ブラケット 750型（500～750）","category":"ブラケット","weight":4.8,"unit":"個","aliases":""},{"id":"nk_176","name":"Ｐ．Ｐ．ロープ （グレー）販売","category":"その他","weight":0.0,"unit":"本","aliases":""},{"id":"nk_177","name":"ブラケット1000型（750～1000）","category":"ブラケット","weight":6.7,"unit":"個","aliases":""},{"id":"nk_178","name":"Ｐ．Ｐ．ロープ （白） 販売","category":"その他","weight":0.0,"unit":"本","aliases":""},{"id":"nk_179","name":"ブラケット先端クランプ","category":"クランプ・金物","weight":0.4,"unit":"個","aliases":""},{"id":"nk_180","name":"Ｐ．Ｐ．ロープ （青） 販売","category":"その他","weight":0.0,"unit":"本","aliases":""},{"id":"nk_181","name":"クイックブラケット","category":"ブラケット","weight":2.5,"unit":"個","aliases":""},{"id":"nk_182","name":"結束ロープ 販売","category":"その他","weight":0.0,"unit":"本","aliases":""},{"id":"nk_183","name":"水平ネット","category":"養生・ネット","weight":0.0,"unit":"枚","aliases":""},{"id":"nk_184","name":"６０角鋼管 １.０ｍ","category":"梁・補強","weight":4.06,"unit":"本","aliases":""},{"id":"nk_185","name":"梁枠４２００（２スパン）","category":"梁・補強","weight":22.2,"unit":"本","aliases":""},{"id":"nk_186","name":"ラッセルネット１ｍｘ６ｍ","category":"養生・ネット","weight":3.3,"unit":"枚","aliases":""},{"id":"nk_187","name":"６０角鋼管 １.５ｍ","category":"梁・補強","weight":6.09,"unit":"本","aliases":""},{"id":"nk_188","name":"梁枠６０００（３スパン）","category":"梁・補強","weight":40.0,"unit":"本","aliases":""},{"id":"nk_189","name":"ラッセルネット２ｍｘ６ｍ","category":"養生・ネット","weight":5.0,"unit":"枚","aliases":""},{"id":"nk_190","name":"６０角鋼管 ２.０ｍ","category":"梁・補強","weight":8.12,"unit":"本","aliases":""},{"id":"nk_191","name":"梁枠８５００（４スパン）","category":"梁・補強","weight":55.7,"unit":"本","aliases":""},{"id":"nk_192","name":"ラッセルネット３ｍｘ６ｍ","category":"養生・ネット","weight":7.0,"unit":"枚","aliases":""},{"id":"nk_193","name":"６０角鋼管 ２.５ｍ","category":"梁・補強","weight":10.15,"unit":"本","aliases":""},{"id":"nk_194","name":"隅梁受け","category":"その他","weight":2.5,"unit":"本","aliases":""},{"id":"nk_195","name":"ラッセルネット４ｍｘ６ｍ","category":"養生・ネット","weight":8.6,"unit":"枚","aliases":""},{"id":"nk_196","name":"６０角鋼管 ３.０ｍ","category":"梁・補強","weight":12.18,"unit":"本","aliases":""},{"id":"nk_197","name":"梁渡し ６１０","category":"梁・補強","weight":5.6,"unit":"本","aliases":""},{"id":"nk_198","name":"ラッセルネット５ｍｘ５ｍ","category":"養生・ネット","weight":9.2,"unit":"枚","aliases":""},{"id":"nk_199","name":"６０角鋼管 ３.５ｍ","category":"梁・補強","weight":14.21,"unit":"本","aliases":""},{"id":"nk_200","name":"梁渡し ９１４","category":"梁・補強","weight":6.5,"unit":"本","aliases":""},{"id":"nk_201","name":"ラッセルネット５ｍｘ１０ｍ","category":"養生・ネット","weight":17.7,"unit":"枚","aliases":""},{"id":"nk_202","name":"６０角鋼管 ４.０ｍ","category":"梁・補強","weight":16.24,"unit":"本","aliases":""},{"id":"nk_203","name":"梁渡し１２１９","category":"梁・補強","weight":10.2,"unit":"本","aliases":""},{"id":"nk_204","name":"ラッセルネット６ｍｘ６ｍ","category":"養生・ネット","weight":12.5,"unit":"枚","aliases":""},{"id":"nk_205","name":"１００角鋼管 １.０ｍ","category":"梁・補強","weight":9.52,"unit":"本","aliases":""},{"id":"nk_206","name":"方杖（短）","category":"梁・補強","weight":4.8,"unit":"本","aliases":""},{"id":"nk_207","name":"ラッセルネット７ｍｘ７ｍ","category":"養生・ネット","weight":18.3,"unit":"枚","aliases":""},{"id":"nk_208","name":"１００角鋼管 １.５ｍ","category":"梁・補強","weight":14.28,"unit":"本","aliases":""},{"id":"nk_209","name":"方杖（長）","category":"梁・補強","weight":6.2,"unit":"本","aliases":""},{"id":"nk_210","name":"ラッセルネット７ｍｘ１０ｍ","category":"養生・ネット","weight":25.2,"unit":"枚","aliases":""},{"id":"nk_211","name":"１００角鋼管 ２.０ｍ","category":"梁・補強","weight":19.04,"unit":"本","aliases":""},{"id":"nk_212","name":"ラッセルネット８ｍｘ８ｍ","category":"養生・ネット","weight":23.0,"unit":"枚","aliases":""},{"id":"nk_213","name":"１００角鋼管 ２.５ｍ","category":"梁・補強","weight":23.8,"unit":"本","aliases":""},{"id":"nk_214","name":"ラッセルネット１０ｍｘ１０ｍ","category":"養生・ネット","weight":35.0,"unit":"枚","aliases":""},{"id":"nk_215","name":"１００角鋼管 ３.０ｍ","category":"梁・補強","weight":28.56,"unit":"本","aliases":""},{"id":"nk_216","name":"スカイフェンス １.８","category":"養生・ネット","weight":8.4,"unit":"枚","aliases":""},{"id":"nk_217","name":"１００角鋼管 ３.５ｍ","category":"梁・補強","weight":33.32,"unit":"本","aliases":""},{"id":"nk_218","name":"スカイフェンス １.５","category":"養生・ネット","weight":7.2,"unit":"枚","aliases":""},{"id":"nk_219","name":"垂直ネット","category":"養生・ネット","weight":0.0,"unit":"枚","aliases":""},{"id":"nk_220","name":"１００角鋼管 ４.０ｍ","category":"梁・補強","weight":38.08,"unit":"本","aliases":""},{"id":"nk_221","name":"スカイフェンス １.２","category":"養生・ネット","weight":6.0,"unit":"枚","aliases":""},{"id":"nk_222","name":"グリーンネット１ｘ１０","category":"養生・ネット","weight":3.3,"unit":"枚","aliases":""},{"id":"nk_223","name":"スカイフェンス ０.９","category":"養生・ネット","weight":4.8,"unit":"枚","aliases":""},{"id":"nk_224","name":"グリーンネット４ｘ１２","category":"養生・ネット","weight":10.8,"unit":"枚","aliases":""},{"id":"nk_225","name":"サポート １尺（320～440）","category":"ジャッキ・ベース","weight":4.0,"unit":"本","aliases":""},{"id":"nk_226","name":"スカイフェンス ０.６","category":"養生・ネット","weight":3.4,"unit":"枚","aliases":""},{"id":"nk_227","name":"グリーンネット６ｘ６","category":"養生・ネット","weight":8.0,"unit":"枚","aliases":""},{"id":"nk_228","name":"サポート ２尺（620～940）","category":"ジャッキ・ベース","weight":5.5,"unit":"本","aliases":""},{"id":"nk_229","name":"養生クランプ","category":"クランプ・金物","weight":0.5,"unit":"個","aliases":""},{"id":"nk_230","name":"グリーンネット６ｘ１０","category":"養生・ネット","weight":12.7,"unit":"枚","aliases":""},{"id":"nk_231","name":"サポート ３尺（920～1415）","category":"ジャッキ・ベース","weight":8.0,"unit":"本","aliases":""},{"id":"nk_232","name":"養生クランプ コーナー","category":"クランプ・金物","weight":0.45,"unit":"個","aliases":""},{"id":"nk_233","name":"グリーンネット６ｘ１２","category":"養生・ネット","weight":15.7,"unit":"枚","aliases":""},{"id":"nk_234","name":"サポート ４尺（1220～1995）","category":"ジャッキ・ベース","weight":10.0,"unit":"本","aliases":""},{"id":"nk_235","name":"サポート ５尺（1520～2590）","category":"ジャッキ・ベース","weight":11.0,"unit":"本","aliases":""},{"id":"nk_236","name":"ＡＫフェンス1.2（青）","category":"養生・ネット","weight":44.0,"unit":"枚","aliases":""},{"id":"nk_237","name":"グレーネット１ｘ１０","category":"養生・ネット","weight":3.3,"unit":"枚","aliases":""},{"id":"nk_238","name":"サポート ６尺（1720～3040）","category":"ジャッキ・ベース","weight":12.0,"unit":"本","aliases":""},{"id":"nk_239","name":"ＡＫジョイント","category":"クランプ・金物","weight":0.5,"unit":"個","aliases":""},{"id":"nk_240","name":"グレーネット４ｘ１２","category":"養生・ネット","weight":10.8,"unit":"枚","aliases":""},{"id":"nk_241","name":"サポート ７尺（2120～3440）","category":"ジャッキ・ベース","weight":14.0,"unit":"本","aliases":""},{"id":"nk_242","name":"ガードフェンス1.2（トラ）","category":"養生・ネット","weight":14.5,"unit":"枚","aliases":""},{"id":"nk_243","name":"グレーネット６ｘ６","category":"養生・ネット","weight":8.0,"unit":"枚","aliases":""},{"id":"nk_244","name":"サポート ９尺（2620～3940）","category":"ジャッキ・ベース","weight":14.5,"unit":"本","aliases":""},{"id":"nk_245","name":"ガードフェンス1.8（トラ）","category":"養生・ネット","weight":16.5,"unit":"枚","aliases":""},{"id":"nk_246","name":"グレーネット６ｘ１０","category":"養生・ネット","weight":12.7,"unit":"枚","aliases":""},{"id":"nk_247","name":"補助サポート ４尺","category":"ジャッキ・ベース","weight":5.0,"unit":"本","aliases":""},{"id":"nk_248","name":"ガードフェンス1.8 全網","category":"養生・ネット","weight":15.0,"unit":"枚","aliases":""},{"id":"nk_249","name":"グレーネット６ｘ１２","category":"養生・ネット","weight":15.7,"unit":"枚","aliases":""},{"id":"nk_250","name":"扉付ガードフェンス1.8 全網","category":"養生・ネット","weight":17.0,"unit":"枚","aliases":""},{"id":"nk_251","name":"扉付ガードフェンス0.9 全網","category":"養生・ネット","weight":16.0,"unit":"枚","aliases":""},{"id":"nk_252","name":"緊張器","category":"その他","weight":1.8,"unit":"個","aliases":""},{"id":"nk_253","name":"引戸型扉フェンス1.8","category":"養生・ネット","weight":17.0,"unit":"枚","aliases":""},{"id":"nk_254","name":"親綱 ６ｍ","category":"安全設備","weight":1.2,"unit":"本","aliases":""},{"id":"nk_255","name":"スタンション ＮＲＥ型","category":"安全設備","weight":7.5,"unit":"本","aliases":""},{"id":"nk_256","name":"ガードフェンス全網用デザインシート","category":"養生・ネット","weight":0.0,"unit":"枚","aliases":""},{"id":"nk_257","name":"親綱 ８ｍ","category":"安全設備","weight":1.2,"unit":"本","aliases":""},{"id":"nk_258","name":"親綱支柱","category":"安全設備","weight":8.7,"unit":"本","aliases":""},{"id":"nk_259","name":"ガードフェンス用シート(販売)","category":"養生・ネット","weight":0.0,"unit":"枚","aliases":""},{"id":"nk_260","name":"親綱 １０ｍ","category":"安全設備","weight":1.5,"unit":"本","aliases":""},{"id":"nk_261","name":"ブロック（鉄）","category":"その他","weight":13.0,"unit":"個","aliases":""},{"id":"nk_262","name":"親綱 １５ｍ","category":"安全設備","weight":2.5,"unit":"本","aliases":""},{"id":"nk_263","name":"ブロック台","category":"その他","weight":18.0,"unit":"個","aliases":""},{"id":"nk_264","name":"親綱 ２０ｍ","category":"安全設備","weight":3.0,"unit":"本","aliases":""},{"id":"nk_265","name":"キャットウォークＫＳ傾斜足場","category":"その他","weight":7.0,"unit":"本","aliases":""},{"id":"nk_266","name":"ＡＶコーンＩ型 赤白","category":"その他","weight":3.0,"unit":"本","aliases":""},{"id":"nk_267","name":"親綱 ３０ｍ","category":"安全設備","weight":5.0,"unit":"本","aliases":""},{"id":"nk_268","name":"開口スライドバー","category":"その他","weight":9.5,"unit":"本","aliases":""},{"id":"nk_269","name":"アルミコーンバー 赤白","category":"その他","weight":0.0,"unit":"本","aliases":""},{"id":"nk_270","name":"セルフロック １５ｍ","category":"安全設備","weight":4.4,"unit":"本","aliases":""},{"id":"nk_271","name":"メッシュロード","category":"布板・足場板","weight":6.0,"unit":"本","aliases":""},{"id":"nk_272","name":"セルフロック用ヒモ １５ｍ(販売)","category":"安全設備","weight":0.0,"unit":"本","aliases":""}];

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
      saved.forEach(s=>{if(!DEFAULT_MATERIALS.some(d=>d.id===s.id))merged.push(s)});
      const cleaned=cleanMaterialMaster(merged);
      lsSet('vertx_core_materials',JSON.stringify(cleaned));
      return cleaned;
    }
  }catch(e){}
  return cleanMaterialMaster(DEFAULT_MATERIALS.map(x=>({...x})));
}
let MATERIALS=cleanMaterialMaster(loadMaterialMaster());
const FRIENDLY_MATERIAL_MIGRATION="v1.1.1";
(function migrateFriendlyMaterialNames(){
  if(lsGet("vertx_core_material_migration")===FRIENDLY_MATERIAL_MIGRATION)return;
  const defaultsById=new Map(DEFAULT_MATERIALS.map(m=>[m.id,m]));
  const ids=new Set(["sanwa_frame1219_1700", "sanwa_frame914_1700", "sanwa_frame610_1700", "nk_048", "nk_051", "nk_054", "nk_057", "nk_060", "nk_062", "nk_064", "nk_067", "nk_070", "nk_073", "nk_008", "nk_011", "nk_022", "nk_025", "nk_028", "nk_065", "nk_068", "nk_071", "nk_074", "nk_075", "nk_046", "nk_049", "nk_052", "nk_055", "nk_058", "soundPanel1800", "soundPanel1500", "soundPanel1200", "soundPanel900", "soundPanel600", "cornerPanel"]);
  MATERIALS=MATERIALS.map(m=>ids.has(m.id)&&defaultsById.has(m.id)?{...m,name:defaultsById.get(m.id).name,category:defaultsById.get(m.id).category,aliases:defaultsById.get(m.id).aliases}:{...m});
  lsSet('vertx_core_materials',JSON.stringify(MATERIALS));
  lsSet('vertx_core_material_migration',FRIENDLY_MATERIAL_MIGRATION);
})();
const state={cart:{},category:'すべて',search:'',selectedSite:'',selectedDrawingId:null,favorites:new Set(JSON.parse(lsGet('vertx_core_favorites')||'[]'))};
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
  $$('.screen').forEach(el=>el.classList.toggle('active',el.id===screenId));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.go===screenId || (screenId==='confirm'&&el.dataset.go==='order')));
  if(screenId==='history')renderHistory(); if(screenId==='confirm')renderConfirm(); if(screenId==='sites')renderSites(); if(screenId==='favorites')renderFavorites(); if(screenId==='materialsMaster')renderMaterialMaster(); if(screenId==='drawings')renderDrawings();if(screenId==='assist')loadAssistDrawings();if(screenId==='siteStock')renderSiteStock();if(screenId==='shortage')renderShortage();if(screenId==='sets')renderSets();if(screenId==='dispatch')renderDispatch();if(screenId==='compare')loadCompareDrawings();if(screenId==='siteDashboard')renderSiteDashboard();if(screenId==='analytics')renderAnalytics();if(screenId==='members')renderMembers();if(screenId==='plans')renderPlans();
  window.scrollTo({top:0,behavior:'instant'});
}
function totals(){return MATERIALS.reduce((a,m)=>{const q=state.cart[m.id]||0;a.qty+=q;a.weight+=q*Number(m.weight||0);return a},{qty:0,weight:0})}
function selectedItems(){return MATERIALS.filter(m=>(state.cart[m.id]||0)>0).map(m=>({...m,qty:state.cart[m.id]}))}
function truckFor(weightKg){const tons=weightKg/1000;if(tons<=0.35)return '軽トラ';if(tons<=2)return '2t車';if(tons<=3)return '3t車';if(tons<=4)return '4t車';if(tons<=6)return '6t車';if(tons<=8)return '8t車';if(tons<=10)return '10t車';return '10t車以上／複数便'}
function formatWeight(weightKg){return `${Number(weightKg).toFixed(1)}kg / ${(Number(weightKg)/1000).toFixed(2)}t`}

const CATEGORY_ORDER=['枠','枠組','アンチ','ハーフアンチ','ブレス','手摺・下さん','布板・足場板','単管','クランプ・金物','ジャッキ・ベース','壁つなぎ','防音パネル','仮囲い','仮囲い金物','養生・ネット','階段・昇降','梁・補強','安全設備','その他'];
const GROUP_ORDER=['枠足場用','単管足場用','クランプ類','ジャッキ・ベース','壁つなぎ','防音パネル','仮囲い・アドフラット','シート・養生類','階段・昇降','その他'];
function materialGroup(m){
  const n=`${m.name} ${m.aliases||''}`;
  if(m.category==='クランプ・金物'||/クランプ|キャッチ/.test(n)) return 'クランプ類';
  if(m.category==='ジャッキ・ベース'||/ジャッキ|固定ベース|ベース/.test(n)) return 'ジャッキ・ベース';
  if(m.category==='壁つなぎ'||/壁つなぎ|壁繋/.test(n)) return '壁つなぎ';
  if(m.category==='防音パネル'||/防音パネル|透過パネル|フラットパネル/.test(n)) return '防音パネル';
  if(['仮囲い','仮囲い金物'].includes(m.category)||/アドフラット|Jフック|ジョイント金具/.test(n)) return '仮囲い・アドフラット';
  if(m.category==='養生・ネット'||/シート|ネット|メッシュ|養生/.test(n)) return 'シート・養生類';
  if(m.category==='階段・昇降'||/階段|タラップ|梯子|はしご/.test(n)) return '階段・昇降';
  if(m.category==='単管'||/単管|ブラケット|くい丸|杭/.test(n)) return '単管足場用';
  if(['枠','枠組','アンチ','ハーフアンチ','ブレス','手摺・下さん','布板・足場板','梁・補強'].includes(m.category)||/建枠|調整枠|アンチ|ブレス|筋違|手摺|下さん|布板|足場板|幅木|連結ピン/.test(n)) return '枠足場用';
  return 'その他';
}
function renderCategories(){const cats=['すべて',...GROUP_ORDER];$('#categoryChips').innerHTML=cats.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');$$('#categoryChips .chip').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;renderCategories();renderMaterials()})}
function preferredLengthRank(name,category){
  const n=String(name).replace(/０/g,'0').replace(/１/g,'1').replace(/２/g,'2').replace(/３/g,'3').replace(/４/g,'4').replace(/５/g,'5').replace(/６/g,'6').replace(/７/g,'7').replace(/８/g,'8').replace(/９/g,'9').replace(/．/g,'.');
  if(category==='枠'){
    if(/(?:枠|^).*600/.test(n)) return 10;
    if(/(?:枠|^).*900/.test(n)) return 20;
    if(/(?:枠|^).*1200/.test(n)) return 30;
  }
  if(['アンチ','ハーフアンチ','ブレス','手摺・下さん','防音パネル'].includes(category)){
    const order=[1.8,1.5,1.2,0.9,0.6];
    for(let i=0;i<order.length;i++) if(new RegExp(`(?:^|\s)${String(order[i]).replace('.', '\.')}(?:m|$|\s)`).test(n)||n.includes(String(Math.round(order[i]*1000)))) return 10+i;
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
function materialCard(m){const q=state.cart[m.id]||0,f=state.favorites.has(m.id);const spec=(m.aliases||'').trim();return `<article class="material"><button class="fav-btn ${f?'active':''}" data-fav="${m.id}" aria-label="お気に入り">★</button><div class="material-info"><b>${escapeHtml(m.name)}</b>${spec?`<small class="material-spec">規格 ${escapeHtml(spec)}</small>`:''}<small>${escapeHtml(m.category)}・単重 ${Number(m.weight).toFixed(2)}kg/${escapeHtml(m.unit)}</small></div><div class="qty-control"><button data-action="minus" data-id="${m.id}">−</button><input data-qty="${m.id}" inputmode="numeric" value="${q}" aria-label="${escapeHtml(m.name)}数量"><button data-action="plus" data-id="${m.id}">＋</button></div></article>`}
function bindMaterialControls(root=document){root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>changeQty(b.dataset.id,b.dataset.action==='plus'?1:-1));root.querySelectorAll('[data-qty]').forEach(i=>i.onchange=()=>setQty(i.dataset.qty,Number(i.value)));root.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav))}
function renderMaterials(){
  const q=state.search.trim().toLowerCase();
  const list=MATERIALS.filter(m=>(state.category==='すべて'||materialGroup(m)===state.category)&&`${m.name} ${m.aliases||''}`.toLowerCase().includes(q)).sort((a,b)=>{const ga=GROUP_ORDER.indexOf(materialGroup(a)),gb=GROUP_ORDER.indexOf(materialGroup(b));if(ga!==gb)return ga-gb;return materialSort(a,b)});
  const root=$('#materialList');
  if(!list.length){root.innerHTML='<div class="card empty">該当する資材がありません</div>';}else{
    const groups={};list.forEach(m=>{const g=materialGroup(m);(groups[g]||(groups[g]=[])).push(m)});
    root.innerHTML=GROUP_ORDER.filter(g=>groups[g]?.length).map(g=>`<section class="material-group"><div class="material-group-title"><b>${escapeHtml(g)}</b><span>${groups[g].length}種類</span></div><div class="material-group-list">${groups[g].map(materialCard).join('')}</div></section>`).join('');
  }
  bindMaterialControls(root);renderOrderTotals();renderSiteBanner();
}
function renderFavorites(){const list=MATERIALS.filter(m=>state.favorites.has(m.id));$('#favoriteList').innerHTML=list.length?list.map(materialCard).join(''):'<div class="card empty">★を押した資材がここに表示されます</div>';bindMaterialControls($('#favoriteList'))}
function changeQty(id,d){state.cart[id]=Math.max(0,(state.cart[id]||0)+d);renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function setQty(id,v){state.cart[id]=Math.max(0,Math.floor(Number.isFinite(v)?v:0));renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites()}
function toggleFavorite(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);lsSet('vertx_core_favorites',JSON.stringify([...state.favorites]));renderMaterials();if($('#favorites').classList.contains('active'))renderFavorites();toast('お気に入りを更新しました')}
function renderOrderTotals(){const t=totals();$('#totalQty').textContent=t.qty;$('#totalWeight').textContent=t.weight.toFixed(1);$('#totalTons').textContent=(t.weight/1000).toFixed(2);$('#toConfirmBtn').disabled=t.qty===0}
function renderSiteBanner(){const el=$('#selectedSiteBanner');if(state.selectedSite){el.classList.remove('hidden');el.innerHTML=`<span>現場</span><strong>${escapeHtml(state.selectedSite)}</strong><button id="clearSiteBtn">変更</button>`;$('#clearSiteBtn').onclick=()=>go('sites')}else el.classList.add('hidden')}

function getSites(){try{return JSON.parse(lsGet('vertx_core_sites')||'[]')}catch{return []}}
function saveSites(v){lsSet('vertx_core_sites',JSON.stringify(v))}
function renderSites(){const sites=getSites();$('#siteList').innerHTML=sites.length?sites.map((s,i)=>`<article class="card site-card"><button class="site-select" data-site="${escapeHtml(s)}"><span>📍</span><b>${escapeHtml(s)}</b><small>この現場で注文を作る</small></button><button class="site-delete" data-site-index="${i}">×</button></article>`).join(''):'<div class="card empty">現場を追加すると、ここからすぐ注文できます</div>';$$('[data-site]').forEach(b=>b.onclick=()=>{state.selectedSite=b.dataset.site;$('#siteName').value=state.selectedSite;go('order')});$$('[data-site-index]').forEach(b=>b.onclick=()=>{const a=getSites();a.splice(Number(b.dataset.siteIndex),1);saveSites(a);renderSites()})}
function addSite(){const name=$('#newSiteName').value.trim();if(!name)return toast('現場名を入力してください');const sites=getSites();if(!sites.includes(name))sites.unshift(name);saveSites(sites);$('#newSiteName').value='';renderSites();toast('現場を追加しました')}

function currentDraft(){const items=selectedItems(),t=totals();return {id:'draft',site:$('#siteName')?.value.trim()||state.selectedSite||'現場名未入力',date:$('#deliveryDate')?.value||'',memo:$('#orderMemo')?.value.trim()||'',createdAt:new Date().toISOString(),items,qty:t.qty,weight:t.weight,truck:truckFor(t.weight),drawingId:state.selectedDrawingId,drawingName:$('#selectedDrawingName')?.textContent||''}}
function renderConfirm(){const o=currentDraft();$('#confirmItems').innerHTML=o.items.map(i=>`<div class="confirm-row"><span>${escapeHtml(i.name)}</span><strong>${i.qty}${escapeHtml(i.unit)} <small>(${(i.qty*i.weight).toFixed(1)}kg)</small></strong></div>`).join('')||'<div class="empty">資材が選択されていません</div>';$('#confirmQty').textContent=`${o.qty}点`;$('#confirmWeight').textContent=formatWeight(o.weight);$('#truckRecommendation').textContent=o.truck;renderMissingCheck(o.items);
  const drawBox=$('#confirmDrawing');
  if(drawBox){
    drawBox.innerHTML=o.drawingId?`<span>添付図面</span><strong>${escapeHtml(o.drawingName||'図面')}</strong>`:'<span>添付図面</span><strong>なし</strong>';
  }
}
function getHistory(){try{return JSON.parse(lsGet('vertx_core_orders')||'[]')}catch{return []}}
function saveHistory(v){lsSet('vertx_core_orders',JSON.stringify(v));updateDashboard()}
function submitOrder(){const order=currentDraft();if(!order.items.length){toast('資材を選択してください');go('order');return}order.id=Date.now();order.status='発注済';const history=getHistory();history.unshift(order);saveHistory(history);const sites=getSites();if(order.site!=='現場名未入力'&&!sites.includes(order.site)){sites.unshift(order.site);saveSites(sites)}state.cart={};state.selectedSite='';state.selectedDrawingId=null;$('#siteName').value='';$('#orderMemo').value='';renderMaterials();go('success')}
function renderHistory(){const h=getHistory();$('#historyList').innerHTML=h.length?h.map(o=>`<article class="card history-card"><header><div><h3>${escapeHtml(o.site)}</h3><div class="history-meta">${formatDate(o.createdAt)}${o.date?`・希望 ${escapeHtml(o.date)}`:''}</div></div><span class="badge">${o.qty}点</span></header><div class="history-item-row"><span>推定重量</span><strong>${formatWeight(Number(o.weight))}</strong></div><div class="history-item-row"><span>乗る車</span><strong>${escapeHtml(o.truck||truckFor(Number(o.weight)))}</strong></div>${o.drawingId?`<div class="history-item-row"><span>図面</span><button class="inline-link" data-open-drawing="${o.drawingId}">${escapeHtml(o.drawingName||'開く')}</button></div>`:''}<div class="history-actions"><button data-reorder="${o.id}">前回コピー</button><button data-pdf="${o.id}">PDF</button><button data-line="${o.id}">LINE</button><button data-delete="${o.id}">削除</button></div></article>`).join(''):'<div class="card empty">まだ注文履歴がありません</div>';$$('[data-reorder]').forEach(b=>b.onclick=()=>reorder(Number(b.dataset.reorder)));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteOrder(Number(b.dataset.delete)));$$('[data-pdf]').forEach(b=>b.onclick=()=>printOrderById(Number(b.dataset.pdf)));$$('[data-line]').forEach(b=>b.onclick=()=>shareOrderById(Number(b.dataset.line)));$$('[data-open-drawing]').forEach(b=>b.onclick=()=>openDrawing(Number(b.dataset.openDrawing)))}
function reorder(id){const o=getHistory().find(x=>x.id===id);if(!o)return;state.cart={};o.items.forEach(i=>{if(MATERIALS.some(m=>m.id===i.id))state.cart[i.id]=i.qty});state.selectedSite=o.site;renderMaterials();go('order');toast('前回注文をコピーしました')}
function deleteOrder(id){if(!confirm('この履歴を削除しますか？'))return;saveHistory(getHistory().filter(x=>x.id!==id));renderHistory()}
function updateDashboard(){const h=getHistory(),today=new Date().toDateString();$('#historyCount').textContent=h.length;$('#todayCount').textContent=h.filter(o=>new Date(o.createdAt).toDateString()===today).length}

function orderText(o){const lines=[`VERTX CORE 資材注文`,`現場：${o.site}`,o.date?`希望日：${o.date}`:'',`合計：${o.qty}点`,`重量：${formatWeight(o.weight)}`,`乗る車：${o.truck||truckFor(o.weight)}`,o.drawingId?`図面：${o.drawingName||'添付あり'}`:'','','【資材】',...o.items.map(i=>`${i.name} ${i.qty}${i.unit}`),o.memo?`\nメモ：${o.memo}`:''];return lines.filter(Boolean).join('\n')}
function shareOrderById(id){const o=getHistory().find(x=>x.id===id);if(o)shareToLine(o)}
function shareDraft(){const o=currentDraft();if(!o.items.length)return toast('資材を選択してください');shareToLine(o)}
function shareToLine(o){window.open(`https://line.me/R/share?text=${encodeURIComponent(orderText(o))}`,'_blank')}
function printOrderById(id){const o=getHistory().find(x=>x.id===id);if(o)printOrder(o)}
function printDraft(){const o=currentDraft();if(!o.items.length)return toast('資材を選択してください');printOrder(o)}
async function printOrder(o){
  const area=$('#printArea');
  area.innerHTML=`<div class="print-sheet" style="display:block;background:#fff;color:#111;width:794px;min-height:1123px;padding:48px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP','Yu Gothic',sans-serif"><h1 style="font-size:28px;margin:0 0 28px">VERTX CORE 資材注文書</h1><p>現場：<b>${escapeHtml(o.site)}</b></p>${o.date?`<p>希望日：${escapeHtml(o.date)}</p>`:''}<p>合計：<b>${o.qty}点</b>　合計重量：<b>${formatWeight(o.weight)}</b></p><p>推奨車両：<b>${escapeHtml(o.truck||truckFor(o.weight))}</b></p>${o.drawingId?`<p>添付図面：<b>${escapeHtml(o.drawingName||'図面')}</b></p>`:''}<table style="width:100%;border-collapse:collapse;margin-top:24px"><thead><tr><th style="border:1px solid #999;padding:9px;text-align:left">資材名</th><th style="border:1px solid #999;padding:9px">数量</th><th style="border:1px solid #999;padding:9px">単重</th><th style="border:1px solid #999;padding:9px">重量</th></tr></thead><tbody>${o.items.map(i=>`<tr><td style="border:1px solid #bbb;padding:9px">${escapeHtml(i.name)}</td><td style="border:1px solid #bbb;padding:9px;text-align:center">${i.qty}${escapeHtml(i.unit)}</td><td style="border:1px solid #bbb;padding:9px;text-align:right">${Number(i.weight).toFixed(2)}kg</td><td style="border:1px solid #bbb;padding:9px;text-align:right">${(i.qty*i.weight).toFixed(1)}kg</td></tr>`).join('')}</tbody></table>${o.memo?`<p style="margin-top:24px">メモ：${escapeHtml(o.memo)}</p>`:''}<p style="margin-top:32px;font-size:11px;color:#666">VERTX CORE v5.1</p></div>`;
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
  root.innerHTML=warnings.length?`<div class="missing-list">${warnings.map(w=>`<div class="missing-item"><span>!</span><span>${escapeHtml(w)}</span></div>`).join('')}</div><small class="assist-warning">※これは注文漏れ防止の簡易チェックです。施工計画・現場条件を優先してください。</small>`:'<div class="missing-ok">✓ 基本項目に大きな抜けは見つかりません</div><small class="muted">施工計画・現場条件による追加材は別途確認してください。</small>';
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
    const brace=findMat(['ブレス',({1829:'1.8',1524:'1.5',1219:'1.2',914:'0.9',610:'0.6'})[len]])||findMat(['筋違',len])||findMat(['ブレス'])||findMat(['筋違']);
    const deck=findMat(['アンチ',({1829:'1.8',1524:'1.5',1219:'1.2',914:'0.9',610:'0.6'})[len]])||findMat(['鋼製布板',`L${len}`,'500'])||findMat(['鋼製布板',len]);
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
function applyAssist(){if(!assistCandidate.length)return;state.cart={};assistCandidate.forEach(i=>state.cart[i.id]=i.qty);const ids=selectedAiDrawingIds();if(ids.length){state.selectedDrawingId=ids[0];drawingGet(state.selectedDrawingId).then(x=>{if(x&&$('#selectedDrawingName'))$('#selectedDrawingName').textContent=x.name+(ids.length>1?` ＋他${ids.length-1}枚`:'')})}renderMaterials();go('order');toast('資材候補を注文に入れました')}


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
async function runAiAnalysis(){
  const ids=selectedAiDrawingIds();if(!ids.length)return toast('解析する図面を1枚以上選んでください');
  if(ids.length>8)return toast('一度に解析できる図面は8枚までです');
  const drawings=(await Promise.all(ids.map(id=>drawingGet(id)))).filter(Boolean);if(!drawings.length)return toast('図面が見つかりません');
  $('#runAiBtn').disabled=true;$('#applyAiBtn').classList.add('hidden');setAiStatus(`AIが${drawings.length}枚の図面をまとめて解析中です。平面・立面・断面を照合しています…`);
  try{
    const files=[];let totalBytes=0;
    for(const d of drawings){
      let aiBlob=d.blob;
      if((d.type||'').startsWith('image/') && Number(d.size)>700*1024) aiBlob=await compressImageBlob(d.blob,1500,.68);
      const bytes=Number(aiBlob.size||d.size||0);totalBytes+=bytes;
      if(totalBytes>2.65*1024*1024)throw new Error('選択した図面の合計サイズが大きすぎます。必要な断面・立面だけに絞るか、PDFページを画像にして再度選択してください。');
      files.push({filename:d.name,mimeType:d.type,dataBase64:await blobToBase64(aiBlob)});
    }
    const materialNames=MATERIALS.map(m=>m.name);
    const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files,mode:$('#aiMode').value,context:$('#aiContext').value.trim(),materialNames})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||`AI解析エラー (${r.status})`);
    renderAiResult(data.analysis,{id:drawings[0].id,name:drawings.map(x=>x.name).join(' / ')});
    setAiStatus(`解析完了。${drawings.length}枚をまとめて確認しました。候補を確認してから注文へ反映してください。`);
  }catch(e){const msg=e?.message||'AI解析に失敗しました';const friendly=/load failed|fetch failed|failed to fetch/i.test(msg)?'通信に失敗しました。図面の合計サイズを小さくするか、必要な断面・立面だけを選んで再試行してください。':msg;setAiStatus(friendly,'error');$('#aiResult').classList.add('empty');$('#aiResult').textContent='AI解析に失敗しました。エラー表示を確認して、もう一度試してください。'}
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
function applyAiCandidate(){if(!aiCandidate.length)return toast('注文へ入れられるAI候補がありません');state.cart={};aiCandidate.forEach(x=>state.cart[x.id]=(state.cart[x.id]||0)+x.qty);renderMaterials();go('order');toast('AI候補を注文へ入れました。数量を確認してください')}

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
  $$('[data-stock-order]').forEach(b=>b.onclick=()=>{const r=getStock()[Number(b.dataset.stockOrder)];if(!r)return;state.selectedSite=r.site;state.cart[r.materialId]=(state.cart[r.materialId]||0)+1;renderMaterials();go('order');toast('注文に追加しました')});
}
function saveStockEntry(){const site=$('#stockSite').value,id=$('#stockMaterial').value,qty=Math.max(0,Number($('#stockQty').value)||0),memo=$('#stockMemo').value.trim();const m=MATERIALS.find(x=>x.id===id);if(!site||!m)return;const a=getStock();const i=a.findIndex(x=>x.site===site&&x.materialId===id);const row={site,materialId:id,materialName:m.name,qty,memo,updatedAt:new Date().toISOString()};if(i>=0)a[i]=row;else a.unshift(row);saveStockRows(a);renderSiteStock();toast('現場資材を保存しました')}
function renderShortage(){$('#shortageSite').innerHTML=optionSites();$('#shortageMaterial').innerHTML=optionMaterials()}
function addShortage(){const site=$('#shortageSite').value,id=$('#shortageMaterial').value,q=Math.max(1,Number($('#shortageQty').value)||1);state.selectedSite=site;state.cart[id]=(state.cart[id]||0)+q;renderMaterials();go('order');toast(`不足分 ${q} を注文に追加しました`)}
function getSets(){try{return JSON.parse(lsGet('vertx_core_sets')||'[]')}catch{return []}}
function saveSets(v){lsSet('vertx_core_sets',JSON.stringify(v))}
function saveCurrentSet(){const name=$('#setName').value.trim(),items=selectedItems();if(!name)return toast('セット名を入力してください');if(!items.length)return toast('先に注文画面で資材を選んでください');const a=getSets();a.unshift({id:Date.now(),name,items:items.map(x=>({id:x.id,qty:x.qty}))});saveSets(a);$('#setName').value='';renderSets();toast('セットを保存しました')}
function renderSets(){const a=getSets();$('#setList').innerHTML=a.length?a.map((x,i)=>`<article class="card set-row"><b>${escapeHtml(x.name)}</b><small>${x.items.length}種類</small><div class="quick-actions"><button data-set-apply="${i}">注文に入れる</button><button data-set-del="${i}">削除</button></div></article>`).join(''):'<div class="card empty">よく使う組み合わせを保存できます</div>';$$('[data-set-apply]').forEach(b=>b.onclick=()=>{const x=getSets()[Number(b.dataset.setApply)];if(!x)return;x.items.forEach(i=>state.cart[i.id]=(state.cart[i.id]||0)+i.qty);renderMaterials();go('order');toast('セットを注文に追加しました')});$$('[data-set-del]').forEach(b=>b.onclick=()=>{const a=getSets();a.splice(Number(b.dataset.setDel),1);saveSets(a);renderSets()})}
const ORDER_STATUSES=['発注済','準備中','配送中','納品済'];
function nextStatus(v){const i=ORDER_STATUSES.indexOf(v);return ORDER_STATUSES[(i<0?0:i+1)%ORDER_STATUSES.length]}
function renderDispatch(){const a=getHistory().slice().sort((x,y)=>String(x.date||'9999').localeCompare(String(y.date||'9999')));$('#dispatchList').innerHTML=a.length?a.map(o=>`<article class="card dispatch-row"><div class="stock-grid"><div><b>${escapeHtml(o.site)}</b><small>${escapeHtml(o.date||'日付未設定')}</small></div><span class="status-pill">${escapeHtml(o.status||'発注済')}</span></div><div class="history-item-row"><span>車両</span><strong>${escapeHtml(o.truck||truckFor(o.weight))}</strong></div><div class="history-item-row"><span>重量</span><strong>${formatWeight(o.weight)}</strong></div>${o.inventoryApplied?'<div class="history-item-row"><span>在庫</span><strong>✓ 自動反映済み</strong></div>':''}<button data-status="${o.id}" class="secondary-btn full">ステータスを進める</button></article>`).join(''):'<div class="card empty">注文を保存すると配車予定に表示されます</div>';$$('[data-status]').forEach(b=>b.onclick=()=>{const a=getHistory(),o=a.find(x=>x.id===Number(b.dataset.status));if(o){const before=o.status||'発注済';o.status=nextStatus(before);let applied=false;if(o.status==='納品済')applied=applyOrderToStock(o);saveHistory(a);renderDispatch();if(applied){renderSiteStock();toast('納品済み：現場在庫へ自動反映しました')}}})}
async function loadCompareDrawings(){const a=await drawingList();const opts='<option value="">図面を選択</option>'+a.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');$('#compareOld').innerHTML=opts;$('#compareNew').innerHTML=opts}
async function runCompare(){const oldId=Number($('#compareOld').value),newId=Number($('#compareNew').value);if(!oldId||!newId||oldId===newId)return toast('旧図面と新図面を別々に選んでください');const oldD=await drawingGet(oldId),newD=await drawingGet(newId);if(!oldD||!newD)return toast('図面が見つかりません');const st=$('#compareStatus');st.classList.remove('hidden');st.textContent='AIが新旧図面を比較しています…';$('#compareResult').innerHTML='';try{let oldBlob=oldD.blob,newBlob=newD.blob;if(!String(oldD.type).includes('pdf'))oldBlob=await compressImageForAi(oldBlob,oldD.type);if(!String(newD.type).includes('pdf'))newBlob=await compressImageForAi(newBlob,newD.type);const body={old:{filename:oldD.name,mimeType:oldD.type,dataBase64:await blobToBase64(oldBlob)},newer:{filename:newD.name,mimeType:newD.type,dataBase64:await blobToBase64(newBlob)},context:$('#compareContext').value.trim()};const r=await fetch('/api/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'比較に失敗しました');const a=data.analysis;$('#compareResult').innerHTML=`<h3>${escapeHtml(a.summary||'比較結果')}</h3>${(a.changes||[]).map(x=>`<div class="compare-change"><b>${escapeHtml(x.area||'変更')}</b><p>${escapeHtml(x.change||'')}</p><small>${escapeHtml(x.impact||'')}</small></div>`).join('')}${(a.warnings||[]).length?`<div class="ai-warning"><b>注意</b>${a.warnings.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</div>`:''}`;st.textContent='比較完了'}catch(e){st.textContent=e.message;$('#compareResult').textContent='AI比較に失敗しました'} }


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
  $('#voiceResult').innerHTML=hits.length?hits.map(x=>`<div class="history-item-row"><span>${escapeHtml(x.m.name)}</span><strong>${x.qty}${escapeHtml(x.m.unit)}</strong></div>`).join(''):'資材名と数量を認識できませんでした。例：アンチ1.8を50枚、枠600を30枚';
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
function canOpenScreen(screenId){const r=getCompanySession()?.role||'member';if(r==='owner')return true;if(r==='admin')return !['plans'].includes(screenId);if(r==='member')return !['materialsMaster','members','plans','analytics','companySettings'].includes(screenId);if(r==='viewer')return ['home','history','favorites','drawings','siteStock','siteDashboard','companySettings','manual'].includes(screenId);return false}
function applyRoleUi(){document.querySelectorAll('[data-go]').forEach(el=>{const target=el.dataset.go;if(!target||target==='home')return;const allowed=canOpenScreen(target);if(el.classList.contains('menu-card'))el.style.display=allowed?'':'none';});const r=getCompanySession()?.role||'member';if($('#memberInviteBtn'))$('#memberInviteBtn').style.display=['owner','admin'].includes(r)?'':'none';}


async function saveAiLearningExample(source='drawing'){
  try{
    const org=getCompanySession()?.orgId; if(!org||!cloudReady) return;
    const finalItems=Object.entries(state.cart||{}).map(([id,qty])=>{const m=MATERIALS.find(x=>String(x.id)===String(id));return m&&Number(qty)>0?{material_name:m.name,quantity:Number(qty),unit:m.unit}:null}).filter(Boolean);
    if(!finalItems.length) return;
    await supabaseClient.from('ai_learning_examples').insert({organization_id:org,source_type:source,context:($('#aiContext')?.value||$('#photoAiContext')?.value||'').trim(),corrected_materials:finalItems});
    updateLearningCount();
  }catch(e){console.warn('learning save failed',e)}
}
async function updateLearningCount(){
  try{const org=getCompanySession()?.orgId;if(!org||!cloudReady)return;const {count}=await supabaseClient.from('ai_learning_examples').select('*',{count:'exact',head:true}).eq('organization_id',org);document.querySelectorAll('[data-learning-count]').forEach(x=>x.textContent=String(count||0));}catch{}}
function renderPlans(){
  const s=getCompanySession();const plan=s?.plan||'standard';
  document.querySelectorAll('.plan-card').forEach(x=>{
    x.classList.toggle('current',x.dataset.plan===plan);
    x.setAttribute('role','button');x.tabIndex=0;
    x.onclick=()=>selectPlan(x.dataset.plan);
    x.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')selectPlan(x.dataset.plan)};
  });
  const note=$('#planChangeStatus');if(note)note.textContent=`現在のプラン：${planLabel(plan)}（テスト切替モード）`;
  updateLearningCount();
}
function planLabel(p){return ({free:'Free',standard:'Standard',pro:'Pro'})[p]||p}
async function selectPlan(nextPlan){
  const s=getCompanySession();if(!s?.orgId)return toast('会社情報を取得できません');
  if(s.role!=='owner')return toast('プラン変更は社長アカウントのみ可能です');
  if(!['free','standard','pro'].includes(nextPlan))return;
  if(nextPlan===s.plan)return toast(`${planLabel(nextPlan)} を利用中です`);
  if(!confirm(`${planLabel(nextPlan)} に切り替えますか？\n現在は決済前のテスト切替です。課金は発生しません。`))return;
  const status=$('#planChangeStatus');if(status)status.textContent='プランを変更中…';
  const {error}=await supabaseClient.rpc('set_organization_plan',{p_org:s.orgId,p_plan:nextPlan});
  if(error){if(status)status.textContent='変更できません：'+error.message;return toast('プラン変更失敗：'+error.message)}
  s.plan=nextPlan;s.subscriptionStatus='trial';nativeSet(VERTX_SESSION_KEY,JSON.stringify(s));
  if(status)status.textContent=`現在のプラン：${planLabel(nextPlan)}（テスト切替モード）`;
  document.querySelectorAll('.plan-card').forEach(x=>x.classList.toggle('current',x.dataset.plan===nextPlan));
  applyPlanUi();toast(`${planLabel(nextPlan)} に切り替えました`);
}
function applyPlanUi(){
  const p=getCompanySession()?.plan||'standard';document.body.dataset.plan=p;
  // 本番決済接続前は画面を消さず、プラン状態のみ反映する。決済導入時に機能ゲートへ切替可能。
}
async function runPhotoAi(){if(!photoAiFiles.length)return toast('写真を選択してください');const st=$('#photoAiStatus');st.classList.remove('hidden');st.textContent='AIが現場写真を確認しています…';try{const drawings=[];for(const f of photoAiFiles.slice(0,6)){const b=await compressImageForAi(f,f.type);drawings.push({filename:f.name,mimeType:f.type,dataBase64:await blobToBase64(b)})}const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files:drawings,materialNames:MATERIALS.map(m=>m.name),mode:'photo',context:$('#photoAiContext').value.trim()+' 現場写真です。写っている足場資材を候補として抽出してください。'})});const data=await r.json();if(!r.ok)throw new Error(data.error||'写真解析に失敗しました');const a=data.analysis||data;photoAiCandidates=a.materials||a.candidates||[];$('#photoAiResult').innerHTML=`<h3>${escapeHtml(a.summary||'写真AI結果')}</h3>`+photoAiCandidates.map(x=>`<div class="history-item-row"><span>${escapeHtml(x.material_name||x.name||x.material||'資材')}</span><strong>${Number(x.qty||x.quantity||0)||'?'} </strong></div>`).join('');$('#applyPhotoAiBtn').classList.toggle('hidden',!photoAiCandidates.length);st.textContent='解析完了'}catch(e){st.textContent=e.message;$('#photoAiResult').textContent='解析できませんでした'}}
function applyPhotoAi(){let n=0;for(const x of photoAiCandidates){const name=x.material_name||x.name||x.material||'';const m=MATERIALS.find(y=>y.name===name)||findMaterialBySpeech(name);const q=Number(x.qty||x.quantity||0);if(m&&q>0){state.cart[m.id]=(state.cart[m.id]||0)+q;n++}}renderMaterials();go('order');toast(`${n}種類を注文へ追加しました`)}

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
  document.body.dataset.role=s.role||'member';applyRoleUi();applyPlanUi();
  return true;
}
function setAuthStatus(msg){const el=$('#authStatus');if(el)el.textContent=msg}
async function initSupabase(){
  try{
    const r=await fetch('/api/config',{cache:'no-store'}),cfg=await r.json();
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
  const {data,error}=await supabaseClient.from('memberships').select('role,organizations(id,name,code,invite_token,plan,subscription_status,trial_ends_at)').eq('user_id',cloudUser.id);
  if(error){console.warn(error);return []}
  return (data||[]).filter(x=>x.organizations);
}
function sessionFromMembership(m){return {orgId:m.organizations.id,company:m.organizations.name,code:m.organizations.code,user:cloudUser?.email||'',role:m.role,inviteToken:m.organizations.invite_token,plan:m.organizations.plan||'standard',subscriptionStatus:m.organizations.subscription_status||'trial',trialEndsAt:m.organizations.trial_ends_at||null,loginAt:new Date().toISOString()}}
async function activateMembership(m){nativeSet(VERTX_SESSION_KEY,JSON.stringify(sessionFromMembership(m)));await hydrateCloudStore();cloudReady=true;reloadTenantState();renderCompanyIdentity();startApp()}
function reloadTenantState(){
  MATERIALS=cleanMaterialMaster(loadMaterialMaster());
  lsSet('vertx_core_materials',JSON.stringify(MATERIALS));
  state.cart={};state.category='すべて';state.search='';state.selectedSite='';state.selectedDrawingId=null;
  try{state.favorites=new Set(JSON.parse(lsGet('vertx_core_favorites')||'[]'))}catch{state.favorites=new Set()}
}
async function joinInviteIfPresent(){
  const u0=new URL(location.href);const teamToken=u0.searchParams.get('team_invite');const legacy=u0.searchParams.get('invite');
  if(!teamToken&&!legacy)return false;
  let error=null;
  if(teamToken){({error}=await supabaseClient.rpc('join_organization_by_role_invite',{p_token:teamToken}));}
  else{({error}=await supabaseClient.rpc('join_organization_by_invite',{p_token:legacy}));}
  if(error){const el=$('#companyGateStatus');if(el)el.textContent='招待参加に失敗しました：'+error.message;return false}
  u0.searchParams.delete('team_invite');u0.searchParams.delete('invite');history.replaceState({},'',u0.toString());return true;
}
async function chooseOrganization(){
  $('#cloudAuthGate')?.classList.add('hidden');
  const joined=await joinInviteIfPresent();
  const memberships=await getMemberships();
  const existing=getCompanySession();
  if(existing?.orgId){const hit=memberships.find(m=>m.organizations.id===existing.orgId);if(hit)return activateMembership(hit)}
  if(memberships.length===1)return activateMembership(memberships[0]);
  const gate=$('#companyGate');gate?.classList.remove('hidden');
  const card=gate?.querySelector('.company-gate-card');
  card?.querySelectorAll('.org-choice-list').forEach(x=>x.remove());
  if(memberships.length){
    const list=document.createElement('div');list.className='org-choice-list';
    list.innerHTML='<b>参加中の会社</b>'+memberships.map((m,i)=>`<button class="secondary-btn full" data-org-choice="${i}">${escapeHtml(m.organizations.name)} <small>${escapeHtml(m.organizations.code)}</small></button>`).join('');
    card?.insertBefore(list,card.querySelector('label'));
    list.querySelectorAll('[data-org-choice]').forEach(btn=>btn.onclick=()=>activateMembership(memberships[Number(btn.dataset.orgChoice)]));
  }
  if(joined&&memberships.length)toast('招待された会社に参加しました');
}
async function companyLogin(){
  const company=$('#tenantCompanyName').value.trim();let code=normalizeCompanyCode($('#tenantCompanyCode').value);const user=$('#tenantUserName').value.trim();
  if(!company)return toast('会社名を入力してください');if(!code)code=normalizeCompanyCode(company.replace(/株式会社|有限会社|合同会社/g,''));if(!code)return toast('会社コードを英数字で入力してください');
  const st=$('#companyGateStatus');if(st)st.textContent='会社を作成中…';
  const {data,error}=await supabaseClient.rpc('create_organization',{p_name:company,p_code:code});
  if(error){if(st)st.textContent='作成できません：'+error.message;return}
  const memberships=await getMemberships(),hit=memberships.find(m=>m.organizations.id===data||m.organizations.code===code);
  if(!hit){if(st)st.textContent='会社は作成されました。再読み込みしてください。';return}
  const sess=sessionFromMembership(hit);sess.user=user||cloudUser?.email||'';nativeSet(VERTX_SESSION_KEY,JSON.stringify(sess));await hydrateCloudStore();cloudReady=true;reloadTenantState();location.reload();
}
async function switchCompany(){nativeRemove(VERTX_SESSION_KEY);location.reload()}
function companyInviteUrl(){const s=getCompanySession();const u=new URL(location.origin+location.pathname);if(s?.inviteToken)u.searchParams.set('invite',s.inviteToken);return u.toString()}
function companyRoleInviteUrl(role){const token=roleInviteTokens?.[role];if(!token)return '';const u=new URL(location.origin+location.pathname);u.searchParams.set('team_invite',token);return u.toString()}
async function copyRoleInvite(role){const s=getCompanySession();if(!['owner','admin'].includes(s?.role||''))return toast('招待URLは社長・管理者のみ発行できます');if(role==='admin'&&s.role!=='owner')return toast('人事・管理者用URLは社長のみ発行できます');const url=companyRoleInviteUrl(role);if(!url)return toast('招待URLがまだ作成されていません。V5.3のSQLを実行してください');try{await navigator.clipboard.writeText(url);toast((role==='admin'?'人事・管理者用':role==='viewer'?'閲覧用':'社員・職長用')+'URLをコピーしました')}catch{prompt('このURLをコピーしてください',url)}}
async function copyCompanyInvite(){const s=getCompanySession();if(!s?.inviteToken)return toast('招待URLを取得できません');try{await navigator.clipboard.writeText(companyInviteUrl());toast('招待URLをコピーしました')}catch{prompt('このURLをコピーしてください',companyInviteUrl())}}
async function signOut(){if(supabaseClient)await supabaseClient.auth.signOut();nativeRemove(VERTX_SESSION_KEY);location.reload()}
function prefillCompanyFromUrl(){const code=normalizeCompanyCode(new URL(location.href).searchParams.get('company')||'');if(code&&$('#tenantCompanyCode'))$('#tenantCompanyCode').value=code}
let appStarted=false;
function startApp(){if(appStarted)return;appStarted=true;const d=new Date();d.setDate(d.getDate()+1);$('#deliveryDate').value=d.toISOString().slice(0,10);renderCategories();renderMaterials();updateDashboard();toggleAssistOptions();go('home')}
async function cloudBoot(){
  prefillCompanyFromUrl();
  const ok=await initSupabase();if(!ok)return;
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){$('#cloudAuthGate')?.classList.remove('hidden');$('#companyGate')?.classList.add('hidden');return}
  cloudUser=session.user;$('#cloudAuthGate')?.classList.add('hidden');
  await chooseOrganization();
}

$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));$('#saveStockBtn').onclick=saveStockEntry;$('#addShortageBtn').onclick=addShortage;$('#saveSetBtn').onclick=saveCurrentSet;$('#runCompareBtn').onclick=runCompare;$('#searchInput').oninput=e=>{state.search=e.target.value;renderMaterials()};$('#toConfirmBtn').onclick=()=>go('confirm');$('#submitOrderBtn').onclick=submitOrder;$('#addSiteBtn').onclick=addSite;$('#newSiteName').onkeydown=e=>{if(e.key==='Enter')addSite()};$('#printDraftBtn').onclick=printDraft;$('#lineDraftBtn').onclick=shareDraft;$('#addCustomMaterialBtn').onclick=addCustomMaterial;$('#resetMaterialsBtn').onclick=resetMaterialMaster;$('#drawingInput').onchange=e=>uploadDrawings(e.target.files);if($('#aiDrawingInput'))$('#aiDrawingInput').onchange=e=>uploadAiDrawings(e.target.files);$('#assistType').onchange=toggleAssistOptions;$('#runAssistBtn').onclick=runAssist;$('#applyAssistBtn').onclick=applyAssist;$('#runAiBtn').onclick=runAiAnalysis;$('#applyAiBtn').onclick=applyAiCandidate;
document.querySelectorAll('[data-invite-role]').forEach(btn=>btn.onclick=()=>copyRoleInvite(btn.dataset.inviteRole));if($('#voiceStartBtn'))$('#voiceStartBtn').onclick=startVoiceOrder;if($('#voiceParseBtn'))$('#voiceParseBtn').onclick=parseVoiceOrder;if($('#photoAiInput'))$('#photoAiInput').onchange=e=>{photoAiFiles=[...e.target.files];$('#photoAiFiles').textContent=photoAiFiles.map(x=>x.name).join(' / ')||'写真未選択'};if($('#runPhotoAiBtn'))$('#runPhotoAiBtn').onclick=runPhotoAi;if($('#applyPhotoAiBtn'))$('#applyPhotoAiBtn').onclick=applyPhotoAi;if($('#memberInviteBtn'))$('#memberInviteBtn').onclick=copyCompanyInvite;if($('#tenantLoginBtn'))$('#tenantLoginBtn').onclick=companyLogin;if($('#switchCompanyBtn'))$('#switchCompanyBtn').onclick=switchCompany;if($('#copyInviteBtn'))$('#copyInviteBtn').onclick=copyCompanyInvite;if($('#companyBadge'))$('#companyBadge').onclick=()=>go('companySettings');if($('#authLoginBtn'))$('#authLoginBtn').onclick=authLogin;if($('#authSignupBtn'))$('#authSignupBtn').onclick=authSignup;if($('#signOutBtn'))$('#signOutBtn').onclick=signOut;
$('#resetBtn').onclick=()=>{if(confirm('注文履歴・現場・お気に入り・選択中数量を初期化しますか？（資材マスタは残ります）')){['vertx_core_orders','vertx_core_sites','vertx_core_favorites'].forEach(k=>lsRemove(k));state.cart={};state.favorites=new Set();state.selectedSite='';renderMaterials();updateDashboard();toast('初期化しました')}};
cloudBoot();
