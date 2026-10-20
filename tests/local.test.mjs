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
const { api, initializeDemoData, resetDemoData } = await import("../public/js/api.js");
const { createDemoData, DEMO_VERSION } = await import("../public/js/demo-data.js");
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

test("los datos ficticios 2025–2026 conservan integridad y saldos coherentes", () => {
  const db = createDemoData();
  assert.equal(db.demo_data_version, DEMO_VERSION);
  assert.deepEqual(createDemoData(), db, "el escenario debe ser determinista");
  assert.equal(db.students.length, 30);
  for (let grade = 1; grade <= 6; grade += 1)
    assert.equal(db.students.filter((s) => s.grade === grade).length, 5);
  assert.equal(db.students.filter((s) => s.school_year === 2026).length, 30);

  const ids = (rows) => rows.map((row) => row.id);
  for (const collection of ["students", "guardians", "enrollments", "documents", "charges", "discounts", "payments", "activity"]) {
    assert.equal(new Set(ids(db[collection])).size, db[collection].length, `${collection}: IDs únicos`);
  }
  const students = new Map(db.students.map((s) => [s.id, s]));
  const enrollments = new Map(db.enrollments.map((e) => [e.id, e]));
  const charges = new Map(db.charges.map((c) => [c.id, c]));
  const paymentsByCharge = new Map();
  for (const payment of db.payments) {
    assert.ok(charges.has(payment.charge_id), `pago ${payment.id} referencia un cargo`);
    assert.ok(Number.isInteger(payment.amount_cents) && payment.amount_cents > 0);
    assert.ok(["Válido", "Anulado"].includes(payment.status));
    if (payment.status === "Anulado") {
      assert.ok(payment.void_reason && payment.voided_at && payment.voided_by);
    } else {
      assert.equal(payment.void_reason, null);
      assert.equal(payment.voided_at, null);
      assert.equal(payment.voided_by, null);
    }
    const list = paymentsByCharge.get(payment.charge_id) || [];
    list.push(payment);
    paymentsByCharge.set(payment.charge_id, list);
  }
  assert.ok(db.guardians.length >= 30);
  assert.ok(db.guardians.every((g) => students.has(g.student_id)));
  assert.ok(db.students.every((s) => db.guardians.some((g) => g.student_id === s.id)));
  assert.ok(db.enrollments.every((e) => students.has(e.student_id)));
  assert.ok(db.documents.every((d) => students.has(d.student_id)));
  assert.ok(db.documents.some((d) => d.status === "Entregado"));
  assert.ok(db.documents.some((d) => d.status === "Pendiente"));
  assert.ok(db.documents.some((d) => d.status === "No requerido"));
  assert.ok(db.enrollments.some((e) => e.school_year === 2025));
  assert.ok(db.enrollments.some((e) => e.school_year === 2026 && e.status === "Prematrícula"));
  assert.ok(db.enrollments.some((e) => e.school_year === 2026 && e.status === "Activa"));
  for (const key of new Set(db.enrollments.filter((e) => e.status === "Activa").map((e) => `${e.student_id}:${e.school_year}`))) {
    const [studentId, schoolYear] = key.split(":").map(Number);
    assert.equal(db.enrollments.filter((e) => e.student_id === studentId && e.school_year === schoolYear && e.status === "Activa").length, 1);
  }
  assert.ok(db.charges.length >= 100);
  for (const charge of db.charges) {
    assert.ok(students.has(charge.student_id));
    assert.ok(Number.isInteger(charge.amount_cents) && charge.amount_cents > 0);
    if (charge.concept === "Matrícula") {
      const enrollment = enrollments.get(charge.enrollment_id);
      assert.ok(enrollment);
      assert.equal(enrollment.student_id, charge.student_id);
      assert.equal(enrollment.school_year, charge.school_year);
      assert.equal(enrollment.status, "Activa");
    } else {
      assert.equal(charge.concept, "Mensualidad");
      assert.ok(charge.month >= 1 && charge.month <= 12);
      assert.ok(db.enrollments.some((e) => e.student_id === charge.student_id && e.school_year === charge.school_year && e.status === "Activa"));
    }
    const discount = db.discounts.find((d) => d.charge_id === charge.id);
    const paid = (paymentsByCharge.get(charge.id) || []).filter((p) => p.status === "Válido").reduce((sum, p) => sum + p.amount_cents, 0);
    const discountCents = discount?.discount_cents || 0;
    assert.ok(paid + discountCents <= charge.amount_cents, `cargo ${charge.id} no debe quedar sobrepagado`);
    assert.ok(charge.amount_cents - paid - discountCents >= 0);
  }
  for (const discount of db.discounts) {
    const original = charges.get(discount.charge_id);
    assert.ok(original);
    assert.ok(Number.isInteger(discount.discount_cents));
    assert.equal(discount.original_cents, original.amount_cents);
    assert.equal(discount.discount_cents, Math.round(original.amount_cents * discount.percent / 100));
    assert.equal(discount.final_cents, original.amount_cents - discount.discount_cents);
    assert.ok(discount.authorized_by && discount.authorized_at && discount.reason);
  }
  assert.ok(db.discounts.length > 0);
  assert.ok(db.payments.some((p) => p.status === "Anulado"));
  assert.ok(db.payments.some((p) => p.status === "Válido"));
  assert.ok(db.activity.length >= 50);
  assert.deepEqual(db.payments.map((p) => p.paid_at), db.payments.map((p) => p.paid_at).slice().sort(), "el historial del fixture queda cronológico");
  assert.deepEqual(db.activity.map((a) => a.created_at), db.activity.map((a) => a.created_at).slice().sort(), "la actividad del fixture queda cronológica");
  assert.ok(db.charges.some((c) => {
    const paid = (paymentsByCharge.get(c.id) || []).filter((p) => p.status === "Válido").reduce((sum, p) => sum + p.amount_cents, 0);
    return paid > 0 && paid + (db.discounts.find((d) => d.charge_id === c.id)?.discount_cents || 0) === c.amount_cents;
  }), "incluye una obligación pagada por completo");
  assert.ok(db.charges.some((c) => {
    const paid = (paymentsByCharge.get(c.id) || []).filter((p) => p.status === "Válido").reduce((sum, p) => sum + p.amount_cents, 0);
    return paid > 0 && c.amount_cents - paid - (db.discounts.find((d) => d.charge_id === c.id)?.discount_cents || 0) > 0;
  }), "incluye abonos parciales con saldo");
  assert.ok(db.charges.some((c) => c.amount_cents > 0 && !(paymentsByCharge.get(c.id) || []).some((p) => p.status === "Válido")));
});

test("la inicialización y el restablecimiento no sustituyen ni borran datos ajenos", () => {
  const freshStore = memory();
  freshStore.setItem("otra_aplicacion", "conservar");
  assert.deepEqual(initializeDemoData(freshStore), { initialized: true, version: DEMO_VERSION });
  const initialValue = freshStore.getItem("primaria_datos_v1");
  assert.deepEqual(initializeDemoData(freshStore), { initialized: false, version: DEMO_VERSION });
  assert.equal(freshStore.getItem("primaria_datos_v1"), initialValue, "una recarga no duplica ni modifica el escenario");
  assert.equal(JSON.parse(initialValue).students.length, 30);

  const validEmptyStore = memory();
  validEmptyStore.setItem("primaria_datos_v1", "{}");
  assert.deepEqual(initializeDemoData(validEmptyStore), { initialized: false, version: null });
  assert.equal(validEmptyStore.getItem("primaria_datos_v1"), "{}", "una base válida vacía no se interpreta como instalación nueva");

  const existingStore = memory();
  const prior = JSON.stringify({ students: [{ id: 77, names: "Dato existente" }] });
  existingStore.setItem("primaria_datos_v1", prior);
  assert.equal(initializeDemoData(existingStore).initialized, false);
  assert.equal(existingStore.getItem("primaria_datos_v1"), prior);

  const brokenStore = memory();
  brokenStore.setItem("primaria_datos_v1", "{base corrupta");
  brokenStore.setItem("otra_aplicacion", "conservar");
  assert.throws(() => initializeDemoData(brokenStore), (error) => error.code === "DEMO_STORAGE_CORRUPT");
  assert.equal(brokenStore.getItem("primaria_datos_v1"), "{base corrupta", "no se repara silenciosamente");
  assert.deepEqual(resetDemoData(brokenStore), { version: DEMO_VERSION });
  assert.equal(JSON.parse(brokenStore.getItem("primaria_datos_v1")).students.length, 30);
  assert.equal(brokenStore.getItem("otra_aplicacion"), "conservar");
});

test("la demostración alimenta consultas por año, saldos y pagos anulados", async () => {
  globalThis.localStorage = memory();
  globalThis.sessionStorage = memory();
  initializeDemoData();
  await api("/login", { method: "POST", body: { username: "caja", password: "Caja12345!" } });
  const students = await api("/students");
  assert.equal(students.length, 30);
  assert.equal((await api("/dashboard?year=2026")).stats.students, 30);
  assert.equal((await api("/dashboard?year=2026")).stats.enrollments, 24);
  const recentActivity = (await api("/dashboard?year=2026")).activity.map((a) => a.created_at);
  assert.deepEqual(recentActivity, recentActivity.slice().sort().reverse(), "Inicio muestra primero las actividades más recientes por fecha");
  assert.equal((await api("/dashboard?year=2025")).stats.students, 10);
  const full = await api("/students/1/account?year=2026");
  assert.equal(full.totals.balance_cents, 0);
  const partial = await api("/students/2/account?year=2026");
  assert.ok(partial.totals.paid_cents > 0 && partial.totals.balance_cents > 0);
  const annulled = await api("/students/3/account?year=2026");
  assert.ok(annulled.payments.some((p) => p.status === "Anulado"));
  assert.ok(annulled.totals.balance_cents > 0, "la anulación no reduce el saldo");
  const annual = await api("/reports?year=2026");
  assert.equal(annual.stats.students, 30);
  assert.equal(annual.stats.enrollments, 24);
  assert.equal(annual.payments.filter((p) => p.status === "Válido").reduce((sum, p) => sum + p.amount_cents, 0), annual.stats.payments_cents);
  assert.equal(annual.enrollments.filter((e) => e.status === "Activa").length, 24);
  const historical = await api("/reports?year=2025");
  assert.equal(historical.stats.students, 10);
  assert.ok(historical.payments.some((p) => p.status === "Válido"));
});
