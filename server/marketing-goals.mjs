import {fail} from './workspace.mjs';
const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const shift=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export function openMarketingGoals({auth,profile,now=()=>Date.now()}){
 const db=auth.db;
 db.exec('CREATE TABLE IF NOT EXISTS marketing_goals(user_id TEXT NOT NULL,dna_id TEXT NOT NULL,weekly INTEGER NOT NULL,monthly INTEGER NOT NULL,PRIMARY KEY(user_id,dna_id));CREATE TABLE IF NOT EXISTS marketing_publications(content_id TEXT PRIMARY KEY REFERENCES marketing_contents(id) ON DELETE CASCADE,user_id TEXT NOT NULL,dna_id TEXT NOT NULL,published_at TEXT NOT NULL)');
 function record(u,content){
  const id=content.brief.dna?.id||'default';
  db.prepare('INSERT OR IGNORE INTO marketing_publications VALUES(?,?,?,?)').run(content.id,u.id,id,new Date(now()).toISOString());
 }
 function goals(u,dnaId='default'){
  const dna=profile(u,dnaId),today=day(now()),weekday=new Date(today+'T12:00:00Z').getUTCDay(),weekStart=shift(today,-((weekday+6)%7)),month=today.slice(0,7);
  const targets=db.prepare('SELECT weekly,monthly FROM marketing_goals WHERE user_id=? AND dna_id=?').get(u.id,dna.id)||{weekly:3,monthly:20};
  const rows=db.prepare("SELECT c.id,c.brief,c.created,c.status,p.published_at FROM marketing_contents c LEFT JOIN marketing_publications p ON p.content_id=c.id AND p.user_id=c.user_id WHERE c.user_id=? AND COALESCE(json_extract(c.brief,'$.dna.id'),'default')=?").all(u.id,dna.id);
  const published=rows.filter(r=>r.status==='Publicado'&&r.published_at).map(r=>({...r,date:day(r.published_at),format:JSON.parse(r.brief).format}));
  const week=published.filter(r=>r.date>=weekStart&&r.date<=today),monthly=published.filter(r=>r.date.startsWith(month)&&r.date<=today),days=new Set(published.map(r=>r.date));
  let cursor=days.has(today)?today:shift(today,-1),streak=0;while(days.has(cursor)){streak++;cursor=shift(cursor,-1);}
  const totalDays=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0)).getUTCDate(),elapsed=Number(today.slice(8)),remaining=totalDays-elapsed+1,expected=Math.floor(targets.monthly*elapsed/totalDays);
  return {targets:{...targets},today,weekStart,weekly:{published:week.length,created:rows.filter(r=>day(r.created)>=weekStart&&day(r.created)<=today).length},monthly:{published:monthly.length,days:new Set(monthly.map(r=>r.date)).size,remainingDays:remaining,expected,byFormat:Object.fromEntries(['Carrossel','Tweet / post curto','Roteiro de Reels','Stories','Legenda'].map(f=>[f,monthly.filter(r=>r.format===f).length]))},streak,undated:rows.filter(r=>r.status==='Publicado'&&!r.published_at).length};
 }
 function saveGoals(u,b){const dna=profile(u,b.dnaId||'default');if(!Number.isInteger(b.weekly)||b.weekly<1||b.weekly>100||!Number.isInteger(b.monthly)||b.monthly<1||b.monthly>1000)fail(400,'Use uma meta semanal de 1 a 100 e mensal de 1 a 1.000.');db.prepare('INSERT INTO marketing_goals VALUES(?,?,?,?) ON CONFLICT(user_id,dna_id) DO UPDATE SET weekly=excluded.weekly,monthly=excluded.monthly').run(u.id,dna.id,b.weekly,b.monthly);auth.audit(u.id,'Metas Marketing atualizadas: '+dna.id);return goals(u,dna.id);}
 return {goals,saveGoals,record};
}
