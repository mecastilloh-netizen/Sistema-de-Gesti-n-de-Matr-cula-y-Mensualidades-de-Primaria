// Un archivo JSON contiene todas las colecciones y conserva sus relaciones.
const collections = [
  "students", "guardians", "enrollments", "documents", "charges",
  "discounts", "payments", "annulments", "activity",
];
const documentKinds = [
  "Partida de nacimiento", "Identificación del responsable",
  "Notas del grado anterior", "Documento de traslado", "Epicrisis",
];
const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const text = (value) => typeof value === "string" && value.trim().length > 0;
const cents = (value, positive = false) => Number.isSafeInteger(value) &&
  (positive ? value > 0 : value >= 0);
const fail = (message) => { throw Error(`Archivo no válido: ${message}`); };

export function exportData(db) {
  return {
    format: "gestion-matriculas-primaria",
    version: 2,
    exported_at: new Date().toISOString(),
    ...Object.fromEntries(collections.map((key) => [key, db[key]])),
  };
}

export function mergeData(current, file) {
  if (!file || typeof file !== "object" || Array.isArray(file)) fail("se esperaba un objeto JSON");
  const source = file.data && typeof file.data === "object" ? file.data : file;
  if (source.format && source.format !== "gestion-matriculas-primaria") fail("formato desconocido");
  if (source.version != null && ![1, 2].includes(source.version)) fail("versión no compatible");
  const rows = {};
  const originalIds = {};
  for (const key of collections) {
    if (source[key] != null && !Array.isArray(source[key])) fail(`${key} debe ser una lista`);
    rows[key] = source[key] || [];
    originalIds[key] = new Set();
    for (const row of rows[key]) {
      if (!row || typeof row !== "object" || Array.isArray(row) ||
          !Number.isSafeInteger(row.id) || row.id < 1 || originalIds[key].has(row.id))
        fail(`identificador repetido o inválido en ${key}`);
      originalIds[key].add(row.id);
    }
  }
  if (!rows.students.length) fail("no contiene estudiantes");
  const ref = (key, value) => {
    if (!originalIds[key].has(value)) fail(`referencia inexistente en ${key}: ${value}`);
  };
  for (const s of rows.students) {
    if (!text(s.names) || !text(s.surnames) || !validDate(s.birth_date) ||
        !["Femenino", "Masculino", "Otro"].includes(s.sex) || !text(s.address) ||
        !Number.isInteger(s.grade) || s.grade < 1 || s.grade > 6 ||
        !Number.isInteger(s.school_year) || s.school_year < 2020 || s.school_year > 2100 ||
        !["Activo", "Retirado", "Egresado", "Inactivo"].includes(s.status))
      fail(`datos incompletos del estudiante ${s.id}`);
  }
  for (const g of rows.guardians) {
    ref("students", g.student_id);
    const digits = String(g.phone || "").replace(/\D/g, "");
    if (!text(g.names) || !text(g.surnames) || !text(g.relationship) ||
        !text(g.address) || digits.length < 8 || digits.length > 15)
      fail(`datos incompletos del responsable ${g.id}`);
  }
  for (const s of rows.students)
    if (!rows.guardians.some((g) => g.student_id === s.id)) fail(`faltan responsables del estudiante ${s.id}`);
  for (const e of rows.enrollments) {
    ref("students", e.student_id);
    if (!Number.isInteger(e.grade) || e.grade < 1 || e.grade > 6 ||
        !Number.isInteger(e.school_year) || !validDate(e.date) ||
        !["Activa", "Prematrícula"].includes(e.status))
      fail(`matrícula inválida ${e.id}`);
  }
  for (const d of rows.documents) {
    ref("students", d.student_id);
    if (!documentKinds.includes(d.kind) || !["Entregado", "Pendiente", "No requerido"].includes(d.status))
      fail(`documento inválido ${d.id}`);
  }
  for (const c of rows.charges) {
    ref("students", c.student_id);
    if (c.enrollment_id != null) ref("enrollments", c.enrollment_id);
    if (!["Matrícula", "Mensualidad"].includes(c.concept) ||
        !Number.isInteger(c.school_year) || !cents(c.amount_cents) ||
        (c.concept === "Mensualidad" && (!Number.isInteger(c.month) || c.month < 1 || c.month > 12)))
      fail(`cargo inválido ${c.id}`);
  }
  for (const d of rows.discounts) {
    ref("charges", d.charge_id);
    if (!text(d.reason) || !Number.isFinite(d.percent) || d.percent <= 0 || d.percent > 100 ||
        !cents(d.discount_cents) || !cents(d.original_cents) || !cents(d.final_cents))
      fail(`descuento inválido ${d.id}`);
  }
  for (const p of rows.payments) {
    ref("charges", p.charge_id);
    if (!cents(p.amount_cents, true) || !text(p.paid_at) ||
        !["Válido", "Anulado"].includes(p.status) ||
        (p.status === "Anulado" && (!text(p.void_reason) || !text(p.voided_at))))
      fail(`pago inválido ${p.id}`);
  }
  if (!rows.annulments.length) {
    rows.annulments = rows.payments.filter((p) => p.status === "Anulado").map((p) => ({
      id: p.id, payment_id: p.id, reason: p.void_reason,
      voided_at: p.voided_at, voided_by: p.voided_by,
    }));
  }
  for (const a of rows.annulments) {
    ref("payments", a.payment_id);
    if (!text(a.reason) || !text(a.voided_at)) fail(`anulación inválida ${a.id}`);
  }

  const maps = Object.fromEntries(collections.map((key) => {
    let next = Math.max(0, ...current[key].map((row) => row.id));
    return [key, new Map(rows[key].map((row) => [row.id, ++next]))];
  }));
  const mapped = (key, value) => maps[key].get(value);
  const withId = (key, row) => ({ ...row, id: mapped(key, row.id) });
  const imported = Object.fromEntries(collections.map((key) => [key, []]));
  imported.students = rows.students.map((s) => ({ ...withId("students", s), status: s.status === "Inactivo" ? "Retirado" : s.status }));
  imported.guardians = rows.guardians.map((g) => ({ ...withId("guardians", g), student_id: mapped("students", g.student_id) }));
  imported.enrollments = rows.enrollments.map((e) => {
    const related = rows.charges.filter((c) => c.student_id === e.student_id && c.school_year === e.school_year);
    return {
      ...withId("enrollments", e), student_id: mapped("students", e.student_id),
      enrollment_amount_cents: e.enrollment_amount_cents ?? related.find((c) => c.concept === "Matrícula")?.amount_cents ?? null,
      monthly_amount_cents: e.monthly_amount_cents ?? related.find((c) => c.concept === "Mensualidad")?.amount_cents ?? null,
    };
  });
  imported.documents = rows.documents.map((d) => ({ ...withId("documents", d), student_id: mapped("students", d.student_id) }));
  imported.charges = rows.charges.map((c) => ({
    ...withId("charges", c), student_id: mapped("students", c.student_id),
    enrollment_id: c.enrollment_id == null ? null : mapped("enrollments", c.enrollment_id),
    grade: c.grade ?? rows.enrollments.find((e) => e.student_id === c.student_id && e.school_year === c.school_year)?.grade ?? rows.students.find((s) => s.id === c.student_id).grade,
  }));
  imported.discounts = rows.discounts.map((d) => {
    const c = imported.charges.find((item) => item.id === mapped("charges", d.charge_id));
    return { ...withId("discounts", d), charge_id: c.id, student_id: c.student_id,
      grade: d.grade ?? c.grade, type: d.type || (/herman/i.test(d.reason) ? "Hermanos" : "Otro") };
  });
  const paid = new Map();
  imported.payments = rows.payments.map((p) => {
    const c = imported.charges.find((item) => item.id === mapped("charges", p.charge_id));
    const discount = imported.discounts.find((d) => d.charge_id === c.id)?.discount_cents || 0;
    const prior = paid.get(c.id) || 0;
    if (p.status === "Válido") paid.set(c.id, prior + p.amount_cents);
    return { ...withId("payments", p), charge_id: c.id, student_id: c.student_id,
      grade: p.grade ?? c.grade, concept: c.concept, month: c.month,
      amount_due_cents: p.amount_due_cents ?? c.amount_cents - discount,
      discount_cents: p.discount_cents ?? discount,
      balance_after_cents: p.balance_after_cents ?? Math.max(0, c.amount_cents - discount - prior - p.amount_cents) };
  });
  imported.annulments = rows.annulments.map((a) => {
    const p = imported.payments.find((item) => item.id === mapped("payments", a.payment_id));
    return { ...withId("annulments", a), payment_id: p.id, student_id: p.student_id,
      paid_at: a.paid_at ?? p.paid_at, amount_cents: a.amount_cents ?? p.amount_cents };
  });
  imported.activity = rows.activity.map((a) => withId("activity", a));
  for (const key of collections) current[key].push(...imported[key]);
  return { students: imported.students.length, payments: imported.payments.length,
    documents: imported.documents.length, annulments: imported.annulments.length };
}
