import {
  api,
  fmtDate,
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
  ["payments", "Caja", "credit-card"],
];
Object.assign(state, {
  year: yearNow(),
  dossier: false,
  tab: "data",
  cashTab: "pay",
  dirty: false,
});
const yearSelect = (all = false) =>
  select(
    "Año lectivo de los cargos",
    "context_year",
    [...(all ? [["", "Todos los años"]] : []), ...years],
    state.year,
  );
const tabs = (items, current, action) =>
  `<div class="task-tabs" aria-label="Secciones">${items.map(([key, label]) => actionButton(action, label, "chevron-right", key === current ? "primary" : "outline", `data-tab="${key}" aria-pressed="${key === current}"`)).join("")}</div>`;
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
    `${s.names} ${s.surnames} · EST-${String(s.id).padStart(4, "0")} · ${grade(s.grade)}`,
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
          class="nav-link ${state.page === id ||
          (id === "students" &&
            ["enrollments", "documents", "account"].includes(state.page))
            ? "active"
            : ""}"
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
          ><small>Primaria · prototipo local</small>
        </div>
      </div>
      <div class="top-right">
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
      </aside>
      <main id="main">${content}</main>
    </div>`;
  icons();
  configureInputs();
  state.formBaseline = formSignature();
  if (document.querySelector("#student-search")) {
    document.querySelector("#student-search").value = state.search || "";
    document.querySelector("#student-grade").value = state.gradeFilter || "";
    filterStudentTable();
  }
  document.querySelector("#main")?.setAttribute("tabindex", "-1");
  document.querySelector("#main")?.focus({ preventScroll: true });
}
function login() {
  app.innerHTML = /* HTML */ `<header class="topbar login-header">
      <div class="brand">
        <div class="brand-mark">🏫</div>
        <div>
          <strong
            >Sistema de Gestión de Matrícula y Mensualidades de Primaria</strong
          ><small>Primaria · prototipo local</small>
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
  const enrollments = await api("/enrollments");
  const payments = await api("/payments");
  const available = new Set([
    ...years.map((y) => Number(y[0])),
    ...state.students.map((s) => s.school_year),
    ...enrollments.map((e) => e.school_year),
    ...payments.map((p) => p.school_year),
  ]);
  years.splice(
    0,
    years.length,
    ...[...available].sort((a, b) => a - b).map((y) => [y, y]),
  );
}
async function go(page) {
  if (
    state.dirty &&
    !(await confirmAction(
      "Cambios sin guardar",
      "¿Desea abandonar los cambios de esta tarea?",
    ))
  )
    return;
  state.dirty = false;
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
  const d = await api(`/dashboard?year=${state.year}`);
  const stats = [
    ["Estudiantes registrados", d.stats.students, "users-round", "blue"],
    ["Matrículas activas", d.stats.enrollments, "clipboard-list", "green"],
    [
      "Pagos del año lectivo",
      money(d.stats.payments_cents),
      "credit-card",
      "gold",
    ],
    ["Documentos pendientes", d.stats.documents, "file-warning", "red"],
  ];
  const bars = Array.from(
    { length: 12 },
    (_, i) => d.monthly.find((m) => m.month === i + 1)?.amount_cents || 0,
  );
  const max = Math.max(...bars, 1);
  return /* HTML */ `${pageTitle(
      "Inicio",
      "Resumen operativo del año lectivo seleccionado.",
    )}
    <div class="page-tools">
      ${yearSelect()}${actionButton(
        "new-student",
        "Registrar estudiante",
        "plus",
      )}${actionButton(
        "open-list",
        "Abrir expediente",
        "search",
        "outline",
      )}<button class="btn primary" data-page="payments">Registrar pago</button
      ><button class="btn outline" data-page="reports">Reportes</button>
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
        `Recepción ${state.year} · cargos ${state.year} · C$`,
        "chart-no-axes-column",
        bars.some(Boolean)
          ? /* HTML */ `<p class="chart-note">Total del indicador: pagos válidos por año lectivo de la obligación. Este gráfico: mismos cargos, agrupados por fecha de recepción dentro de ${state.year}.</p><div class="chart">
              ${bars
                .map(
                  (b, i) =>
                    /* HTML */ `<div class="bar-cell">
                      <small class="bar-month">${months[i]}</small><div class="bar-track"><div class="bar" style="--bar:${Math.round((b / max) * 100)}%" title="${months[i]}: ${money(b)}"></div></div><small class="bar-value">${money(b)}</small>
                    </div>`,
                )
                .join("")}
            </div>`
          : empty(
              "Sin pagos recibidos",
              "No hay pagos recibidos en este año para sus cargos lectivos.",
            ),
      )}${card(
        "Actividad reciente · todos los períodos",
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
    </div> `;
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
  if (form)
    return `${pageTitle("Registrar o editar estudiante", "Los campos con * son obligatorios.")}${form}`;
  if (state.dossier && state.selectedStudent) return dossier();
  return /* HTML */ `${pageTitle(
      "Estudiantes",
      "Busque un estudiante y abra su expediente para continuar una tarea.",
      "Estudiantes",
    )}
    <div class="page-tools">
      ${actionButton("new-student", "Registrar estudiante", "user-round-plus")}
    </div>
    ${form}${card(
      "Estudiantes registrados",
      "users-round",
      /* HTML */ `<div class="filters">
          <label class="field"
            ><span>Buscar por nombre o código</span
            ><input
              id="student-search"
              type="search"
              placeholder="Nombre o EST-0001"
          /></label>
          <label class="field"
            ><span>Grado</span
            ><select id="student-grade">
              <option value="">Todos los grados</option>
              ${grades.map((g) => option(g[0], g[1])).join("")}
            </select></label
          >
        </div>
        <div id="student-table">${studentTable(state.students)}</div>`,
    )}`;
}
function studentTable(rows) {
  return rows.length
    ? /* HTML */ `<div class="table-wrap student-list">
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
                    <td data-label="Grado">${grade(s.grade)}</td>
                    <td data-label="Año lectivo">${s.school_year}</td>
                    <td data-label="Estado">${statusBadge(s.status)}</td>
                    <td data-label="Acciones" class="row-actions">
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
async function enrollments(embedded = false) {
  const list = (await api("/enrollments")).filter(
    (e) =>
      e.student_id === state.selectedStudent &&
      e.school_year === Number(state.year),
  );
  return /* HTML */ `${embedded ? "" : pageTitle(
      "Prematrícula y matrícula",
      "Registre solicitudes y confirme las matrículas del año lectivo.",
      "Matrícula",
    )}
    <div class="two-col">
      ${card(
        "Nueva solicitud",
        "clipboard-plus",
        /* HTML */ `<form id="enrollment-form" class="stack-form">
          <input
            type="hidden"
            name="student_id"
            value="${state.selectedStudent}"
          />${select(
            "Grado solicitado",
            "grade",
            grades,
            state.students.find((s) => s.id === state.selectedStudent)?.grade,
          )}<input
            type="hidden"
            name="school_year"
            value="${state.year}"
          />${field("Fecha", "date", today(), "date")}${select(
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
          ? /* HTML */ `<div class="table-wrap enrollment-list">
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
                          <td data-label="Estudiante">
                            <strong>${h(e.student_name)}</strong
                            ><small>${fmtDate(e.date)}</small>
                          </td>
                          <td data-label="Grado">${grade(e.grade)}</td>
                          <td data-label="Año">${e.school_year}</td>
                          <td data-label="Estado">${statusBadge(e.status)}</td>
                          <td data-label="Acciones" class="row-actions">
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
async function documents(embedded = false) {
  const id = state.selectedStudent;
  const selected = state.students.find((s) => s.id === Number(id));
  const docs = id ? await api(`/students/${id}/documents`) : [];
  return /* HTML */ `${embedded ? "" : pageTitle(
      "Documentos y estado de cuenta",
      "Consulte y actualice los requisitos del estudiante.",
      "Documentos",
    )}
    ${embedded ? "" : `<div class="selection-bar">
      ${select("Estudiante", "selected_student", studentOptions(), id)}
    </div>`}
    ${selected && !embedded
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
        ? /* HTML */ `<div class="table-wrap document-list">
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
                        <td data-label="Documento"><strong>${h(d.kind)}</strong></td>
                        <td data-label="Estado">${statusBadge(d.status)}</td>
                        <td data-label="Fecha de entrega">
                          ${d.delivered_at ? fmtDate(d.delivered_at) : "—"}
                        </td>
                        <td data-label="Observaciones">${h(d.notes || "—")}</td>
                        <td data-label="Acción">
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
  const id = state.selectedStudent;
  const charges = id
    ? (await api(`/charges?student_id=${id}`)).filter(
        (c) => c.school_year === Number(state.year),
      )
    : [];
  state.charges = charges;
  const rows = await api(
    `/payments?year=${state.year}${id ? `&student_id=${id}` : ""}`,
  );
  return `${pageTitle("Caja", id ? "Registre pagos o abonos para el estudiante y año seleccionados." : "Busque y seleccione un estudiante antes de registrar el pago.")}
    ${tabs(
      [
        ["pay", "Registrar pago o abono"],
        ["charge", "Crear mensualidad"],
        ["history", "Historial"],
      ],
      state.cashTab,
      "cash-tab",
    )}
    <div class="cash-context">
      ${id ? `<div class="selected-student"><div><small>Registrando para</small><strong>${h(state.students.find((s) => s.id === id)?.names || "")} ${h(state.students.find((s) => s.id === id)?.surnames || "")}</strong><span>EST-${String(id).padStart(4, "0")} · ${grade(state.students.find((s) => s.id === id)?.grade || 1)}</span></div><button class="btn outline" type="button" data-action="change-cash-student">Cambiar estudiante</button></div>` : `<section class="student-picker" aria-labelledby="cash-student-title"><h2 id="cash-student-title">Elegir estudiante</h2><label class="field"><span>Buscar por nombre o código</span><input id="cash-search" type="search" autocomplete="off" placeholder="Ej.: María Rodríguez o EST-0001" aria-controls="cash-student-results"></label><div id="cash-student-results" class="student-results" aria-live="polite">${cashStudentResults("")}</div></section>`}
      <div class="cash-year">${yearSelect()}</div>
    </div>
    ${
      state.cashTab === "history"
        ? card(
            "Historial · año lectivo seleccionado",
            "history",
            `<div class="filters"><label class="field"><span>Buscar por nombre</span><input id="payment-search" type="search" value="${h(state.paymentSearch || "")}"></label><label class="field"><span>Mes de la obligación</span><select id="payment-month">${option("", "Todos los meses", state.paymentMonth)}${months.map((m, i) => option(i + 1, m, state.paymentMonth)).join("")}</select></label><label class="field"><span>Concepto</span><select id="payment-concept">${["", "Matrícula", "Mensualidad"].map((c) => option(c, c || "Todos los conceptos", state.paymentConcept)).join("")}</select></label></div><div id="payment-table">${paymentTable(rows.filter((p) => (!state.paymentMonth || p.month === Number(state.paymentMonth)) && (!state.paymentConcept || p.concept === state.paymentConcept) && (!state.paymentSearch || p.student_name.toLocaleLowerCase("es").includes(state.paymentSearch.toLocaleLowerCase("es")))))}</div>`,
          )
        : !id
          ? empty(
              "Seleccione un estudiante",
              "Busque y elija uno para continuar. No se ha seleccionado ninguno automáticamente.",
            )
          : state.cashTab === "charge"
            ? card(
                "Crear cargo de mensualidad",
                "plus",
                `<form id="charge-form" class="stack-form"><input type="hidden" name="student_id" value="${id}"><input type="hidden" name="school_year" value="${state.year}">${select(
                  "Mes",
                  "month",
                  months.map((m, i) => [i + 1, m]),
                  new Date().getMonth() + 1,
                )}${field("Monto (C$)", "amount", "", "number", true, 'min="0.01" step="0.01"')}<button class="btn primary">Crear mensualidad</button></form>`,
              )
            : card(
                "Registrar pago o abono",
                "credit-card",
                `<form id="payment-form" class="stack-form"><label class="field"><span>Obligación pendiente *</span><select name="charge_id" id="payment-charge" required>${chargeOptions(charges)}</select></label><div id="charge-review" class="charge-review" aria-live="polite">Seleccione una obligación para revisar sus importes.</div>${field("Monto del abono (C$)", "amount", "", "number", true, 'min="0.01" step="0.01" inputmode="decimal" aria-describedby="amount-error remaining"')}<p id="amount-error" class="field-error" role="alert" aria-live="polite"></p><output id="remaining" class="remaining" aria-live="polite" hidden></output><button class="btn primary payment-submit" disabled>Registrar pago</button></form>`,
              )
    }
    ${
      id && state.cashTab !== "history"
        ? `<details><summary>Consultar cargos y descuentos del período</summary>${chargeTable(charges)}${
            state.user.role === "directora"
              ? charges
                  .filter((c) => !c.discount_cents && c.balance_cents)
                  .map((c) =>
                    actionButton(
                      "discount-charge",
                      `Descuento: ${c.concept} ${c.month ? monthLabel(c.month) : ""}`,
                      "badge-percent",
                      "outline",
                      `data-id="${c.id}"`,
                    ),
                  )
                  .join("")
              : ""
          }</details>`
        : ""
    }`;
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
function cashStudentResults(query) {
  const q = query.trim().toLocaleLowerCase("es");
  if (!q) return `<p class="picker-hint">Escriba un nombre o código para buscar. No se selecciona a nadie automáticamente.</p>`;
  const matches = state.students.filter((s) => `${s.names} ${s.surnames} EST-${String(s.id).padStart(4, "0")} ${s.id}`.toLocaleLowerCase("es").includes(q));
  if (!matches.length) return `<p class="picker-empty">No encontramos estudiantes con “${h(query)}”. Revise el nombre o código.</p>`;
  const shown = matches.slice(0, 6);
  return `<div class="student-result-list">${shown.map((s) => `<button type="button" class="student-result" data-action="select-cash-student" data-id="${s.id}"><strong>${h(s.names)} ${h(s.surnames)}</strong><span>EST-${String(s.id).padStart(4, "0")} · ${grade(s.grade)}</span></button>`).join("")}</div>${matches.length > shown.length ? `<p class="picker-hint">Mostrando 6 de ${matches.length} resultados. Refine la búsqueda para encontrar otro estudiante.</p>` : ""}`;
}
function chargeTable(charges) {
  return /* HTML */ `<div class="table-wrap financial-list">
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
                <td data-label="Concepto">
                  <strong
                    >${h(c.concept)}
                    ${c.month ? monthLabel(c.month) : ""}</strong
                  >
                </td>
                <td data-label="Año">${c.school_year}</td>
                <td data-label="Monto">${money(c.amount_cents)}</td>
                <td data-label="Descuento">
                  ${money(c.discount_cents)}<small
                    >${h(c.discount_reason || "")}${c.discount_percent
                      ? `<br>${c.discount_percent}% · ${h(c.discount_basis)}<br>${h(c.discount_author)} · ${fmtDate(c.discount_date)}`
                      : ""}</small
                  >
                </td>
                <td data-label="Pagado">${money(c.paid_cents)}</td>
                <td data-label="Saldo">
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
    ? /* HTML */ `<div class="table-wrap payment-list">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Concepto</th>
              <th>Fecha de recepción</th>
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
                    <td data-label="Estudiante">
                      <strong>${h(p.student_name)}</strong
                      ><small>Comprobante #${p.id}</small>
                    </td>
                    <td data-label="Concepto">
                      ${h(p.concept)}
                      ${p.month ? monthLabel(p.month) : ""}<small
                        >Año lectivo: ${p.school_year}</small
                      >
                    </td>
                    <td data-label="Fecha de recepción">${fmtDate(p.paid_at)}</td>
                    <td data-label="Monto">${money(p.amount_cents)}</td>
                    <td data-label="Estado">${statusBadge(p.status)}</td>
                    <td data-label="Acciones" class="row-actions">
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
async function account(embedded = false) {
  const id = state.selectedStudent;
  const a = id ? await api(`/students/${id}/account?year=${state.year}`) : null;
  return /* HTML */ `${embedded ? "" : pageTitle(
      "Estado de cuenta",
      "Consulte los pagos, mensualidades y saldo del estudiante.",
    )}
    ${embedded ? "" : `<div class="selection-bar">
      ${select("Estudiante", "selected_student", studentOptions(), id)}${a
        ? actionButton("print-account", "Imprimir estado", "printer", "outline")
        : ""}
    </div>`}
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
async function reportBody() {
  const [d, p, e] = await Promise.all([
    api(`/dashboard?year=${state.year}`),
    api(`/payments?year=${state.year}`),
    api("/enrollments"),
  ]);
  const valid = p.filter((x) => x.status === "Válido");
  return `<p>Año lectivo: ${state.year}. Los pagos se agrupan por año de la obligación, aunque se reciban en otra fecha. Documentos: estado actual de estudiantes vinculados al período.</p><div class="account-stats"><div>Estudiantes <strong>${d.stats.students}</strong></div><div>Matrículas activas <strong>${d.stats.enrollments}</strong></div><div>Pagos válidos <strong>${valid.length}</strong></div><div>Documentos pendientes <strong>${d.stats.documents}</strong></div></div><h2>Matrículas por grado</h2>${grades.map(([n, l]) => `<p>${l}: ${e.filter((x) => x.grade === n && x.status === "Activa" && x.school_year === Number(state.year)).length}</p>`).join("")}<h2>Pagos por concepto · C$</h2>${["Matrícula", "Mensualidad"].map((c) => `<p>${c}: ${money(valid.filter((p) => p.concept === c).reduce((a, p) => a + p.amount_cents, 0))}</p>`).join("")}<p>Total recibido para el año lectivo: ${money(valid.reduce((a, p) => a + p.amount_cents, 0))}</p>`;
}
async function reports() {
  return `${pageTitle("Reportes", "Resumen administrativo del año lectivo.")}<div class="page-tools">${yearSelect()}${actionButton("print-report", "Imprimir reporte", "printer", "outline")}</div>${await reportBody()}`;
}
async function dossier() {
  const s = await api(`/students/${state.selectedStudent}`);
  const heading = `${actionButton("open-list", "Volver al listado", "arrow-left", "quiet")}${pageTitle(`${h(s.names)} ${h(s.surnames)}`, `EST-${String(s.id).padStart(4, "0")} · ${grade(s.grade)} · año registrado ${s.school_year}`)}<div class="page-tools">${["enrollments", "account"].includes(state.tab) ? yearSelect(state.tab === "account") : ""}${actionButton("pay-student", "Registrar pago", "credit-card")}</div>${tabs(
    [
      ["data", "Datos y responsables"],
      ["enrollments", "Matrícula"],
      ["documents", "Documentos"],
      ["account", "Estado de cuenta"],
    ],
    state.tab,
    "student-tab",
  )}`;
  if (state.tab !== "data") {
    const html = await { enrollments, documents, account }[state.tab](true);
    if (state.tab === "account")
      return (
        heading +
        actionButton("print-account", "Imprimir estado", "printer", "outline") +
        `<p>Alcance: ${state.year || "Todos los años"} · saldos actuales.</p>` +
        `<div class="dossier-account">${html}</div>`
      );
    return heading + html;
  }
  return (
    heading +
    card(
      "Datos del estudiante",
      "user",
      `<p>Nacimiento: ${fmtDate(s.birth_date)} · ${h(s.sex)} · ${h(s.status)}</p><p>Dirección: ${h(s.address)}</p>${actionButton("edit-student", "Editar datos y responsables", "pencil", "outline", `data-id="${s.id}"`)}`,
    ) +
    card(
      "Responsables",
      "users",
      s.guardians
        .map(
          (g) =>
            `<p><strong>${h(g.names)} ${h(g.surnames)}</strong> · ${h(g.relationship)}<br>Teléfono: ${h(g.phone)} · ${h(g.address)}<br>${h(g.email || "")} ${h(g.identity_number || "")}</p>`,
        )
        .join(""),
    )
  );
}
const views = {
  dashboard,
  students,
  enrollments,
  documents,
  payments,
  account,
  reports,
};
async function refresh() {
  await go(state.page);
}
function printSection(title, body) {
  const dialog = document.createElement("dialog");
  dialog.className = "print-preview";
  dialog.innerHTML =
    '<div class="page-tools"><button class="btn primary" data-print>Imprimir</button><button class="btn outline" data-close>Cerrar vista previa</button></div><iframe title="Vista previa del comprobante"></iframe>';
  document.body.append(dialog);
  const frame = dialog.querySelector("iframe");
  frame.srcdoc = /* HTML */ `<!doctype html>
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
        <p>Sistema de Gestión de Matrícula y Mensualidades de Primaria</p>
        <h1>${h(title)}</h1>
        <p>Fecha de emisión: ${new Date().toLocaleDateString("es-NI")}</p>
        ${body}
      </body>
    </html>`;
  dialog.querySelector("[data-print]").onclick = () =>
    frame.contentWindow.print();
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
}

async function handleAction(button) {
  const action = button.dataset.action,
    id = button.dataset.id;
  if (action === "select-cash-student" || action === "change-cash-student") {
    if (state.dirty && !(await confirmAction("Cambios sin guardar", "Cambiar el estudiante descartará el formulario actual. ¿Continuar?"))) return;
    state.dirty = false;
    state.selectedStudent = action === "select-cash-student" ? Number(id) : null;
    state.cashSearch = "";
    return refresh();
  }
  if (
    [
      "logout",
      "new-student",
      "cancel-student",
      "edit-student",
      "view-student",
    ].includes(action)
  ) {
    if (
      state.dirty &&
      !(await confirmAction(
        "Cambios sin guardar",
        "¿Desea abandonar los cambios de esta tarea?",
      ))
    )
      return;
    state.dirty = false;
  }
  if (
    ["open-list", "student-tab", "cash-tab", "pay-student"].includes(action)
  ) {
    if (
      state.dirty &&
      !(await confirmAction(
        "Cambios sin guardar",
        "¿Desea abandonar los cambios?",
      ))
    )
      return;
    state.dirty = false;
    if (action === "open-list") {
      state.dossier = false;
      state.showStudentForm = false;
      return go("students");
    }
    if (action === "pay-student") {
      state.cashTab = "pay";
      if (!state.year) state.year = yearNow();
      return go("payments");
    }
    if (action === "cash-tab") state.cashTab = button.dataset.tab;
    else {
      state.tab = button.dataset.tab;
      if (!state.year && state.tab !== "account") state.year = yearNow();
    }
    return refresh();
  }
  if (action === "print-report")
    return printSection("Reporte administrativo", await reportBody());
  if (action === "copy-address") {
    button
      .closest(".guardian-block")
      .querySelector('[name="g_address"]').value =
      document.querySelector('[name="address"]').value;
    state.dirty = true;
    return;
  }
  if (action === "discount-charge") {
    const c = state.charges.find((c) => c.id === Number(id));
    const r = await Swal.fire({
      title: "Autorizar descuento",
      html: `<p>${h(c.concept)} · ${state.year} · cargo ${money(c.amount_cents)} · pagado ${money(c.paid_cents)}</p><label>Porcentaje<input id="disc-percent" type="number" min="1" max="100" value="10" class="swal2-input"></label><label>Base<select id="disc-basis" class="swal2-input"><option>Monto original del cargo</option><option>Saldo pendiente del cargo</option></select></label><label>Motivo<input id="disc-reason" class="swal2-input"></label><p id="disc-preview" aria-live="polite"></p>`,
      showCancelButton: true,
      confirmButtonText: "Autorizar",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const update = () => {
          const base = document.querySelector("#disc-basis").selectedIndex
            ? c.balance_cents
            : c.amount_cents;
          const d = Math.round(
            (base * Number(document.querySelector("#disc-percent").value)) /
              100,
          );
          document.querySelector("#disc-preview").textContent =
            `Descuento: ${money(d)} · Saldo resultante: ${money(c.balance_cents - d)}`;
        };
        document.querySelector("#disc-percent").oninput = update;
        document.querySelector("#disc-basis").onchange = update;
        update();
      },
      preConfirm: async () => {
        try {
          await api("/discounts", {
            method: "POST",
            body: {
              charge_id: c.id,
              percent: document.querySelector("#disc-percent").value,
              basis: document.querySelector("#disc-basis").value,
              reason: document.querySelector("#disc-reason").value,
            },
          });
          return true;
        } catch (e) {
          Swal.showValidationMessage(e.message);
          return false;
        }
      },
    });
    if (r.isConfirmed) return refreshCashDraft();
    return;
  }
  if (action === "logout") {
    await api("/logout", { method: "POST" });
    state.user = null;
    state.selectedStudent = null;
    state.dossier = false;
    state.year = yearNow();
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
    return go("students");
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
    state.dossier = true;
    state.tab = "data";
    return go("students");
  }
  if (action === "add-guardian") {
    const list = document.querySelector("#guardian-list");
    list.insertAdjacentHTML(
      "beforeend",
      guardianFields({}, list.children.length),
    );
    configureInputs();
    state.dirty = true;
    icons();
    return;
  }
  if (action === "remove-guardian") {
    button.closest(".guardian-block").remove();
    state.dirty = true;
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
    state.dirty = false;
    state.tab = "documents";
    await go("students");
    return notify(
      "Matrícula confirmada",
      "Puede actualizar documentos o registrar un pago desde el expediente.",
    );
  }
  if (action === "print-enrollment") {
    const e = (await api("/enrollments")).find((x) => x.id === Number(id));
    return printSection(
      "Comprobante de matrícula",
      /* HTML */ `<p><strong>Estudiante:</strong> ${h(e.student_name)}</p>
        <p><strong>Grado:</strong> ${grade(e.grade)}</p>
        <p><strong>Año lectivo:</strong> ${e.school_year}</p>
        <p><strong>Fecha:</strong> ${fmtDate(e.date)}</p>
        <p>
          <strong>Registro:</strong> #${e.id} ·
          EST-${String(e.student_id).padStart(4, "0")} · ${h(e.status)}
        </p>
        ${chargeTable(
          (await api(`/charges?student_id=${e.student_id}`)).filter(
            (c) => c.enrollment_id === e.id,
          ),
        )}
        <p>Importes y saldo actuales a la emisión.</p>`,
    );
  }
  if (action === "edit-document") {
    const status = button.dataset.status;
    const result = await Swal.fire({
      title: button.dataset.kind,
      html: /* HTML */ `<label for="doc-status">Estado documental</label
        ><select id="doc-status" class="swal2-input">
          <option ${status === "Entregado" ? "selected" : ""}>Entregado</option>
          <option ${status === "Pendiente" ? "selected" : ""}>Pendiente</option>
          <option ${status === "No requerido" ? "selected" : ""}>
            No requerido
          </option></select
        ><label for="doc-date" id="doc-date-label">Fecha de entrega</label
        ><input
          id="doc-date"
          class="swal2-input"
          type="date"
          value="${h(button.dataset.date || today())}"
        /><label for="doc-notes">Observaciones (opcional)</label
        ><textarea
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
      didOpen: () => {
        const status = document.querySelector("#doc-status"),
          date = document.querySelector("#doc-date");
        const update = () => {
          date.hidden = status.value !== "Entregado";
          date.required = !date.hidden;
          document.querySelector("#doc-date-label").hidden = date.hidden;
        };
        status.addEventListener("change", update);
        update();
      },
      preConfirm: () => {
        if (
          document.querySelector("#doc-status").value === "Entregado" &&
          !document.querySelector("#doc-date").value
        ) {
          Swal.showValidationMessage("Indique la fecha de entrega");
          return false;
        }
        return {
          status: document.querySelector("#doc-status").value,
          delivered_at: document.querySelector("#doc-date").value,
          notes: document.querySelector("#doc-notes").value,
        };
      },
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
        <p><strong>Fecha de recepción:</strong> ${fmtDate(p.paid_at)}</p>
        <p><strong>Registrado por:</strong> ${h(p.created_by_name)}</p>
        <p class="total">Monto: ${money(p.amount_cents)}</p>
        ${p.status === "Anulado"
          ? `<p><strong>ANULADO</strong> · Motivo: ${h(p.void_reason)} · Por: ${h(p.voided_by_name)} · ${fmtDate(p.voided_at)}</p>`
          : ""}
        <p>
          Año lectivo: ${p.school_year} ·
          EST-${String(p.student_id).padStart(4, "0")}
        </p>`,
    );
  }
  if (action === "void-payment") {
    const r = await Swal.fire({
      title: "Anular pago",
      html: await paymentContext(id),
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
    const payment = (await api("/payments")).find((p) => p.id === Number(id));
    const account = await api(
      `/students/${payment.student_id}/account?year=${payment.school_year}`,
    );
    await refresh();
    return notify(
      "Pago anulado",
      `Saldo actual del estudiante para ${payment.school_year}: ${money(account.totals.balance_cents)}`,
    );
  }
  if (action === "print-account") {
    const a = await api(
      `/students/${state.selectedStudent}/account?year=${state.year}`,
    );
    return printSection(
      "Estado de cuenta",
      /* HTML */ `<p>
          <strong>Estudiante:</strong> ${h(a.student.names)}
          ${h(a.student.surnames)}
        </p>
        <p>
          <strong>Grado registrado:</strong> ${grade(a.student.grade)} · año
          registrado ${a.student.school_year}
        </p>
        <p>
          Alcance: ${state.year || "Todos los años"}. Saldos actuales a la fecha
          de emisión.
        </p>
        ${chargeTable(a.charges)}
        <p class="total">
          Total cargado: ${money(a.totals.charged_cents)} · Descuentos:
          ${money(a.totals.discount_cents)} · Total pagado:
          ${money(a.totals.paid_cents)} · Saldo pendiente:
          ${money(a.totals.balance_cents)}
        </p>`,
    );
  }
}
document.addEventListener("click", async (event) => {
  const navButton = event.target.closest("[data-page]");
  if (navButton) {
    if (
      state.dirty &&
      !(await confirmAction(
        "Cambios sin guardar",
        "¿Desea abandonar los cambios de esta tarea?",
      ))
    )
      return;
    state.dirty = false;
    state.showStudentForm = false;
    if (!state.year && navButton.dataset.page !== "students")
      state.year = yearNow();
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
  if (el.name === "selected_student" || el.name === "context_year") {
    const previous =
      el.name === "selected_student" ? state.selectedStudent : state.year;
    if (
      state.dirty &&
      !(await confirmAction(
        "Cambios sin guardar",
        "Cambiar el contexto descartará el formulario actual. ¿Continuar?",
      ))
    ) {
      el.value = previous ?? "";
      return;
    }
    state.dirty = false;
    if (el.name === "selected_student")
      state.selectedStudent = Number(el.value) || null;
    else state.year = el.value;
    if (state.page === "payments") {
      const main = document.querySelector("#main");
      main.innerHTML = await payments();
      configureInputs();
      state.formBaseline = formSignature();
      icons();
      main.focus({ preventScroll: true });
      return;
    }
    // Year changes inside the dossier update its task area and leave the shell intact.
    const main = document.querySelector("#main");
    main.innerHTML = await views[state.page]();
    configureInputs();
    state.formBaseline = formSignature();
    icons();
    return;
  }
  if (el.closest("form") && el.form?.id !== "login-form")
    state.dirty = formSignature() !== state.formBaseline;
  if (el.id === "student-grade") filterStudentTable();
  if (el.id === "payment-month" || el.id === "payment-concept")
    filterPaymentTable();
  if (el.id === "payment-charge") updatePaymentPreview();
  configureInputs();
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.closest("form") && el.form?.id !== "login-form")
    state.dirty = formSignature() !== state.formBaseline;
  el.setCustomValidity?.("");
  if (el.id === "student-search") filterStudentTable();
  if (el.id === "payment-search") filterPaymentTable();
  if (el.id === "cash-search") {
    state.cashSearch = el.value;
    const results = document.querySelector("#cash-student-results");
    if (results) results.innerHTML = cashStudentResults(el.value);
    icons();
  }
  if (el.form?.id === "payment-form") updatePaymentPreview();
});
window.addEventListener("beforeunload", (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
function formSignature() {
  return JSON.stringify(
    [...document.querySelectorAll("#main form")].map((f) => [
      f.id,
      [...new FormData(f)],
    ]),
  );
}
function configureInputs() {
  document
    .querySelectorAll('[name="birth_date"]')
    .forEach((el) => (el.max = today()));
  document.querySelectorAll('[name="g_phone"]').forEach((el) => {
    el.pattern = "[+0-9 ()-]{8,25}";
    el.title = "Entre 8 y 15 dígitos; admite +, espacios y guiones";
    if (!el.parentElement.querySelector("small"))
      el.insertAdjacentHTML(
        "afterend",
        "<small>8 a 15 dígitos; admite +, espacios y guiones.</small>",
      );
  });
  document.querySelectorAll('[name="g_address"]').forEach((el) => {
    if (!el.parentElement.querySelector("button"))
      el.insertAdjacentHTML(
        "afterend",
        '<button type="button" class="btn quiet" data-action="copy-address">Usar dirección del estudiante</button>',
      );
  });
  const f = document.querySelector("#enrollment-form");
  if (f) {
    const el = f.elements.enrollment_amount;
    el.disabled = f.elements.status.value !== "Activa";
    el.required = !el.disabled;
    el.closest("label").hidden = el.disabled;
    el.closest("label").querySelector("span").textContent =
      "Monto de matrícula (C$) *";
  }
}
function updatePaymentPreview() {
  const f = document.querySelector("#payment-form");
  if (!f) return;
  const c = state.charges.find(
    (c) => c.id === Number(f.elements.charge_id.value),
  );
  document.querySelector("#charge-review").innerHTML = c
    ? `<div class="charge-summary"><h3>${h(c.concept)}${c.month ? ` · ${monthLabel(c.month)}` : ""} · ${c.school_year}</h3><dl><div><dt>Monto original</dt><dd>${money(c.amount_cents)}</dd></div><div><dt>Descuento</dt><dd>${money(c.discount_cents)}</dd></div><div><dt>Total pagado</dt><dd>${money(c.paid_cents)}</dd></div><div class="charge-balance"><dt>Saldo pendiente</dt><dd>${money(c.balance_cents)}</dd></div></dl></div>`
    : "Seleccione una obligación para ver sus importes.";
  const raw = f.elements.amount.value;
  const amount = raw === "" ? 0 : Math.round(Number(raw) * 100);
  f.elements.amount.max = c ? (c.balance_cents / 100).toFixed(2) : "";
  const error = c && raw !== "" && (!Number.isFinite(amount) || amount < 1 || amount > c.balance_cents)
    ? amount > c.balance_cents ? "El monto supera el saldo disponible de " + money(c.balance_cents) + "." : "Ingrese un monto válido mayor que cero."
    : "";
  document.querySelector("#amount-error").textContent = error;
  const remaining = document.querySelector("#remaining");
  remaining.textContent = c && raw !== "" && !error ? "Saldo después del abono: " + money(c.balance_cents - amount) : "";
  remaining.hidden = !remaining.textContent;
  f.elements.amount.setAttribute("aria-invalid", error ? "true" : "false");
  f.querySelector(".payment-submit").disabled = !c || !raw || !!error;
}
async function refreshCashDraft() {
  const form = document.querySelector("#payment-form");
  const draft = form
    ? {
        charge: form.elements.charge_id.value,
        amount: form.elements.amount.value,
      }
    : null;
  state.dirty = false;
  await refresh();
  if (draft) {
    const next = document.querySelector("#payment-form");
    if (next) {
      next.elements.charge_id.value = draft.charge;
      next.elements.amount.value = draft.amount;
      updatePaymentPreview();
      state.dirty = formSignature() !== state.formBaseline;
    }
  }
}
async function paymentContext(id) {
  const p = (await api("/payments")).find((p) => p.id === Number(id));
  return `<p>${h(p.student_name)} · Comprobante #${p.id}</p><p>${h(p.concept)} ${p.month ? monthLabel(p.month) : ""} · ${p.school_year} · ${money(p.amount_cents)}</p>`;
}
function filterStudentTable() {
  const q =
      document
        .querySelector("#student-search")
        ?.value.toLocaleLowerCase("es") || "",
    g = document.querySelector("#student-grade")?.value;
  state.search = q;
  state.gradeFilter = g;
  document.querySelector("#student-table").innerHTML = studentTable(
    state.students.filter(
      (s) =>
        (!g || s.grade === Number(g)) &&
        `${s.names} ${s.surnames} ${s.id} EST-${String(s.id).padStart(4, "0")}`
          .toLocaleLowerCase("es")
          .includes(q),
    ),
  );
  icons();
}
async function filterPaymentTable() {
  const q = document.querySelector("#payment-search")?.value || "",
    month = document.querySelector("#payment-month")?.value || "",
    concept = document.querySelector("#payment-concept")?.value || "";
  state.paymentSearch = q;
  state.paymentMonth = month;
  state.paymentConcept = concept;
  const rows = await api(
    `/payments?year=${state.year}&student_id=${state.selectedStudent || ""}&q=${encodeURIComponent(q)}&month=${encodeURIComponent(month)}&concept=${encodeURIComponent(concept)}`,
  );
  document.querySelector("#payment-table").innerHTML = paymentTable(rows);
  icons();
}
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.id) return;
  event.preventDefault();
  try {
    const birth = form.querySelector('[name="birth_date"]');
    if (birth && birth.value > today()) {
      birth.setCustomValidity("La fecha de nacimiento no puede ser futura");
      birth.reportValidity();
      return;
    }
    for (const phone of form.querySelectorAll('[name="g_phone"]')) {
      if (
        !/^\+?[\d ()-]+$/.test(phone.value) ||
        !/^[0-9]{8,15}$/.test(phone.value.replace(/\D/g, ""))
      ) {
        phone.setCustomValidity(
          "Use entre 8 y 15 dígitos; admite +, espacios y guiones",
        );
        phone.reportValidity();
        return;
      }
    }
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
      state.dirty = false;
      state.dossier = true;
      state.tab = "data";
      state.year = student.school_year;
      await go("students");
      return notify(
        "Estudiante guardado",
        "Su expediente está abierto. Continúe en Matrícula cuando lo necesite.",
      );
    }
    if (form.id === "enrollment-form") {
      const data = getForm(form);
      await api("/enrollments", { method: "POST", body: data });
      state.dirty = false;
      state.selectedStudent = Number(data.student_id);
      state.year = data.school_year;
      state.tab = "documents";
      await go("students");
      return notify(
        "Solicitud guardada",
        "Puede consultar documentos o registrar un pago.",
      );
    }
    if (form.id === "charge-form") {
      const data = getForm(form);
      await api("/charges", { method: "POST", body: data });
      state.dirty = false;
      notify("Mensualidad creada");
      return refresh();
    }
    if (form.id === "payment-form") {
      const data = getForm(form);
      const charge = state.charges.find((c) => c.id === Number(data.charge_id));
      const cents = Math.round(Number(data.amount) * 100);
      if (!charge || !Number.isFinite(cents) || cents < 1 || cents > charge.balance_cents) {
        const error = document.querySelector("#amount-error");
        error.textContent = charge && cents > charge.balance_cents
          ? `El monto supera el saldo disponible de ${money(charge.balance_cents)}.`
          : "Seleccione una obligación e ingrese un monto válido.";
        form.elements.amount.focus();
        return;
      }
      const saved = await api("/payments", { method: "POST", body: data });
      state.dirty = false;
      await refresh();
      const r = await Swal.fire({
        title: "Pago registrado",
        text: "El saldo se actualizó. Puede imprimir el comprobante o registrar otro pago.",
        showCancelButton: true,
        confirmButtonText: "Ver / imprimir comprobante",
        cancelButtonText: "Registrar otro pago",
      });
      if (r.isConfirmed)
        return handleAction({
          dataset: { action: "print-payment", id: saved.id },
        });
      return;
    }
  } catch (e) {
    let error = form.querySelector(".form-error");
    if (!error) {
      error = document.createElement("p");
      error.className = "form-error";
      error.setAttribute("role", "alert");
      form.append(error);
    }
    error.textContent = e.message;
    const field = form.elements.amount && /abono|saldo|monto/i.test(e.message) ? form.elements.amount : form.querySelector("input,select,textarea");
    field?.focus();
    error.scrollIntoView({ block: "nearest" });
  }
});
try {
  state.user = await api("/me");
  await go("dashboard");
} catch {
  login();
}
