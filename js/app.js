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
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.add('hidden'), 3500);
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
