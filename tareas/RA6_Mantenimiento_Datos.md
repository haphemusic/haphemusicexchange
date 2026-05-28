# Mantenimiento de Datos - R.A. 6

**Alumno:** Manuel Solís  
**Empresa/Proyecto:** Contemporánica  

---

### Presentación
En este trabajo detallo cómo se gestionan los backups y logs en Contemporánica. Como el servidor físico (Proxmox VE) se cayó por completo y no pudimos usar la máquina virtual de Ubuntu Server, tuvimos que gestionarlo todo con Supabase (PostgreSQL en la nube) y con pruebas en mi PC local.

---

### Copias de Seguridad y Restauración

* **Identifica qué herramienta usa la empresa (interfaz gráfica o comandos):** 
  Usamos la interfaz gráfica de Supabase para las copias automáticas en la nube y el terminal de comandos (`pg_dump` y `pg_restore`) de PostgreSQL para pruebas locales en mi PC.

* **Documenta la realización de un backup si procede:** 
  1. **En Supabase (GUI):** Entré en Ajustes -> Database -> Backups y descargué el último backup diario disponible. 
     *(⚠️ AQUÍ PON UNA FOTO DEL PANEL DE BACKUPS DE SUPABASE)*
  2. **Por comandos (CLI):** Hice un volcado manual desde mi terminal para guardar las tablas:
     ```bash
     pg_dump -h db.olmjsegaabvgsnhplumx.supabase.co -U postgres -d postgres -F c -b -v -f backup_contemporanica.dump
     ```
     *(⚠️ AQUÍ PON FOTO DE LA TERMINAL AL EJECUTAR EL COMANDO)*

* **Documenta la restauración de dicho backup (puede ser en un entorno de test):** 
  Como Proxmox estaba caído, lo restauré en un Postgres de pruebas instalado en mi PC:
  1. Creé una base de datos limpia de pruebas:
     ```sql
     CREATE DATABASE contemporanica_test;
     ```
  2. Restauré el archivo `.dump` por comandos:
     ```bash
     pg_restore -h localhost -U postgres -d contemporanica_test -v backup_contemporanica.dump
     ```
     *(⚠️ AQUÍ PON FOTO DE LA TERMINAL EJECUTANDO EL PG_RESTORE O DE PGADMIN CON LAS TABLAS RESTAURADAS)*

---

### Gestión de Incidencias (Logs)

* **Localiza los ficheros de log del SGBD o del sistema de copias:** 
  * **En Supabase (Cloud):** Se ven desde la web en Monitor -> Logs -> Postgres Logs.
    *(⚠️ AQUÍ PON FOTO DEL PANEL DE LOGS DE SUPABASE)*
  * **En la VM de Ubuntu (Local):** Los logs se guardan en el archivo `/var/log/postgresql/postgresql-14-main.log` (cuando el servidor local Proxmox está encendido).

* **Interpreta un mensaje de error o un mensaje de "éxito" tras una operación, explicando qué significa:** 
  * **Log de error por seguridad (RLS):**
    `ERROR: new row violates row-level security policy for table "messages"`
    * **Qué significa:** El frontend intentó mandar un mensaje de chat usando un ID de emisor que no coincidía con el usuario logueado en ese momento. La política RLS de la base de datos lo bloqueó para evitar que alguien suplante a otro usuario.
    *(⚠️ AQUÍ PON FOTO DE LA CONSOLA DE DESARROLLADOR O LOG CON EL ERROR)*
  * **Log del sistema tras la caída del servidor Proxmox:**
    `LOG: database system was not properly shut down; automatic recovery in progress`
    * **Qué significa:** Al arrancar el servidor tras la caída de Proxmox, Postgres vio que se apagó a las malas. Entró en modo recuperación automática usando el WAL para que no se corrompiera nada y quedar listo de nuevo.
    *(⚠️ AQUÍ PON FOTO DEL LOG DE ARRANQUE TRAS EL CRASH)*

---

### Nota de Confidencialidad
He borrado e inventado las IPs reales, tokens y contraseñas de las capturas y de los comandos para no exponer datos del proyecto de la empresa.
