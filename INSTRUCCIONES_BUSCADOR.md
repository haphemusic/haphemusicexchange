# 🚀 CÓMO HACER FUNCIONAR EL BUSCADOR - GUÍA COMPLETA

## Estado Actual
✅ **Frontend**: Completamente arreglado (web/index.html)
✅ **Datos**: Existen en `datos/repertorio_limpio.json`
❌ **Supabase**: La tabla `works` está VACÍA

---

## ¿Por qué no funciona?
El buscador necesita datos en la tabla `works` de Supabase, pero esa tabla está vacía.
Tienes todos los datos en `datos/repertorio_limpio.json`, solo necesitas **cargarlos en Supabase**.

---

## 📋 PASOS PARA HACER FUNCIONAR TODO

### PASO 1: Abre Supabase Dashboard
1. Ve a https://supabase.com/dashboard/projects
2. Entra en tu proyecto `xidiihjezddpbgiexbph`
3. Haz clic en **SQL Editor** en el menú izquierdo

### PASO 2: Copia y Ejecuta el Script SQL
1. Abre el archivo: `/diseno/CARGAR_OBRAS_DESDE_JSON.sql`
2. **Copia TODO el contenido**
3. Vuelve a Supabase SQL Editor
4. **Pega TODO el contenido** en el editor
5. Haz clic en **Run** (botón verde)

### PASO 3: Verifica que los datos se cargaron
En Supabase, ejecuta esta query para confirmar:
```sql
SELECT COUNT(*) as total_obras FROM works;
```

Deberías ver `4` (las 4 obras del JSON):
- Obertura Contemporánea
- Suite Para Cello
- Reflejos Sonoros
- Ecos Del Bosque

### PASO 4: Recarga el navegador
1. Ve a `http://127.0.0.1:5500/web/index.html` (o tu URL local)
2. **Recarga la página** (Ctrl+R o Cmd+R)
3. Deberías ver las 4 obras listadas en "Recent Works"

---

## ✅ Ahora el buscador debe funcionar:
- **Botón "Explore"**: Filtra por año, país, género e instrumentos
- **Botón "VIEW ALL"**: Muestra todas las obras
- **Seleccionar instrumentos**: Filtra obras por familia de instrumentos

---

## 🆘 Si aún no funciona:

### Opción 1: Los datos se cargaron pero no aparecen
- Asegúrate de que los compositores coincidan con los nombres en `profiles`:
  - "David Gutiérrez" (no "David Gutierrez")
  - "Manuel Solis"
  - "Juan Perez" (si existe)
  - "Elena Garcia" (si existe)

### Opción 2: Error de SQL en Supabase
- Si ves error en Supabase al pegar el script:
  1. Copia SOLO las líneas de INSERT (a partir de la línea 10)
  2. Pégalas una por una
  3. Ejecuta cada bloque por separado

### Opción 3: Verificar IDs de instrumentos
En Supabase, ejecuta:
```sql
SELECT id, name, family FROM instruments LIMIT 20;
```

Los instrumentos esperados:
- Flute, Piccolo, Violin, Cello, Clarinet, Oboe, Bassoon, Piano, etc.

---

## 📝 Resumen Final

| Componente | Estado |
|-----------|--------|
| Frontend (index.html) | ✅ Listo |
| Datos (repertorio_limpio.json) | ✅ Listos |
| Tabla instruments en Supabase | ✅ Poblada |
| Tabla profiles en Supabase | ✅ Poblada |
| Tabla works en Supabase | ❌ **VACÍA - CARGAR AHORA** |
| Tabla work_instruments en Supabase | ❌ **VACÍA - CARGAR AHORA** |

**SIGUIENTE PASO**: Ejecuta `/diseno/CARGAR_OBRAS_DESDE_JSON.sql` en Supabase.

---

## 🔗 Archivos Relevantes
- Script SQL: `/diseno/CARGAR_OBRAS_DESDE_JSON.sql`
- Datos JSON: `/datos/repertorio_limpio.json`
- Frontend: `/web/index.html`
- Config Supabase: `/web/js/config.js`
