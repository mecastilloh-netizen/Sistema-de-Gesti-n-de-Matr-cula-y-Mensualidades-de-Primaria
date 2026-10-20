import { createDemoData, DEMO_VERSION } from "./demo-data.js";

// Almacenamiento de demostración: los datos y los roles se controlan en este navegador.
const KEY = "primaria_datos_v1",
  SESSION = "primaria_sesion_v1";
const COLLECTIONS = ["students", "guardians", "enrollments", "documents", "charges", "discounts", "payments", "activity"];
const fresh = () => ({
  students: [],
  guardians: [],
  enrollments: [],
  documents: [],
  charges: [],
  discounts: [],
  payments: [],
  activity: [],
});
function storageError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function parseDatabase(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw storageError(
      "Los datos locales del prototipo están dañados. No se reemplazaron automáticamente; puede recuperar los datos ficticios desde la acción Restablecer demostración.",
      "DEMO_STORAGE_CORRUPT",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw storageError(
      "La estructura de datos locales no es válida. No se reemplazó; puede recuperar los datos ficticios desde la acción Restablecer demostración.",
      "DEMO_STORAGE_CORRUPT",
    );
  for (const key of COLLECTIONS)
    if (parsed[key] !== undefined && !Array.isArray(parsed[key]))
      throw storageError(
        `La colección local «${key}» no es válida. No se reemplazó; puede recuperar los datos ficticios desde la acción Restablecer demostración.`,
        "DEMO_STORAGE_CORRUPT",
      );
  return { ...fresh(), ...parsed };
}
const read = () => {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    throw storageError(
      "El navegador no permitió leer el almacenamiento local. No se modificaron datos.",
      "DEMO_STORAGE_UNAVAILABLE",
    );
  }
  return raw === null ? fresh() : parseDatabase(raw);
};
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
export function initializeDemoData(storage = localStorage) {
  let raw;
  try {
    raw = storage.getItem(KEY);
    if (raw !== null) {
      const db = parseDatabase(raw);
      return { initialized: false, version: db.demo_data_version || null };
    }
    const db = createDemoData();
    storage.setItem(KEY, JSON.stringify(db));
    return { initialized: true, version: DEMO_VERSION };
  } catch (error) {
    if (error.code) throw error;
    throw storageError(
      "No se pudieron inicializar los datos locales. No se modificaron datos existentes.",
      "DEMO_STORAGE_UNAVAILABLE",
    );
  }
}
export function resetDemoData(storage = localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify(createDemoData()));
    return { version: DEMO_VERSION };
  } catch {
    throw storageError(
      "No se pudo restaurar la demostración. El navegador no permitió guardar los datos.",
      "DEMO_STORAGE_UNAVAILABLE",
    );
  }
}
const id = (rows) => Math.max(0, ...rows.map((x) => x.id)) + 1;
const fail = (m, field = null, guardianIndex = null) => {
  const error = Error(m);
  if (field) error.field = field;
  if (guardianIndex != null) error.guardianIndex = guardianIndex;
  throw error;
};
const req = (v, label, field = null, guardianIndex = null) => {
  if (typeof v !== "string" || !v.trim()) fail(`${label} es obligatorio`, field, guardianIndex);
  return v.trim();
};
const int = (v, label, min, max, field = null) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail(`${label} no es válido`, field);
  return n;
};
const cents = (v, label = "Monto", field = null) => {
  const s = String(v);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s) || Number(s) <= 0)
    fail(`${label} debe ser positivo y tener hasta dos decimales`, field);
  return Math.round(Number(s) * 100);
};
const date = (v, label, field = null) => {
  const d =
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? new Date(`${v}T12:00:00Z`)
      : null;
  if (!d || Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== v)
    fail(`${label} no es válida`, field);
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
    discount_percent: d?.percent || null,
    discount_basis: d?.basis || null,
    discount_author: d?.authorized_by || null,
    discount_date: d?.authorized_at || null,
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
function guardian(g, index) {
  const x = {
    names: req(g.names, "Nombre del responsable", "g_names", index),
    surnames: req(g.surnames, "Apellido del responsable", "g_surnames", index),
    relationship: req(g.relationship, "Parentesco", "g_relationship", index),
    phone: req(g.phone, "Teléfono", "g_phone", index),
    address: req(g.address, "Dirección del responsable", "g_address", index),
    email: g.email?.trim() || null,
    identity_number: g.identity_number?.trim() || null,
  };
  if (x.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))
    fail("Correo no válido", "g_email", index);
  if (
    !/^\+?[\d ()-]+$/.test(x.phone) ||
    !/^[0-9]{8,15}$/.test(x.phone.replace(/\D/g, ""))
  )
    fail("Teléfono: use entre 8 y 15 dígitos; admite +, espacios y guiones", "g_phone", index);
  return x;
}
function studentData(body) {
  if (!Array.isArray(body.guardians) || !body.guardians.length)
    fail("Agregue al menos un responsable");
  body.guardians.forEach(guardian);
  const s = body.student || body,
    x = {
      names: req(s.names, "Nombres", "names"),
      surnames: req(s.surnames, "Apellidos", "surnames"),
      birth_date: date(s.birth_date, "Fecha de nacimiento", "birth_date"),
      sex: req(s.sex, "Sexo", "sex"),
      address: req(s.address, "Dirección", "address"),
      grade: int(s.grade, "Grado", 1, 6, "grade"),
      school_year: int(s.school_year, "Año lectivo", 2020, 2100, "school_year"),
      status: req(s.status || "Activo", "Estado", "status"),
    };
  if (
    !["Femenino", "Masculino", "Otro"].includes(x.sex) ||
    !["Activo", "Inactivo"].includes(x.status)
  )
    fail("Sexo o estado no válido");
  if (x.birth_date > today()) fail("Fecha de nacimiento no puede ser futura", "birth_date");
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
    created_at: now(),
  });
  Object.assign(student(db, e.student_id), {
    grade: e.grade,
    school_year: e.school_year,
  });
}
function dashboardData(db, year) {
  const cohort = db.students.filter(
    (s) =>
      s.school_year === year ||
      db.enrollments.some(
        (e) => e.student_id === s.id && e.school_year === year,
      ),
  );
  const valid = payments(db).filter(
    (p) => p.status === "Válido" && p.school_year === year,
  );
  return {
    stats: {
      students: cohort.length,
      enrollments: db.enrollments.filter(
        (e) => e.status === "Activa" && e.school_year === year,
      ).length,
      payments_cents: valid.reduce((a, p) => a + p.amount_cents, 0),
      documents: db.documents.filter(
        (d) =>
          d.status === "Pendiente" &&
          cohort.some((s) => s.id === d.student_id),
      ).length,
    },
    monthly: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount_cents: valid
        .filter(
          (p) =>
            receiptPeriod(p.paid_at).year === year &&
            receiptPeriod(p.paid_at).month === i + 1,
        )
        .reduce((a, p) => a + p.amount_cents, 0),
    })),
    activity: db.activity.slice(-6).reverse(),
  };
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
  if (route === "/dashboard" && method === "GET") {
    const year = Number(url.searchParams.get("year")) || yearNow();
    return dashboardData(db, year);
  }
  if (route === "/reports" && method === "GET") {
    const year = Number(url.searchParams.get("year")) || yearNow();
    return {
      ...dashboardData(db, year),
      year,
      payments: payments(db).filter((p) => p.school_year === year),
      enrollments: db.enrollments
        .filter((e) => e.school_year === year)
        .map((e) => ({ ...e, student_name: name(db, e.student_id) })),
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
        ...guardian(g, i),
      })),
    );
    [
      "Partida de nacimiento",
      "Identificación del responsable",
      "Notas del grado anterior",
      "Documento de traslado",
      "Epicrisis",
    ].forEach((kind, i) =>
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
        ...guardian(g, i),
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
    const amount =
        status === "Activa"
          ? cents(b.enrollment_amount, "Monto de matrícula")
          : null,
      e = {
        id: id(db.enrollments),
        student_id,
        grade,
        school_year,
        date: when,
        status,
        created_at: now(),
      };
    if (amount) enrollmentCharge(db, e, amount);
    db.enrollments.push(e);
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
    enrollmentCharge(db, e, cents(b.enrollment_amount, "Monto de matrícula"));
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
      amount_cents = cents(b.amount);
    student(db, student_id);
    if (
      !db.enrollments.some(
        (e) =>
          e.student_id === student_id &&
          e.school_year === school_year &&
          e.status === "Activa",
      )
    )
      fail("El estudiante requiere matrícula activa para ese año");
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
    if (url.searchParams.get("year"))
      rows = rows.filter(
        (p) => p.school_year === Number(url.searchParams.get("year")),
      );
    return rows;
  }
  if (route === "/payments" && method === "POST") {
    const charge_id = int(b.charge_id, "Cargo", 1, 1e9, "charge_id"),
      amount_cents = cents(b.amount, "Abono", "amount"),
      raw = db.charges.find((c) => c.id === charge_id);
    if (!raw) fail("Cargo no encontrado", "charge_id");
    const c = charge(db, raw);
    if (amount_cents > c.balance_cents)
      fail("El abono supera el saldo pendiente", "amount");
    const n = id(db.payments);
    db.payments.push({
      id: n,
      charge_id,
      amount_cents,
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
      percent = int(b.percent, "Porcentaje", 1, 100),
      reason = req(b.reason, "Motivo"),
      basis = req(b.basis, "Base del descuento");
    if (
      !["Monto original del cargo", "Saldo pendiente del cargo"].includes(basis)
    )
      fail("Base del descuento no válida");
    const raw = db.charges.find((c) => c.id === charge_id);
    if (!raw) fail("Cargo no encontrado");
    if (db.discounts.some((d) => d.charge_id === charge_id))
      fail("El cargo ya tiene un descuento");
    const c = charge(db, raw),
      base =
        basis === "Saldo pendiente del cargo"
          ? c.balance_cents
          : c.amount_cents,
      discount_cents = Math.round((base * percent) / 100),
      final_cents = c.amount_cents - discount_cents;
    if (c.paid_cents > final_cents)
      fail("El descuento dejaría pagos mayores al monto final");
    const n = id(db.discounts);
    db.discounts.push({
      id: n,
      charge_id,
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
      rows = charges(db, s.id).filter(
        (c) =>
          !url.searchParams.get("year") ||
          c.school_year === Number(url.searchParams.get("year")),
      ),
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
      charges: rows,
      payments: payments(db).filter(
        (p) =>
          p.student_id === s.id &&
          (!url.searchParams.get("year") ||
            p.school_year === Number(url.searchParams.get("year"))),
      ),
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
const dialogClasses = {
  popup: "app-swal-popup",
  title: "app-swal-title",
  htmlContainer: "app-swal-html",
  actions: "app-swal-actions",
  confirmButton: "app-swal-confirm",
  cancelButton: "app-swal-cancel",
  input: "app-swal-input",
  validationMessage: "app-swal-validation",
};
export function showDialog(options = {}) {
  const opener = document.activeElement;
  const suppliedClose = options.didClose;
  return Swal.fire({
    ...options,
    buttonsStyling: false,
    customClass: { ...dialogClasses, ...options.customClass },
    didClose: (...args) => {
      suppliedClose?.(...args);
      requestAnimationFrame(() => {
        if (opener instanceof HTMLElement && opener.isConnected)
          opener.focus({ preventScroll: true });
      });
    },
  });
}
export function notify(title, text = "", kind = "success") {
  if (window.Swal)
    return showDialog({
      icon: kind,
      title,
      text,
      confirmButtonText: "Aceptar",
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
      await showDialog({
        title,
        text,
        icon: "question",
        showCancelButton: true,
        focusCancel: true,
        customClass: { popup: "app-swal-popup app-swal-popup--confirm" },
        confirmButtonText,
        cancelButtonText: "Cancelar",
      })
    ).isConfirmed;
  return confirm(`${title}\n${text}`);
}

// Calendar dates retain their day; timestamps use Nicaragua civil time.
export function fmtDate(value) {
  if (!value) return "—";
  const calendar = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const normalized = calendar ? `${value}T12:00:00Z` : value.replace(" ", "T");
  const d = new Date(
    calendar || /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
      ? normalized
      : normalized + "Z",
  );
  return Number.isNaN(d.valueOf())
    ? "Fecha no válida"
    : new Intl.DateTimeFormat("es-NI", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: calendar ? "UTC" : "America/Managua",
      }).format(d);
}

export function receiptPeriod(timestamp) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    timeZone: "America/Managua",
  }).formatToParts(new Date(timestamp));
  return {
    year: Number(parts.find((p) => p.type === "year").value),
    month: Number(parts.find((p) => p.type === "month").value),
  };
}
