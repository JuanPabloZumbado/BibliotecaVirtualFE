# BibliotecaVirtualFE
Proyecto Front End para el proyecto de Bases de Datos de una Biblioteca Virtual
Fabricio

Interfaz web para los lectores de la Biblioteca Virtual. Consume el API REST del backend [BibliotecaVirtualCloudDBRest](https://github.com/JuanPabloZumbado/BibliotecaVirtualCloudDBRest).

## Tecnologías
- HTML5, CSS3 y JavaScript puro (sin frameworks)
- `fetch` para consumir el API REST
- Fuentes de Google Fonts: Playfair Display (títulos) y Nunito (texto). Sin internet se usan Georgia y Segoe UI.

## Estructura
```
index.html       página única: login y aplicación con pestañas
css/styles.css   estilos y paleta de colores (variables CSS)
js/api.js        cliente del API REST: un método por endpoint
js/app.js        sesión, pestañas, formularios y mensajes
img/logo.svg     logo
```

## Cómo ejecutar el proyecto completo
Requisitos: Docker Desktop, Java 21 e IntelliJ IDEA (o cualquier editor con un servidor local).

1. **Base de datos (MySQL en Docker).** En la raíz del backend, copie `.env.example` como `.env`, ponga las contraseñas y ejecute:
   ```
   docker compose up -d
   ```
2. **Backend.** Ejecute `BibliotecaApplication` con las variables de entorno `DB_USR_NAME`, `DB_PWD` y `DB_PORT` (los mismos valores del `.env`). Al arrancar crea las tablas y carga los datos de prueba. Debe quedar en `http://localhost:8080`. El README del backend tiene los detalles.
3. **Frontend.** Abra `index.html` con un servidor local: el ícono de navegador de IntelliJ (arriba a la derecha del editor) o la extensión Live Server de VS Code.
4. Inicie sesión con el correo de uno de los usuarios de prueba.

| Usuario de prueba | Correo |
|---|---|
| Juan Pablo Zumbado (tiene lecturas, sesiones, reseñas y lista por leer) | `juan.zumbadoz@correo.cr` |
| Carlos Araya | `carlos.araya@correo.cr` |
| Fabricio Castro | `fabricio.castro@correo.cr` |

Si el backend corre en otra dirección, cambie `BASE_URL` en `js/api.js`.

**Problemas comunes**
- *"No se pudo conectar con el servidor"*: el backend no está encendido o no está en el puerto 8080.
- Una pestaña no muestra datos nuevos después de actualizar el código: recargue sin caché con **Ctrl + Shift + R**.

## Funcionalidades
- **Inicio de sesión** con el correo del lector (sin contraseña). La sesión se guarda en `sessionStorage` y se mantiene al recargar la página.
- **Perfil:** editar el nombre y el correo.
- **Catálogo:** los libros se muestran como un estante. Se puede buscar por título o autor (sin importar acentos) y filtrar por género, autor y saga.
- **Detalle del libro:** autores con su rol, géneros, saga, ediciones y reseñas de los lectores con su promedio. Desde aquí se puede **iniciar la lectura** de una edición o **agregar el libro a la lista por leer**.
- **Sagas:** cada saga con sus libros en orden, autores y géneros.
- **Mis lecturas:** tarjetas con el progreso de cada lectura (página actual, porcentaje y tiempo leído), contadores por estado y filtro por estado.
- **Detalle de la lectura:** historial de sesiones, marcar como terminada, abandonar, retomar, cambiar el formato y eliminar la lectura.
- **Registrar sesión:** la página inicial se completa con la última página leída. Al llegar a la última página, ofrece marcar la lectura como terminada.
- **Valoraciones:** en el detalle de una lectura terminada o abandonada se puede valorar el libro con estrellas (1 a 5) y una reseña de hasta 2000 caracteres. La valoración se puede editar o eliminar.
- **Por leer:** lista de libros pendientes ordenada por prioridad (Alta, Media, Baja), con contadores y filtro por prioridad. Se puede cambiar la prioridad, quitar un libro o **empezar a leerlo**: al iniciar la lectura, el libro sale de la lista automáticamente.
- **Estadísticas:** resumen del lector (lecturas, libros terminados, páginas leídas, tiempo de lectura, páginas por hora, promedio de sus reseñas y libros por leer) y gráficos de barras de lecturas por estado, géneros y autores más leídos y formatos usados.

En todas las pestañas:
- Mientras llegan los datos aparece *"Cargando…"*.
- Si el backend no responde, aparece un aviso con el botón **Reintentar**.
- Los errores que devuelve el backend (por ejemplo, un correo repetido o una lectura ya valorada) se muestran como avisos en la esquina de la pantalla.
- La página se adapta al celular. En el catálogo, los filtros se ocultan y se muestran con el botón **Filtros**, que indica cuántos hay activos.

## Pantallas y endpoints
Todas las rutas empiezan con `/api/v1`. El README del backend documenta cada endpoint.

| Pantalla | Acción | Endpoint |
|---|---|---|
| Inicio de sesión | Buscar al lector por correo | `GET /usuarios/by-correo/{correo}` |
| Perfil | Ver y editar los datos | `GET /usuarios/{id}`, `PATCH /usuarios/{id}` |
| Catálogo | Listar, buscar y filtrar libros | `GET /libros?q=&genero=&autor=&saga=` |
| Catálogo | Llenar los filtros y los formatos | `GET /generos`, `GET /autores`, `GET /sagas`, `GET /formatos` |
| Detalle del libro | Libro con autores, géneros y ediciones | `GET /libros/{id}` |
| Detalle del libro | Reseñas de los lectores | `GET /libros/{id}/valoraciones` |
| Detalle del libro | Iniciar una lectura | `POST /usuarios/{id}/lecturas` |
| Sagas | Sagas con sus libros en orden | `GET /sagas`, `GET /sagas/{id}` |
| Mis lecturas | Listar y filtrar por estado | `GET /usuarios/{id}/lecturas?estado=` |
| Detalle de la lectura | Progreso y sesiones | `GET /usuarios/{id}/lecturas/{idLectura}` |
| Detalle de la lectura | Terminar, abandonar, retomar y cambiar el formato | `PATCH /usuarios/{id}/lecturas/{idLectura}` |
| Detalle de la lectura | Eliminar la lectura | `DELETE /usuarios/{id}/lecturas/{idLectura}` |
| Registrar sesión | Guardar y eliminar sesiones | `POST /lecturas/{idLectura}/sesiones`, `DELETE /lecturas/{idLectura}/sesiones/{idSesion}` |
| Mi valoración | Ver, crear, editar y eliminar | `GET` y `POST /lecturas/{idLectura}/valoraciones`, `PATCH` y `DELETE /valoraciones/{id}` |
| Por leer | Listar y filtrar por prioridad | `GET /usuarios/{id}/por-leer?prioridad=` |
| Por leer | Agregar, cambiar la prioridad y quitar | `POST /usuarios/{id}/por-leer`, `PATCH` y `DELETE /usuarios/{id}/por-leer/{idLibro}` |
| Estadísticas | Resumen y gráficos | `GET /usuarios/{id}/estadisticas` |

## Diseño
Paleta inspirada en una biblioteca antigua, definida con variables CSS en `css/styles.css`:

| Variable | Color | Uso |
|---|---|---|
| `--madera-oscura` | `#4A2E1F` | Barra superior |
| `--madera` | `#8B5E3C` | Estantes |
| `--borgona` | `#7B2D3B` | Títulos y botón principal |
| `--dorado` | `#D9A441` | Pestaña activa, marcapáginas y estrellas |
| `--verde` | `#2F5D50` | Acciones secundarias y estado *terminada* |
| `--terracota` | `#C8553D` | Estado *abandonada* y acciones de eliminar |
| `--azul-tinta` | `#2E4A7D` | Estado *por iniciar* y enlaces |
| `--pergamino` | `#F7F1E3` | Fondo de la página |

Cada género tiene un color de lomo (clases `.lomo-1` a `.lomo-7`), para que el catálogo se vea como un estante de libros.
