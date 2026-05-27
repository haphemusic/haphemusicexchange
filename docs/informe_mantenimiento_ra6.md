# INFORME DE MANTENIMIENTO Y RECUPERACIÓN DE DATOS (R.A.6)
**Entorno de Trabajo:** Prácticas FCT desde Casa (Teletrabajo)  
**Proyecto:** Contemporánica  
**Tecnologías Utilizadas:** Supabase (PostgreSQL), Antigravity (Asistente de IA), Visual Studio Code (IDE), Microsoft Excel (Edición y depuración de datos), y GitHub (Gestión de configuración y scripts).

---

## 1. Copias de Seguridad y Restauración

### Enunciado: Identifica qué herramienta usa la empresa (interfaz gráfica o comandos).
#### Definición / Desarrollo:
En nuestro entorno de trabajo ágil y descentralizado (desarrollo desde casa), la empresa utiliza un enfoque híbrido que combina herramientas **gráficas (GUI)** y de **línea de comandos (CLI)** para garantizar la disponibilidad y la integridad de los datos en **Supabase** (que corre sobre un motor relacional **PostgreSQL**). Las herramientas se clasifican de la siguiente manera:

1. **Herramientas Gráficas (GUI):**
   * **Panel de Control de Supabase (Dashboard):** Se emplea para la administración directa de la base de datos en la nube. Permite la exportación rápida de tablas en formato CSV desde el editor de tablas (*Table Editor*), la ejecución manual de consultas e inserciones de mantenimiento mediante el *SQL Editor*, y la supervisión del estado del servidor.
   * **Microsoft Excel:** Es la herramienta principal para la visualización, filtrado rápido, formateo y corrección de datos crudos del catálogo de obras (por ejemplo, el archivo `repertorio_sucio.csv` o `Camarero catálogo - Hoja 1.csv`) antes de realizar la inserción masiva en base de datos.
   * **Visual Studio Code (Entorno Integrado):** Permite controlar visualmente los archivos del proyecto, extensiones de base de datos y la interfaz gráfica de control de versiones Git.

2. **Herramientas por Comandos (CLI):**
   * **Supabase CLI:** Herramienta de comandos que permite realizar backups físicos y lógicos del esquema y datos de la base de datos remota (`supabase db dump`).
   * **Terminal de VS Code (PowerShell/Bash) & Git/GitHub CLI:** Se utiliza para ejecutar scripts de limpieza automatizada de datos (como el script en Python `limpieza.py`) e importar scripts de carga (como el cargador en Javascript `importar_camarero.js`).
   * **Comandos Git:** Utilizados para el control de versiones y rollback (restauración estructurada de código y esquemas SQL en la nube).

---

### Enunciado: Documenta la realización de un backup si procede.
#### Definición / Desarrollo:
El proceso de realización de copias de seguridad se divide en dos niveles estratégicos: estructural/código (esquema DDL) y de negocio (datos DML).

#### Paso 1: Copia de seguridad Estructural (Esquema DDL) mediante Supabase CLI y Git
Para salvaguardar la estructura de la base de datos (tablas como `works`, `profiles`, `instruments`, restricciones y funciones de trigger), se realiza un volcado del esquema desde la terminal utilizando la herramienta oficial de comandos de Supabase:
```powershell
# Realizar el volcado completo del esquema de la base de datos
supabase db dump --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f diseno/schema_backup.sql
```
*Este comando genera el archivo `schema_backup.sql` que contiene las sentencias `CREATE TABLE`, `ALTER TABLE` y las definiciones de los triggers.*

Posteriormente, el esquema se añade al repositorio Git para control de versiones:
```powershell
git add diseno/schema_backup.sql
git commit -m "Backup de seguridad del esquema de la base de datos"
git push origin main
```

#### Paso 2: Copia de seguridad de Datos de Negocio (CSV/Excel)
Para salvaguardar los datos introducidos manualmente o cargados por catálogos (obras y repertorios), el procedimiento gráfico consta de:
1. Acceder al panel de administración de **Supabase -> Table Editor**.
2. Seleccionar la tabla crítica, por ejemplo, `works` u `obras`.
3. Pulsar en el botón **Export to CSV**.
4. Descargar el archivo resultante (guardado localmente como `obras_backup_2026.csv`).
5. Abrir el archivo en **Microsoft Excel** para verificar la consistencia visual y archivar el archivo de forma segura o editarlo para realizar correcciones manuales rápidas.

---

### Enunciado: Documenta la restauración de dicho backup (puede ser en un entorno de test).
#### Definición / Desarrollo:
Para validar la recuperación de desastres, se simula la restauración del backup en un entorno de pruebas/desarrollo local o en una base de datos de test temporal en Supabase.

#### Escenario A: Restauración estructural mediante Consola de Comandos y Scripts SQL (VS Code)
Si se requiere volver a crear las tablas o revertir un error crítico de base de datos que rompió el esquema:
1. Abrimos el archivo `diseno/tablas.sql` o nuestro backup `diseno/schema_backup.sql` en **Visual Studio Code**.
2. Copiamos el bloque estructural que deseamos recuperar. Por ejemplo, la tabla `works` y su restricción:
   ```sql
   CREATE TABLE works (
     id SERIAL PRIMARY KEY,
     composer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
     submitted_by uuid REFERENCES profiles(id),
     title text NOT NULL,
     year integer,
     status text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```
3. Accedemos al **Supabase SQL Editor** de nuestro proyecto de pruebas.
4. Pegamos la consulta y ejecutamos (`Run`). El motor PostgreSQL vuelve a construir la tabla con todas sus claves primarias, foráneas y restricciones en segundos.

#### Escenario B: Restauración y carga de datos limpios vía Excel, Script de Python y Carga Masiva
Si se produce una corrupción de datos o pérdida de registros y es necesario volver a cargar un catálogo externo desde su copia en Excel:
1. Abrimos la copia del catálogo en **Microsoft Excel** (por ejemplo, `Camarero catálogo - Hoja 1.csv`), realizamos las correcciones pertinentes de formato y guardamos como un archivo CSV delimitado por comas (`repertorio_sucio.csv`).
2. Ejecutamos el script de limpieza `limpieza.py` desde el terminal de VS Code para depurar la codificación, formatear los nombres propios en mayúsculas tipo título (`Title Case`) y normalizar la columna de año:
   ```powershell
   python scripts/limpieza.py
   ```
   *El script genera el archivo libre de anomalías `datos/repertorio_limpio.json` y nos asegura que la columna `status` contenga el valor por defecto `'pending'` para no violar las restricciones de base de datos.*
3. Para la restauración física en Supabase, abrimos la tabla `works` en el **Supabase Table Editor**, seleccionamos **Import data from CSV** y subimos el archivo limpio corregido por Excel y Python. La interfaz gráfica completa la inserción de los registros recuperados.

#### Escenario C: Rollback Estructural por Git
Si un cambio de configuración en el esquema o en los scripts del backend rompe el funcionamiento, procedemos a realizar una restauración a un punto estable anterior usando Git en la terminal de VS Code:
```powershell
# Buscar el hash del commit seguro en el log de Git
git log --oneline

# Revertir temporalmente o restaurar el archivo del esquema al último commit funcional
git checkout HEAD~1 -- diseno/tablas.sql
```

---

## 2. Gestión de Incidencias (Logs)

### Enunciado: Localiza los ficheros de log del SGBD o del sistema de copias.
#### Definición / Desarrollo:
Dado que operamos con un entorno en la nube y un flujo local, disponemos de tres ubicaciones clave donde se registran las incidencias (logs):

1. **Logs del SGBD (PostgreSQL) en Supabase (Nube):**
   * Se localizan accediendo al panel del proyecto de Supabase, en la ruta: **Project Settings -> Database -> Postgres logs** u en la sección del menú lateral **Monitor -> Logs -> Database**.
   * Estos logs capturan todas las consultas SQL entrantes, errores de sintaxis, violaciones de restricciones de integridad (como claves foráneas o checks) y tiempos de ejecución del servidor PostgreSQL.

2. **Logs del Entorno de Desarrollo y Scripts de Carga (VS Code):**
   * Se visualizan en la pestaña **Console** del navegador (F12) para las llamadas a la API de Supabase realizadas por la aplicación web en Javascript.
   * Se muestran directamente en la pestaña **Terminal** de Visual Studio Code al lanzar herramientas y scripts (como la salida estándar del intérprete de Python o NodeJS durante ejecuciones manuales de limpieza de datos).

3. **Logs de Configuración y Código (GitHub):**
   * El log histórico de cambios estructurales y de código se localiza en la terminal mediante el comando `git log` o la interfaz de GitHub, sirviendo como diario de incidencias sobre cuándo y quién modificó la estructura de base de datos.

---

### Enunciado: Interpreta un mensaje de error o un mensaje de "éxito" tras una operación, explicando qué significa.
#### Definición / Desarrollo:

#### Caso 1: Interpretación de un Mensaje de Error Real (Violación de Restricción CHECK en base de datos)
Durante el desarrollo del formulario de guardado del catálogo en la interfaz web de edición del compositor (`composer.js`), el sistema generó un error registrado en la consola de depuración y en el log de llamadas del API de Supabase.

* **Mensaje de Error Registrado:**
  ```json
  {
    "code": "23514",
    "details": "Failing row contains (24, null, 1729, Obra Inédita, 2026, hidden, 2026-05-25 12:00:00+00).",
    "hint": null,
    "message": "new row for relation \"works\" violates check constraint \"works_status_check\""
  }
  ```
* **Interpretación técnica:**
  1. **`code: "23514"`:** Corresponde al código estándar SQLSTATE en PostgreSQL para una violación de restricción de verificación (`check_violation`).
  2. **`message: "...violates check constraint \"works_status_check\""`:** Indica que la base de datos ha denegado la inserción porque uno de los valores introducidos no cumple con la regla de validación definida para esa tabla en el servidor.
  3. **`details`:** Nos muestra la fila que se intentaba insertar. Podemos observar que el valor para la columna `status` era `'hidden'`.
  4. **Relación con el Esquema:** En `tablas.sql`, la columna `status` de la tabla `works` se creó con la restricción `CHECK (status IN ('pending', 'validated', 'rejected'))`. El valor `'hidden'` no es aceptado por el motor de la base de datos PostgreSQL, garantizando la integridad referencial y de negocio al evitar valores no autorizados.
  5. **Acción correctora ejecutada:** Se modificó `composer.js` para mapear el estado lógico de los elementos no marcados a `'pending'` (el valor aceptado por la base de datos) en lugar de `'hidden'`, resolviendo la incidencia por completo y previniendo caídas en producción.

---

#### Caso 2: Interpretación de un Mensaje de Éxito Real (Ejecución de script de limpieza y mantenimiento)
Cuando procedimos a realizar el mantenimiento de catálogo, ejecutamos el script de limpieza local de datos desarrollado en Python.

* **Mensaje de Éxito Registrado en la Terminal de VS Code:**
  ```powershell
  PS C:\Users\gutis\Desktop\proyecto> python scripts/limpieza.py
  ¡Éxito! Datos limpiados y guardados en datos/repertorio_limpio.json
  ```
* **Interpretación técnica:**
  1. **Lanzamiento:** El intérprete de Python inicializó el script `limpieza.py` localmente desde VS Code.
  2. **Procesamiento:** El script abrió el archivo exportado desde Excel `datos/repertorio_sucio.csv` en modo lectura UTF-8, leyó las filas crudas y ejecutó la función `limpiar_texto()` y `limpiar_fecha()`.
  3. **Generación del entregable:** El script finalizó sin lanzar excepciones (código de salida 0) y escribió de forma exitosa el archivo estructurado JSON con formato normalizado. La salida por consola confirma que el archivo `repertorio_limpio.json` está listo para ser restaurado o importado en la base de datos de Supabase sin riesgo de generar errores por codificación corrupta o datos sucios.

---

## 3. Importante (Confidencialidad)

### Enunciado: Explica las medidas de anonimización aplicadas en tu memoria técnica y capturas.
#### Definición / Desarrollo:
Para cumplir de manera estricta con la Ley Orgánica de Protección de Datos y Garantía de Derechos Digitales (LOPDGDD) y las directrices de seguridad de la información de la empresa, se han implementado las siguientes medidas en la realización de esta memoria técnica de prácticas:

1. **Anonimización del archivo `.env`:** 
   Las credenciales de acceso a Supabase (como la base de datos de producción, `SUPABASE_KEY` y `DATABASE_URL` con contraseñas de administrador) no se exponen en esta memoria técnica ni en los logs. El archivo `.env` local se ha incluido dentro de `.gitignore` para impedir que se aloje públicamente en GitHub.
2. **Uso de Datos Ficticios para Pruebas:**
   Todos los datos utilizados en las demostraciones de copias de seguridad e importaciones (como `datos_obra_prueba.csv` y `obras_prueba_bulk.csv`) corresponden a compositores y piezas musicales ficticias o de dominio público, garantizando que no se filtre información interna de clientes ni proyectos comerciales de la compañía.
3. **Restricción de IPs y Hostnames:**
   En los comandos CLI documentados, se ha sustituido la dirección IP pública y el host real de Supabase por variables genéricas como `[HOST]` y `[PASSWORD]`, neutralizando cualquier posibilidad de ataques dirigidos de denegación de servicio (DDoS) o intentos de inyección SQL externos.
