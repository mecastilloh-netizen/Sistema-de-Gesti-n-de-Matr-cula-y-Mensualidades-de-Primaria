import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const memory = () => { const data = new Map(); return { getItem:key => data.get(key) ?? null, setItem:(key,value) => data.set(key,String(value)), removeItem:key => data.delete(key) }; };
globalThis.localStorage = memory();
globalThis.sessionStorage = memory();
const { api } = await import('../public/js/api.js');

test('los textos de la interfaz están guardados en UTF-8 correcto', () => {
  for (const path of ['public/index.html','public/js/app.js','public/js/api.js','README.md']) {
    const content = readFileSync(path,'utf8');
    assert.doesNotMatch(content,/Ã.|Â.|â..|ð...|�/u,path);
  }
  assert.match(readFileSync('public/js/app.js','utf8'),/Sistema de Gestión de Matrícula y Mensualidades de Primaria/);
});

test('versión local: matrícula, abonos, descuentos y roles', async () => {
  await api('/login',{method:'POST',body:{username:'caja',password:'Caja12345!'}});
  const result = await api('/students',{method:'POST',body:{student:{names:'Ana',surnames:'López',birth_date:'2018-05-04',sex:'Femenino',address:'Managua',grade:4,school_year:2026,status:'Activo'},guardians:[{names:'Marta',surnames:'López',relationship:'Madre',phone:'88888888',address:'Managua'},{names:'José',surnames:'López',relationship:'Padre',phone:'77777777',address:'Managua'}]}});
  const studentId=result.id;
  assert.equal((await api(`/students/${studentId}`)).guardians.length,2);
  const enrollment={student_id:studentId,grade:4,school_year:2026,date:'2026-01-10',status:'Activa',enrollment_amount:800};
  await api('/enrollments',{method:'POST',body:enrollment});
  await assert.rejects(api('/enrollments',{method:'POST',body:enrollment}),/matrícula activa/);
  await api('/charges',{method:'POST',body:{student_id:studentId,school_year:2026,month:3,amount:500.29}});
  const c=(await api(`/charges?student_id=${studentId}`)).find(x=>x.concept==='Mensualidad');
  assert.equal(c.balance_cents,50029);
  const p=await api('/payments',{method:'POST',body:{charge_id:c.id,amount:200.10}});
  assert.equal((await api(`/students/${studentId}/account`)).charges.find(x=>x.id===c.id).balance_cents,30019);
  await assert.rejects(api('/payments',{method:'POST',body:{charge_id:c.id,amount:301}}),/supera/);
  await assert.rejects(api(`/payments/${p.id}/void`,{method:'POST',body:{reason:'Error de caja'}}),/directora/);
  await api('/logout',{method:'POST'});
  await api('/login',{method:'POST',body:{username:'directora',password:'Directora123!'}});
  await api(`/payments/${p.id}/void`,{method:'POST',body:{reason:'Error de caja'}});
  assert.equal((await api(`/students/${studentId}/account`)).charges.find(x=>x.id===c.id).balance_cents,50029);
  await api('/discounts',{method:'POST',body:{charge_id:c.id,reason:'Hermanos',percent:10,basis:'Monto original del cargo'}});
  assert.equal((await api(`/students/${studentId}/account`)).charges.find(x=>x.id===c.id).balance_cents,45026);
});
