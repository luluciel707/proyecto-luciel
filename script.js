/* ♡ INICIO: SESIÓN, PERFIL Y POSTS ♡ */

let sesionId = null;     // id de la persona que inició sesión
let miPerfil = null;     // su fila de la tabla perfiles
let editandoId = null;   // id del post que se está editando (o null)


/* ---------- SESIÓN ---------- */

async function actualizarSesion(session) {
  const user = session ? session.user : null;

  // si es la misma sesión de antes, no hacemos nada
  if ((user ? user.id : null) === sesionId && (user ? miPerfil : true)) return;

  sesionId = user ? user.id : null;
  miPerfil = null;

  $('vista-auth').hidden = !!user;
  $('vista-panel').hidden = !user;
  $('btn-salir').hidden = !user;

  if (!user) return;

  const { data, error } = await db
    .from('perfiles')
    .select('id, usuario, nombre, bio')
    .eq('id', user.id)
    .maybeSingle();

  if (error) console.error(error);
  miPerfil = data;
  mostrarPanel();
}

function mostrarPanel() {
  const tienePerfil = !!miPerfil;
  $('form-perfil').hidden = tienePerfil;
  $('bloque-editor').hidden = !tienePerfil;

  if (tienePerfil) {
    $('saludo').textContent = miPerfil.nombre || miPerfil.usuario;
    $('ver-mi-blog').href = 'blog.html?u=' + encodeURIComponent(miPerfil.usuario);
    cargarMisPosts();
  }
}

db.auth.onAuthStateChange((_evento, session) => {
  // setTimeout evita bloqueos al llamar a la base dentro de este aviso
  setTimeout(() => actualizarSesion(session), 0);
});


/* ---------- REGISTRO / ENTRAR / SALIR ---------- */

$('form-registro').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('reg-email').value.trim();
  const pass = $('reg-pass').value;

  if (pass.length < 8) return aviso('aviso-auth', 'La contraseña tiene que tener al menos 8 caracteres.', true);

  const { data, error } = await db.auth.signUp({ email, password: pass });

  if (error) return aviso('aviso-auth', 'No se pudo crear la cuenta: ' + error.message, true);

  if (!data.session) {
    aviso('aviso-auth', '¡Listo! Revisá tu mail para confirmar la cuenta y después iniciá sesión ♡');
  }
});

$('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('login-email').value.trim();
  const password = $('login-pass').value;

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.includes('Invalid login')
      ? 'Email o contraseña incorrectos.'
      : error.message;
    return aviso('aviso-auth', msg, true);
  }
  aviso('aviso-auth', '');
});

$('btn-salir').addEventListener('click', async () => {
  await db.auth.signOut();
});


/* ---------- PERFIL (primera vez) ---------- */

$('form-perfil').addEventListener('submit', async e => {
  e.preventDefault();
  const usuario = $('perfil-usuario').value.trim().toLowerCase();
  const nombre = $('perfil-nombre').value.trim() || null;
  const bio = $('perfil-bio').value.trim() || null;

  if (!/^[a-z0-9_]{3,20}$/.test(usuario)) {
    return aviso('aviso-perfil', 'El usuario debe tener de 3 a 20 letras minúsculas, números o _ (sin espacios ni tildes).', true);
  }

  const { error } = await db.from('perfiles').insert({ id: sesionId, usuario, nombre, bio });

  if (error) {
    if (error.code === '23505') return aviso('aviso-perfil', 'Ese usuario ya existe, probá con otro.', true);
    console.error(error);
    return aviso('aviso-perfil', 'No se pudo crear el perfil: ' + error.message, true);
  }

  miPerfil = { id: sesionId, usuario, nombre, bio };
  mostrarPanel();
});


/* ---------- EDITOR DE POSTS ---------- */

function salirDeEdicion() {
  editandoId = null;
  $('form-post').reset();
  $('editor-titulo').textContent = 'Nuevo post';
  $('post-enviar').textContent = 'Publicar ♡';
  $('post-cancelar').hidden = true;
}

$('post-cancelar').addEventListener('click', () => {
  salirDeEdicion();
  aviso('aviso-post', '');
});

$('form-post').addEventListener('submit', async e => {
  e.preventDefault();
  const titulo = $('post-titulo').value.trim();
  const contenido = $('post-contenido').value.trim();
  const publicado = !$('post-borrador').checked;

  if (!titulo || !contenido) return aviso('aviso-post', 'Completá el título y el contenido.', true);

  const boton = $('post-enviar');
  boton.disabled = true;

  try {
    const consulta = editandoId
      ? db.from('posts').update({ titulo, contenido, publicado }).eq('id', editandoId)
      : db.from('posts').insert({ titulo, contenido, publicado });

    const { error } = await consulta;

    if (error) {
      console.error(error);
      return aviso('aviso-post', 'No se pudo guardar: ' + error.message, true);
    }

    aviso('aviso-post', editandoId ? '¡Post actualizado! ♡' : '¡Post guardado! ♡');
    salirDeEdicion();
    cargarMisPosts();
    cargarUltimos();
  } finally {
    boton.disabled = false;
  }
});


/* ---------- MIS POSTS ---------- */

async function cargarMisPosts() {
  const lista = $('mis-posts');
  lista.innerHTML = '';

  const { data, error } = await db
    .from('posts')
    .select('id, titulo, contenido, publicado, created_at')
    .eq('autor_id', sesionId)
    .order('created_at', { ascending: false });

  if (error) { console.error(error); lista.append(crear('p', 'ayuda', 'No se pudieron cargar tus posts.')); return; }
  if (!data.length) { lista.append(crear('p', 'ayuda', 'Todavía no escribiste nada. ¡Animate! ✧')); return; }

  data.forEach(p => {
    const tarjeta = tarjetaPost(p, false);
    if (!p.publicado) tarjeta.prepend(crear('span', 'etiqueta', 'borrador'));

    const botones = crear('div', 'botones');

    const editar = crear('button', 'suave', 'Editar');
    editar.type = 'button';
    editar.addEventListener('click', () => {
      editandoId = p.id;
      $('post-titulo').value = p.titulo;
      $('post-contenido').value = p.contenido;
      $('post-borrador').checked = !p.publicado;
      $('editor-titulo').textContent = 'Editando post';
      $('post-enviar').textContent = 'Guardar cambios ♡';
      $('post-cancelar').hidden = false;
      $('form-post').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const borrar = crear('button', 'peligro', 'Borrar');
    borrar.type = 'button';
    borrar.addEventListener('click', async () => {
      if (!confirm('¿Seguro que querés borrar este post?')) return;
      const { error } = await db.from('posts').delete().eq('id', p.id);
      if (error) return aviso('aviso-post', 'No se pudo borrar: ' + error.message, true);
      if (editandoId === p.id) salirDeEdicion();
      cargarMisPosts();
      cargarUltimos();
    });

    botones.append(editar, borrar);
    tarjeta.append(botones);
    lista.append(tarjeta);
  });
}


/* ---------- ÚLTIMOS POSTS (públicos) ---------- */

async function cargarUltimos() {
  const lista = $('ultimos');
  lista.innerHTML = '';

  const { data, error } = await db
    .from('posts')
    .select('id, titulo, contenido, created_at, perfiles(usuario, nombre)')
    .eq('publicado', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) { console.error(error); lista.append(crear('p', 'ayuda', 'No se pudieron cargar los posts.')); return; }
  if (!data.length) { lista.append(crear('p', 'ayuda', 'Todavía no hay posts. ¡Sé la primera persona en escribir! ♡')); return; }

  data.forEach(p => lista.append(tarjetaPost(p, true)));
}

cargarUltimos();
