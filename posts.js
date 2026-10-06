/* =========================================================
   ♡ POSTS CON LIKES Y RESPUESTAS ♡
   (este archivo reemplaza a la tarjetaPost de supabase.js)
   ========================================================= */

let yoId = null;   // id de la persona (solo si ya tiene perfil)

const CAMPOS_POST =
  'id, titulo, contenido, created_at, autor_id, likes(count), respuestas(count), perfiles(usuario, nombre)';


/* ---------- AVISO RÁPIDO ---------- */

function avisarRapido(texto) {
  const aviso = crear('div', 'toast', texto);
  aviso.setAttribute('role', 'status');
  document.body.append(aviso);
  setTimeout(() => aviso.remove(), 2800);
}


/* ---------- QUIÉN SOY ---------- */

async function cargarYo() {
  yoId = null;
  const { data } = await db.auth.getSession();
  const user = data.session ? data.session.user : null;
  if (!user) return;

  const { data: perfil } = await db
    .from('perfiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (perfil) yoId = perfil.id;
}


/* ---------- LIKES QUE YA DI ---------- */

async function misLikesDe(posts) {
  if (!yoId || !posts.length) return new Set();

  const { data } = await db
    .from('likes')
    .select('post_id')
    .eq('usuario_id', yoId)
    .in('post_id', posts.map(p => p.id));

  return new Set((data || []).map(l => l.post_id));
}


/* ---------- DIBUJAR UNA LISTA DE POSTS ---------- */

async function pintarPosts(lista, posts, conAutor) {
  const mios = await misLikesDe(posts);
  lista.innerHTML = '';   // se limpia justo antes de dibujar, así no se duplican
  posts.forEach(p => lista.append(tarjetaPost(p, conAutor, mios.has(p.id))));
}


/* ---------- TARJETA DE UN POST ---------- */

function tarjetaPost(p, conAutor, meGusta = false) {
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

  tarjeta.append(meta, crear('p', 'texto', texto), barraAcciones(p, meGusta));
  return tarjeta;
}


/* ---------- LIKE Y RESPUESTAS ---------- */

function barraAcciones(p, meGusta) {
  const contenedor = crear('div', 'interaccion');
  const barra = crear('div', 'acciones');

  /* corazoncito */
  let cuenta = p.likes && p.likes[0] ? p.likes[0].count : 0;
  let activo = meGusta;

  const like = crear('button', 'accion');
  like.type = 'button';

  function pintarLike() {
    like.textContent = (activo ? '💗 ' : '🤍 ') + cuenta;
    like.setAttribute('aria-pressed', String(activo));
    like.setAttribute('aria-label', activo ? 'Quitar me gusta' : 'Dar me gusta');
  }
  pintarLike();

  like.addEventListener('click', async () => {
    if (!yoId) return avisarRapido('Iniciá sesión y creá tu blog para dar like ♡');

    like.disabled = true;

    if (activo) {
      const { error } = await db
        .from('likes').delete()
        .eq('post_id', p.id).eq('usuario_id', yoId);
      if (!error) { activo = false; cuenta = Math.max(0, cuenta - 1); }
    } else {
      const { error } = await db.from('likes').insert({ post_id: p.id });
      if (!error) { activo = true; cuenta += 1; }
      else if (error.code === '23505') { activo = true; }   // ya tenía like
    }

    like.disabled = false;
    pintarLike();
  });

  /* respuestas */
  const nResp = p.respuestas && p.respuestas[0] ? p.respuestas[0].count : 0;
  const responder = crear('button', 'accion', '💬 ' + nResp);
  responder.type = 'button';
  responder.setAttribute('aria-expanded', 'false');

  const panel = crear('div', 'respuestas');
  panel.hidden = true;

  responder.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    responder.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) await cargarRespuestas(p, panel, responder);
  });

  barra.append(like, responder);
  contenedor.append(barra, panel);
  return contenedor;
}


async function cargarRespuestas(p, panel, boton) {
  panel.innerHTML = '';

  const { data, error } = await db
    .from('respuestas')
    .select('id, contenido, created_at, autor_id, perfiles(usuario, nombre)')
    .eq('post_id', p.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    panel.append(crear('p', 'ayuda', 'No se pudieron cargar las respuestas.'));
    return;
  }

  boton.textContent = '💬 ' + data.length;

  if (!data.length) {
    panel.append(crear('p', 'ayuda', 'Todavía no hay respuestas. ¡Sé la primera persona! ✧'));
  }

  data.forEach(r => {
    const item = crear('div', 'respuesta');

    const meta = crear('div', 'meta');
    const quien = crear('a', '', '♡ ' + (r.perfiles ? (r.perfiles.nombre || r.perfiles.usuario) : 'alguien'));
    if (r.perfiles) quien.href = 'blog.html?u=' + encodeURIComponent(r.perfiles.usuario);
    meta.append(quien, crear('span', '', fechaCorta(r.created_at)));

    item.append(meta, crear('p', 'texto', r.contenido));

    // puede borrar: quien escribió la respuesta o la dueña del post
    if (yoId && (r.autor_id === yoId || p.autor_id === yoId)) {
      const borrar = crear('button', 'mini', 'borrar');
      borrar.type = 'button';
      borrar.addEventListener('click', async () => {
        if (!confirm('¿Borrar esta respuesta?')) return;
        const { error } = await db.from('respuestas').delete().eq('id', r.id);
        if (error) return avisarRapido('No se pudo borrar (╥﹏╥)');
        cargarRespuestas(p, panel, boton);
      });
      item.append(borrar);
    }

    panel.append(item);
  });

  /* formulario para responder */
  if (!yoId) {
    panel.append(crear('p', 'ayuda', 'Iniciá sesión y creá tu blog para responder ♡'));
    return;
  }

  const caja = crear('div', 'caja-respuesta');

  const texto = document.createElement('textarea');
  texto.rows = 2;
  texto.maxLength = 500;
  texto.placeholder = 'escribí tu respuesta...';
  texto.setAttribute('aria-label', 'Tu respuesta');

  const enviar = crear('button', '', 'Responder ♡');
  enviar.type = 'button';

  enviar.addEventListener('click', async () => {
    const contenido = texto.value.trim();
    if (!contenido) return avisarRapido('Escribí algo primero ♡');

    enviar.disabled = true;
    const { error } = await db.from('respuestas').insert({ post_id: p.id, contenido });
    enviar.disabled = false;

    if (error) {
      console.error(error);
      return avisarRapido('No se pudo enviar la respuesta (╥﹏╥)');
    }
    cargarRespuestas(p, panel, boton);
  });

  caja.append(texto, enviar);
  panel.append(caja);
}
