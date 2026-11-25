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

## Cómo ejecutarlo
1. Levante el backend (vea el README del backend). Debe quedar en `http://localhost:8080`.
2. Abra `index.html` en el navegador, o use un servidor local (por ejemplo, el botón de navegador de IntelliJ o la extensión Live Server de VS Code).
3. Inicie sesión con el correo de un usuario existente, por ejemplo `juan.zumbadoz@correo.cr`.

Si el backend corre en otra dirección, cambie `BASE_URL` en `js/api.js`.

## Funcionalidades
- **Inicio de sesión** con el correo del lector (sin contraseña). La sesión se guarda en `sessionStorage` y se mantiene al recargar la página.
- **Perfil:** editar el nombre y el correo.
- **Pestañas:** Catálogo, Sagas, Mis lecturas, Por leer y Estadísticas.

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
