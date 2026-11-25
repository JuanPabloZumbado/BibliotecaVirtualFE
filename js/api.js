/**
 * Cliente del API REST del backend BibliotecaVirtualCloudDBRest.
 * Cada método devuelve una Promise con el JSON de la respuesta.
 * Si el backend responde con error, lanza un Error con el "message" que envía el servidor.
 */
const Api = (() => {
  const BASE_URL = 'http://localhost:8080';

  async function request(method, path, body) {
    const url = BASE_URL + '/api/v1' + path;
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      throw new Error('No se pudo conectar con el servidor. ¿Está el backend activo en el puerto 8080?');
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || `Error HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // Arma "?a=1&b=2" ignorando los valores vacíos
  function query(params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const s = qs.toString();
    return s ? '?' + s : '';
  }

  const enc = encodeURIComponent;

  return {
    usuarios: {
      get: (id) => request('GET', `/usuarios/${id}`),
      getByCorreo: (correo) => request('GET', `/usuarios/by-correo/${enc(correo)}`),
      update: (id, datos) => request('PATCH', `/usuarios/${id}`, datos),
      estadisticas: (id) => request('GET', `/usuarios/${id}/estadisticas`),
    },
    libros: {
      list: (filtros = {}) => request('GET', '/libros' + query(filtros)),   // { genero, autor, saga, q }
      get: (id) => request('GET', `/libros/${id}`),
      ediciones: (id) => request('GET', `/libros/${id}/ediciones`),
      valoraciones: (id) => request('GET', `/libros/${id}/valoraciones`),
    },
    ediciones: {
      get: (id) => request('GET', `/ediciones/${id}`),
    },
    autores: {
      list: () => request('GET', '/autores'),
      get: (id) => request('GET', `/autores/${id}`),
      libros: (id) => request('GET', `/autores/${id}/libros`),
    },
    generos: {
      list: () => request('GET', '/generos'),
    },
    sagas: {
      list: () => request('GET', '/sagas'),
      get: (id) => request('GET', `/sagas/${id}`),
    },
    formatos: {
      list: () => request('GET', '/formatos'),
    },
    lecturas: {
      list: (uid, estado) => request('GET', `/usuarios/${uid}/lecturas` + query({ estado })),
      get: (uid, id) => request('GET', `/usuarios/${uid}/lecturas/${id}`),
      create: (uid, datos) => request('POST', `/usuarios/${uid}/lecturas`, datos),
      update: (uid, id, datos) => request('PATCH', `/usuarios/${uid}/lecturas/${id}`, datos),
      remove: (uid, id) => request('DELETE', `/usuarios/${uid}/lecturas/${id}`),
    },
    sesiones: {
      list: (idLectura) => request('GET', `/lecturas/${idLectura}/sesiones`),
      create: (idLectura, datos) => request('POST', `/lecturas/${idLectura}/sesiones`, datos),
      remove: (idLectura, id) => request('DELETE', `/lecturas/${idLectura}/sesiones/${id}`),
    },
    valoraciones: {
      deLectura: (idLectura) => request('GET', `/lecturas/${idLectura}/valoraciones`),
      create: (idLectura, datos) => request('POST', `/lecturas/${idLectura}/valoraciones`, datos),
      get: (id) => request('GET', `/valoraciones/${id}`),
      update: (id, datos) => request('PATCH', `/valoraciones/${id}`, datos),
      remove: (id) => request('DELETE', `/valoraciones/${id}`),
    },
    porLeer: {
      list: (uid, prioridad) => request('GET', `/usuarios/${uid}/por-leer` + query({ prioridad })),
      get: (uid, idLibro) => request('GET', `/usuarios/${uid}/por-leer/${idLibro}`),
      add: (uid, datos) => request('POST', `/usuarios/${uid}/por-leer`, datos),
      update: (uid, idLibro, datos) => request('PATCH', `/usuarios/${uid}/por-leer/${idLibro}`, datos),
      remove: (uid, idLibro) => request('DELETE', `/usuarios/${uid}/por-leer/${idLibro}`),
    },
  };
})();
