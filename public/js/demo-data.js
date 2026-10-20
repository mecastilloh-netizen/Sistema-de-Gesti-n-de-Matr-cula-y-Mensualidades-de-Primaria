// Escenario ficticio, determinista y local para demostraciones escolares.
export const DEMO_VERSION = "2026.1-30-estudiantes";

const roster = [
  { grade: 1, names: "Ana Lucía", surnames: "Benítez Solórzano", birth_date: "2020-03-14", sex: "Femenino", address: "Residencial Los Pinos, sector de prueba 01, Managua", guardians: [{ names: "Nora", surnames: "Benítez Solórzano", relationship: "Madre" }, { names: "Marcos", surnames: "Solórzano Ruiz", relationship: "Padre" }] },
  { grade: 1, names: "Gael", surnames: "Pineda Rojas", birth_date: "2019-11-02", sex: "Masculino", address: "Barrio Las Brisas, calle de prueba 02, Managua", guardians: [{ names: "Yadira", surnames: "Pineda Rojas", relationship: "Madre" }] },
  { grade: 1, names: "Mireya", surnames: "Téllez Arce", birth_date: "2020-07-26", sex: "Femenino", address: "Residencial Valle Verde, sector de prueba 03, Managua", guardians: [{ names: "Óscar", surnames: "Téllez Reyes", relationship: "Padre" }] },
  { grade: 1, names: "Iker", surnames: "Campos Duarte", birth_date: "2019-05-19", sex: "Masculino", address: "Colonia El Mirador, calle de prueba 04, Managua", guardians: [{ names: "Roxana", surnames: "Duarte Campos", relationship: "Madre" }, { names: "Luis", surnames: "Campos Duarte", relationship: "Padre" }] },
  { grade: 1, names: "Salomé", surnames: "Fajardo Cruz", birth_date: "2020-01-08", sex: "Femenino", address: "Barrio Santa Elena, sector de prueba 05, Managua", guardians: [{ names: "Mónica", surnames: "Cruz Fajardo", relationship: "Abuela" }] },
  { grade: 2, names: "Bruno", surnames: "Martínez Zúñiga", birth_date: "2019-02-11", sex: "Masculino", address: "Residencial La Arboleda, calle de prueba 06, Managua", guardians: [{ names: "Karla", surnames: "Martínez Zúñiga", relationship: "Madre" }, { names: "René", surnames: "Zúñiga Mora", relationship: "Padre" }] },
  { grade: 2, names: "Celeste", surnames: "Ocampo Reyes", birth_date: "2018-09-23", sex: "Femenino", address: "Barrio El Rosario, sector de prueba 07, Managua", guardians: [{ names: "Maribel", surnames: "Reyes Ocampo", relationship: "Madre" }] },
  { grade: 2, names: "Damián", surnames: "Urrutia Lagos", birth_date: "2019-06-17", sex: "Masculino", address: "Colonia Las Palmas, calle de prueba 08, Managua", guardians: [{ names: "Joel", surnames: "Urrutia Lagos", relationship: "Padre" }] },
  { grade: 2, names: "Inés", surnames: "Villalta Mena", birth_date: "2018-12-04", sex: "Femenino", address: "Residencial Jardines del Sur, sector de prueba 09, Managua", guardians: [{ names: "Claudia", surnames: "Mena Villalta", relationship: "Madre" }, { names: "Felipe", surnames: "Villalta Ruiz", relationship: "Padre" }] },
  { grade: 2, names: "Thiago", surnames: "Mejía Borge", birth_date: "2018-04-29", sex: "Masculino", address: "Barrio El Carmen, calle de prueba 10, Managua", guardians: [{ names: "Sonia", surnames: "Borge Mejía", relationship: "Tutora legal" }] },
  { grade: 3, names: "Alma Sofía", surnames: "Montalván Ríos", birth_date: "2018-01-15", sex: "Femenino", address: "Residencial Camino Real, sector de prueba 11, Managua", guardians: [{ names: "Patricia", surnames: "Ríos Montalván", relationship: "Madre" }] },
  { grade: 3, names: "Nicolás", surnames: "Sequeira Blanco", birth_date: "2017-08-06", sex: "Masculino", address: "Barrio San Judas, calle de prueba 12, Managua", guardians: [{ names: "Darío", surnames: "Sequeira Blanco", relationship: "Padre" }, { names: "Vilma", surnames: "Blanco Vega", relationship: "Abuela" }] },
  { grade: 3, names: "Lía", surnames: "Cordero Amador", birth_date: "2018-05-31", sex: "Femenino", address: "Colonia Miraflores, sector de prueba 13, Managua", guardians: [{ names: "Evelyn", surnames: "Amador Cordero", relationship: "Madre" }] },
  { grade: 3, names: "Matías", surnames: "Calderón Espinoza", birth_date: "2017-10-22", sex: "Masculino", address: "Residencial Monte Claro, calle de prueba 14, Managua", guardians: [{ names: "Gloria", surnames: "Espinoza Calderón", relationship: "Madre" }] },
  { grade: 3, names: "Renata", surnames: "Páiz Mercado", birth_date: "2017-03-09", sex: "Femenino", address: "Barrio San Luis, sector de prueba 15, Managua", guardians: [{ names: "Héctor", surnames: "Páiz Mercado", relationship: "Padre" }, { names: "Beatriz", surnames: "Mercado Gaitán", relationship: "Madre" }] },
  { grade: 4, names: "Samuel", surnames: "Lacayo Herrera", birth_date: "2017-02-18", sex: "Masculino", address: "Residencial Altos del Lago, calle de prueba 16, Managua", guardians: [{ names: "Alejandra", surnames: "Herrera Lacayo", relationship: "Madre" }] },
  { grade: 4, names: "Abril", surnames: "Gutiérrez Porras", birth_date: "2016-09-12", sex: "Femenino", address: "Barrio Monseñor Lezcano, sector de prueba 17, Managua", guardians: [{ names: "Roberto", surnames: "Gutiérrez Porras", relationship: "Padre" }, { names: "Diana", surnames: "Porras Mora", relationship: "Madre" }] },
  { grade: 4, names: "Emilio", surnames: "Narváez Tórrez", birth_date: "2017-06-25", sex: "Masculino", address: "Colonia Primero de Mayo, calle de prueba 18, Managua", guardians: [{ names: "Marlene", surnames: "Tórrez Narváez", relationship: "Madre" }] },
  { grade: 4, names: "Violeta", surnames: "López Alemán", birth_date: "2016-12-10", sex: "Femenino", address: "Residencial El Almendro, sector de prueba 19, Managua", guardians: [{ names: "Edwin", surnames: "López Alemán", relationship: "Padre" }] },
  { grade: 4, names: "Julián", surnames: "Báez Castañeda", birth_date: "2016-04-03", sex: "Masculino", address: "Barrio Sierra Maestra, calle de prueba 20, Managua", guardians: [{ names: "Teresa", surnames: "Castañeda Báez", relationship: "Abuela" }, { names: "Manuel", surnames: "Báez Ruiz", relationship: "Tutor legal" }] },
  { grade: 5, names: "Camila", surnames: "Rocha Espinales", birth_date: "2016-01-27", sex: "Femenino", address: "Residencial Santa Mónica, sector de prueba 21, Managua", guardians: [{ names: "Erika", surnames: "Espinales Rocha", relationship: "Madre" }] },
  { grade: 5, names: "Leonardo", surnames: "Aráuz Solís", birth_date: "2015-08-14", sex: "Masculino", address: "Barrio La Fuente, calle de prueba 22, Managua", guardians: [{ names: "César", surnames: "Aráuz Solís", relationship: "Padre" }] },
  { grade: 5, names: "Noa", surnames: "Munguía Pacheco", birth_date: "2016-05-20", sex: "Otro", address: "Colonia 10 de Junio, sector de prueba 23, Managua", guardians: [{ names: "Silvia", surnames: "Pacheco Munguía", relationship: "Madre" }, { names: "Adrián", surnames: "Munguía Flores", relationship: "Padre" }] },
  { grade: 5, names: "Valentina", surnames: "Castillo Guido", birth_date: "2015-11-07", sex: "Femenino", address: "Residencial Altamira, calle de prueba 24, Managua", guardians: [{ names: "Lourdes", surnames: "Guido Castillo", relationship: "Tutora legal" }] },
  { grade: 5, names: "Benjamín", surnames: "Rugama Castillo", birth_date: "2015-03-16", sex: "Masculino", address: "Barrio Altagracia, sector de prueba 25, Managua", guardians: [{ names: "Yessenia", surnames: "Castillo Rugama", relationship: "Madre" }] },
  { grade: 6, names: "Daniela", surnames: "Mairena Vílchez", birth_date: "2015-02-05", sex: "Femenino", address: "Residencial Las Colinas, calle de prueba 26, Managua", guardians: [{ names: "Fabiola", surnames: "Vílchez Mairena", relationship: "Madre" }, { names: "Gustavo", surnames: "Mairena López", relationship: "Padre" }] },
  { grade: 6, names: "Rodrigo", surnames: "Blandón Zavala", birth_date: "2014-09-28", sex: "Masculino", address: "Barrio Ducualí, sector de prueba 27, Managua", guardians: [{ names: "Iván", surnames: "Blandón Zavala", relationship: "Padre" }] },
  { grade: 6, names: "Elisa", surnames: "Chávez Rivas", birth_date: "2015-06-02", sex: "Femenino", address: "Colonia Centroamérica, calle de prueba 28, Managua", guardians: [{ names: "María José", surnames: "Rivas Chávez", relationship: "Madre" }] },
  { grade: 6, names: "Andrés", surnames: "Brenes Salvatierra", birth_date: "2014-12-19", sex: "Masculino", address: "Residencial Villa Fontana, sector de prueba 29, Managua", guardians: [{ names: "Carmen", surnames: "Salvatierra Brenes", relationship: "Madre" }, { names: "Óscar", surnames: "Brenes Ruiz", relationship: "Padre" }] },
  { grade: 6, names: "Maia", surnames: "Zamora Leiva", birth_date: "2014-04-21", sex: "Femenino", address: "Barrio Santo Domingo, calle de prueba 30, Managua", guardians: [{ names: "Ester", surnames: "Leiva Zamora", relationship: "Abuela" }] },
];

const documentKinds = [
  "Partida de nacimiento",
  "Identificación del responsable",
  "Notas del grado anterior",
  "Documento de traslado",
  "Epicrisis",
];
const documentProfiles = [
  ["Entregado", "Entregado", "Entregado", "No requerido", "No requerido"],
  ["Entregado", "Pendiente", "Entregado", "No requerido", "No requerido"],
  ["Pendiente", "Entregado", "Pendiente", "Pendiente", "No requerido"],
  ["Entregado", "Entregado", "Pendiente", "No requerido", "No requerido"],
  ["Pendiente", "Pendiente", "Entregado", "No requerido", "No requerido"],
  ["Entregado", "Pendiente", "Pendiente", "Entregado", "No requerido"],
  ["Entregado", "Entregado", "Entregado", "Pendiente", "No requerido"],
  ["Pendiente", "Entregado", "Entregado", "No requerido", "No requerido"],
];

const iso = (year, month, day, hour = 16) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;

export function createDemoData() {
  const data = {
    demo_data_version: DEMO_VERSION,
    students: [], guardians: [], enrollments: [], documents: [],
    charges: [], discounts: [], payments: [], activity: [],
  };
  const addActivity = (label, detail, date) =>
    data.activity.push({ id: data.activity.length + 1, label, detail, created_at: date });
  const addCharge = (studentId, enrollmentId, concept, month, year, amount, created) => {
    const item = {
      id: data.charges.length + 1, student_id: studentId,
      enrollment_id: enrollmentId, concept, month, school_year: year,
      amount_cents: amount, created_at: created,
    };
    data.charges.push(item);
    return item;
  };
  const addPayment = (item, amount, year, month, day, status = "Válido") => {
    const cancelled = status === "Anulado";
    const payment = {
      id: data.payments.length + 1,
      charge_id: item.id,
      amount_cents: amount,
      paid_at: iso(year, month, day),
      created_by: "caja",
      status,
      void_reason: cancelled ? "Comprobante duplicado durante la demostración." : null,
      voided_at: cancelled ? iso(year, month, day + 1, 17) : null,
      voided_by: cancelled ? "directora" : null,
    };
    data.payments.push(payment);
    if (!cancelled)
      addActivity("Pago registrado", `Comprobante demostrativo #${payment.id}`, payment.paid_at);
    else addActivity("Pago anulado", `Comprobante demostrativo #${payment.id}`, payment.voided_at);
    return payment;
  };
  const addDiscount = (item, percent, reason, year, month) => {
    const discount = Math.round((item.amount_cents * percent) / 100);
    data.discounts.push({
      id: data.discounts.length + 1,
      charge_id: item.id,
      reason,
      percent,
      basis: "Monto original del cargo",
      original_cents: item.amount_cents,
      discount_cents: discount,
      final_cents: item.amount_cents - discount,
      authorized_by: "directora",
      authorized_at: iso(year, month, 4, 15),
    });
    addActivity("Descuento autorizado", `${percent}% · ${reason}`, iso(year, month, 4, 15));
    return discount;
  };

  let guardianId = 1;
  for (const [index, row] of roster.entries()) {
    const studentId = index + 1;
    const student = {
      id: studentId, ...row, school_year: 2026, status: "Activo",
      created_at: iso(2026, 1, 3 + ((index * 2) % 20), 14),
    };
    delete student.guardians;
    data.students.push(student);
    for (let n = 0; n < row.guardians.length; n += 1) {
      const person = row.guardians[n];
      data.guardians.push({
        id: guardianId++, student_id: studentId,
        ...person,
        phone: `000000${String(guardianId - 1).padStart(2, "0")}`,
        address: row.address,
        email: `responsable${String(guardianId - 1).padStart(2, "0")}@example.test`,
        identity_number: `DEMO-RESP-${String(guardianId - 1).padStart(4, "0")}`,
      });
    }
    const profile = documentProfiles[index % documentProfiles.length];
    for (let n = 0; n < documentKinds.length; n += 1) {
      const status = profile[n];
      data.documents.push({
        id: data.documents.length + 1,
        student_id: studentId,
        kind: documentKinds[n],
        status,
        delivered_at: status === "Entregado" ? `2026-02-${String(2 + ((index + n) % 20)).padStart(2, "0")}` : null,
        notes: status === "Pendiente" ? "Pendiente de completar en este caso ficticio." : status === "No requerido" ? "No aplica al expediente de demostración." : "",
      });
    }
    addActivity("Estudiante registrado", `${row.names} ${row.surnames}`, student.created_at);
  }

  const currentEnrollments = new Map();
  const historicEnrollments = new Map();
  for (const student of data.students) {
    const offset = (student.id - 1) % 5;
    const pending = offset === 4;
    if (student.grade > 1 && (offset === 0 || offset === 4)) {
      const old = {
        id: data.enrollments.length + 1,
        student_id: student.id,
        grade: student.grade - 1,
        school_year: 2025,
        date: `2025-01-${String(6 + ((student.id * 3) % 20)).padStart(2, "0")}`,
        status: "Activa",
        created_at: iso(2025, 1, 6 + ((student.id * 3) % 20), 14),
      };
      data.enrollments.push(old);
      historicEnrollments.set(student.id, old);
      addActivity("Matrícula 2025 registrada", `Grado ${old.grade} · EST-${String(student.id).padStart(4, "0")}`, old.created_at);
    }
    const enrollment = {
      id: data.enrollments.length + 1,
      student_id: student.id,
      grade: student.grade,
      school_year: 2026,
      date: pending ? `2026-02-${String(2 + student.grade).padStart(2, "0")}` : `2026-01-${String(5 + ((student.id * 2) % 22)).padStart(2, "0")}`,
      status: pending ? "Prematrícula" : "Activa",
      created_at: pending ? iso(2026, 2, 2 + student.grade, 14) : iso(2026, 1, 5 + ((student.id * 2) % 22), 14),
    };
    data.enrollments.push(enrollment);
    if (pending) addActivity("Prematrícula registrada", `${student.names} ${student.surnames}`, enrollment.created_at);
    else {
      currentEnrollments.set(student.id, enrollment);
      addActivity("Matrícula activa registrada", `${student.names} ${student.surnames}`, enrollment.created_at);
    }
  }

  // A simple illustrative tariff by grade keeps the amounts explainable and stable.
  const enrollmentFee = (grade, year) => (year === 2025 ? 120000 + (grade - 1) * 4000 : 135000 + (grade - 1) * 5000);
  const monthlyFee = (grade, year) => (year === 2025 ? 90000 + (grade - 1) * 4000 : 100000 + (grade - 1) * 5000);

  for (const student of data.students) {
    const previous = historicEnrollments.get(student.id);
    const offset = (student.id - 1) % 5;
    if (previous) {
      const year = 2025;
      const mat = addCharge(student.id, previous.id, "Matrícula", null, year, enrollmentFee(previous.grade, year), iso(year, 1, 5));
      const pastDiscount = offset === 4 && previous.grade % 2 === 0;
      const discount = pastDiscount ? addDiscount(mat, 10, "Apoyo familiar autorizado", year, 1) : 0;
      addPayment(mat, mat.amount_cents - discount, year, 1, 18);
      for (const month of [2, 3]) {
        const monthly = addCharge(student.id, null, "Mensualidad", month, year, monthlyFee(previous.grade, year), iso(year, month, 1));
        const paymentAmount = offset === 4 && month === 3 ? 60000 : monthly.amount_cents;
        addPayment(monthly, paymentAmount, year, month, 12);
      }
    }

    const current = currentEnrollments.get(student.id);
    if (!current) continue;
    const year = 2026;
    const mat = addCharge(student.id, current.id, "Matrícula", null, year, enrollmentFee(student.grade, year), iso(year, 1, 5));
    if (offset === 0) addPayment(mat, mat.amount_cents, year, 1, 16);
    if (offset === 1) addPayment(mat, Math.round(mat.amount_cents * 0.5), year, 1, 20);
    if (offset === 2 && student.grade % 2 === 0)
      addPayment(mat, 35000, year, 1, 21, "Anulado");
    if (offset === 3) {
      const discount = addDiscount(mat, 25, "Beca parcial autorizada", year, 1);
      addPayment(mat, mat.amount_cents - discount, year, 1, 22);
    }

    const months = offset === 0 ? [1, 2, 3] : offset === 2 ? [1, 3] : [1, 2];
    for (const month of months) {
      const monthly = addCharge(student.id, null, "Mensualidad", month, year, monthlyFee(student.grade, year), iso(year, month, 2));
      if (offset === 0) addPayment(monthly, monthly.amount_cents, year, month, 15 + offset);
      if (offset === 1 && month === 1) addPayment(monthly, 45000, year, month, 19);
      if (offset === 2 && month === 1 && student.grade % 2 !== 0)
        addPayment(monthly, 40000, year, month, 20, "Anulado");
      if (offset === 3 && month === 1) addPayment(monthly, monthly.amount_cents, year, month, 23);
    }
  }

  // API lists reverse insertion order; keep both histories chronological so
  // their newest rows and the dashboard's latest activity agree with dates.
  data.payments.sort((a, b) => a.paid_at.localeCompare(b.paid_at) || a.id - b.id);
  data.activity.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  return data;
}
