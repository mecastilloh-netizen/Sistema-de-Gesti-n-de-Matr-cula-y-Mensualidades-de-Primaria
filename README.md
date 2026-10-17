# Sistema de Gestión de Matrícula y Mensualidades de Primaria

Versión de demostración hecha con **HTML, CSS y JavaScript nativo**. No requiere Node, paquetes ni base de datos. Los registros se guardan en `localStorage` del navegador.

## Abrir

Abra la carpeta `public` con **Live Server** de VS Code o cualquier servidor estático y visite `index.html`. Los módulos JavaScript pueden no cargar al abrir el archivo directamente con `file://`.

Accesos de demostración:

| Rol                   | Usuario     | Contraseña      |
| --------------------- | ----------- | --------------- |
| Directora             | `directora` | `Directora123!` |
| Administración y Caja | `caja`      | `Caja12345!`    |

La aplicación inicia sin estudiantes ni pagos ficticios. Puede registrar estudiantes, responsables, prematrículas, matrículas, documentos, mensualidades, abonos y descuentos; también permite imprimir comprobantes y estados de cuenta.

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
