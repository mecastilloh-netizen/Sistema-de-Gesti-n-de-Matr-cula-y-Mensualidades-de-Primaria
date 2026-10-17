import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const memory = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
};
globalThis.localStorage = memory();
globalThis.sessionStorage = memory();
const { api } = await import("../public/js/api.js");
const { chartBarPercent, findCashStudents } = await import("../public/js/ui-utils.js");

test("los textos de la interfaz están guardados en UTF-8 correcto", () => {
  for (const path of [
    "public/index.html",
    "public/js/app.js",
    "public/js/api.js",
    "README.md",
  ]) {
    const content = readFileSync(path, "utf8");
    assert.doesNotMatch(content, /Ã.|Â.|â..|ð...|�/u, path);
  }
  assert.match(
    readFileSync("public/js/app.js", "utf8"),
    /Sistema de Gestión de Matrícula y Mensualidades de Primaria/,
  );
});

test("la búsqueda de Caja encuentra por nombre y código, e informa el límite", () => {
  const students = Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    names: index === 0 ? "María Elena" : `Alumno ${index + 1}`,
    surnames: index === 0 ? "Rodríguez" : "Prueba",
  }));
  assert.equal(findCashStudents(students, "MARÍA").matches[0].id, 1);
  assert.equal(findCashStudents(students, "est-0002").matches[0].id, 2);
  assert.equal(findCashStudents(students, "no existe").matches.length, 0);
  assert.equal(findCashStudents(students, "").matches.length, 0);
  const limited = findCashStudents(students, "alumno");
  assert.equal(limited.shown.length, 6);
  assert.equal(limited.remaining, 1);
});

test("el gráfico usa una escala común y conserva proporciones", () => {
  assert.equal(chartBarPercent(0, 1000), 0);
  assert.equal(chartBarPercent(500, 1000), 50);
  assert.equal(chartBarPercent(1000, 1000), 100);
  assert.equal(chartBarPercent(200, 0), 0);
});

test("versión local: matrícula, abonos, descuentos y roles", async () => {
  await api("/login", {
    method: "POST",
    body: { username: "caja", password: "Caja12345!" },
  });
  const result = await api("/students", {
    method: "POST",
    body: {
      student: {
        names: "Ana",
        surnames: "López",
        birth_date: "2018-05-04",
        sex: "Femenino",
        address: "Managua",
        grade: 4,
        school_year: 2026,
        status: "Activo",
      },
      guardians: [
        {
          names: "Marta",
          surnames: "López",
          relationship: "Madre",
          phone: "88888888",
          address: "Managua",
        },
        {
          names: "José",
          surnames: "López",
          relationship: "Padre",
          phone: "77777777",
          address: "Managua",
        },
      ],
    },
  });
  const studentId = result.id;
  assert.equal((await api(`/students/${studentId}`)).guardians.length, 2);
  const enrollment = {
    student_id: studentId,
    grade: 4,
    school_year: 2026,
    date: "2026-01-10",
    status: "Activa",
    enrollment_amount: 800,
  };
  await api("/enrollments", { method: "POST", body: enrollment });
  await assert.rejects(
    api("/enrollments", { method: "POST", body: enrollment }),
    /matrícula activa/,
  );
  await api("/charges", {
    method: "POST",
    body: {
      student_id: studentId,
      school_year: 2026,
      month: 3,
      amount: 500.29,
    },
  });
  const c = (await api(`/charges?student_id=${studentId}`)).find(
    (x) => x.concept === "Mensualidad",
  );
  assert.equal(c.balance_cents, 50029);
  const p = await api("/payments", {
    method: "POST",
    body: { charge_id: c.id, amount: 200.1 },
  });
  assert.equal(
    (await api(`/students/${studentId}/account`)).charges.find(
      (x) => x.id === c.id,
    ).balance_cents,
    30019,
  );
  await assert.rejects(
    api("/payments", {
      method: "POST",
      body: { charge_id: c.id, amount: 301 },
    }),
    /supera/,
  );
  const balanceAfterRejectedPayment = (await api(`/charges?student_id=${studentId}`)).find(
    (charge) => charge.id === c.id,
  ).balance_cents;
  assert.equal(balanceAfterRejectedPayment, 30019);
  assert.ok(balanceAfterRejectedPayment >= 0);
  await assert.rejects(
    api(`/payments/${p.id}/void`, {
      method: "POST",
      body: { reason: "Error de caja" },
    }),
    /directora/,
  );
  await api("/logout", { method: "POST" });
  await api("/login", {
    method: "POST",
    body: { username: "directora", password: "Directora123!" },
  });
  await api(`/payments/${p.id}/void`, {
    method: "POST",
    body: { reason: "Error de caja" },
  });
  assert.equal(
    (await api(`/students/${studentId}/account`)).charges.find(
      (x) => x.id === c.id,
    ).balance_cents,
    50029,
  );
  await api("/discounts", {
    method: "POST",
    body: {
      charge_id: c.id,
      reason: "Hermanos",
      percent: 10,
      basis: "Monto original del cargo",
    },
  });
  assert.equal(
    (await api(`/students/${studentId}/account`)).charges.find(
      (x) => x.id === c.id,
    ).balance_cents,
    45026,
  );
});

test("fechas de calendario y marcas de tiempo sin duplicar zona", async () => {
  const { fmtDate } = await import("../public/js/api.js");
  assert.equal(fmtDate("2026-01-10"), "10/01/2026");
  assert.equal(fmtDate("2026-01-10T12:00:00Z"), "10/01/2026");
  assert.equal(fmtDate("2026-01-10 12:00:00"), "10/01/2026");
  assert.equal(fmtDate("2026-01-10T01:00:00Z"), "09/01/2026");
  assert.equal(fmtDate("2026-01-10T12:00:00-06:00"), "10/01/2026");
});

test("períodos, validaciones y datos persistentes de dos años", async () => {
  await api("/login", {
    method: "POST",
    body: { username: "caja", password: "Caja12345!" },
  });
  const body = {
    student: {
      names: "Prueba",
      surnames: "Períodos",
      birth_date: "2018-03-02",
      sex: "Femenino",
      address: "Ficticia",
      grade: 3,
      school_year: 2025,
    },
    guardians: [
      {
        names: "Tutor",
        surnames: "Prueba",
        relationship: "Tutor/a",
        phone: "+505 8888-8888",
        address: "Ficticia",
      },
    ],
  };
  await assert.rejects(
    api("/students", {
      method: "POST",
      body: { ...body, student: { ...body.student, birth_date: "2099-01-01" } },
    }),
    /futura/,
  );
  await assert.rejects(
    api("/students", {
      method: "POST",
      body: { ...body, guardians: [{ ...body.guardians[0], phone: "abc" }] },
    }),
    /Teléfono/,
  );
  const { id } = await api("/students", { method: "POST", body });
  for (const year of [2025, 2026])
    await api("/enrollments", {
      method: "POST",
      body: {
        student_id: id,
        grade: 3,
        school_year: year,
        date: `${year}-01-10`,
        status: "Activa",
        enrollment_amount: 100.29,
      },
    });
  const c = (await api(`/charges?student_id=${id}`)).find(
    (c) => c.school_year === 2025,
  );
  await api("/payments", {
    method: "POST",
    body: { charge_id: c.id, amount: 50.1 },
  });
  const account = await api(`/students/${id}/account?year=2025`);
  assert.equal(account.totals.charged_cents, 10029);
  assert.equal(account.totals.balance_cents, 5019);
  assert.equal(account.payments.length, 1);
  assert.equal(
    (await api(`/students/${id}/account?year=2026`)).payments.length,
    0,
  );
  assert.equal(
    (await api(`/students/${id}/account`)).totals.charged_cents,
    20058,
  );
  assert.equal((await api(`/payments?year=2025&student_id=${id}`)).length, 1);
  const dash = await api("/dashboard?year=2025");
  assert.equal(dash.stats.payments_cents, 5010);
  assert.equal(dash.stats.enrollments, 1);
  const docs = await api(`/students/${id}/documents`);
  await assert.rejects(
    api(`/documents/${docs[0].id}`, {
      method: "PUT",
      body: { status: "Entregado", delivered_at: "" },
    }),
    /Fecha/,
  );
  await api(`/documents/${docs[0].id}`, {
    method: "PUT",
    body: { status: "Pendiente", delivered_at: "" },
  });
  await assert.rejects(
    api("/discounts", {
      method: "POST",
      body: {
        charge_id: c.id,
        percent: 10,
        reason: "Prueba",
        basis: "Saldo pendiente del cargo",
      },
    }),
    /directora/,
  );
  assert.equal(
    (await api(`/students/${id}`)).guardians[0].phone,
    "+505 8888-8888",
  );
});

test("prematrícula sin cargo y confirmación atómica", async () => {
  const s = (await api("/students")).find((s) => s.names === "Prueba");
  const before = localStorage.getItem("primaria_datos_v1");
  await assert.rejects(
    api("/enrollments", {
      method: "POST",
      body: {
        student_id: s.id,
        grade: 4,
        school_year: 2027,
        date: "2027-01-10",
        status: "Activa",
        enrollment_amount: "",
      },
    }),
    /Monto/,
  );
  assert.equal(localStorage.getItem("primaria_datos_v1"), before);
  const e = await api("/enrollments", {
    method: "POST",
    body: {
      student_id: s.id,
      grade: 4,
      school_year: 2027,
      date: "2027-01-10",
      status: "Prematrícula",
    },
  });
  assert.equal(
    (await api(`/charges?student_id=${s.id}`)).filter(
      (c) => c.school_year === 2027,
    ).length,
    0,
  );
  await api(`/enrollments/${e.id}/confirm`, {
    method: "POST",
    body: { enrollment_amount: 700.01 },
  });
  assert.equal(
    (await api(`/students/${s.id}/account?year=2027`)).totals.charged_cents,
    70001,
  );
  await assert.rejects(
    api(`/enrollments/${e.id}/confirm`, {
      method: "POST",
      body: { enrollment_amount: 700.01 },
    }),
    /confirmada/,
  );
});

test("recepción mensual usa fecha civil de Nicaragua y excluye anulados", async () => {
  const { receiptPeriod } = await import("../public/js/api.js");
  assert.deepEqual(receiptPeriod("2026-01-01T02:00:00Z"), {
    year: 2025,
    month: 12,
  });
  assert.deepEqual(receiptPeriod("2026-01-01T06:00:00Z"), {
    year: 2026,
    month: 1,
  });
  const db = JSON.parse(localStorage.getItem("primaria_datos_v1"));
  const c = db.charges.find((c) => c.school_year === 2025);
  db.payments.push({
    id: 999,
    charge_id: c.id,
    amount_cents: 1234,
    status: "Válido",
    paid_at: "2026-01-01T02:00:00Z",
    created_by: "caja",
  });
  db.payments.push({
    id: 1000,
    charge_id: c.id,
    amount_cents: 9000,
    status: "Anulado",
    paid_at: "2025-12-10T12:00:00Z",
    created_by: "caja",
  });
  localStorage.setItem("primaria_datos_v1", JSON.stringify(db));
  const d = await api("/dashboard?year=2025");
  assert.equal(d.monthly.find((m) => m.month === 12).amount_cents, 1234);
  assert.equal(d.stats.payments_cents, 6244);
});

test("las validaciones de campos identifican el control y responsable incorrectos", async () => {
  await api("/login", {
    method: "POST",
    body: { username: "caja", password: "Caja12345!" },
  });
  const student = {
    names: "Prueba",
    surnames: "Campo",
    birth_date: "2018-03-02",
    sex: "Femenino",
    address: "Ficticia",
    grade: 3,
    school_year: 2026,
  };
  const guardian = {
    names: "Tutor",
    surnames: "Prueba",
    relationship: "Tutor/a",
    phone: "88888888",
    address: "Ficticia",
  };
  await assert.rejects(
    api("/students", {
      method: "POST",
      body: {
        student: { ...student, birth_date: "2099-01-01" },
        guardians: [guardian],
      },
    }),
    (error) => error.field === "birth_date",
  );
  await assert.rejects(
    api("/students", {
      method: "POST",
      body: {
        student,
        guardians: [guardian, { ...guardian, phone: "abc" }],
      },
    }),
    (error) => error.field === "g_phone" && error.guardianIndex === 1,
  );
  await assert.rejects(
    api("/students", {
      method: "POST",
      body: {
        student,
        guardians: [{ ...guardian, email: "no-es-correo" }],
      },
    }),
    (error) => error.field === "g_email" && error.guardianIndex === 0,
  );

  const editedGuardians = [
    { ...guardian, names: "Primero" },
    { ...guardian, names: "Responsable que se quita" },
    { ...guardian, names: "Tercero" },
  ];
  editedGuardians.splice(1, 1);
  editedGuardians.push({ ...guardian, names: "Agregado", phone: "inválido" });
  await assert.rejects(
    api("/students", {
      method: "POST",
      body: { student: { ...student, names: "Prueba reordenada" }, guardians: editedGuardians },
    }),
    (error) => error.field === "g_phone" && error.guardianIndex === 2,
  );
});
