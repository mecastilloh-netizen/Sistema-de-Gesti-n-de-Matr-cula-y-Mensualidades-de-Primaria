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
    monthly_amount: 500.29,
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
      type: "Hermanos",
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

test("diccionario: prematrícula, cargos, pagos, descuentos, cuenta y anulaciones", async () => {
  globalThis.localStorage = memory();
  globalThis.sessionStorage = memory();
  await api("/login", {
    method: "POST",
    body: { username: "directora", password: "Directora123!" },
  });
  const student = {
    names: "Carlos",
    surnames: "López",
    birth_date: "2017-06-10",
    sex: "Masculino",
    address: "Managua",
    grade: 2,
    school_year: 2026,
    status: "Activo",
  };
  const guardian = {
    names: "Marta",
    surnames: "López",
    relationship: "Madre",
    phone: "+505 8888-8888",
    address: "Managua",
  };
  await assert.rejects(
    api("/students", { method: "POST", body: { student, guardians: [{ ...guardian, phone: "123" }] } }),
    /Teléfono no válido/,
  );
  await assert.rejects(
    api("/students", { method: "POST", body: { student: { ...student, status: "Inactivo" }, guardians: [guardian] } }),
    /estado no válido/,
  );
  const { id: studentId } = await api("/students", {
    method: "POST",
    body: { student, guardians: [guardian] },
  });
  const { id: enrollmentId } = await api("/enrollments", {
    method: "POST",
    body: {
      student_id: studentId,
      grade: 2,
      school_year: 2026,
      date: "2026-01-10",
      status: "Prematrícula",
      monthly_amount: 400,
      documents: [
        { kind: "Partida de nacimiento", status: "Entregado" },
        { kind: "Notas del grado anterior", status: "Pendiente" },
      ],
    },
  });
  const docs = await api(`/students/${studentId}/documents`);
  assert.equal(docs.find((d) => d.kind === "Partida de nacimiento").status, "Entregado");
  assert.equal(docs.find((d) => d.kind === "Notas del grado anterior").status, "Pendiente");
  await api(`/enrollments/${enrollmentId}/confirm`, {
    method: "POST",
    body: { enrollment_amount: 0, monthly_amount: 400 },
  });
  const enrollment = (await api("/enrollments")).find((e) => e.id === enrollmentId);
  assert.equal(enrollment.enrollment_amount_cents, 0);
  assert.equal(enrollment.monthly_amount_cents, 40000);
  const { id: chargeId } = await api("/charges", {
    method: "POST",
    body: { student_id: studentId, school_year: 2026, month: 2, amount: 400 },
  });
  await assert.rejects(
    api("/charges", { method: "POST", body: { student_id: studentId, school_year: 2026, month: 3, amount: 401 } }),
    /mensualidad establecida/,
  );
  await api("/discounts", {
    method: "POST",
    body: { charge_id: chargeId, type: "Hermanos", reason: "Dos hermanos inscritos", percent: 12.5 },
  });
  const discount = (await api("/discounts")).find((d) => d.charge_id === chargeId);
  assert.equal(discount.discount_cents, 5000);
  assert.equal(discount.final_cents, 35000);
  assert.equal(discount.type, "Hermanos");
  const { id: paymentId } = await api("/payments", {
    method: "POST",
    body: { charge_id: chargeId, amount: 100 },
  });
  const payment = (await api("/payments")).find((p) => p.id === paymentId);
  assert.equal(payment.grade, 2);
  assert.equal(payment.amount_due_cents, 35000);
  assert.equal(payment.discount_cents, 5000);
  assert.equal(payment.balance_after_cents, 25000);
  const account = await api(`/students/${studentId}/account`);
  assert.equal(account.enrollment.status, "Activa");
  assert.equal(account.monthly_pending.length, 1);
  assert.equal(account.installments.length, 1);
  assert.equal(account.totals.paid_cents, 10000);
  await api(`/payments/${paymentId}/void`, {
    method: "POST",
    body: { reason: "Registro duplicado" },
  });
  const annulment = (await api("/annulments")).find((a) => a.payment_id === paymentId);
  assert.equal(annulment.student_id, studentId);
  assert.equal(annulment.amount_cents, 10000);
  assert.equal(annulment.reason, "Registro duplicado");
  assert.equal(annulment.voided_by, "directora");
  assert.equal((await api(`/students/${studentId}/account`)).totals.balance_cents, 35000);
  await api("/enrollments", {
    method: "POST",
    body: { student_id: studentId, grade: 3, school_year: 2027, date: "2027-01-10", status: "Activa", enrollment_amount: 0, monthly_amount: 0 },
  });
  const { id: zeroChargeId } = await api("/charges", {
    method: "POST",
    body: { student_id: studentId, school_year: 2027, month: 3, amount: 0 },
  });
  assert.equal((await api(`/charges?student_id=${studentId}`)).find((c) => c.id === zeroChargeId).amount_cents, 0);
});
