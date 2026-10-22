// Almacenamiento de demostración: los datos y los roles se controlan en este navegador.
import { exportData, mergeData } from "./data-transfer.js";
const KEY = "primaria_datos_v1",
  SESSION = "primaria_sesion_v1";
const fresh = () => ({
  students: [],
  guardians: [],
  enrollments: [],
  documents: [],
  charges: [],
  discounts: [],
  payments: [],
  annulments: [],
  activity: [],
});
const read = () => {
  try {
    const db = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    db.students = db.students.map((s) => ({ ...s, status: s.status === "Inactivo" ? "Retirado" : s.status }));
    if (!db.annulments.length) db.annulments = db.payments.filter((p) => p.status === "Anulado").map((p) => ({ id: p.id, payment_id: p.id, reason: p.void_reason, voided_at: p.voided_at, voided_by: p.voided_by }));
    return db;
  } catch {
    return fresh();
  }
};
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const id = (rows) => Math.max(0, ...rows.map((x) => x.id)) + 1;
const fail = (m) => {
  throw Error(m);
};
const req = (v, label) => {
  if (typeof v !== "string" || !v.trim()) fail(`${label} es obligatorio`);
  return v.trim();
};
const int = (v, label, min, max) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail(`${label} no es válido`);
  return n;
};
const cents = (v, label = "Monto") => {
  const s = String(v);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s) || Number(s) <= 0)
    fail(`${label} debe ser positivo y tener hasta dos decimales`);
  return Math.round(Number(s) * 100);
};
const nonnegativeCents = (v, label = "Monto") => {
  const s = String(v);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s)) fail(`${label} debe ser cero o positivo y tener hasta dos decimales`);
  return Math.round(Number(s) * 100);
};
const documentKinds = ["Partida de nacimiento", "Identificación del responsable", "Notas del grado anterior", "Documento de traslado", "Epicrisis"];
function suppliedDocuments(db, student_id, items, delivered_at) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!documentKinds.includes(item.kind) || !["Entregado", "Pendiente", "No requerido"].includes(item.status)) fail("Documento o estado no válido");
    const d = db.documents.find((x) => x.student_id === student_id && x.kind === item.kind);
    if (!d) fail("Documento no encontrado");
    Object.assign(d, { status: item.status, delivered_at: item.status === "Entregado" ? delivered_at : null, notes: String(item.notes || "").trim() });
  }
}
const date = (v, label) => {
  const d =
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? new Date(`${v}T12:00:00Z`)
      : null;
  if (!d || Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== v)
    fail(`${label} no es válida`);
  return v;
};
const now = () => new Date().toISOString();
const user = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION) || "null");
  } catch {
    return null;
  }
};
const director = () => {
  if (user()?.role !== "directora")
    fail("Solo la directora puede realizar esta acción");
};
const student = (db, n) => {
  const s = db.students.find((x) => x.id === Number(n));
  if (!s) fail("Estudiante no encontrado");
  return s;
};
const name = (db, n) => {
  const s = student(db, n);
  return `${s.names} ${s.surnames}`;
};
const activity = (db, label, detail) =>
  db.activity.push({ id: id(db.activity), label, detail, created_at: now() });
const charge = (db, c) => {
  const d = db.discounts.find((x) => x.charge_id === c.id),
    paid_cents = db.payments
      .filter((p) => p.charge_id === c.id && p.status === "Válido")
      .reduce((a, p) => a + p.amount_cents, 0),
    discount_cents = d?.discount_cents || 0;
  return {
    ...c,
    paid_cents,
    discount_cents,
    discount_reason: d?.reason || null,
    balance_cents: Math.max(0, c.amount_cents - paid_cents - discount_cents),
  };
};
const charges = (db, n) =>
  db.charges
    .filter((c) => c.student_id === Number(n))
    .map((c) => charge(db, c))
    .sort(
      (a, b) =>
        b.school_year - a.school_year ||
        a.concept.localeCompare(b.concept) ||
        (a.month || 0) - (b.month || 0),
    );
const payments = (db) =>
  db.payments
    .slice()
    .reverse()
    .map((p) => {
      const c = db.charges.find((x) => x.id === p.charge_id);
      return {
        ...p,
        student_id: c.student_id,
        concept: c.concept,
        month: c.month,
        school_year: c.school_year,
        student_name: name(db, c.student_id),
        created_by_name: p.created_by,
        voided_by_name: p.voided_by,
      };
    });
function guardian(g) {
  const x = {
    names: req(g.names, "Nombre del responsable"),
    surnames: req(g.surnames, "Apellido del responsable"),
    relationship: req(g.relationship, "Parentesco"),
    phone: req(g.phone, "Teléfono"),
    address: req(g.address, "Dirección del responsable"),
    email: g.email?.trim() || null,
    identity_number: g.identity_number?.trim() || null,
  };
  if (x.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))
    fail("Correo no válido");
  const digits = x.phone.replace(/\D/g, "");
  if (!/^\+?[0-9 ()-]+$/.test(x.phone) || digits.length < 8 || digits.length > 15) fail("Teléfono no válido");
  return x;
}
function studentData(body) {
  if (!Array.isArray(body.guardians) || !body.guardians.length)
    fail("Agregue al menos un responsable");
  body.guardians.forEach(guardian);
  const s = body.student || body,
    x = {
      names: req(s.names, "Nombres"),
      surnames: req(s.surnames, "Apellidos"),
      birth_date: date(s.birth_date, "Fecha de nacimiento"),
      sex: req(s.sex, "Sexo"),
      address: req(s.address, "Dirección"),
      grade: int(s.grade, "Grado", 1, 6),
      school_year: int(s.school_year, "Año lectivo", 2020, 2100),
      status: req(s.status || "Activo", "Estado"),
    };
  if (
    !["Femenino", "Masculino", "Otro"].includes(x.sex) ||
    !["Activo", "Retirado", "Egresado"].includes(x.status)
  )
    fail("Sexo o estado no válido");
  return x;
}
function enrollmentCharge(db, e, amount_cents) {
  if (
    db.charges.some(
      (c) =>
        c.student_id === e.student_id &&
        c.concept === "Matrícula" &&
        c.school_year === e.school_year,
    )
  )
    fail("Ya existe un cargo de matrícula para ese año");
  db.charges.push({
    id: id(db.charges),
    student_id: e.student_id,
    enrollment_id: e.id,
    concept: "Matrícula",
    month: null,
    school_year: e.school_year,
    amount_cents,
    grade: e.grade,
    created_at: now(),
  });
  Object.assign(student(db, e.student_id), {
    grade: e.grade,
    school_year: e.school_year,
  });
}

export async function api(path, options = {}) {
  const method = options.method || "GET",
    b = options.body || {},
    url = new URL(path, "http://local.demo"),
    route = url.pathname;
  if (route === "/login" && method === "POST") {
    const accounts = [
      {
        id: 1,
        username: "directora",
        password: "Directora123!",
        role: "directora",
      },
      { id: 2, username: "caja", password: "Caja12345!", role: "caja" },
    ];
    const account = accounts.find(
      (x) => x.username === b.username && x.password === b.password,
    );
    if (!account) fail("Usuario o contraseña incorrectos");
    const result = {
      id: account.id,
      username: account.username,
      role: account.role,
    };
    sessionStorage.setItem(SESSION, JSON.stringify(result));
    return result;
  }
  if (route === "/me") {
    if (!user()) fail("Inicie sesión");
    return user();
  }
  if (!user()) fail("Inicie sesión");
  if (route === "/logout" && method === "POST") {
    sessionStorage.removeItem(SESSION);
    return { ok: true };
  }
  const db = read(),
    done = (result) => {
      save(db);
      return result;
    };
  let m;
  if (route === "/data/export" && method === "GET") return exportData(db);
  if (route === "/data/import" && method === "POST") return done(mergeData(db, b));
  if (route === "/dashboard" && method === "GET") {
    const year = Number(url.searchParams.get("year")) || yearNow(),
      valid = db.payments.filter((p) => p.status === "Válido");
    return {
      stats: {
        students: db.students.length,
        enrollments: db.enrollments.filter(
          (e) => e.status === "Activa" && e.school_year === year,
        ).length,
        payments_cents: valid
          .filter((p) => p.paid_at.slice(0, 7) === now().slice(0, 7))
          .reduce((a, p) => a + p.amount_cents, 0),
        documents: db.documents.filter((d) => d.status === "Pendiente").length,
      },
      monthly: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        amount_cents: valid
          .filter(
            (p) =>
              new Date(p.paid_at).getFullYear() === year &&
              new Date(p.paid_at).getMonth() === i,
          )
          .reduce((a, p) => a + p.amount_cents, 0),
      })),
      activity: db.activity.slice(-6).reverse(),
    };
  }
  if (route === "/students" && method === "GET")
    return db.students.slice().reverse();
  if (route === "/students" && method === "POST") {
    const data = studentData(b),
      n = id(db.students);
    db.students.push({ id: n, ...data, created_at: now() });
    db.guardians.push(
      ...b.guardians.map((g, i) => ({
        id: id(db.guardians) + i,
        student_id: n,
        ...guardian(g),
      })),
    );
    documentKinds.forEach((kind, i) =>
      db.documents.push({
        id: id(db.documents),
        student_id: n,
        kind,
        status: i >= 3 ? "No requerido" : "Pendiente",
        delivered_at: null,
        notes: "",
      }),
    );
    activity(db, "Estudiante registrado", name(db, n));
    return done({ id: n });
  }
  m = route.match(/^\/students\/(\d+)$/);
  if (m && method === "GET") {
    const s = student(db, m[1]);
    return {
      ...s,
      guardians: db.guardians.filter((g) => g.student_id === s.id),
    };
  }
  if (m && method === "PUT") {
    const s = student(db, m[1]);
    Object.assign(s, studentData(b));
    db.guardians = db.guardians.filter((g) => g.student_id !== s.id);
    db.guardians.push(
      ...b.guardians.map((g, i) => ({
        id: id(db.guardians) + i,
        student_id: s.id,
        ...guardian(g),
      })),
    );
    activity(db, "Estudiante actualizado", name(db, s.id));
    return done({ id: s.id });
  }
  if (route === "/enrollments" && method === "GET")
    return db.enrollments
      .slice()
      .reverse()
      .map((e) => ({ ...e, student_name: name(db, e.student_id) }));
  if (route === "/enrollments" && method === "POST") {
    const student_id = int(b.student_id, "Estudiante", 1, 1e9),
      grade = int(b.grade, "Grado", 1, 6),
      school_year = int(b.school_year, "Año lectivo", 2020, 2100),
      when = date(b.date, "Fecha"),
      status = req(b.status, "Tipo");
    student(db, student_id);
    if (!["Prematrícula", "Activa"].includes(status)) fail("Tipo no válido");
    if (
      status === "Activa" &&
      db.enrollments.some(
        (e) =>
          e.student_id === student_id &&
          e.school_year === school_year &&
          e.status === "Activa",
      )
    )
      fail("Ya existe una matrícula activa para ese año");
    const amount = status === "Activa" ? nonnegativeCents(b.enrollment_amount, "Monto de matrícula") : null,
      monthlyAmount = b.monthly_amount === "" || b.monthly_amount == null ? null : nonnegativeCents(b.monthly_amount, "Monto de mensualidad"),
      e = {
        id: id(db.enrollments),
        student_id,
        grade,
        school_year,
        date: when,
        status,
        enrollment_amount_cents: amount,
        monthly_amount_cents: monthlyAmount,
        created_at: now(),
      };
    if (status === "Activa" && monthlyAmount == null) fail("Defina el monto de mensualidad");
    if (status === "Activa") enrollmentCharge(db, e, amount);
    db.enrollments.push(e);
    suppliedDocuments(db, student_id, b.documents, when);
    activity(db, `${status} registrada`, name(db, student_id));
    return done({ id: e.id });
  }
  m = route.match(/^\/enrollments\/(\d+)\/confirm$/);
  if (m && method === "POST") {
    const e = db.enrollments.find((x) => x.id === Number(m[1]));
    if (!e) fail("Prematrícula no encontrada");
    if (e.status !== "Prematrícula") fail("La matrícula ya está confirmada");
    if (
      db.enrollments.some(
        (x) =>
          x.id !== e.id &&
          x.student_id === e.student_id &&
          x.school_year === e.school_year &&
          x.status === "Activa",
      )
    )
      fail("Ya existe una matrícula activa para ese año");
    const amount = nonnegativeCents(b.enrollment_amount, "Monto de matrícula");
    e.enrollment_amount_cents = amount;
    e.monthly_amount_cents = b.monthly_amount === "" || b.monthly_amount == null ? e.monthly_amount_cents ?? null : nonnegativeCents(b.monthly_amount, "Monto de mensualidad");
    if (e.monthly_amount_cents == null) fail("Defina el monto de mensualidad");
    enrollmentCharge(db, e, amount);
    e.status = "Activa";
    activity(db, "Matrícula confirmada", name(db, e.student_id));
    return done({ ok: true });
  }
  m = route.match(/^\/students\/(\d+)\/documents$/);
  if (m && method === "GET") {
    student(db, m[1]);
    return db.documents.filter((d) => d.student_id === Number(m[1]));
  }
  m = route.match(/^\/documents\/(\d+)$/);
  if (m && method === "PUT") {
    const d = db.documents.find((x) => x.id === Number(m[1]));
    if (!d) fail("Documento no encontrado");
    const status = req(b.status, "Estado");
    if (!["Entregado", "Pendiente", "No requerido"].includes(status))
      fail("Estado no válido");
    Object.assign(d, {
      status,
      delivered_at:
        status === "Entregado"
          ? date(b.delivered_at, "Fecha de entrega")
          : null,
      notes: String(b.notes || "").trim(),
    });
    activity(
      db,
      "Documento actualizado",
      `${d.kind} · ${name(db, d.student_id)}`,
    );
    return done({ ok: true });
  }
  if (route === "/charges" && method === "GET") {
    const n = int(url.searchParams.get("student_id"), "Estudiante", 1, 1e9);
    student(db, n);
    return charges(db, n);
  }
  if (route === "/charges" && method === "POST") {
    const student_id = int(b.student_id, "Estudiante", 1, 1e9),
      school_year = int(b.school_year, "Año lectivo", 2020, 2100),
      month = int(b.month, "Mes", 1, 12),
      amount_cents = nonnegativeCents(b.amount);
    student(db, student_id);
    const activeEnrollment = db.enrollments.find(
      (e) => e.student_id === student_id && e.school_year === school_year && e.status === "Activa",
    );
    if (!activeEnrollment)
      fail("El estudiante requiere matrícula activa para ese año");
    if (activeEnrollment.monthly_amount_cents != null && amount_cents !== activeEnrollment.monthly_amount_cents)
      fail("El monto no coincide con la mensualidad establecida para esta matrícula");
    if (
      db.charges.some(
        (c) =>
          c.student_id === student_id &&
          c.concept === "Mensualidad" &&
          c.month === month &&
          c.school_year === school_year,
      )
    )
      fail("La mensualidad ya fue registrada");
    const n = id(db.charges);
    db.charges.push({
      id: n,
      student_id,
      enrollment_id: null,
      concept: "Mensualidad",
      grade: activeEnrollment.grade,
      month,
      school_year,
      amount_cents,
      created_at: now(),
    });
    activity(db, "Mensualidad creada", name(db, student_id));
    return done({ id: n });
  }
  if (route === "/payments" && method === "GET") {
    let rows = payments(db);
    const q = url.searchParams.get("q"),
      month = url.searchParams.get("month"),
      concept = url.searchParams.get("concept"),
      student_id = url.searchParams.get("student_id");
    if (q)
      rows = rows.filter((p) =>
        p.student_name
          .toLocaleLowerCase("es")
          .includes(q.toLocaleLowerCase("es")),
      );
    if (month) rows = rows.filter((p) => p.month === Number(month));
    if (concept) rows = rows.filter((p) => p.concept === concept);
    if (student_id)
      rows = rows.filter((p) => p.student_id === Number(student_id));
    return rows;
  }
  if (route === "/annulments" && method === "GET") return db.annulments.map((a) => {
    const p = db.payments.find((x) => x.id === a.payment_id), c = db.charges.find((x) => x.id === p?.charge_id);
    return { ...a, student_id: c?.student_id ?? a.student_id, student_name: c ? name(db, c.student_id) : "", paid_at: p?.paid_at ?? a.paid_at, amount_cents: p?.amount_cents ?? a.amount_cents };
  }).reverse();
  if (route === "/payments" && method === "POST") {
    const charge_id = int(b.charge_id, "Cargo", 1, 1e9),
      amount_cents = cents(b.amount, "Abono"),
      raw = db.charges.find((c) => c.id === charge_id);
    if (!raw) fail("Cargo no encontrado");
    const c = charge(db, raw);
    if (amount_cents > c.balance_cents)
      fail("El abono supera el saldo pendiente");
    const n = id(db.payments);
    db.payments.push({
      id: n,
      charge_id,
      student_id: c.student_id,
      grade: c.grade ?? student(db, c.student_id).grade,
      concept: c.concept,
      month: c.month,
      amount_due_cents: c.amount_cents - c.discount_cents,
      discount_cents: c.discount_cents,
      amount_cents,
      balance_after_cents: c.balance_cents - amount_cents,
      paid_at: now(),
      created_by: user().username,
      status: "Válido",
      void_reason: null,
      voided_at: null,
      voided_by: null,
    });
    activity(db, "Pago registrado", name(db, c.student_id));
    return done({ id: n });
  }
  m = route.match(/^\/payments\/(\d+)\/void$/);
  if (m && method === "POST") {
    director();
    const reason = req(b.reason, "Motivo");
    if (reason.length < 5) fail("Explique el motivo de la anulación");
    const p = db.payments.find((x) => x.id === Number(m[1]));
    if (!p) fail("Pago no encontrado");
    if (p.status === "Anulado") fail("El pago ya está anulado");
    Object.assign(p, {
      status: "Anulado",
      void_reason: reason,
      voided_at: now(),
      voided_by: user().username,
    });
    const c = db.charges.find((x) => x.id === p.charge_id);
    db.annulments.push({ id: id(db.annulments), payment_id: p.id, student_id: c.student_id, paid_at: p.paid_at, amount_cents: p.amount_cents, reason, voided_at: p.voided_at, voided_by: p.voided_by });
    activity(db, "Pago anulado", `Comprobante #${p.id}`);
    return done({ ok: true });
  }
  if (route === "/discounts" && method === "GET") {
    director();
    return db.discounts
      .slice()
      .reverse()
      .map((d) => {
        const c = db.charges.find((x) => x.id === d.charge_id);
        return {
          ...d,
          student_id: c.student_id,
          concept: c.concept,
          month: c.month,
          student_name: name(db, c.student_id),
        };
      });
  }
  if (route === "/discounts" && method === "POST") {
    director();
    const charge_id = int(b.charge_id, "Cargo", 1, 1e9),
      percent = Number(b.percent),
      type = req(b.type, "Tipo de descuento"),
      reason = req(b.reason, "Motivo"),
      basis = "Monto original del cargo";
    if (b.basis && b.basis !== basis) fail("El descuento se calcula sobre el monto original del cargo");
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100 || !/^\d+(?:\.\d{1,2})?$/.test(String(b.percent))) fail("Porcentaje no válido");
    const raw = db.charges.find((c) => c.id === charge_id);
    if (!raw) fail("Cargo no encontrado");
    if (db.discounts.some((d) => d.charge_id === charge_id))
      fail("El cargo ya tiene un descuento");
    const c = charge(db, raw),
      base = c.amount_cents,
      discount_cents = Math.round((base * percent) / 100),
      final_cents = c.amount_cents - discount_cents;
    if (c.paid_cents > final_cents)
      fail("El descuento dejaría pagos mayores al monto final");
    const n = id(db.discounts);
    db.discounts.push({
      id: n,
      charge_id,
      student_id: c.student_id,
      grade: c.grade ?? student(db, c.student_id).grade,
      type,
      reason,
      percent,
      basis,
      original_cents: c.amount_cents,
      discount_cents,
      final_cents,
      authorized_by: user().username,
      authorized_at: now(),
    });
    activity(db, "Descuento autorizado", name(db, c.student_id));
    return done({ id: n });
  }
  m = route.match(/^\/students\/(\d+)\/account$/);
  if (m && method === "GET") {
    const s = student(db, m[1]),
      rows = charges(db, s.id),
      enrollments = db.enrollments.filter((e) => e.student_id === s.id),
      totals = rows.reduce(
        (a, c) => ({
          charged_cents: a.charged_cents + c.amount_cents,
          discount_cents: a.discount_cents + c.discount_cents,
          paid_cents: a.paid_cents + c.paid_cents,
          balance_cents: a.balance_cents + c.balance_cents,
        }),
        {
          charged_cents: 0,
          discount_cents: 0,
          paid_cents: 0,
          balance_cents: 0,
        },
      );
    return {
      student: s,
      enrollment: enrollments.find((e) => e.school_year === s.school_year && e.status === "Activa") || enrollments.at(-1) || null,
      charges: rows,
      payments: payments(db).filter((p) => p.student_id === s.id),
      monthly_paid: rows.filter((c) => c.concept === "Mensualidad" && c.balance_cents === 0),
      monthly_pending: rows.filter((c) => c.concept === "Mensualidad" && c.balance_cents > 0),
      installments: payments(db).filter((p) => p.student_id === s.id && p.status === "Válido" && p.balance_after_cents > 0),
      annulments: db.annulments.filter((x) => x.student_id === s.id || db.payments.some((p) => p.id === x.payment_id && db.charges.some((c) => c.id === p.charge_id && c.student_id === s.id))),
      totals,
    };
  }
  fail("Función no disponible");
}
export const money = (cents) =>
  `C$ ${(Number(cents || 0) / 100).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const yearNow = () => new Date().getFullYear();
export const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export const grade = (n) => `${n}° de Primaria`;
export const icon = (name, size = 20) =>
  `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
export const option = (value, label, selected) =>
  `<option value="${escape(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escape(label)}</option>`;
export function notify(title, text = "", kind = "success") {
  if (window.Swal)
    return Swal.fire({
      icon: kind,
      title,
      text,
      confirmButtonColor: "#1069e8",
    });
  alert(`${title}${text ? `\n${text}` : ""}`);
}
export async function confirmAction(
  title,
  text,
  confirmButtonText = "Confirmar",
) {
  if (window.Swal)
    return (
      await Swal.fire({
        title,
        text,
        icon: "question",
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#1069e8",
      })
    ).isConfirmed;
  return confirm(`${title}\n${text}`);
}
