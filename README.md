# Sistema de Gestión de Matrícula y Mensualidades de Primaria

Versión de demostración hecha con **HTML, CSS y JavaScript nativo**. Usa Bootstrap **5.3.8** como hoja de estilos local, además de SweetAlert2 y Lucide locales y la tipografía disponible en el sistema. No requiere Node, paquetes ni conexión a Internet para ejecutarse; los registros se guardan en `localStorage` del navegador.

## Abrir

Abra la carpeta `public` con **Live Server** de VS Code o cualquier servidor estático y visite `index.html`. Los módulos JavaScript pueden no cargar al abrir el archivo directamente con `file://`. Bootstrap está en `public/vendor/bootstrap-5.3.8`; sus archivos compilados se obtuvieron de la distribución oficial y se conserva su licencia MIT. Esta interfaz usa el CSS de Bootstrap; no necesita sus plugins JavaScript.

Accesos de demostración:

| Rol                   | Usuario     | Contraseña      |
| --------------------- | ----------- | --------------- |
| Directora             | `directora` | `Directora123!` |
| Administración y Caja | `caja`      | `Caja12345!`    |

En una instalación nueva, la aplicación carga un escenario determinista con 30 estudiantes completamente ficticios, cinco por cada grado. Incluye responsables, expedientes documentales mixtos, matrículas y obligaciones de 2025/2026, pagos completos y parciales, saldos pendientes, descuentos autorizados, anulaciones e historial. El conjunto está versionado en `public/js/demo-data.js` y sus importes de ejemplo están expresados en centavos enteros de córdobas.

### Datos de demostración

- **Inicialización:** se cargan solo si no existe la clave `primaria_datos_v1` en `localStorage`. Una base válida ya existente —incluso si sus colecciones están vacías— se conserva. Recargar o cerrar sesión no vuelve a insertar estudiantes.
- **Almacenamiento:** las altas y cambios continúan en `localStorage` del navegador actual. Los datos de demostración viajan con el código y no necesitan Internet, backend ni una base externa.
- **Restablecimiento:** use **Restaurar demo** en Inicio o **Restaurar datos ficticios de demostración** en el acceso. La aplicación pide confirmación e indica que se perderán los cambios locales de las colecciones del sistema. Solo reemplaza `primaria_datos_v1`; conserva otras claves de `localStorage`.
- **Almacenamiento dañado:** la aplicación informa el problema y no lo sustituye al iniciar. Puede elegir explícitamente restablecer el escenario ficticio desde el aviso.
- **Año sugerido:** use 2026 en Inicio, Caja y Reportes. Cambie a 2025 para ver las matrículas y operaciones históricas de parte de los mismos estudiantes.

Recorridos recomendados para presentar el prototipo:

1. Entre como **Caja**, busque a Ana Lucía Benítez Solórzano o filtre por grado; abra su expediente y compruebe responsables, documentos y cuenta sin saldo pendiente.
2. En Caja, busque a Celeste Ocampo Reyes para ver pagos parciales y saldo; registre un abono menor al saldo, revise el comprobante y consulte Historial.
3. Abra el expediente de Inés Villalta Mena para ver obligaciones pendientes. Thiago Mejía Borge tiene una prematrícula 2026 sin cargo de matrícula aún.
4. Entre como **Directora** para revisar descuentos y pagos anulados en los historiales. En Reportes compare 2026 con 2025 e imprima la vista previa del mismo período.
5. Use **Restaurar demo** para volver al escenario inicial después de modificarlo.

Todos los nombres, domicilios, teléfonos, identificadores y movimientos de este conjunto son sintéticos. Los importes ilustran reglas y no representan una tarifa escolar real. Este prototipo local sirve para demostración y no es apto para producción ni para datos reales de estudiantes.

## Límite de esta versión

**Los datos y las contraseñas están en el navegador.** El control de roles solo sirve para demostrar la interfaz: una persona con acceso al navegador puede modificar sus datos o el código. No use esta versión con información real ni como sistema de producción. Para permisos seguros y datos compartidos se necesita un servidor y una base de datos.

## Navegación y flujo

- **Inicio**: resumen por año lectivo, registro de estudiante, acceso al expediente, pagos y reportes como consulta secundaria. La actividad reciente abarca todos los períodos.
- **Estudiantes**: búsqueda por nombre o código y filtro por grado. «Ver» abre un expediente con Datos y responsables, Matrícula, Documentos y Estado de cuenta. Al guardar se abre el expediente para continuar con la matrícula.
- **Caja**: seleccione explícitamente estudiante y año; elija la obligación, revise cargo/descuento/pagos/saldo e introduzca el abono. La vista previa muestra el saldo resultante. Crear mensualidades e Historial son tareas internas separadas.

El estudiante y el año se conservan entre tareas relacionadas. Antes de abandonar un formulario modificado se pide confirmación; cancelar mantiene los datos. Los cargos no se crean automáticamente, salvo el cargo de matrícula que ya generaba la confirmación.

Los descuentos se autorizan desde el cargo en Caja y las anulaciones desde el pago del Historial, exclusivamente como Directora. Cada pago ofrece comprobante; matrícula, cuenta y reporte tienen vista previa propia y botón Imprimir. Los saldos impresos son actuales a la emisión.

Los reportes agrupan por **año lectivo de la obligación**, aunque el pago se reciba en otra fecha. El gráfico de Inicio muestra recepción mensual dentro del año seleccionado para cargos de ese mismo año. Los documentos corresponden al estado actual del expediente; no representan un historial anual. La cuenta permite un año o Todos los años.

## Pruebas locales

```sh
node --test tests/local.test.mjs
```

Incluyen matrícula, abonos, restricciones de rol, descuentos, anulaciones, fechas con zonas horarias, validaciones de entrada y separación de cuentas y pagos de dos años. No modifican el almacenamiento del navegador.
