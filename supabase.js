/* ♡ CONEXIÓN Y FUNCIONES COMPARTIDAS ♡ */

const SUPABASE_URL = 'PEGA-ACA-LA-URL-DEL-PROYECTO-NUEVO';
const SUPABASE_KEY = 'PEGA-ACA-LA-PUBLISHABLE-KEY';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto) el.textContent = texto;   // textContent: nunca se interpreta como HTML
  return el;
}

function aviso(id, texto, error = false) {
  const el = $(id);
  el.textContent = texto;
  el.className = error ? 'aviso error' : 'aviso';
}

function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString('es-AR');
}

/* Tarjeta de un post. conAutor = true en el inicio (muestra autor y resume el texto) */
function tarjetaPost(p, conAutor) {
  const tarjeta = crear('article', 'post');
  tarjeta.append(crear('h3', '', p.titulo));

  const meta = crear('div', 'meta');
  if (conAutor && p.perfiles) {
    const autor = crear('a', '', '♡ ' + (p.perfiles.nombre || p.perfiles.usuario));
    autor.href = 'blog.html?u=' + encodeURIComponent(p.perfiles.usuario);
    meta.append(autor);
  }
  meta.append(crear('span', '', fechaCorta(p.created_at)));

  const texto = conAutor && p.contenido.length > 300
    ? p.contenido.slice(0, 300) + '…'
    : p.contenido;

  tarjeta.append(meta, crear('p', 'texto', texto));
  return tarjeta;
}
