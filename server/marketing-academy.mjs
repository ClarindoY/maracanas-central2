import {ACADEMY_TIPS} from '../shared/marketing-academy.mjs';
import {fail} from './workspace.mjs';
export function openMarketingAcademy({auth,profile}){
 const db=auth.db;db.exec('CREATE TABLE IF NOT EXISTS marketing_academy_favorites(user_id TEXT NOT NULL REFERENCES users(id),tip_id TEXT NOT NULL,PRIMARY KEY(user_id,tip_id))');
 function academy(u,dnaId='default'){
 const dna=profile(u,dnaId),favorite=new Set(db.prepare('SELECT tip_id FROM marketing_academy_favorites WHERE user_id=?').all(u.id).map(r=>r.tip_id));
 const counts=new Map();for(const row of db.prepare('SELECT brief FROM marketing_contents WHERE user_id=?').all(u.id)){const b=JSON.parse(row.brief);if((b.dna?.id||'default')!==dna.id)continue;for(const name of new Set(b.techniques||[]))counts.set(name,(counts.get(name)||0)+1);}
 return ACADEMY_TIPS.map(t=>({id:t.id,favorite:favorite.has(t.id),uses:counts.get(t.title)||0}));
 }
 return {academy,saveAcademyFavorite(u,b){if(!ACADEMY_TIPS.some(t=>t.id===b.id)||typeof b.favorite!=='boolean')fail(400,'Favorito inválido.');profile(u,b.dnaId??'default');if(b.favorite)db.prepare('INSERT OR IGNORE INTO marketing_academy_favorites VALUES(?,?)').run(u.id,b.id);else db.prepare('DELETE FROM marketing_academy_favorites WHERE user_id=? AND tip_id=?').run(u.id,b.id);return academy(u,b.dnaId??'default');}};
}
