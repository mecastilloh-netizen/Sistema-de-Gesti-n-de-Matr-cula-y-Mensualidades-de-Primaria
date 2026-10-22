export const fresh=()=>({demo:false,students:[],guardians:[],enrollments:[],documents:[],charges:[],discounts:[],payments:[],activity:[]});
const id=rows=>Math.max(0,...rows.map(x=>x.id))+1;
const fail=m=>{throw Error(m)};
const req=(v,label)=>{if(typeof v!=='string'||!v.trim())fail(`${label} es obligatorio`);return v.trim()};
const int=(v,label,min,max)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)fail(`${label} no es válido`);return n};
const cents=(v,label='Monto')=>{const s=String(v);if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s)||Number(s)<=0)fail(`${label} debe ser positivo y tener hasta dos decimales`);return Math.round(Number(s)*100)};
const date=(v,label)=>{const d=typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?new Date(`${v}T12:00:00Z`):null;if(!d||Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==v)fail(`${label} no es válida`);return v};
const now=()=>new Date().toISOString();
const student=(db,n)=>{const s=db.students.find(x=>x.id===Number(n));if(!s)fail('Estudiante no encontrado');return s};
const name=(db,n)=>{const s=student(db,n);return `${s.names} ${s.surnames}`};
const activity=(db,label,detail)=>db.activity.push({id:id(db.activity),label,detail,created_at:now()});
const charge=(db,c)=>{const d=db.discounts.find(x=>x.charge_id===c.id),paid_cents=db.payments.filter(p=>p.charge_id===c.id&&p.status==='Válido').reduce((a,p)=>a+p.amount_cents,0),discount_cents=d?.discount_cents||0;return {...c,paid_cents,discount_cents,discount_reason:d?.reason||null,balance_cents:Math.max(0,c.amount_cents-paid_cents-discount_cents)}};
const charges=(db,n)=>db.charges.filter(c=>c.student_id===Number(n)).map(c=>charge(db,c)).sort((a,b)=>b.school_year-a.school_year||a.concept.localeCompare(b.concept)||(a.month||0)-(b.month||0));
const payments=db=>db.payments.slice().reverse().map(p=>{const c=db.charges.find(x=>x.id===p.charge_id);return {...p,student_id:c.student_id,concept:c.concept,month:c.month,school_year:c.school_year,student_name:name(db,c.student_id),created_by_name:p.created_by,voided_by_name:p.voided_by}});
export const calculateCharge=charge;
export const listPayments=payments;
function guardian(g){const x={names:req(g.names,'Nombre del responsable'),surnames:req(g.surnames,'Apellido del responsable'),relationship:req(g.relationship,'Parentesco'),phone:req(g.phone,'Teléfono'),address:req(g.address,'Dirección del responsable'),email:g.email?.trim()||null,identity_number:g.identity_number?.trim()||null};if(x.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))fail('Correo no válido');return x}
function studentData(body){if(!Array.isArray(body.guardians)||!body.guardians.length)fail('Agregue al menos un responsable');body.guardians.forEach(guardian);const s=body.student||body,x={names:req(s.names,'Nombres'),surnames:req(s.surnames,'Apellidos'),birth_date:date(s.birth_date,'Fecha de nacimiento'),sex:req(s.sex,'Sexo'),address:req(s.address,'Dirección'),grade:int(s.grade,'Grado',1,6),school_year:int(s.school_year,'Año lectivo',2020,2100),status:req(s.status||'Activo','Estado')};if(!['Femenino','Masculino','Otro'].includes(x.sex)||!['Activo','Inactivo'].includes(x.status))fail('Sexo o estado no válido');return x}
function enrollmentCharge(db,e,amount_cents){if(db.charges.some(c=>c.student_id===e.student_id&&c.concept==='Matrícula'&&c.school_year===e.school_year))fail('Ya existe un cargo de matrícula para ese año');db.charges.push({id:id(db.charges),student_id:e.student_id,enrollment_id:e.id,concept:'Matrícula',month:null,school_year:e.school_year,amount_cents,created_at:now()});Object.assign(student(db,e.student_id),{grade:e.grade,school_year:e.school_year})}

const demoTables=['students','guardians','enrollments','documents','charges','discounts','payments','activity'];
const fileExtensions={'application/pdf':['pdf'],'image/png':['png'],'image/jpeg':['jpg','jpeg'],'text/plain':['txt']};
function validateAttachment(file){
  const file_name=req(file.file_name,'Nombre del archivo').split(/[\\/]/).pop(),file_type=req(file.file_type,'Tipo del archivo'),file_size=int(file.file_size,'Tamaño del archivo',1,750000);
  if(!fileExtensions[file_type]?.includes(file_name.split('.').pop().toLowerCase()))fail('Use un archivo PDF, PNG, JPG o TXT');
  const prefix=`data:${file_type};base64,`,data=req(file.file_data,'Archivo');
  if(!data.startsWith(prefix)||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.slice(prefix.length))||atob(data.slice(prefix.length)).length!==file_size)fail('El contenido del archivo no es válido');
  return {file_name,file_type,file_size,file_data:data};
}
function validateDemoData(sample){
  if(sample?.version!==1||demoTables.some(table=>!Array.isArray(sample[table])))fail('El archivo de ejemplo no tiene el formato esperado');
  for(const table of demoTables){const ids=sample[table].map(row=>row.id);if(ids.some(n=>!Number.isInteger(n)||n<1)||new Set(ids).size!==ids.length)fail(`Identificadores inválidos en ${table}`)}
  if(!sample.students.length)fail('El archivo no contiene estudiantes');
  for(const s of sample.students){req(s.names,'Nombres');req(s.surnames,'Apellidos');date(s.birth_date,'Fecha de nacimiento');int(s.grade,'Grado',1,6);int(s.school_year,'Año lectivo',2020,2100);if(!['Activo','Inactivo'].includes(s.status))fail('Estado de estudiante no válido')}
  for(const g of sample.guardians){if(!sample.students.some(s=>s.id===g.student_id))fail('Responsable sin estudiante');guardian(g)}
  for(const s of sample.students)if(!sample.guardians.some(g=>g.student_id===s.id))fail('Cada estudiante necesita al menos un responsable');
  const active=new Set();
  for(const e of sample.enrollments){if(!sample.students.some(s=>s.id===e.student_id)||!['Prematrícula','Activa'].includes(e.status))fail('Matrícula no válida');int(e.grade,'Grado',1,6);int(e.school_year,'Año lectivo',2020,2100);date(e.date,'Fecha de matrícula');if(e.status==='Activa'){const key=`${e.student_id}:${e.school_year}`;if(active.has(key))fail('Matrículas activas duplicadas');active.add(key)}}
  const documentKeys=new Set();
  for(const d of sample.documents){if(!sample.students.some(s=>s.id===d.student_id)||!['Entregado','Pendiente','No requerido'].includes(d.status))fail('Documento no válido');const key=`${d.student_id}:${d.kind}`;if(documentKeys.has(key))fail('Documentos duplicados');documentKeys.add(key);if(d.file_data)validateAttachment(d)}
  const chargeKeys=new Set();
  for(const c of sample.charges){if(!sample.students.some(s=>s.id===c.student_id)||!Number.isInteger(c.amount_cents)||c.amount_cents<=0||!['Matrícula','Mensualidad'].includes(c.concept))fail('Cargo no válido');int(c.school_year,'Año lectivo',2020,2100);if(c.month!==null)int(c.month,'Mes',1,12);if(c.enrollment_id!==null&&!sample.enrollments.some(e=>e.id===c.enrollment_id&&e.student_id===c.student_id))fail('Cargo sin matrícula');const key=`${c.student_id}:${c.concept}:${c.month||0}:${c.school_year}`;if(chargeKeys.has(key))fail('Cargos duplicados');chargeKeys.add(key)}
  for(const p of sample.payments)if(!sample.charges.some(c=>c.id===p.charge_id)||!Number.isInteger(p.amount_cents)||p.amount_cents<=0||!['Válido','Anulado'].includes(p.status))fail('Pago no válido');
  const discounted=new Set();
  for(const d of sample.discounts){const c=sample.charges.find(c=>c.id===d.charge_id);if(!c||!Number.isInteger(d.discount_cents)||d.discount_cents<0||d.discount_cents>c.amount_cents||discounted.has(d.charge_id))fail('Descuento no válido');discounted.add(d.charge_id)}
  for(const c of sample.charges)if(charge(sample,c).balance_cents!==c.amount_cents-(sample.discounts.find(d=>d.charge_id===c.id)?.discount_cents||0)-sample.payments.filter(p=>p.charge_id===c.id&&p.status==='Válido').reduce((sum,p)=>sum+p.amount_cents,0))fail('Los pagos del ejemplo exceden un cargo');
}
function normalizeFile(file){
  if(file?.format==='gestion-matriculas-primaria'&&file.version===1)return file.data;
  if(file?.version===1&&Array.isArray(file.students))return file;
  fail('Seleccione un JSON exportado por este sistema o el archivo de ejemplo');
}
function appendDataset(db,source){
  const existing=new Set(db.students.map(s=>`${s.names} ${s.surnames} ${s.birth_date}`.toLocaleLowerCase('es')));
  for(const s of source.students)if(existing.has(`${s.names} ${s.surnames} ${s.birth_date}`.toLocaleLowerCase('es')))fail(`El estudiante ${s.names} ${s.surnames} ya existe. No se importó ningún registro.`);
  const maps=Object.fromEntries(demoTables.map(table=>[table,new Map()]));
  for(const table of demoTables){let next=id(db[table]);for(const row of source[table])maps[table].set(row.id,next++)}
  const remap=(table,n)=>n===null||n===undefined?null:maps[table].get(n);
  db.students.push(...source.students.map(s=>({...s,id:remap('students',s.id)})));
  db.guardians.push(...source.guardians.map(g=>({...g,id:remap('guardians',g.id),student_id:remap('students',g.student_id)})));
  db.enrollments.push(...source.enrollments.map(e=>({...e,id:remap('enrollments',e.id),student_id:remap('students',e.student_id)})));
  db.documents.push(...source.documents.map(d=>({...d,id:remap('documents',d.id),student_id:remap('students',d.student_id)})));
  db.charges.push(...source.charges.map(c=>({...c,id:remap('charges',c.id),student_id:remap('students',c.student_id),enrollment_id:remap('enrollments',c.enrollment_id)})));
  db.discounts.push(...source.discounts.map(d=>({...d,id:remap('discounts',d.id),charge_id:remap('charges',d.charge_id)})));
  db.payments.push(...source.payments.map(p=>({...p,id:remap('payments',p.id),charge_id:remap('charges',p.charge_id)})));
  db.activity.push(...source.activity.map(a=>({...a,id:remap('activity',a.id)})));
}

export function adminApi(path,options={},actor,store){
  if(!actor||actor.role==='tutor')fail('Acceso denegado');
  const user=()=>actor, director=()=>{if(actor.role!=='directora')fail('Solo la directora puede realizar esta acción')};
  const method=options.method||'GET',b=options.body||{},url=new URL(path,'http://local.demo'),route=url.pathname;
  const db=store.read(),done=result=>{store.save(db);return result};let m;
  if(route==='/data/summary'&&method==='GET')return {students:db.students.length,guardians:db.guardians.length,enrollments:db.enrollments.length,documents:db.documents.length,files:db.documents.filter(d=>d.file_data).length,charges:db.charges.length,payments:db.payments.length,discounts:db.discounts.length};
  if(route==='/data/export'&&method==='GET')return {format:'gestion-matriculas-primaria',version:1,exported_at:now(),data:{version:1,demo:Boolean(db.demo),...Object.fromEntries(demoTables.map(table=>[table,db[table]]))}};
  if(route==='/data/import'&&method==='POST'){
    const mode=req(b.mode,'Modo');if(!['append','replace'].includes(mode))fail('Modo de importación no válido');
    const source=normalizeFile(b.file);validateDemoData(source);
    if(mode==='replace'){for(const table of demoTables)db[table]=source[table].map(row=>({...row}));db.demo=Boolean(source.demo)}
    else{appendDataset(db,source);db.demo=Boolean(db.demo||source.demo)}
    activity(db,'Archivo de datos importado',`${source.students.length} estudiantes · ${mode==='replace'?'reemplazo':'agregados'}`);
    return done({students:source.students.length,total_students:db.students.length,mode});
  }
  if(route==='/demo/import'&&method==='POST'){
    if(demoTables.some(table=>db[table].length))fail('Los datos de ejemplo solo pueden cargarse cuando no hay registros. Sus datos actuales se conservaron.');
    validateDemoData(b);
    for(const table of demoTables)db[table]=b[table].map(row=>({...row}));
    db.demo=true;
    activity(db,'Datos de demostración cargados',`${db.students.length} estudiantes · pagos y saldos de ejemplo`);
    return done({students:db.students.length,charges:db.charges.length,payments:db.payments.length});
  }
  if(route==='/dashboard'&&method==='GET'){const year=Number(url.searchParams.get('year'))||yearNow(),valid=db.payments.filter(p=>p.status==='Válido');return {demo:db.demo,stats:{students:db.students.length,enrollments:db.enrollments.filter(e=>e.status==='Activa'&&e.school_year===year).length,payments_cents:valid.filter(p=>p.paid_at.slice(0,7)===now().slice(0,7)).reduce((a,p)=>a+p.amount_cents,0),documents:db.documents.filter(d=>d.status==='Pendiente').length},monthly:Array.from({length:12},(_,i)=>({month:i+1,amount_cents:valid.filter(p=>new Date(p.paid_at).getFullYear()===year&&new Date(p.paid_at).getMonth()===i).reduce((a,p)=>a+p.amount_cents,0)})),activity:db.activity.slice(-6).reverse()}}
  if(route==='/students'&&method==='GET')return db.students.slice().reverse();
  if(route==='/students'&&method==='POST'){const data=studentData(b),n=id(db.students);db.students.push({id:n,...data,created_at:now()});db.guardians.push(...b.guardians.map((g,i)=>({id:id(db.guardians)+i,student_id:n,...guardian(g)})));['Partida de nacimiento','Identificación del responsable','Notas del grado anterior','Documento de traslado','Epicrisis'].forEach((kind,i)=>db.documents.push({id:id(db.documents),student_id:n,kind,status:i>=3?'No requerido':'Pendiente',delivered_at:null,notes:''}));activity(db,'Estudiante registrado',name(db,n));return done({id:n})}
  m=route.match(/^\/students\/(\d+)$/);
  if(m&&method==='GET'){const s=student(db,m[1]);return {...s,guardians:db.guardians.filter(g=>g.student_id===s.id)}}
  if(m&&method==='PUT'){const s=student(db,m[1]);Object.assign(s,studentData(b));const old=db.guardians.filter(g=>g.student_id===s.id),used=new Set();let next=id(db.guardians);const updated=b.guardians.map(g=>{const clean=guardian(g),match=old.find(o=>!used.has(o.id)&&((clean.identity_number&&o.identity_number===clean.identity_number)||(clean.email&&o.email?.toLowerCase()===clean.email.toLowerCase())||(o.names===clean.names&&o.surnames===clean.surnames&&o.phone===clean.phone)));if(match)used.add(match.id);return {id:match?.id||next++,student_id:s.id,...clean}});db.guardians=db.guardians.filter(g=>g.student_id!==s.id);db.guardians.push(...updated);activity(db,'Estudiante actualizado',name(db,s.id));return done({id:s.id})}
  if(route==='/enrollments'&&method==='GET')return db.enrollments.slice().reverse().map(e=>({...e,student_name:name(db,e.student_id)}));
  if(route==='/enrollments'&&method==='POST'){const student_id=int(b.student_id,'Estudiante',1,1e9),grade=int(b.grade,'Grado',1,6),school_year=int(b.school_year,'Año lectivo',2020,2100),when=date(b.date,'Fecha'),status=req(b.status,'Tipo');student(db,student_id);if(!['Prematrícula','Activa'].includes(status))fail('Tipo no válido');if(status==='Activa'&&db.enrollments.some(e=>e.student_id===student_id&&e.school_year===school_year&&e.status==='Activa'))fail('Ya existe una matrícula activa para ese año');const amount=status==='Activa'?cents(b.enrollment_amount,'Monto de matrícula'):null,e={id:id(db.enrollments),student_id,grade,school_year,date:when,status,created_at:now()};if(amount)enrollmentCharge(db,e,amount);db.enrollments.push(e);activity(db,`${status} registrada`,name(db,student_id));return done({id:e.id})}
  m=route.match(/^\/enrollments\/(\d+)\/confirm$/);
  if(m&&method==='POST'){const e=db.enrollments.find(x=>x.id===Number(m[1]));if(!e)fail('Prematrícula no encontrada');if(e.status!=='Prematrícula')fail('La matrícula ya está confirmada');if(db.enrollments.some(x=>x.id!==e.id&&x.student_id===e.student_id&&x.school_year===e.school_year&&x.status==='Activa'))fail('Ya existe una matrícula activa para ese año');enrollmentCharge(db,e,cents(b.enrollment_amount,'Monto de matrícula'));e.status='Activa';activity(db,'Matrícula confirmada',name(db,e.student_id));return done({ok:true})}
  m=route.match(/^\/students\/(\d+)\/documents$/);if(m&&method==='GET'){student(db,m[1]);return db.documents.filter(d=>d.student_id===Number(m[1])).map(({file_data,...d})=>d)}
  m=route.match(/^\/documents\/(\d+)\/file$/);
  if(m&&method==='GET'){const d=db.documents.find(x=>x.id===Number(m[1]));if(!d||!d.file_data)fail('Archivo no encontrado');return {name:d.file_name,type:d.file_type,size:d.file_size,data:d.file_data}}
  if(m&&method==='POST'){
    const d=db.documents.find(x=>x.id===Number(m[1]));if(!d)fail('Documento no encontrado');
    const file=validateAttachment(b);
    Object.assign(d,{...file,status:'Entregado',delivered_at:today()});
    activity(db,'Documento importado',`${d.kind} · ${name(db,d.student_id)}`);return done({ok:true,name:file.file_name});
  }
  if(m&&method==='DELETE'){const d=db.documents.find(x=>x.id===Number(m[1]));if(!d||!d.file_data)fail('Archivo no encontrado');delete d.file_name;delete d.file_type;delete d.file_size;delete d.file_data;d.status='Pendiente';d.delivered_at=null;activity(db,'Archivo retirado',`${d.kind} · ${name(db,d.student_id)}`);return done({ok:true})}
  m=route.match(/^\/documents\/(\d+)$/);if(m&&method==='PUT'){const d=db.documents.find(x=>x.id===Number(m[1]));if(!d)fail('Documento no encontrado');const status=req(b.status,'Estado');if(!['Entregado','Pendiente','No requerido'].includes(status))fail('Estado no válido');Object.assign(d,{status,delivered_at:status==='Entregado'?date(b.delivered_at,'Fecha de entrega'):null,notes:String(b.notes||'').trim()});activity(db,'Documento actualizado',`${d.kind} · ${name(db,d.student_id)}`);return done({ok:true})}
  if(route==='/charges/all'&&method==='GET'){
    let rows=db.charges.map(c=>{const item=charge(db,c);return {...item,student_name:name(db,c.student_id),status:item.balance_cents===0?'Pagado':item.paid_cents>0?'Abono':'Pendiente'}}).reverse();
    const q=url.searchParams.get('q'),month=url.searchParams.get('month'),concept=url.searchParams.get('concept');
    if(q)rows=rows.filter(c=>c.student_name.toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es')));
    if(month)rows=rows.filter(c=>c.month===Number(month));
    if(concept)rows=rows.filter(c=>c.concept===concept);
    return rows;
  }
  if(route==='/charges'&&method==='GET'){const n=int(url.searchParams.get('student_id'),'Estudiante',1,1e9);student(db,n);return charges(db,n)}
  if(route==='/charges'&&method==='POST'){const student_id=int(b.student_id,'Estudiante',1,1e9),school_year=int(b.school_year,'Año lectivo',2020,2100),month=int(b.month,'Mes',1,12),amount_cents=cents(b.amount);student(db,student_id);if(!db.enrollments.some(e=>e.student_id===student_id&&e.school_year===school_year&&e.status==='Activa'))fail('El estudiante requiere matrícula activa para ese año');if(db.charges.some(c=>c.student_id===student_id&&c.concept==='Mensualidad'&&c.month===month&&c.school_year===school_year))fail('La mensualidad ya fue registrada');const n=id(db.charges);db.charges.push({id:n,student_id,enrollment_id:null,concept:'Mensualidad',month,school_year,amount_cents,created_at:now()});activity(db,'Mensualidad creada',name(db,student_id));return done({id:n})}
  if(route==='/payments'&&method==='GET'){let rows=payments(db);const q=url.searchParams.get('q'),month=url.searchParams.get('month'),concept=url.searchParams.get('concept'),student_id=url.searchParams.get('student_id');if(q)rows=rows.filter(p=>p.student_name.toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es')));if(month)rows=rows.filter(p=>p.month===Number(month));if(concept)rows=rows.filter(p=>p.concept===concept);if(student_id)rows=rows.filter(p=>p.student_id===Number(student_id));return rows}
  if(route==='/payments'&&method==='POST'){const charge_id=int(b.charge_id,'Cargo',1,1e9),amount_cents=cents(b.amount,'Abono'),raw=db.charges.find(c=>c.id===charge_id);if(!raw)fail('Cargo no encontrado');const c=charge(db,raw);if(amount_cents>c.balance_cents)fail('El abono supera el saldo pendiente');const n=id(db.payments);db.payments.push({id:n,charge_id,amount_cents,paid_at:now(),created_by:user().username,status:'Válido',void_reason:null,voided_at:null,voided_by:null});activity(db,'Pago registrado',name(db,c.student_id));return done({id:n})}
  m=route.match(/^\/payments\/(\d+)\/void$/);if(m&&method==='POST'){director();const reason=req(b.reason,'Motivo');if(reason.length<5)fail('Explique el motivo de la anulación');const p=db.payments.find(x=>x.id===Number(m[1]));if(!p)fail('Pago no encontrado');if(p.status==='Anulado')fail('El pago ya está anulado');Object.assign(p,{status:'Anulado',void_reason:reason,voided_at:now(),voided_by:user().username});activity(db,'Pago anulado',`Comprobante #${p.id}`);return done({ok:true})}
  if(route==='/discounts'&&method==='GET'){director();return db.discounts.slice().reverse().map(d=>{const c=db.charges.find(x=>x.id===d.charge_id);return {...d,student_id:c.student_id,concept:c.concept,month:c.month,student_name:name(db,c.student_id)}})}
  if(route==='/discounts'&&method==='POST'){director();const charge_id=int(b.charge_id,'Cargo',1,1e9),percent=int(b.percent,'Porcentaje',1,100),reason=req(b.reason,'Motivo'),basis=req(b.basis,'Base del descuento');if(!['Monto original del cargo','Saldo pendiente del cargo'].includes(basis))fail('Base del descuento no válida');const raw=db.charges.find(c=>c.id===charge_id);if(!raw)fail('Cargo no encontrado');if(db.discounts.some(d=>d.charge_id===charge_id))fail('El cargo ya tiene un descuento');const c=charge(db,raw),base=basis==='Saldo pendiente del cargo'?c.balance_cents:c.amount_cents,discount_cents=Math.round(base*percent/100),final_cents=c.amount_cents-discount_cents;if(c.paid_cents>final_cents)fail('El descuento dejaría pagos mayores al monto final');const n=id(db.discounts);db.discounts.push({id:n,charge_id,reason,percent,basis,original_cents:c.amount_cents,discount_cents,final_cents,authorized_by:user().username,authorized_at:now()});activity(db,'Descuento autorizado',name(db,c.student_id));return done({id:n})}
  m=route.match(/^\/students\/(\d+)\/account$/);if(m&&method==='GET'){const s=student(db,m[1]),rows=charges(db,s.id),totals=rows.reduce((a,c)=>({charged_cents:a.charged_cents+c.amount_cents,discount_cents:a.discount_cents+c.discount_cents,paid_cents:a.paid_cents+c.paid_cents,balance_cents:a.balance_cents+c.balance_cents}),{charged_cents:0,discount_cents:0,paid_cents:0,balance_cents:0});return {student:s,charges:rows,payments:payments(db).filter(p=>p.student_id===s.id),totals}}
  fail('Función no disponible');
}
export const money=cents=>`C$ ${(Number(cents||0)/100).toLocaleString('es-NI',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const yearNow=()=>new Date().getFullYear();
export const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const grade=n=>`${n}° de Primaria`;
export const icon=(name,size=20)=>`<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
export const option=(value,label,selected)=>`<option value="${escape(value)}" ${String(value)===String(selected)?'selected':''}>${escape(label)}</option>`;
export function notify(title,text='',kind='success'){if(window.Swal)return Swal.fire({icon:kind,title,text,confirmButtonColor:'#1069e8'});alert(`${title}${text?`\n${text}`:''}`)}
export async function confirmAction(title,text,confirmButtonText='Confirmar'){if(window.Swal)return (await Swal.fire({title,text,icon:'question',showCancelButton:true,confirmButtonText,cancelButtonText:'Cancelar',confirmButtonColor:'#1069e8'})).isConfirmed;return confirm(`${title}\n${text}`)}
