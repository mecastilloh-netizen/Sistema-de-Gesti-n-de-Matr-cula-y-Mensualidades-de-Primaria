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

El flujo del diccionario de datos incluye documentos recibidos durante la prematrícula, montos de matrícula y mensualidad por año, pagos parciales, descuentos autorizados, estado de cuenta detallado e historial de anulaciones. La matrícula directa y la confirmación de prematrícula requieren ambos montos; pueden ser cero. Las mensualidades creadas usan el monto establecido para esa matrícula.

Para comprobar los recorridos locales, ejecute `npm test` si tiene Node instalado. Node se usa solo para las pruebas; la página sigue funcionando como sitio estático.

## Límite de esta versión

**Los datos y las contraseñas están en el navegador.** El control de roles solo sirve para demostrar la interfaz: una persona con acceso al navegador puede modificar sus datos o el código. No use esta versión con información real ni como sistema de producción. Para permisos seguros y datos compartidos se necesita un servidor y una base de datos.
