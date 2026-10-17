import {
  api,
  money,
  escape as h,
  today,
  yearNow,
  months,
  grade,
  icon,
  option,
  notify,
  confirmAction,
} from "./api.js";

const app = document.querySelector("#app");
const state = {
  user: null,
  page: "dashboard",
  selectedStudent: null,
  editingStudent: null,
  showStudentForm: false,
  students: [],
  loading: false,
};
const nav = [
  ["dashboard", "Inicio", "house"],
  ["students", "Estudiantes", "users-round"],
  ["enrollments", "Matrícula", "clipboard-list"],
  ["documents", "Documentos", "files"],
  ["payments", "Pagos y mensualidades", "credit-card"],
  ["account", "Estado de cuenta", "file-text"],
  ["reports", "Reportes", "chart-no-axes-column"],
  ["discounts", "Descuentos", "badge-percent"],
];
const field = (
  label,
  name,
  value = "",
  type = "text",
  required = true,
  extra = "",
) =>
  /* HTML */ `<label class="field"
    ><span>${label}${required ? " <b>*</b>" : ""}</span
    ><input
      name="${name}"
      type="${type}"
      value="${h(value)}"
      ${required ? "required" : ""}
      ${extra}
  /></label>`;
const select = (label, name, values, selected, required = true) =>
  /* HTML */ `<label class="field"
    ><span>${label}${required ? " <b>*</b>" : ""}</span
    ><select name="${name}" ${required ? "required" : ""}>
      ${values.map((v) => option(v[0], v[1], selected)).join("")}
    </select></label
  >`;
const grades = [
  [1, "1° de Primaria"],
  [2, "2° de Primaria"],
  [3, "3° de Primaria"],
  [4, "4° de Primaria"],
  [5, "5° de Primaria"],
  [6, "6° de Primaria"],
];
const years = Array.from({ length: 5 }, (_, i) => [
  yearNow() - 1 + i,
  yearNow() - 1 + i,
]);
const studentOptions = () => [
  ["", "Seleccione un estudiante"],
  ...state.students.map((s) => [
    s.id,
    `${s.names} ${s.surnames} · ${grade(s.grade)}`,
  ]),
];
const statusBadge = (text) =>
  /* HTML */ `<span
    class="badge ${text === "Pagado" ||
    text === "Entregado" ||
    text === "Activa" ||
    text === "Válido"
      ? "success"
      : text === "Anulado"
        ? "danger"
        : text === "Abono"
          ? "info"
          : "warning"}"
    >${h(text)}</span
  >`;
const empty = (title, description) =>
  /* HTML */ `<div class="empty">
    ${icon("inbox", 34)}<strong>${title}</strong><span>${description}</span>
  </div>`;
const pageTitle = (title, sub, crumb = title) =>
  /* HTML */ `<div class="page-heading">
    <div>
      <h1>${title}</h1>
      <p>${sub}</p>
    </div>
    <div class="breadcrumb">
      ${icon("house", 18)} Inicio <span>›</span> ${crumb}
    </div>
  </div>`;
const card = (title, iconName, content, right = "") =>
  /* HTML */ `<section class="card">
    <div class="card-head">
      <span class="icon-disc">${icon(iconName, 23)}</span>
      <h2>${title}</h2>
      ${right}
    </div>
    ${content}
  </section>`;
const actionButton = (action, label, iconName, cls = "primary", attrs = "") =>
  /* HTML */ `<button
    type="button"
    class="btn ${cls}"
    data-action="${action}"
    ${attrs}
  >
    ${icon(iconName, 18)} ${label}
  </button>`;
const fmtDate = (value) =>
  value
    ? new Date(
        value.length === 10
          ? `${value}T12:00:00`
          : `${value.replace(" ", "T")}Z`,
      ).toLocaleDateString("es-NI")
    : "—";
const monthLabel = (n) => (n ? months[n - 1] : "—");
const getForm = (form) => Object.fromEntries(new FormData(form));
function icons() {
  if (window.lucide) lucide.createIcons();
}
function renderShell(content) {
  const links = nav
    .filter(([id]) => id !== "discounts" || state.user.role === "directora")
    .map(
      ([id, label, ico]) =>
        /* HTML */ `<button
          class="nav-link ${state.page === id ? "active" : ""}"
          data-page="${id}"
        >
          ${icon(ico, 20)}<span>${label}</span>
        </button>`,
    )
    .join("");
  app.innerHTML = /* HTML */ `<header class="topbar">
      <div class="brand">
        <div class="brand-mark">🏫</div>
        <div>
          <strong
            >Sistema de Gestión de Matrícula y Mensualidades de Primaria</strong
          ><small>Administración escolar eficiente y segura</small>
        </div>
      </div>
      <div class="top-right">
        <div class="slogan">
          ${icon("graduation-cap", 28)}<span
            >Educación de hoy,<br />mejores oportunidades mañana</span
          >
        </div>
        <div class="user-chip">
          <span class="avatar"
            >${state.user.role === "directora" ? "D" : "C"}</span
          ><span
            >${state.user.role === "directora"
              ? "Directora"
              : "Administración y Caja"}<small
              >${h(state.user.username)}</small
            ></span
          ><button
            class="icon-button"
            data-action="logout"
            title="Cerrar sesión"
          >
            ${icon("log-out", 18)}
          </button>
        </div>
      </div>
    </header>
    <div class="layout">
      <aside class="sidebar">
        <nav>${links}</nav>
        <div class="side-art">
          <img src="./assets/school.svg" alt="Ilustración de escuela" />
        </div>
      </aside>
      <main id="main">${content}</main>
    </div>`;
  icons();
}
function login() {
  app.innerHTML = /* HTML */ `<header class="topbar login-header">
      <div class="brand">
        <div class="brand-mark">🏫</div>
        <div>
          <strong
            >Sistema de Gestión de Matrícula y Mensualidades de Primaria</strong
          ><small>Administración escolar eficiente y segura</small>
        </div>
      </div>
      <div class="slogan">
        ${icon("graduation-cap", 28)}<span
          >Educación de hoy,<br />mejores oportunidades mañana</span
        >
      </div>
    </header>
    <main class="login-page">
      <div class="login-panel">
        <div class="login-visual">
          <div class="login-welcome">
            <h1>Bienvenido</h1>
            <p>Gestión escolar al servicio<br />de una mejor educación</p>
          </div>
          <img src="./assets/school.svg" alt="Escuela de primaria" />
        </div>
        <div class="login-form">
          <span class="login-lock">${icon("lock-keyhole", 46)}</span>
          <h2>Iniciar sesión</h2>
          <p>
            Acceda al sistema para gestionar matrículas,<br />mensualidades y
            más.
          </p>
          <form id="login-form">
            <label class="input-icon"
              >${icon("user-round", 20)}<input
                name="username"
                placeholder="Usuario"
                required
                autocomplete="username" /></label
            ><label class="input-icon"
              >${icon("lock-keyhole", 20)}<input
                name="password"
                placeholder="Contraseña"
                type="password"
                required
                autocomplete="current-password"
              /><button
                type="button"
                data-action="toggle-password"
                title="Mostrar contraseña"
              >
                ${icon("eye-off", 19)}
              </button></label
            ><button class="btn primary wide" type="submit">
              Iniciar sesión ${icon("arrow-right", 19)}
            </button>
          </form>
          <div class="demo-credentials">
            Directora: <strong>directora / Directora123!</strong><br />Caja:
            <strong>caja / Caja12345!</strong>
          </div>
          <div class="secure">
            ${icon("shield-check", 19)} Demostración local · datos guardados en
            este navegador
          </div>
        </div>
      </div>
    </main>
    <footer class="footer">
      Sistema de Gestión de Matrícula y Mensualidades de Primaria
      <span>Comprometidos con una educación de calidad</span>
    </footer>`;
  icons();
}
async function loadStudents() {
  state.students = await api("/students");
}
async function go(page) {
  state.page = page;
  state.loading = true;
  renderShell(
    /* HTML */ `<div class="boot">
      <span class="spinner"></span>
      <p>Cargando información…</p>
    </div>`,
  );
  try {
    await loadStudents();
    const view = await views[page]();
    renderShell(view);
  } catch (e) {
    renderShell(
      /* HTML */ `<div class="error-panel">
        ${icon("circle-alert", 32)}
        <h2>No se pudo cargar la página</h2>
        <p>${h(e.message)}</p>
        ${actionButton("retry", "Reintentar", "refresh-cw")}
      </div>`,
    );
  }
  state.loading = false;
}
async function dashboard() {
  const d = await api(`/dashboard?year=${yearNow()}`);
  const stats = [
    ["Estudiantes registrados", d.stats.students, "users-round", "blue"],
    ["Matrículas activas", d.stats.enrollments, "clipboard-list", "green"],
    ["Pagos del mes", money(d.stats.payments_cents), "credit-card", "gold"],
    ["Documentos pendientes", d.stats.documents, "file-warning", "red"],
  ];
  const bars = Array.from(
    { length: 12 },
    (_, i) => d.monthly.find((m) => m.month === i + 1)?.amount_cents || 0,
  );
  const max = Math.max(...bars, 1);
  return /* HTML */ `${pageTitle(
      "Panel principal",
      "Resumen general del sistema escolar",
    )}
    <div class="hero">
      <div>
        <h2>Panel principal</h2>
        <p>Resumen general del sistema escolar</p>
      </div>
      <img src="./assets/school.svg" alt="Escuela" />
    </div>
    <div class="stats">
      ${stats
        .map(
          ([label, value, ico, color]) =>
            /* HTML */ `<div class="stat card">
              <span class="stat-icon ${color}">${icon(ico, 27)}</span>
              <div><span>${label}</span><strong>${value}</strong></div>
            </div>`,
        )
        .join("")}
    </div>
    <div class="dashboard-grid">
      ${card(
        "Pagos por mes",
        "chart-no-axes-column",
        /* HTML */ `<div class="chart">
          ${bars
            .map(
              (b, i) =>
                /* HTML */ `<div class="bar-cell">
                  <div
                    class="bar"
                    style="height:${Math.max(4, Math.round((b / max) * 100))}%"
                    title="${months[i]}: ${money(b)}"
                  ></div>
                  <small>${months[i].slice(0, 3)}</small>
                </div>`,
            )
            .join("")}
        </div>`,
      )}${card(
        "Actividades recientes",
        "clock-3",
        d.activity.length
          ? /* HTML */ `<div class="activity-list">
              ${d.activity
                .map(
                  (a) =>
                    /* HTML */ `<div>
                      ${icon("circle-check", 19)}<span
                        ><strong>${h(a.label)}</strong
                        ><small>${h(a.detail)}</small></span
                      ><time>${fmtDate(a.created_at)}</time>
                    </div>`,
                )
                .join("")}
            </div>`
          : empty(
              "Aún no hay actividades",
              "Las acciones registradas aparecerán aquí.",
            ),
      )}
    </div>
    ${card(
      "Accesos rápidos",
      "zap",
      /* HTML */ `<div class="quick-grid">
        ${[
          ["students", "Registrar estudiante", "user-round-plus"],
          ["enrollments", "Nueva matrícula", "clipboard-plus"],
          ["payments", "Registrar pago", "credit-card"],
          ["account", "Consultar estado", "search"],
        ]
          .map(
            ([p, l, i]) =>
              /* HTML */ `<button class="quick" data-page="${p}">
                ${icon(i, 24)}<span>${l}</span>${icon("arrow-right", 18)}
              </button>`,
          )
          .join("")}
      </div>`,
    )}`;
}
function studentForm(student = {}, guardians = [{}]) {
  return /* HTML */ `<form
    id="student-form"
    data-id="${student.id || ""}"
    class="form-card"
  >
    ${card(
      "Datos del estudiante",
      "user-round",
      /* HTML */ `<div class="form-grid">
        ${field("Nombres", "names", student.names)}${field(
          "Apellidos",
          "surnames",
          student.surnames,
        )}${field(
          "Fecha de nacimiento",
          "birth_date",
          student.birth_date,
          "date",
        )}${select(
          "Sexo",
          "sex",
          [
            ["", "Seleccione"],
            ["Femenino", "Femenino"],
            ["Masculino", "Masculino"],
            ["Otro", "Otro"],
          ],
          student.sex,
        )}
        <div class="span-2">
          ${field("Dirección", "address", student.address)}
        </div>
        ${select(
          "Grado",
          "grade",
          [["", "Seleccione"], ...grades],
          student.grade,
        )}${select(
          "Año lectivo",
          "school_year",
          years,
          student.school_year || yearNow(),
        )}${select(
          "Estado",
          "status",
          [
            ["Activo", "Activo"],
            ["Inactivo", "Inactivo"],
          ],
          student.status,
        )}
      </div>`,
    )}${card(
      "Datos del responsable",
      "users-round",
      /* HTML */ `<div id="guardian-list">
          ${guardians.map((g, i) => guardianFields(g, i)).join("")}
        </div>
        ${actionButton(
          "add-guardian",
          "Agregar responsable",
          "plus",
          "outline",
        )}`,
    )}
    <div class="form-actions">
      <button class="btn primary" type="submit">
        ${icon("save", 18)} Guardar estudiante</button
      >${actionButton("cancel-student", "Cancelar", "x", "quiet")}
    </div>
  </form>`;
}
function guardianFields(g = {}, i = 0) {
  return /* HTML */ `<div class="guardian-block" data-guardian="${i}">
    <div class="guardian-title">
      <strong>Responsable ${i + 1}</strong>${i
        ? actionButton("remove-guardian", "Quitar", "trash-2", "quiet")
        : ""}
    </div>
    <div class="form-grid">
      ${field("Nombres", "g_names", g.names)}${field(
        "Apellidos",
        "g_surnames",
        g.surnames,
      )}${select(
        "Parentesco",
        "g_relationship",
        [
          ["", "Seleccione"],
          ["Madre", "Madre"],
          ["Padre", "Padre"],
          ["Tutor/a", "Tutor/a"],
          ["Otro", "Otro"],
        ],
        g.relationship,
      )}${field("Teléfono", "g_phone", g.phone, "tel")}${field(
        "Dirección",
        "g_address",
        g.address,
      )}${field(
        "Correo electrónico",
        "g_email",
        g.email,
        "email",
        false,
      )}${field(
        "Identificación",
        "g_identity_number",
        g.identity_number,
        "text",
        false,
      )}
    </div>
  </div>`;
}
async function students() {
  let form = "";
  if (state.showStudentForm) {
    if (state.editingStudent) {
      const s = await api(`/students/${state.editingStudent}`);
      form = studentForm(s, s.guardians);
    } else form = studentForm();
  }
  return /* HTML */ `${pageTitle(
      "Registro de estudiantes",
      "Complete la información del estudiante y del responsable.",
      "Estudiantes",
    )}
    <div class="page-tools">
      ${actionButton("new-student", "Registrar estudiante", "user-round-plus")}
    </div>
    ${form}${card(
      "Estudiantes registrados",
      "users-round",
      /* HTML */ `<div class="filters">
          <label class="input-icon"
            >${icon("search", 18)}<input
              id="student-search"
              placeholder="Buscar por nombre o código" /></label
          ><select id="student-grade">
            <option value="">Todos los grados</option>
            ${grades.map((g) => option(g[0], g[1])).join("")}
          </select>
        </div>
        <div id="student-table">${studentTable(state.students)}</div>`,
    )}`;
}
function studentTable(rows) {
  return rows.length
    ? /* HTML */ `<div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Grado</th>
              <th>Año lectivo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (s) =>
                  /* HTML */ `<tr>
                    <td>
                      <strong>${h(s.names)} ${h(s.surnames)}</strong
                      ><small>Cód. EST-${String(s.id).padStart(4, "0")}</small>
                    </td>
                    <td>${grade(s.grade)}</td>
                    <td>${s.school_year}</td>
                    <td>${statusBadge(s.status)}</td>
                    <td class="row-actions">
                      ${actionButton(
                        "view-student",
                        "Ver",
                        "eye",
                        "small outline",
                        `data-id="${s.id}"`,
                      )}${actionButton(
                        "edit-student",
                        "Editar",
                        "pencil",
                        "small outline",
                        `data-id="${s.id}"`,
                      )}
                    </td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
    : empty(
        "No hay estudiantes",
        "Registre el primer estudiante para comenzar.",
      );
}
async function enrollments() {
  const list = await api("/enrollments");
  return /* HTML */ `${pageTitle(
      "Prematrícula y matrícula",
      "Registre solicitudes y confirme las matrículas del año lectivo.",
      "Matrícula",
    )}
    <div class="two-col">
      ${card(
        "Nueva solicitud",
        "clipboard-plus",
        /* HTML */ `<form id="enrollment-form" class="stack-form">
          ${select(
            "Estudiante",
            "student_id",
            studentOptions(),
            state.selectedStudent,
          )}${select("Grado solicitado", "grade", [
            ["", "Seleccione"],
            ...grades,
          ])}${select("Año lectivo", "school_year", years, yearNow())}${field(
            "Fecha",
            "date",
            today(),
            "date",
          )}${select(
            "Tipo",
            "status",
            [
              ["Prematrícula", "Prematrícula"],
              ["Activa", "Matrícula directa"],
            ],
            "Prematrícula",
          )}${field(
            "Monto de matrícula (C$)",
            "enrollment_amount",
            "",
            "number",
            false,
            'min="0.01" step="0.01" placeholder="Se requiere al confirmar"',
          )}<button class="btn primary" type="submit">
            ${icon("save", 18)} Guardar solicitud
          </button>
        </form>`,
      )}${card(
        "Matrículas registradas",
        "list",
        list.length
          ? /* HTML */ `<div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Grado</th>
                    <th>Año</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${list
                    .map(
                      (e) =>
                        /* HTML */ `<tr>
                          <td>
                            <strong>${h(e.student_name)}</strong
                            ><small>${fmtDate(e.date)}</small>
                          </td>
                          <td>${grade(e.grade)}</td>
                          <td>${e.school_year}</td>
                          <td>${statusBadge(e.status)}</td>
                          <td class="row-actions">
                            ${e.status === "Prematrícula"
                              ? actionButton(
                                  "confirm-enrollment",
                                  "Confirmar",
                                  "check",
                                  "small primary",
                                  `data-id="${e.id}"`,
                                )
                              : actionButton(
                                  "print-enrollment",
                                  "Comprobante",
                                  "printer",
                                  "small outline",
                                  `data-id="${e.id}"`,
                                )}
                          </td>
                        </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`
          : empty(
              "Sin matrículas",
              "Registre una prematrícula o matrícula directa.",
            ),
      )}
    </div>`;
}
async function documents() {
  const id = state.selectedStudent || state.students[0]?.id;
  const selected = state.students.find((s) => s.id === Number(id));
  const docs = id ? await api(`/students/${id}/documents`) : [];
  return /* HTML */ `${pageTitle(
      "Documentos y estado de cuenta",
      "Consulte y actualice los requisitos del estudiante.",
      "Documentos",
    )}
    <div class="selection-bar">
      ${select("Estudiante", "selected_student", studentOptions(), id)}
    </div>
    ${selected
      ? /* HTML */ `<div class="student-banner">
          <span class="student-avatar">${icon("user-round", 32)}</span>
          <div>
            <small>Estudiante</small
            ><strong>${h(selected.names)} ${h(selected.surnames)}</strong
            ><span>ID: EST-${String(selected.id).padStart(4, "0")}</span>
          </div>
          <div>
            <small>Grado</small><strong>${grade(selected.grade)}</strong>
          </div>
          <div>
            <small>Año lectivo</small><strong>${selected.school_year}</strong>
          </div>
        </div>`
      : ""}${card(
      "Control de documentos",
      "file-text",
      docs.length
        ? /* HTML */ `<div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Estado</th>
                  <th>Fecha de entrega</th>
                  <th>Observaciones</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                ${docs
                  .map(
                    (d) =>
                      /* HTML */ `<tr>
                        <td><strong>${h(d.kind)}</strong></td>
                        <td>${statusBadge(d.status)}</td>
                        <td>
                          ${d.delivered_at ? fmtDate(d.delivered_at) : "—"}
                        </td>
                        <td>${h(d.notes || "—")}</td>
                        <td>
                          ${actionButton(
                            "edit-document",
                            "Actualizar",
                            "pencil",
                            "small outline",
                            `data-id="${d.id}" data-kind="${h(d.kind)}" data-status="${h(d.status)}" data-date="${h(d.delivered_at || "")}" data-notes="${h(d.notes)}"`,
                          )}
                        </td>
                      </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>`
        : empty("Sin documentos", "Seleccione o registre un estudiante."),
    )}`;
}
async function payments() {
  const rows = await api("/payments");
  const month = new Date().getMonth() + 1;
  const current = rows.filter(
    (p) =>
      p.status === "Válido" && p.paid_at.slice(0, 7) === today().slice(0, 7),
  );
  const id = state.selectedStudent || state.students[0]?.id;
  const charges = id ? await api(`/charges?student_id=${id}`) : [];
  return /* HTML */ `${pageTitle(
      "Pagos y mensualidades",
      "Registro de pagos, abonos y control de mensualidades.",
    )}
    <div class="payments-top">
      ${card(
        "Buscar y filtrar",
        "search",
        /* HTML */ `<div class="filters">
          <label class="input-icon"
            >${icon("search", 18)}<input
              id="payment-search"
              placeholder="Nombre del estudiante" /></label
          ><select id="payment-month">
            <option value="">Todos los meses</option>
            ${months.map((m, i) => option(i + 1, m)).join("")}</select
          ><select id="payment-concept">
            <option value="">Todos los conceptos</option>
            <option>Matrícula</option>
            <option>Mensualidad</option>
          </select>
        </div>`,
      )}${card(
        "Resumen del mes",
        "chart-no-axes-column",
        /* HTML */ `<div class="mini-stats">
          <div>
            <span>Pagos registrados</span><strong>${current.length}</strong>
          </div>
          <div>
            <span>Total del mes</span
            ><strong class="green-text"
              >${money(current.reduce((a, p) => a + p.amount_cents, 0))}</strong
            >
          </div>
        </div>`,
      )}
    </div>
    <div class="two-col">
      ${card(
        "Registrar cargo y pago",
        "credit-card",
        /* HTML */ `<form id="charge-form" class="stack-form">
            <h3>Nueva mensualidad</h3>
            ${select("Estudiante", "student_id", studentOptions(), id)}${select(
              "Año lectivo",
              "school_year",
              years,
              yearNow(),
            )}${select(
              "Mes",
              "month",
              months.map((m, i) => [i + 1, m]),
              month,
            )}${field(
              "Monto (C$)",
              "amount",
              "",
              "number",
              true,
              'min="0.01" step="0.01"',
            )}<button class="btn outline" type="submit">
              ${icon("plus", 18)} Crear mensualidad
            </button>
          </form>
          <form id="payment-form" class="stack-form with-divider">
            <h3>Registrar pago o abono</h3>
            ${select("Estudiante", "student_id", studentOptions(), id)}<label
              class="field"
              ><span>Cargo *</span
              ><select name="charge_id" id="payment-charge" required>
                ${chargeOptions(charges)}
              </select></label
            >${field(
              "Monto del abono (C$)",
              "amount",
              "",
              "number",
              true,
              'min="0.01" step="0.01"',
            )}<button class="btn primary" type="submit">
              ${icon("credit-card", 18)} Registrar pago
            </button>
          </form>`,
      )}${card(
        "Cargos del estudiante",
        "receipt",
        charges.length
          ? chargeTable(charges)
          : empty(
              "Sin cargos",
              "Seleccione un estudiante con matrícula activa y cree una mensualidad.",
            ),
      )}
    </div>
    ${card(
      "Listado de pagos y mensualidades",
      "list",
      /* HTML */ `<div id="payment-table">${paymentTable(rows)}</div>`,
    )}`;
}
function chargeOptions(charges) {
  const open = charges.filter((c) => c.balance_cents > 0);
  return /* HTML */ `<option value="">Seleccione un cargo</option>
    ${open
      .map((c) =>
        option(
          c.id,
          `${c.concept}${c.month ? ` · ${monthLabel(c.month)}` : ""} ${c.school_year} — saldo ${money(c.balance_cents)}`,
        ),
      )
      .join("")}`;
}
function chargeTable(charges) {
  return /* HTML */ `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th>Año</th>
          <th>Monto</th>
          <th>Descuento</th>
          <th>Pagado</th>
          <th>Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${charges
          .map(
            (c) =>
              /* HTML */ `<tr>
                <td>
                  <strong
                    >${h(c.concept)}
                    ${c.month ? monthLabel(c.month) : ""}</strong
                  >
                </td>
                <td>${c.school_year}</td>
                <td>${money(c.amount_cents)}</td>
                <td>${money(c.discount_cents)}</td>
                <td>${money(c.paid_cents)}</td>
                <td>
                  <strong class="${c.balance_cents ? "red-text" : "green-text"}"
                    >${money(c.balance_cents)}</strong
                  >
                </td>
              </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>`;
}
function paymentTable(rows) {
  return rows.length
    ? /* HTML */ `<div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Concepto</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (p) =>
                  /* HTML */ `<tr>
                    <td>
                      <strong>${h(p.student_name)}</strong
                      ><small>Comprobante #${p.id}</small>
                    </td>
                    <td>
                      ${h(p.concept)} ${p.month ? monthLabel(p.month) : ""}
                    </td>
                    <td>${fmtDate(p.paid_at)}</td>
                    <td>${money(p.amount_cents)}</td>
                    <td>${statusBadge(p.status)}</td>
                    <td class="row-actions">
                      ${actionButton(
                        "print-payment",
                        "Imprimir",
                        "printer",
                        "small outline",
                        `data-id="${p.id}"`,
                      )}${state.user.role === "directora" &&
                      p.status === "Válido"
                        ? actionButton(
                            "void-payment",
                            "Anular",
                            "ban",
                            "small danger-btn",
                            `data-id="${p.id}"`,
                          )
                        : ""}
                    </td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
    : empty("Sin pagos registrados", "Los pagos y abonos aparecerán aquí.");
}
async function account() {
  const id = state.selectedStudent || state.students[0]?.id;
  const a = id ? await api(`/students/${id}/account`) : null;
  return /* HTML */ `${pageTitle(
      "Estado de cuenta",
      "Consulte los pagos, mensualidades y saldo del estudiante.",
    )}
    <div class="selection-bar">
      ${select("Estudiante", "selected_student", studentOptions(), id)}${a
        ? actionButton("print-account", "Imprimir estado", "printer", "outline")
        : ""}
    </div>
    ${a
      ? /* HTML */ `<div class="student-banner">
            <span class="student-avatar">${icon("graduation-cap", 32)}</span>
            <div>
              <small>Estudiante</small
              ><strong>${h(a.student.names)} ${h(a.student.surnames)}</strong
              ><span>ID: EST-${String(a.student.id).padStart(4, "0")}</span>
            </div>
            <div>
              <small>Grado</small><strong>${grade(a.student.grade)}</strong>
            </div>
            <div>
              <small>Año lectivo</small
              ><strong>${a.student.school_year}</strong>
            </div>
          </div>
          <div class="account-stats">
            <div>
              <span>Total cargado</span
              ><strong>${money(a.totals.charged_cents)}</strong>
            </div>
            <div>
              <span>Descuentos</span
              ><strong>${money(a.totals.discount_cents)}</strong>
            </div>
            <div>
              <span>Total pagado</span
              ><strong class="green-text">${money(a.totals.paid_cents)}</strong>
            </div>
            <div class="balance">
              <span>Saldo pendiente</span
              ><strong>${money(a.totals.balance_cents)}</strong>
            </div>
          </div>
          ${card(
            "Estado de cargos",
            "file-text",
            a.charges.length
              ? chargeTable(a.charges)
              : empty(
                  "Sin cargos",
                  "Confirme una matrícula o cree una mensualidad.",
                ),
          )}${card(
            "Historial de pagos y abonos",
            "history",
            paymentTable(
              a.payments.map((p) => ({
                ...p,
                student_name: `${a.student.names} ${a.student.surnames}`,
              })),
            ),
          )}`
      : empty(
          "Sin estudiante seleccionado",
          "Registre o seleccione un estudiante para consultar su cuenta.",
        )}`;
}
async function discounts() {
  const rows = await api("/discounts");
  const id = state.selectedStudent || state.students[0]?.id;
  const charges = id ? await api(`/charges?student_id=${id}`) : [];
  return /* HTML */ `${pageTitle(
      "Descuentos autorizados",
      "La directora puede aplicar descuentos a cargos pendientes.",
      "Descuentos",
    )}
    <div class="two-col">
      ${card(
        "Autorizar descuento",
        "badge-percent",
        /* HTML */ `<form id="discount-form" class="stack-form">
          ${select("Estudiante", "student_id", studentOptions(), id)}<label
            class="field"
            ><span>Cargo *</span
            ><select name="charge_id" id="discount-charge" required>
              <option value="">Seleccione un cargo</option>
              ${charges
                .filter((c) => !c.discount_cents)
                .map((c) =>
                  option(
                    c.id,
                    `${c.concept} ${c.month ? monthLabel(c.month) : ""} — ${money(c.amount_cents)}`,
                  ),
                )
                .join("")}
            </select></label
          >${field(
            "Motivo",
            "reason",
            "",
            "text",
            true,
            'placeholder="Por ejemplo, dos o más hermanos"',
          )}${field(
            "Porcentaje autorizado",
            "percent",
            10,
            "number",
            true,
            'min="1" max="100"',
          )}${select(
            "Base del descuento",
            "basis",
            [
              ["Monto original del cargo", "Monto original del cargo"],
              ["Saldo pendiente del cargo", "Saldo pendiente del cargo"],
            ],
            "Monto original del cargo",
          )}
          <p class="hint">
            Para hermanos, confirme la política del centro y elija la base antes
            de autorizar el 10 %.
          </p>
          <button class="btn primary" type="submit">
            ${icon("check", 18)} Autorizar descuento
          </button>
        </form>`,
      )}${card(
        "Historial de descuentos",
        "list",
        rows.length
          ? /* HTML */ `<div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Cargo</th>
                    <th>Motivo</th>
                    <th>Descuento</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (d) =>
                        /* HTML */ `<tr>
                          <td>${h(d.student_name)}</td>
                          <td>
                            ${h(d.concept)}
                            ${d.month ? monthLabel(d.month) : ""}
                          </td>
                          <td>
                            ${h(d.reason)}<small
                              >${d.percent}% · ${h(d.basis)}</small
                            >
                          </td>
                          <td>
                            ${money(d.discount_cents)}<small
                              >Final: ${money(d.final_cents)}</small
                            >
                          </td>
                        </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`
          : empty(
              "Sin descuentos",
              "Los descuentos autorizados aparecerán aquí.",
            ),
      )}
    </div>`;
}
async function reports() {
  const [d, p, e] = await Promise.all([
    api(`/dashboard?year=${yearNow()}`),
    api("/payments"),
    api("/enrollments"),
  ]);
  const valid = p.filter((x) => x.status === "Válido");
  return /* HTML */ `${pageTitle(
      "Reportes",
      "Resumen administrativo y financiero del año lectivo.",
    )}
    <div class="page-tools">
      ${actionButton("print-account", "Imprimir reporte", "printer", "outline")}
    </div>
    <div class="stats">
      ${[
        ["Estudiantes", d.stats.students, "users-round", "blue"],
        ["Matrículas activas", d.stats.enrollments, "clipboard-list", "green"],
        ["Pagos válidos", valid.length, "credit-card", "gold"],
        ["Documentos pendientes", d.stats.documents, "file-warning", "red"],
      ]
        .map(
          ([l, v, i, c]) =>
            /* HTML */ `<div class="stat card">
              <span class="stat-icon ${c}">${icon(i, 27)}</span>
              <div><span>${l}</span><strong>${v}</strong></div>
            </div>`,
        )
        .join("")}
    </div>
    <div class="two-col">
      ${card(
        "Matrículas por grado",
        "graduation-cap",
        grades
          .map(
            ([n, l]) =>
              /* HTML */ `<div class="report-row">
                <span>${l}</span
                ><strong
                  >${e.filter((x) => x.grade === n && x.status === "Activa")
                    .length}</strong
                >
              </div>`,
          )
          .join(""),
      )}${card(
        "Pagos por concepto",
        "credit-card",
        /* HTML */ `<div class="report-row">
            <span>Matrículas</span
            ><strong
              >${money(
                valid
                  .filter((x) => x.concept === "Matrícula")
                  .reduce((a, x) => a + x.amount_cents, 0),
              )}</strong
            >
          </div>
          <div class="report-row">
            <span>Mensualidades</span
            ><strong
              >${money(
                valid
                  .filter((x) => x.concept === "Mensualidad")
                  .reduce((a, x) => a + x.amount_cents, 0),
              )}</strong
            >
          </div>`,
      )}
    </div>`;
}
const views = {
  dashboard,
  students,
  enrollments,
  documents,
  payments,
  account,
  reports,
  discounts,
};
async function refresh() {
  await go(state.page);
}
function printSection(title, body) {
  const win = window.open("", "_blank");
  if (!win)
    return notify(
      "Permita las ventanas emergentes para imprimir",
      "",
      "warning",
    );
  win.document.write(
    /* HTML */ `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${h(title)}</title>
          <style>
            body {
              font: 15px Arial;
              margin: 35px;
              color: #102257;
            }
            h1 {
              font-size: 23px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th,
            td {
              text-align: left;
              padding: 9px;
              border-bottom: 1px solid #d9e3ef;
            }
            small {
              display: block;
              color: #60769a;
            }
            .badge {
              color: #12744a;
            }
            .row-actions,
            button {
              display: none;
            }
            .total {
              margin-top: 20px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>${h(title)}</h1>
          <p>Fecha de emisión: ${new Date().toLocaleDateString("es-NI")}</p>
          ${body}
        </body>
      </html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}
async function handleAction(button) {
  const action = button.dataset.action,
    id = button.dataset.id;
  if (action === "logout") {
    await api("/logout", { method: "POST" });
    state.user = null;
    login();
    return;
  }
  if (action === "toggle-password") {
    const input = document.querySelector("input[name=password]");
    input.type = input.type === "password" ? "text" : "password";
    return;
  }
  if (action === "retry") return refresh();
  if (action === "new-student") {
    state.showStudentForm = true;
    state.editingStudent = null;
    return refresh();
  }
  if (action === "cancel-student") {
    state.showStudentForm = false;
    state.editingStudent = null;
    return refresh();
  }
  if (action === "edit-student") {
    state.showStudentForm = true;
    state.editingStudent = id;
    await refresh();
    document
      .querySelector("#student-form")
      ?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (action === "view-student") {
    state.selectedStudent = Number(id);
    return go("account");
  }
  if (action === "add-guardian") {
    const list = document.querySelector("#guardian-list");
    list.insertAdjacentHTML(
      "beforeend",
      guardianFields({}, list.children.length),
    );
    icons();
    return;
  }
  if (action === "remove-guardian") {
    button.closest(".guardian-block").remove();
    return;
  }
  if (action === "confirm-enrollment") {
    const r = await Swal.fire({
      title: "Confirmar matrícula",
      input: "number",
      inputLabel: "Monto de matrícula (C$)",
      inputAttributes: { min: "0.01", step: "0.01" },
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1069e8",
    });
    if (!r.isConfirmed) return;
    await api(`/enrollments/${id}/confirm`, {
      method: "POST",
      body: { enrollment_amount: r.value },
    });
    notify("Matrícula confirmada");
    return refresh();
  }
  if (action === "print-enrollment") {
    const e = (await api("/enrollments")).find((x) => x.id === Number(id));
    return printSection(
      "Comprobante de matrícula",
      /* HTML */ `<p><strong>Estudiante:</strong> ${h(e.student_name)}</p>
        <p><strong>Grado:</strong> ${grade(e.grade)}</p>
        <p><strong>Año lectivo:</strong> ${e.school_year}</p>
        <p><strong>Fecha:</strong> ${h(e.date)}</p>
        <p><strong>Registro:</strong> #${e.id}</p>`,
    );
  }
  if (action === "edit-document") {
    const status = button.dataset.status;
    const result = await Swal.fire({
      title: button.dataset.kind,
      html: /* HTML */ `<select id="doc-status" class="swal2-input">
          <option ${status === "Entregado" ? "selected" : ""}>Entregado</option>
          <option ${status === "Pendiente" ? "selected" : ""}>Pendiente</option>
          <option ${status === "No requerido" ? "selected" : ""}>
            No requerido
          </option></select
        ><input
          id="doc-date"
          class="swal2-input"
          type="date"
          value="${h(button.dataset.date || today())}"
        /><textarea
          id="doc-notes"
          class="swal2-textarea"
          placeholder="Observaciones"
        >
${h(button.dataset.notes)}</textarea
        >`,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1069e8",
      preConfirm: () => ({
        status: document.querySelector("#doc-status").value,
        delivered_at: document.querySelector("#doc-date").value,
        notes: document.querySelector("#doc-notes").value,
      }),
    });
    if (!result.isConfirmed) return;
    await api(`/documents/${id}`, { method: "PUT", body: result.value });
    notify("Documento actualizado");
    return refresh();
  }
  if (action === "print-payment") {
    const p = (await api("/payments")).find((x) => x.id === Number(id));
    return printSection(
      `Comprobante de pago #${p.id}`,
      /* HTML */ `<p><strong>Estudiante:</strong> ${h(p.student_name)}</p>
        <p>
          <strong>Concepto:</strong> ${h(p.concept)}
          ${p.month ? monthLabel(p.month) : ""}
        </p>
        <p><strong>Fecha:</strong> ${fmtDate(p.paid_at)}</p>
        <p><strong>Registrado por:</strong> ${h(p.created_by_name)}</p>
        <p class="total">Monto: ${money(p.amount_cents)}</p>
        ${p.status === "Anulado" ? "<p>ANULADO</p>" : ""}`,
    );
  }
  if (action === "void-payment") {
    const r = await Swal.fire({
      title: "Anular pago",
      input: "textarea",
      inputLabel: "Motivo de anulación",
      showCancelButton: true,
      confirmButtonText: "Anular pago",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d12b43",
      inputValidator: (v) =>
        !v || v.trim().length < 5 ? "Escriba al menos 5 caracteres" : undefined,
    });
    if (!r.isConfirmed) return;
    await api(`/payments/${id}/void`, {
      method: "POST",
      body: { reason: r.value },
    });
    notify("Pago anulado", "El saldo fue recalculado.");
    return refresh();
  }
  if (action === "print-account") {
    if (state.page === "reports")
      return printSection(
        "Reporte administrativo",
        document.querySelector("#main").innerHTML,
      );
    const a = await api(
      `/students/${state.selectedStudent || state.students[0].id}/account`,
    );
    return printSection(
      "Estado de cuenta",
      /* HTML */ `<p>
          <strong>Estudiante:</strong> ${h(a.student.names)}
          ${h(a.student.surnames)}
        </p>
        <p>
          <strong>Grado:</strong> ${grade(a.student.grade)} ·
          ${a.student.school_year}
        </p>
        ${chargeTable(a.charges)}
        <p class="total">
          Total pagado: ${money(a.totals.paid_cents)} · Saldo pendiente:
          ${money(a.totals.balance_cents)}
        </p>`,
    );
  }
}
document.addEventListener("click", async (event) => {
  const navButton = event.target.closest("[data-page]");
  if (navButton) {
    state.showStudentForm = false;
    return go(navButton.dataset.page);
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  try {
    await handleAction(button);
  } catch (e) {
    notify("No se pudo completar", e.message, "error");
  }
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  if (
    el.name === "selected_student" ||
    (el.name === "student_id" &&
      ["charge-form", "payment-form", "discount-form"].includes(el.form?.id))
  ) {
    state.selectedStudent = Number(el.value) || null;
    await refresh();
  }
  if (el.id === "student-grade") filterStudentTable();
  if (el.id === "payment-month" || el.id === "payment-concept")
    filterPaymentTable();
});
document.addEventListener("input", (event) => {
  if (event.target.id === "student-search") filterStudentTable();
  if (event.target.id === "payment-search") filterPaymentTable();
});
function filterStudentTable() {
  const q =
      document
        .querySelector("#student-search")
        ?.value.toLocaleLowerCase("es") || "",
    g = document.querySelector("#student-grade")?.value;
  document.querySelector("#student-table").innerHTML = studentTable(
    state.students.filter(
      (s) =>
        (!g || s.grade === Number(g)) &&
        `${s.names} ${s.surnames} ${s.id}`.toLocaleLowerCase("es").includes(q),
    ),
  );
  icons();
}
async function filterPaymentTable() {
  const q = document.querySelector("#payment-search")?.value || "",
    month = document.querySelector("#payment-month")?.value || "",
    concept = document.querySelector("#payment-concept")?.value || "";
  const rows = await api(
    `/payments?q=${encodeURIComponent(q)}&month=${encodeURIComponent(month)}&concept=${encodeURIComponent(concept)}`,
  );
  document.querySelector("#payment-table").innerHTML = paymentTable(rows);
  icons();
}
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.id) return;
  event.preventDefault();
  try {
    if (form.id === "login-form") {
      const data = getForm(form);
      state.user = await api("/login", { method: "POST", body: data });
      await go("dashboard");
      return;
    }
    if (form.id === "student-form") {
      const data = getForm(form),
        guardians = [...form.querySelectorAll(".guardian-block")].map(
          (block) => {
            const g = (name) =>
              block.querySelector(`[name="${name}"]`)?.value || "";
            return {
              names: g("g_names"),
              surnames: g("g_surnames"),
              relationship: g("g_relationship"),
              phone: g("g_phone"),
              address: g("g_address"),
              email: g("g_email"),
              identity_number: g("g_identity_number"),
            };
          },
        );
      const student = {
        names: data.names,
        surnames: data.surnames,
        birth_date: data.birth_date,
        sex: data.sex,
        address: data.address,
        grade: Number(data.grade),
        school_year: Number(data.school_year),
        status: data.status,
      };
      const id = form.dataset.id;
      const result = await api(id ? `/students/${id}` : "/students", {
        method: id ? "PUT" : "POST",
        body: { student, guardians },
      });
      state.selectedStudent = result.id;
      state.showStudentForm = false;
      state.editingStudent = null;
      notify("Estudiante guardado");
      return refresh();
    }
    if (form.id === "enrollment-form") {
      const data = getForm(form);
      await api("/enrollments", { method: "POST", body: data });
      notify("Solicitud guardada");
      return refresh();
    }
    if (form.id === "charge-form") {
      const data = getForm(form);
      await api("/charges", { method: "POST", body: data });
      notify("Mensualidad creada");
      return refresh();
    }
    if (form.id === "payment-form") {
      const data = getForm(form);
      await api("/payments", { method: "POST", body: data });
      notify("Pago registrado");
      return refresh();
    }
    if (form.id === "discount-form") {
      const data = getForm(form);
      if (
        !(await confirmAction(
          "Autorizar descuento",
          `Se aplicará ${data.percent}% al cargo seleccionado.`,
        ))
      )
        return;
      await api("/discounts", { method: "POST", body: data });
      notify("Descuento autorizado");
      return refresh();
    }
  } catch (e) {
    notify("Revise los datos", e.message, "error");
  }
});
try {
  state.user = await api("/me");
  await go("dashboard");
} catch {
  login();
}
