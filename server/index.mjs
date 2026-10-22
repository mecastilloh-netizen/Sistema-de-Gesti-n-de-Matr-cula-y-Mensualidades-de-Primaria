import {createServer} from 'node:http';
import {readFileSync, writeFileSync, renameSync, mkdirSync, existsSync} from 'node:fs';
import {join, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';
import {adminApi, fresh, calculateCharge, listPayments} from './domain.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const publicDir=join(root,'public');
const dataDir=process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(root,'data');
const dataFile=join(dataDir,'school.json');
const port=Number(process.env.PORT||3000);
const sessions=new Map(), attempts=new Map();
const error=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
const hashPassword=(password,salt=randomBytes(16).toString('hex'))=>({salt,hash:scryptSync(password,salt,64).toString('hex')});
const verifyPassword=(password,account)=>{const actual=scryptSync(password,account.salt,64),expected=Buffer.from(account.hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)};
const accountPublic=a=>({id:a.id,username:a.username,role:a.role,name:a.name,guardian_ids:a.role==='tutor'?a.guardian_ids:undefined});
const defaultAccounts=()=>[
  {id:1,username:'directora',role:'directora',name:'Directora',...hashPassword(process.env.DIRECTORA_PASSWORD||'Directora123!')},
  {id:2,username:'caja',role:'caja',name:'Administración y Caja',...hashPassword(process.env.CAJA_PASSWORD||'Caja12345!')}
];
mkdirSync(dataDir,{recursive:true});
let state=existsSync(dataFile)?JSON.parse(readFileSync(dataFile,'utf8')):{db:fresh(),accounts:defaultAccounts()};
state.db={...fresh(),...state.db};
function persist(){const tmp=`${dataFile}.tmp`;writeFileSync(tmp,JSON.stringify(state),{mode:0o600});renameSync(tmp,dataFile)}
if(!existsSync(dataFile))persist();
const store={read:()=>structuredClone(state.db),save:db=>{state.db=db;persist()}};
const json=(res,status,value)=>{const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body)};
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(part=>part.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2))}
function actor(req){const token=cookies(req).school_session;if(!token)return null;const session=sessions.get(createHash('sha256').update(token).digest('hex'));if(!session||session.expires<Date.now())return null;return state.accounts.find(a=>a.id===session.id)||null}
function sessionCookie(res,token,maxAge=28800){res.setHeader('Set-Cookie',`school_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`)}
function checkOrigin(req){if(!['POST','PUT','DELETE','PATCH'].includes(req.method))return;const origin=req.headers.origin;if(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)error('Origen no autorizado',403)}
async function body(req){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>16_000_000)error('Archivo demasiado grande',413);chunks.push(chunk)}if(!size)return {};try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{error('JSON no válido')}}
function linkedIds(a,db){const guardianIds=new Set(a.guardian_ids||[]);return new Set(db.guardians.filter(g=>guardianIds.has(g.id)).map(g=>g.student_id))}
function ownStudent(a,db,id){const n=Number(id);if(!Number.isInteger(n)||!linkedIds(a,db).has(n))error('Estudiante no disponible para esta cuenta',403);const student=db.students.find(s=>s.id===n);if(!student)error('Estudiante no encontrado',404);return student}
function tutorStudent(db,a,id){const student=ownStudent(a,db,id),sid=student.id,charges=db.charges.filter(c=>c.student_id===sid).map(c=>calculateCharge(db,c)),payments=listPayments(db).filter(p=>p.student_id===sid),documents=db.documents.filter(d=>d.student_id===sid).map(({file_data,...d})=>d),enrollments=db.enrollments.filter(e=>e.student_id===sid),guardians=db.guardians.filter(g=>g.student_id===sid).map(({identity_number,...g})=>g),discounts=db.discounts.filter(d=>charges.some(c=>c.id===d.charge_id));
  const totals=charges.reduce((t,c)=>({charged_cents:t.charged_cents+c.amount_cents,paid_cents:t.paid_cents+c.paid_cents,discount_cents:t.discount_cents+c.discount_cents,balance_cents:t.balance_cents+c.balance_cents}),{charged_cents:0,paid_cents:0,discount_cents:0,balance_cents:0});
  return {student,guardians,enrollments,documents,charges,payments,discounts,totals};
}
function tutorProfile(db,a){const linked=linkedIds(a,db),rows=db.guardians.filter(g=>a.guardian_ids.includes(g.id)&&linked.has(g.student_id));const g=rows[0];return {id:a.id,username:a.username,name:a.name||`${g?.names||''} ${g?.surnames||''}`.trim(),phone:g?.phone||'',email:g?.email||'',address:g?.address||'',relationships:[...new Set(rows.map(x=>x.relationship))],students:[...linked]}}
function notifications(data){const events=[];for(const item of data){const name=`${item.student.names} ${item.student.surnames}`,sid=item.student.id;
  for(const e of item.enrollments)events.push({type:'enrollment',label:e.status==='Activa'?'Matrícula registrada':'Prematrícula registrada',detail:name,student_id:sid,date:e.created_at||e.date});
  for(const p of item.payments){events.push({type:p.status==='Anulado'?'void':p.amount_cents<(item.charges.find(c=>c.id===p.charge_id)?.amount_cents||0)?'installment':'payment',label:p.status==='Anulado'?'Pago anulado':'Pago registrado',detail:name,student_id:sid,date:p.voided_at||p.paid_at,payment_id:p.id});if(p.status==='Válido')events.push({type:'receipt',label:'Comprobante disponible',detail:`${name} · #${p.id}`,student_id:sid,date:p.paid_at,payment_id:p.id})}
  for(const d of item.documents)if(d.status==='Pendiente')events.push({type:'document',label:'Documento pendiente',detail:`${name} · ${d.kind}`,student_id:sid,date:d.created_at||null});
  for(const d of item.discounts)events.push({type:'discount',label:'Descuento autorizado',detail:name,student_id:sid,date:d.authorized_at});
}return events.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,30)}
async function apiRequest(req,res,path,url){checkOrigin(req);const input=await body(req),a=actor(req);
  if(path==='/login'&&req.method==='POST'){
    const key=req.socket.remoteAddress||'local',entry=attempts.get(key)||{count:0,until:0};if(entry.until>Date.now())error('Espere unos minutos antes de volver a intentarlo',429);
    const account=state.accounts.find(x=>x.username===String(input.username||'').trim());if(!account||!verifyPassword(String(input.password||''),account)){entry.count++;entry.until=entry.count>=6?Date.now()+300000:0;attempts.set(key,entry);error('Usuario o contraseña incorrectos',401)}
    attempts.delete(key);const token=randomBytes(32).toString('hex');sessions.set(createHash('sha256').update(token).digest('hex'),{id:account.id,expires:Date.now()+28800000});sessionCookie(res,token);return accountPublic(account);
  }
  if(!a)error('Inicie sesión',401);
  if(path==='/me'&&req.method==='GET')return accountPublic(a);
  if(path==='/logout'&&req.method==='POST'){const token=cookies(req).school_session;if(token)sessions.delete(createHash('sha256').update(token).digest('hex'));sessionCookie(res,'',0);return {ok:true}}
  if(a.role==='tutor'){
    const db=state.db;
    if(path==='/tutor/overview'&&req.method==='GET'){const items=[...linkedIds(a,db)].map(id=>tutorStudent(db,a,id));return {profile:tutorProfile(db,a),students:items,notifications:notifications(items)}}
    let m=path.match(/^\/tutor\/students\/(\d+)$/);if(m&&req.method==='GET')return tutorStudent(db,a,m[1]);
    m=path.match(/^\/tutor\/documents\/(\d+)\/file$/);if(m&&req.method==='GET'){const d=db.documents.find(x=>x.id===Number(m[1]));if(!d)error('Archivo no encontrado',404);ownStudent(a,db,d.student_id);if(!d.file_data)error('Archivo no encontrado',404);return {name:d.file_name,type:d.file_type,size:d.file_size,data:d.file_data}}
    if(path==='/tutor/password'&&req.method==='POST'){if(!verifyPassword(String(input.current_password||''),a))error('La contraseña actual es incorrecta',400);const next=String(input.new_password||'');if(next.length<12||!/[A-Z]/.test(next)||!/[a-z]/.test(next)||!/[0-9]/.test(next))error('Use al menos 12 caracteres, mayúscula, minúscula y número');Object.assign(a,hashPassword(next));persist();return {ok:true}}
    error('Acceso denegado',403);
  }
  if(path==='/tutors'&&req.method==='GET')return state.accounts.filter(x=>x.role==='tutor').map(x=>({...accountPublic(x),students:[...linkedIds(x,state.db)]}));
  if(path==='/tutors'&&req.method==='POST'){
    const username=String(input.username||'').trim().toLowerCase(),password=String(input.password||''),ids=[...new Set((input.guardian_ids||[]).map(Number))];
    if(!/^[a-z0-9._-]{4,40}$/.test(username))error('El usuario debe tener entre 4 y 40 caracteres');if(state.accounts.some(x=>x.username===username))error('El usuario ya existe');if(password.length<12||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))error('Use al menos 12 caracteres, mayúscula, minúscula y número');if(!ids.length||ids.some(id=>!state.db.guardians.some(g=>g.id===id)))error('Seleccione responsables existentes');
    const first=state.db.guardians.find(g=>g.id===ids[0]);const account={id:Math.max(...state.accounts.map(x=>x.id))+1,username,role:'tutor',name:`${first.names} ${first.surnames}`,...hashPassword(password),guardian_ids:ids};state.accounts.push(account);persist();return accountPublic(account);
  }
  if(path==='/guardians'&&req.method==='GET')return state.db.guardians.map(g=>({...g,student_name:state.db.students.find(s=>s.id===g.student_id)?.names+' '+state.db.students.find(s=>s.id===g.student_id)?.surnames}));
  const result=adminApi(path+url.search,{method:req.method,body:input},a,store);
  if(path==='/demo/import'&&req.method==='POST'&&!state.accounts.some(x=>x.username==='marta.demo')){const ids=state.db.guardians.filter(g=>g.email==='marta.demo@example.com').map(g=>g.id);if(ids.length){state.accounts.push({id:Math.max(...state.accounts.map(x=>x.id))+1,username:'marta.demo',role:'tutor',name:'Marta López Demo',...hashPassword('TutorDemo123!'),guardian_ids:ids});persist()}}
  if(path==='/data/import'&&req.method==='POST'&&input.mode==='replace'){state.accounts=state.accounts.filter(x=>x.role!=='tutor');for(const [key,s] of sessions)if(!state.accounts.some(x=>x.id===s.id))sessions.delete(key);persist()}
  return result;
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local'),path=url.pathname;if(path.startsWith('/api/'))return json(res,200,await apiRequest(req,res,path.slice(4),url));if(req.method!=='GET')error('Método no permitido',405);const file=resolve(publicDir,`.${decodeURIComponent(path==='/'?'/index.html':path)}`);if(file!==publicDir&&!file.startsWith(publicDir+sep))error('Ruta no permitida',403);const content=readFileSync(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(content)}catch(e){const status=e.status||(/ENOENT/.test(e.code||'')?404:400);json(res,status,{error:e.message||'Error del servidor'})}});
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))server.listen(port,()=>console.log(`Sistema escolar: http://localhost:${port}`));
export {server};
