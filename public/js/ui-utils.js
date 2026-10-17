export function findCashStudents(students, query, limit = 6) {
  const normalized = String(query || "").trim().toLocaleLowerCase("es");
  const matches = normalized
    ? students.filter((student) =>
        `${student.names} ${student.surnames} EST-${String(student.id).padStart(4, "0")} ${student.id}`
          .toLocaleLowerCase("es")
          .includes(normalized),
      )
    : [];
  return { matches, shown: matches.slice(0, limit), remaining: Math.max(0, matches.length - limit) };
}

export function chartBarPercent(amount, maximum) {
  return maximum > 0 ? Math.round((amount / maximum) * 100) : 0;
}
