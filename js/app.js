/**
 * Lógica de la interfaz: sesión, pestañas, perfil y utilidades compartidas.
 * Las pantallas de cada pestaña (catálogo, sagas, lecturas, por leer y estadísticas)
 * se registran en "vistas" y se cargan al abrir su pestaña.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const SESSION_KEY = 'biblioteca.usuario';

  let usuario = null;

  // ---------- Utilidades ----------
  // Crea un elemento del DOM. Los textos se agregan como nodos de texto (no como HTML).
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.flat().forEach((c) => {
      if (c !== undefined && c !== null && c !== false) node.append(c);
    });
    return node;
  }

  function toast(msg, isError = false) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    // Se vuelve a mostrar para que quede encima del último diálogo abierto
    if (t.matches(':popover-open')) t.hidePopover();
    t.showPopover();
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.hidePopover(), 3500);
  }

  // Ejecuta una acción asíncrona y muestra el error del backend si falla
  async function guard(fn) {
    try { return await fn(); } catch (e) { toast(e.message, true); }
  }

  // "2026-08-20" -> "20 ago 2026"
  function fmtFecha(iso) {
    if (!iso) return '-';
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ---------- Login ----------
  $('login-form').onsubmit = (e) => {
    e.preventDefault();
    const correo = $('login-correo').value.trim();
    guard(async () => {
      try {
        iniciarSesion(await Api.usuarios.getByCorreo(correo));
      } catch (err) {
        if (err.status === 404) throw new Error('No hay ningún lector registrado con ese correo');
        throw err;
      }
    });
  };

  function iniciarSesion(u) {
    usuario = u;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    mostrarUsuario();
    $('login-view').classList.add('hidden');
    $('app-view').classList.remove('hidden');
    showTab('catalogo');
  }

  function mostrarUsuario() {
    $('session-nombre').textContent = usuario.nombre;
    $('session-inicial').textContent = usuario.nombre.trim().charAt(0).toUpperCase();
  }

  $('logout').onclick = () => {
    sessionStorage.removeItem(SESSION_KEY);
    usuario = null;
    $('app-view').classList.add('hidden');
    $('login-view').classList.remove('hidden');
    $('login-correo').value = '';
    $('login-correo').focus();
  };

  // ---------- Pestañas ----------
  // Cada etapa registra aquí la función que carga su pestaña: vistas.catalogo = async () => {...}
  const vistas = {};

  function showTab(nombre) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === nombre));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('hidden', p.id !== 'tab-' + nombre));
    if (vistas[nombre]) guard(vistas[nombre]);
  }
  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

  // ---------- Utilidades del catálogo ----------
  const PRIORIDADES = ['Alta', 'Media', 'Baja'];
  const estrellas = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const anno = (fecha) => (fecha ? fecha.slice(0, 4) : '-');
  // Clase de color del lomo: según el género (1 a 7) o, si no hay, según una posición
  const lomo = (id) => 'lomo-' + (((id || 1) - 1) % 7 + 1);
  const nombresAutores = (autores = []) => autores.map((a) => a.nombre).join(', ') || 'Autor desconocido';

  function vacio(texto) {
    return el('div', { class: 'empty' }, texto);
  }

  function chipsGeneros(generos = []) {
    return el('div', { class: 'chips' },
      generos.map((g) => el('span', { class: 'chip ' + lomo(g.idGenero) }, g.clasificacion)));
  }

  // Datos de referencia que no cambian: se cargan una sola vez
  const ref = { generos: [], autores: [], sagas: [], formatos: [], cargado: false };

  async function cargarReferencias() {
    if (ref.cargado) return;
    [ref.generos, ref.autores, ref.sagas, ref.formatos] = await Promise.all([
      Api.generos.list(), Api.autores.list(), Api.sagas.list(), Api.formatos.list(),
    ]);
    const llenar = (select, items, valor, texto) =>
      items.forEach((i) => select.append(el('option', { value: i[valor] }, i[texto])));
    llenar($('f-genero'), ref.generos, 'idGenero', 'clasificacion');
    llenar($('f-autor'), ref.autores, 'idAutor', 'nombre');
    llenar($('f-saga'), ref.sagas, 'idSaga', 'nombre');
    llenar($('il-formato'), ref.formatos, 'idFormato', 'tipoFormato');
    ref.cargado = true;
  }

  // ---------- Catálogo ----------
  vistas.catalogo = async () => {
    await cargarReferencias();
    await buscarLibros();
  };

  async function buscarLibros() {
    const libros = await Api.libros.list({
      q: $('f-texto').value.trim(),
      genero: $('f-genero').value,
      autor: $('f-autor').value,
      saga: $('f-saga').value,
    });
    $('catalogo-total').textContent = libros.length === 1 ? '1 libro' : `${libros.length} libros`;
    const lista = $('catalogo-lista');
    lista.textContent = '';
    if (!libros.length) {
      lista.append(vacio('No hay libros que coincidan con la búsqueda.'));
      return;
    }
    libros.forEach((libro) => lista.append(el('div', { class: 'slot' }, tarjetaLibro(libro))));
  }

  function tarjetaLibro(libro) {
    const genero = libro.generos && libro.generos[0];
    return el('article', { class: 'book ' + lomo(genero && genero.idGenero) },
      chipsGeneros(libro.generos),
      el('h4', {}, libro.titulo),
      el('span', { class: 'autores' }, nombresAutores(libro.autores)),
      libro.nombreSaga && el('span', { class: 'saga-tag' }, `${libro.nombreSaga} · #${libro.ordenSaga}`),
      el('div', { class: 'acciones' },
        el('button', { class: 'btn primary small', onclick: () => guard(() => abrirLibro(libro.idLibro)) }, 'Ver detalle')));
  }

  // Búsqueda mientras se escribe (espera 300 ms después de la última tecla)
  let esperaBusqueda;
  $('f-texto').oninput = () => {
    clearTimeout(esperaBusqueda);
    esperaBusqueda = setTimeout(() => guard(buscarLibros), 300);
  };
  ['f-genero', 'f-autor', 'f-saga'].forEach((id) => ($(id).onchange = () => guard(buscarLibros)));
  $('f-limpiar').onclick = () => {
    $('filtros').reset();
    guard(buscarLibros);
  };

  // ---------- Detalle de libro ----------
  async function abrirLibro(idLibro) {
    const [libro, valoraciones, listaPorLeer] = await Promise.all([
      Api.libros.get(idLibro),
      Api.libros.valoraciones(idLibro),
      Api.porLeer.list(usuario.idUsuario),
    ]);
    const enLista = listaPorLeer.find((p) => p.idLibro === idLibro) || null;
    const genero = libro.generos && libro.generos[0];
    const cont = $('libro-detalle');
    cont.textContent = '';

    cont.append(
      el('div', { class: 'detalle-header ' + lomo(genero && genero.idGenero) },
        chipsGeneros(libro.generos),
        el('h3', {}, libro.titulo),
        libro.nombreSaga && el('p', { class: 'saga-tag', style: 'margin:4px 0 0' },
          `Libro ${libro.ordenSaga} de la saga `,
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); guard(() => abrirSaga(libro.idSaga)); } }, libro.nombreSaga))),

      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Autores'),
        el('ul', { class: 'lista-simple' },
          (libro.autores || []).map((a) => el('li', {}, el('strong', {}, a.nombre), ` · ${a.rol} · ${a.nacionalidad}`)))),

      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Ediciones'),
        seccionEdiciones(libro)),

      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Mi lista por leer'),
        seccionPorLeer(libro, enLista)),

      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Reseñas de los lectores'),
        seccionResenas(valoraciones)));

    if (!$('libro-dialog').open) $('libro-dialog').showModal();
  }

  function seccionEdiciones(libro) {
    if (!libro.ediciones || !libro.ediciones.length) return el('p', { class: 'muted' }, 'Este libro no tiene ediciones registradas.');
    return el('div', { class: 'tabla-wrap' },
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {},
          ['Tipo', 'Editorial', 'ISBN', 'Páginas', 'Año', ''].map((t) => el('th', {}, t)))),
        el('tbody', {}, libro.ediciones.map((ed) => el('tr', {},
          el('td', {}, ed.tipo),
          el('td', {}, ed.editorial),
          el('td', { class: 'small' }, ed.isbn),
          el('td', {}, String(ed.totPaginas)),
          el('td', {}, anno(ed.annoPublicacion)),
          el('td', {}, el('button', { class: 'btn secondary small', onclick: () => abrirIniciar(libro, ed) }, 'Leer')))))));
  }

  function seccionPorLeer(libro, enLista) {
    if (enLista) {
      return el('p', {}, 'Está en su lista con prioridad ',
        el('span', { class: 'pill ' + enLista.prioridad.toLowerCase() }, enLista.prioridad),
        el('span', { class: 'muted small' }, ` · agregado el ${fmtFecha(enLista.fechaAgregado)}`));
    }
    const select = el('select', { 'aria-label': 'Prioridad' },
      PRIORIDADES.map((p) => el('option', { value: p, selected: p === 'Media' ? 'selected' : null }, p)));
    return el('div', { class: 'por-leer-form' },
      el('span', {}, 'Prioridad:'), select,
      el('button', {
        class: 'btn gold small',
        onclick: () => guard(async () => {
          await Api.porLeer.add(usuario.idUsuario, { idLibro: libro.idLibro, prioridad: select.value });
          toast(`"${libro.titulo}" se agregó a su lista por leer`);
          await abrirLibro(libro.idLibro);
        }),
      }, 'Agregar a por leer'));
  }

  function seccionResenas(valoraciones) {
    if (!valoraciones.length) return el('p', { class: 'muted' }, 'Este libro todavía no tiene reseñas.');
    const promedio = valoraciones.reduce((s, v) => s + v.puntuacion, 0) / valoraciones.length;
    return el('div', {},
      el('p', { style: 'margin:0' },
        el('span', { class: 'estrellas' }, estrellas(Math.round(promedio))),
        ` ${promedio.toFixed(1)} de 5 · ${valoraciones.length} ${valoraciones.length === 1 ? 'reseña' : 'reseñas'}`),
      valoraciones.map((v) => el('div', { class: 'resena' },
        el('span', { class: 'estrellas' }, estrellas(v.puntuacion)),
        el('span', { class: 'quien' }, ` ${v.nombreUsuario} · ${fmtFecha(v.fecha)}`),
        el('p', {}, v.resenna))));
  }

  // ---------- Iniciar lectura de una edición ----------
  let edicionAIniciar = null;

  function abrirIniciar(libro, edicion) {
    edicionAIniciar = { libro, edicion };
    $('iniciar-edicion').textContent =
      `${libro.titulo} · ${edicion.tipo}, ${edicion.editorial} (${edicion.totPaginas} páginas)`;
    $('iniciar-form').reset();
    $('iniciar-dialog').showModal();
  }

  $('iniciar-form').onsubmit = (e) => {
    e.preventDefault();
    guard(async () => {
      const { libro, edicion } = edicionAIniciar;
      await Api.lecturas.create(usuario.idUsuario, {
        idEdicion: edicion.idEdicion,
        idFormato: Number($('il-formato').value),
        estado: $('il-estado').value,
      });
      $('iniciar-dialog').close();
      $('libro-dialog').close();
      toast(`Lectura de "${libro.titulo}" iniciada. Puede verla en Mis lecturas.`);
    });
  };

  // ---------- Sagas ----------
  vistas.sagas = async () => {
    const sagas = await Api.sagas.list();
    // Se pide el detalle de cada saga para mostrar sus libros en el estante
    const detalles = await Promise.all(sagas.map((s) => Api.sagas.get(s.idSaga)));
    const lista = $('sagas-lista');
    lista.textContent = '';
    if (!detalles.length) {
      lista.append(vacio('No hay sagas registradas.'));
      return;
    }
    detalles.forEach((saga) => lista.append(tarjetaSaga(saga)));
  };

  function tarjetaSaga(saga) {
    const libros = saga.libros || [];
    return el('article', { class: 'saga-card' },
      el('h3', {}, saga.nombre),
      el('span', { class: 'muted small' },
        `${libros.length} ${libros.length === 1 ? 'libro' : 'libros'} · ${nombresAutores(saga.autores)}`),
      chipsGeneros(saga.generos),
      el('div', { class: 'lomos', 'aria-hidden': 'true' },
        libros.map((l, i) => el('span', {
          class: 'lomo ' + lomo(i + 1),
          style: `height:${48 + (i % 3) * 8}px`,
          title: l.titulo,
        }, String(l.ordenSaga)))),
      el('p', { class: 'small' }, saga.descripcion),
      el('button', { class: 'btn primary small', onclick: () => guard(() => abrirSaga(saga.idSaga)) }, 'Ver saga'));
  }

  async function abrirSaga(idSaga) {
    const saga = await Api.sagas.get(idSaga);
    const cont = $('saga-detalle');
    cont.textContent = '';
    cont.append(
      el('div', { class: 'detalle-header' },
        el('h3', {}, saga.nombre),
        chipsGeneros(saga.generos)),
      el('p', {}, saga.descripcion),
      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Autores'),
        el('p', { style: 'margin:0' }, nombresAutores(saga.autores))),
      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Orden de lectura'),
        el('ul', { class: 'saga-libros' },
          (saga.libros || []).map((l) => el('li', {},
            el('span', { class: 'num' }, String(l.ordenSaga)),
            el('span', { style: 'flex:1' }, l.titulo),
            el('button', {
              class: 'btn ghost small',
              onclick: () => guard(async () => {
                $('saga-dialog').close();
                await abrirLibro(l.idLibro);
              }),
            }, 'Ver libro'))))));
    if (!$('saga-dialog').open) $('saga-dialog').showModal();
  }

  // ---------- Mis lecturas ----------
  const ESTADOS = ['por iniciar', 'en curso', 'terminada', 'abandonada'];
  const ETIQUETA_ESTADO = {
    'por iniciar': 'Por iniciar', 'en curso': 'En curso', terminada: 'Terminada', abandonada: 'Abandonada',
  };
  const claseEstado = (estado) => estado.replace(' ', '-');   // "en curso" -> "en-curso"
  const estaActiva = (l) => l.estado === 'por iniciar' || l.estado === 'en curso';
  const porcentaje = (l) => (l.totPaginas ? Math.min(100, Math.round((l.paginaActual * 100) / l.totPaginas)) : 0);
  const pillEstado = (estado) => el('span', { class: 'pill ' + claseEstado(estado) }, ETIQUETA_ESTADO[estado] || estado);
  const fmtMinutos = (m) => {
    if (m < 60) return `${m} min`;
    const horas = Math.floor(m / 60);
    return m % 60 ? `${horas} h ${m % 60} min` : `${horas} h`;
  };
  const rangoFechas = (l) => (l.fechaFin
    ? `${fmtFecha(l.fechaInicio)} – ${fmtFecha(l.fechaFin)}`
    : `Desde ${fmtFecha(l.fechaInicio)}`);
  const barraProgreso = (l) => el('div', { class: 'progreso ' + claseEstado(l.estado) },
    el('span', { style: `width:${porcentaje(l)}%` }));

  vistas.lecturas = async () => {
    await cargarReferencias();   // los formatos se usan en el detalle
    await cargarLecturas();
  };

  async function cargarLecturas() {
    const filtro = $('lecturas-filtro').value;
    // Todas las lecturas para los contadores y, si hay filtro, la lista filtrada por el backend (?estado=)
    const [todas, filtradas] = await Promise.all([
      Api.lecturas.list(usuario.idUsuario),
      filtro ? Api.lecturas.list(usuario.idUsuario, filtro) : null,
    ]);

    const contadores = $('lecturas-contadores');
    contadores.textContent = '';
    ESTADOS.forEach((estado) => {
      const n = todas.filter((l) => l.estado === estado).length;
      if (n) contadores.append(el('span', { class: 'pill ' + claseEstado(estado) }, `${ETIQUETA_ESTADO[estado]}: ${n}`));
    });

    const lecturas = filtradas || todas;
    const lista = $('lecturas-lista');
    lista.textContent = '';
    if (!lecturas.length) {
      lista.append(vacio(filtro
        ? 'No tiene lecturas en este estado.'
        : 'Todavía no tiene lecturas. Busque un libro en el catálogo y presione "Leer".'));
      return;
    }
    lecturas.forEach((l) => lista.append(el('div', { class: 'slot' }, tarjetaLectura(l))));
  }

  function tarjetaLectura(l) {
    return el('article', { class: `book estado-${claseEstado(l.estado)}` + (l.estado === 'en curso' ? ' marcado' : '') },
      pillEstado(l.estado),
      el('h4', {}, l.titulo),
      el('span', { class: 'meta' }, `${l.tipoEdicion} · ${l.editorial} · ${l.tipoFormato}`),
      barraProgreso(l),
      el('span', { class: 'meta' }, `Pág. ${l.paginaActual} de ${l.totPaginas} (${porcentaje(l)}%) · ${fmtMinutos(l.minutosLeidos)}`),
      el('span', { class: 'fechas' }, rangoFechas(l)),
      el('div', { class: 'acciones' },
        estaActiva(l) && el('button', { class: 'btn primary small', onclick: () => abrirSesion(l) }, 'Registrar sesión'),
        el('button', { class: 'btn ghost small', onclick: () => guard(() => abrirLectura(l.idLectura)) }, 'Detalle')));
  }

  $('lecturas-filtro').onchange = () => guard(cargarLecturas);
  $('lecturas-nueva').onclick = () => showTab('catalogo');

  // ---------- Detalle de lectura ----------
  async function abrirLectura(idLectura) {
    const l = await Api.lecturas.get(usuario.idUsuario, idLectura);
    const sesiones = l.sesiones || [];
    const cont = $('lectura-detalle');
    cont.textContent = '';

    const dato = (etiqueta, valor) => el('div', {}, el('span', { class: 'etiqueta' }, etiqueta), el('span', { class: 'dato' }, valor));

    cont.append(
      el('div', { class: 'detalle-header estado-' + claseEstado(l.estado) },
        pillEstado(l.estado),
        el('h3', {}, l.titulo),
        el('p', { class: 'muted', style: 'margin:2px 0 0' }, `${l.tipoEdicion} · ${l.editorial} · ${l.tipoFormato} · ${rangoFechas(l)}`)),

      el('div', { class: 'info-grid' },
        dato('Progreso', `${porcentaje(l)}%`),
        dato('Página actual', `${l.paginaActual} de ${l.totPaginas}`),
        dato('Páginas leídas', String(l.paginasLeidas)),
        dato('Tiempo de lectura', fmtMinutos(l.minutosLeidos)),
        dato('Sesiones', String(sesiones.length))),
      barraProgreso(l),

      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Acciones'),
        accionesLectura(l)),

      el('section', { class: 'detalle-seccion' },
        el('h4', {}, 'Sesiones de lectura'),
        tablaSesiones(l, sesiones)));

    if (!$('lectura-dialog').open) $('lectura-dialog').showModal();
  }

  function accionesLectura(l) {
    const formato = el('select', {
      'aria-label': 'Formato',
      onchange: (e) => cambiarLectura(l, { idFormato: Number(e.target.value) }, 'Formato actualizado'),
    }, ref.formatos.map((f) => el('option', {
      value: f.idFormato, selected: f.idFormato === l.idFormato ? 'selected' : null,
    }, f.tipoFormato)));

    return el('div', { class: 'acciones-detalle' },
      estaActiva(l) && el('button', { class: 'btn primary small', onclick: () => abrirSesion(l) }, 'Registrar sesión'),
      estaActiva(l) && el('button', {
        class: 'btn secondary small',
        onclick: () => cambiarLectura(l, { estado: 'terminada' }, 'Lectura terminada'),
      }, 'Marcar como terminada'),
      estaActiva(l) && el('button', {
        class: 'btn danger small',
        onclick: () => cambiarLectura(l, { estado: 'abandonada' }, 'Lectura abandonada'),
      }, 'Abandonar'),
      !estaActiva(l) && el('button', {
        class: 'btn secondary small',
        onclick: () => cambiarLectura(l, { estado: 'en curso' }, 'La lectura volvió a estar en curso'),
      }, 'Retomar lectura'),
      el('span', { class: 'small muted', style: 'margin-left:8px' }, 'Formato:'), formato,
      el('span', { class: 'spacer', style: 'flex:1' }),
      el('button', { class: 'btn danger small', onclick: () => eliminarLectura(l) }, 'Eliminar lectura'));
  }

  function tablaSesiones(l, sesiones) {
    if (!sesiones.length) return el('p', { class: 'muted' }, 'Aún no hay sesiones registradas.');
    return el('div', { class: 'tabla-wrap' },
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {},
          ['#', 'Páginas', 'Leídas', 'Tiempo', 'Capítulo', ''].map((t) => el('th', {}, t)))),
        el('tbody', {}, sesiones.map((s, i) => el('tr', {},
          el('td', {}, String(i + 1)),
          el('td', {}, `${s.pagInicio} – ${s.pagFin}`),
          el('td', {}, String(s.pagLeidas)),
          el('td', {}, fmtMinutos(s.duracion)),
          el('td', {}, String(s.capActual)),
          el('td', {}, el('button', {
            class: 'btn danger small',
            title: 'Eliminar sesión',
            onclick: () => eliminarSesion(l, s, i + 1),
          }, 'Eliminar')))))));
  }

  // Actualiza la lectura (estado o formato) y refresca el detalle y la lista
  function cambiarLectura(l, cambios, mensaje) {
    return guard(async () => {
      await Api.lecturas.update(usuario.idUsuario, l.idLectura, cambios);
      toast(mensaje);
      await refrescarLectura(l.idLectura);
    });
  }

  async function refrescarLectura(idLectura) {
    await cargarLecturas();
    if ($('lectura-dialog').open) await abrirLectura(idLectura);
  }

  function eliminarLectura(l) {
    if (!confirm(`¿Eliminar la lectura de "${l.titulo}"? También se borrarán sus sesiones y su valoración.`)) return;
    guard(async () => {
      await Api.lecturas.remove(usuario.idUsuario, l.idLectura);
      $('lectura-dialog').close();
      toast('Lectura eliminada');
      await cargarLecturas();
    });
  }

  function eliminarSesion(l, sesion, numero) {
    if (!confirm(`¿Eliminar la sesión #${numero} (páginas ${sesion.pagInicio} a ${sesion.pagFin})?`)) return;
    guard(async () => {
      await Api.sesiones.remove(l.idLectura, sesion.idSesion);
      toast('Sesión eliminada');
      await refrescarLectura(l.idLectura);
    });
  }

  // ---------- Registrar sesión ----------
  let lecturaSesion = null;

  function abrirSesion(l) {
    lecturaSesion = l;
    $('sesion-form').reset();
    $('sesion-libro').textContent = `${l.titulo} · ${l.totPaginas} páginas`;
    // La sesión continúa donde quedó la anterior
    $('sf-inicio').value = l.paginaActual;
    $('sf-inicio').max = l.totPaginas;
    $('sf-fin').min = l.paginaActual;
    $('sf-fin').max = l.totPaginas;
    $('sesion-ayuda').textContent = `Va en la página ${l.paginaActual} de ${l.totPaginas}.`;
    $('sesion-dialog').showModal();
  }

  // Si se cambia la página inicial, la final no puede ser menor
  $('sf-inicio').oninput = () => { $('sf-fin').min = $('sf-inicio').value || 0; };

  $('sesion-form').onsubmit = (e) => {
    e.preventDefault();
    guard(async () => {
      const l = lecturaSesion;
      const datos = {
        pagInicio: Number($('sf-inicio').value),
        pagFin: Number($('sf-fin').value),
        duracion: Number($('sf-duracion').value),
        capActual: Number($('sf-capitulo').value),
      };
      await Api.sesiones.create(l.idLectura, datos);
      $('sesion-dialog').close();
      toast(`Sesión registrada: ${datos.pagFin - datos.pagInicio} páginas en ${fmtMinutos(datos.duracion)}`);

      if (datos.pagFin >= l.totPaginas
          && confirm(`Llegó a la última página de "${l.titulo}". ¿Desea marcar la lectura como terminada?`)) {
        await Api.lecturas.update(usuario.idUsuario, l.idLectura, { estado: 'terminada' });
        toast(`¡Felicidades! Terminó "${l.titulo}"`);
      }
      await refrescarLectura(l.idLectura);
    });
  };

  // ---------- Perfil ----------
  $('perfil-btn').onclick = () => {
    $('pf-nombre').value = usuario.nombre;
    $('pf-correo').value = usuario.correo;
    $('pf-fecha').textContent = fmtFecha(usuario.fechaRegistro);
    $('perfil-dialog').showModal();
  };

  $('perfil-form').onsubmit = (e) => {
    e.preventDefault();
    guard(async () => {
      const cambios = {};
      const nombre = $('pf-nombre').value.trim();
      const correo = $('pf-correo').value.trim();
      if (nombre !== usuario.nombre) cambios.nombre = nombre;
      if (correo !== usuario.correo) cambios.correo = correo;
      if (Object.keys(cambios).length === 0) { $('perfil-dialog').close(); return; }

      const actualizado = await Api.usuarios.update(usuario.idUsuario, cambios);
      usuario = actualizado;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
      mostrarUsuario();
      $('perfil-dialog').close();
      toast('Perfil actualizado');
    });
  };

  // Botones "Cancelar" de los diálogos
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => b.closest('dialog').close()));

  // ---------- Restaurar sesión ----------
  // Si la pestaña se recarga, se vuelve a pedir el usuario al backend para tener los datos al día
  const guardado = sessionStorage.getItem(SESSION_KEY);
  if (guardado) {
    try {
      const { idUsuario } = JSON.parse(guardado);
      Api.usuarios.get(idUsuario)
        .then(iniciarSesion)
        .catch(() => sessionStorage.removeItem(SESSION_KEY));
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
})();
