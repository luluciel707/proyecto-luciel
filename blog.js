/* ♡ BLOG PÚBLICO DE UNA PERSONA ♡ */

(async function () {
  const usuario = (new URLSearchParams(location.search).get('u') || '').toLowerCase();
  const lista = $('blog-posts');

  if (!usuario) {
    $('blog-titulo').textContent = 'Falta el usuario (╥﹏╥)';
    return;
  }

  const { data: perfil, error } = await db
    .from('perfiles')
    .select('id, usuario, nombre, bio')
    .eq('usuario', usuario)
    .maybeSingle();

  if (error || !perfil) {
    $('blog-titulo').textContent = 'Este blog no existe (╥﹏╥)';
    return;
  }

  document.title = '♡ ' + (perfil.nombre || perfil.usuario) + ' ♡';
  $('blog-titulo').textContent = perfil.nombre || perfil.usuario;
  $('blog-usuario').textContent = '@' + perfil.usuario;
  $('blog-bio').textContent = perfil.bio || '';

  const { data: posts, error: errorPosts } = await db
    .from('posts')
    .select('id, titulo, contenido, created_at')
    .eq('autor_id', perfil.id)
    .eq('publicado', true)
    .order('created_at', { ascending: false });

  if (errorPosts) { console.error(errorPosts); lista.append(crear('p', 'ayuda', 'No se pudieron cargar los posts.')); return; }
  if (!posts.length) { lista.append(crear('p', 'ayuda', 'Todavía no hay posts por acá ✧')); return; }

  posts.forEach(p => lista.append(tarjetaPost(p, false)));
})();
