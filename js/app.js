(() => {
  'use strict';

  const DATA = window.NEXTMOMENTS_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const imageUrl = (id, width = 720) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
  const read = (key, fallback) => { try { const value = localStorage.getItem(`nextmoments-${key}`); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(`nextmoments-${key}`, JSON.stringify(value)); } catch { /* storage can be disabled */ } };
  const savedKept = read('swipe-kept', []);
  const savedDiscarded = read('swipe-discarded', []);
  const reviewedIds = new Set([...savedKept, ...savedDiscarded]);
  const initialParticipants = [
    { id: 'maria', name: 'María', email: 'maria@example.demo', initials: 'MG' },
    { id: 'alex', name: 'Alex', email: 'alex@example.demo', initials: 'AR' },
    { id: 'lucia', name: 'Lucía', email: 'lucia@example.demo', initials: 'LM' },
    { id: 'diego', name: 'Diego', email: 'diego@example.demo', initials: 'DS' }
  ];
  const initialSharedPhotoIds = ['coast', 'friends-beach', 'family', 'campfire', 'mountain-road'];
  const icon = (name) => {
    const paths = {
      trash: '<path d="M4 7h16M10 11v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1.9-1.1 2-1.3-.5a8 8 0 0 1-1.5.9l-.2 1.4h-2.3l-.3-1.4a8 8 0 0 1-1.5-.9l-1.3.5-1.1-2 1.1-.9a8 8 0 0 1 0-1.8l-1.1-.9 1.1-2 1.3.5a8 8 0 0 1 1.5-.9l.3-1.4h2.3l.2 1.4a8 8 0 0 1 1.5.9l1.3-.5 1.1 2-1.1.9a8 8 0 0 1 0 1.8Z" transform="translate(-2 -2)"/>',
      bag: '<path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.dots}</svg>`;
  };

  const state = {
    screen: 'swipe-screen',
    current: 0,
    reviewed: read('swipe-reviewed-v2', 0),
    photos: DATA.photos.filter((photo) => !reviewedIds.has(photo.id)),
    kept: savedKept,
    discarded: savedDiscarded,
    filter: 'Todos',
    albumFilter: 'Todos',
    albumSearch: '',
    albums: [...DATA.albums],
    favorites: read('favorites', ['mountain-road', 'friends', 'coast', 'hike', 'friends-beach', 'paris']),
    cart: read('cart', []),
    points: read('points-v2', 0),
    sharedAlbumId: 'shared-summer-2026',
    sharedPhotoIds: read('shared-photo-ids', initialSharedPhotoIds).filter((id) => DATA.photos.some((photo) => photo.id === id)),
    sharedParticipants: read('shared-participants', initialParticipants),
    referralCode: read('referral-code', 'NM-VERANO26'),
    referralRegistrations: read('referral-registrations', []),
    referralHistory: read('referral-history', []),
    existingUsers: read('existing-album-invites', []),
    addingToSharedAlbum: false,
    toastTimer: null,
    pointerX: null,
    transitioning: false,
    transitionTimer: null
  };

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function setScreen(id) {
    const target = $(`#${id}`);
    if (!target) return;
    state.screen = id;
    $$('.screen').forEach((screen) => screen.classList.toggle('active', screen === target));
    const selectedNav = id === 'shared-album-screen' ? 'albums-screen' : id;
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.screen === selectedNav));
    const sharedAlbum = state.albums.find((album) => album.id === state.sharedAlbumId);
    const titles = { 'swipe-screen': 'Siguiente foto', 'albums-screen': 'Mis álbumes', 'store-screen': 'Imprimir', 'profile-screen': 'Mi perfil', 'results-screen': 'Resumen de demo', 'shared-album-screen': sharedAlbum?.title || 'Álbum compartido' };
    $('#screen-title').textContent = titles[id] || 'NextMoment';
    $('#header-action').innerHTML = id === 'swipe-screen' ? icon('trash') : id === 'albums-screen' ? icon('search') : id === 'store-screen' ? icon('bag') : id === 'profile-screen' ? icon('settings') : '';
    $('#header-action').setAttribute('aria-label', id === 'swipe-screen' ? 'Finalizar revisión' : id === 'albums-screen' ? 'Buscar álbum' : id === 'store-screen' ? 'Ver cesta' : 'Configuración');
    $('#header-action').hidden = id === 'results-screen' || id === 'shared-album-screen';
    $('.header-side').hidden = true;
    if (id === 'shared-album-screen') $('[data-action="back"]').hidden = false;
    if (id === 'results-screen') $$('.nav-item').forEach((item) => item.classList.remove('active'));
    target.scrollTop = 0;
  }

  function enterApp() {
    $('#welcome').classList.remove('active');
    $('#workspace').classList.add('active');
    setScreen('swipe-screen');
    renderAll();
  }

  function openModal(title, body, kicker = 'NEXTMOMENTS · DEMO') {
    $('#modal-content').innerHTML = `<p class="modal-kicker">${kicker}</p><h2 id="modal-title">${title}</h2>${body}`;
    $('#modal').hidden = false;
    const field = $('input,select,button', $('#modal-content'));
    field?.focus({ preventScroll: true });
  }

  function closeModal() { $('#modal').hidden = true; }

  function showAuth(mode) {
    const register = mode === 'register';
    openModal(register ? 'Crea tu cuenta' : 'Qué bueno verte', `
      <p>${register ? 'Empieza a recuperar espacio y a reencontrarte con tus fotos.' : 'Entra en tu espacio de recuerdos.'} Esta es una demostración, no se enviarán tus datos.</p>
      <form id="auth-form" data-mode="${mode}">
        ${register ? '<label for="auth-name">Nombre</label><input id="auth-name" name="name" autocomplete="name" placeholder="Tu nombre" required>' : ''}
        <label for="auth-email">Correo electrónico</label><input id="auth-email" name="email" type="email" autocomplete="email" placeholder="tu@correo.com" required>
        <label for="auth-password">Contraseña</label><input id="auth-password" name="password" type="password" minlength="4" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="Al menos 4 caracteres" required>
        <button class="button button-dark" type="submit">${register ? 'Crear cuenta de demo' : 'Iniciar sesión'}</button>
      </form>
      <p class="modal-note">Acceso simulado para el prototipo. No se crea una cuenta real.</p>`, register ? 'BIENVENIDA A NEXTMOMENTS' : 'TUS RECUERDOS TE ESPERAN');
  }

  function renderPhoto() {
    // Una cola ya revisada puede quedar vacía al volver a abrir la demo porque
    // los estados se guardan en localStorage. Inicia una nueva pasada con las
    // fotos de muestra, conservando los estados de conservar/descartar.
    if (!state.photos[state.current] && DATA.photos.length) {
      state.photos = [...DATA.photos];
      state.current = 0;
      state.reviewed = 0;
      write('swipe-reviewed-v2', 0);
    }
    const photo = state.photos[state.current];
    if (!photo) {
      $('#review-card').hidden = true;
      $('.side-photo-left').hidden = true;
      $('.side-photo-right').hidden = true;
      $('.review-actions').querySelectorAll('[data-action="discard"],[data-action="keep"]').forEach((button) => { button.disabled = true; });
      $('#current-photo').removeAttribute('src');
      $('#photo-title').textContent = 'Has revisado todas las fotos';
      $('#photo-date').textContent = 'Puedes añadir más desde tu dispositivo';
      $('#photo-counter').textContent = 'FIN DE LA GALERÍA';
      return;
    }
    $('#review-card').hidden = false;
    $('.side-photo-left').hidden = false;
    $('.side-photo-right').hidden = false;
    $('.review-actions').querySelectorAll('[data-action="discard"],[data-action="keep"]').forEach((button) => { button.disabled = false; });
    const next = state.photos[state.current + 1];
    const after = state.photos[state.current + 2];
    $('#current-photo').src = photo.src || imageUrl(photo.image, 900);
    $('#current-photo').alt = photo.title;
    $('#photo-title').textContent = photo.title;
    $('#photo-date').textContent = photo.date;
    $('#photo-counter').textContent = `FOTO ${state.current + 1}`;
    $('#side-left').src = next ? (next.src || imageUrl(next.image, 220)) : (photo.src || imageUrl(photo.image, 220));
    $('#side-right').src = after ? (after.src || imageUrl(after.image, 220)) : (photo.src || imageUrl(photo.image, 220));
    $('#progress-label').textContent = `${state.current} / ${state.photos.length} en esta sesión`;
    $('#progress-bar').style.width = `${state.photos.length ? Math.min(100, state.current / state.photos.length * 100) : 0}%`;
    if (state.transitioning) return;
  }

  function renderAlbums() {
    $('#album-filters').innerHTML = DATA.filters.map((filter) => `<button class="filter-chip ${state.filter === filter ? 'active' : ''}" role="tab" aria-selected="${state.filter === filter}" data-filter="${filter}">${filter}</button>`).join('');
    let albums = state.albums;
    if (state.filter !== 'Todos') albums = albums.filter((album) => album.category === state.filter);
    if (state.albumSearch) albums = albums.filter((album) => album.title.toLowerCase().includes(state.albumSearch.toLowerCase()));
    $('#album-grid').innerHTML = albums.length ? albums.map((album) => `
      <article class="album-card" data-album="${album.id}">
        <div class="album-cover"><img src="${album.src || imageUrl(album.image, 500)}" alt="${album.title}" loading="lazy">${album.shared ? '<span class="shared-album-flag">♧ Compartido</span>' : ''}<button class="album-favorite" data-favorite-album="${album.id}" aria-label="${state.favorites.includes(album.id) ? 'Quitar favorito' : 'Añadir favorito'}">${state.favorites.includes(album.id) ? '★' : '☆'}</button></div>
        <h3>${album.title}</h3><p>${album.shared ? `${state.sharedParticipants.length} participantes · ${state.sharedPhotoIds.length} fotos` : album.count}</p>
        ${album.shared ? `<div class="album-collaboration"><span class="mini-participants">${state.sharedParticipants.slice(0,3).map((person) => `<i>${person.initials}</i>`).join('')}</span><small>Un álbum para colaborar</small></div>` : ''}
      </article>`).join('') : '<div class="empty-state"><b>No hay álbumes en esta categoría</b>Prueba otro filtro o crea un álbum nuevo.</div>';
  }

  function photoForId(id) {
    return state.photos.find((photo) => photo.id === id) || DATA.photos.find((photo) => photo.id === id);
  }

  function renderReferrals() {
    $('#referral-points').textContent = state.points.toLocaleString('es-ES');
    $('#referral-count').textContent = state.referralHistory.length;
    $('#referral-code').textContent = state.referralCode;
    $('#referral-history-list').innerHTML = state.referralHistory.length
      ? state.referralHistory.map((item) => `<div class="referral-history-item"><span><b>${item.name}</b><small>${item.date}</small></span><strong>+100 pts</strong></div>`).join('')
      : '<p class="referral-empty">Aún no hay registros referidos. Compartir el enlace, por sí solo, no genera puntos.</p>';
  }

  function renderSharedAlbum() {
    const album = state.albums.find((item) => item.id === state.sharedAlbumId);
    if (!album) return;
    $('#shared-cover-image').src = imageUrl(album.image, 1000);
    $('#shared-cover-image').alt = `Portada de ${album.title}`;
    $('#shared-album-title').textContent = album.title;
    $('#shared-album-stats').textContent = `${state.sharedPhotoIds.length} fotos · ${state.sharedParticipants.length} participantes`;
    $('#participant-list').innerHTML = state.sharedParticipants.map((person, index) => `<div class="participant-person"><span class="participant-avatar participant-tone-${index % 5}">${person.initials}</span><span><b>${person.name}</b><small>${person.id === 'maria' ? 'Tú' : 'Colabora'}</small></span></div>`).join('');
    const photos = state.sharedPhotoIds.map(photoForId).filter(Boolean);
    $('#shared-photo-count').textContent = `${photos.length} fotos`;
    $('#shared-photo-grid').innerHTML = photos.length ? photos.map((photo) => `<button class="shared-photo-tile" data-open-photo="${photo.id}" aria-label="Abrir ${photo.title}"><img src="${photo.src || imageUrl(photo.image, 420)}" alt="${photo.title}" loading="lazy"><span>${photo.title}</span></button>`).join('') : '<div class="empty-state"><b>Aún no hay fotos</b>Añade la primera imagen a este álbum compartido.</div>';
    renderReferrals();
  }

  function albumInviteLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('album', state.sharedAlbumId);
    url.searchParams.set('invite', state.referralCode);
    return url.toString();
  }

  function personalReferralLink() {
    const url = new URL(window.location.href);
    url.searchParams.delete('album');
    url.searchParams.set('ref', state.referralCode);
    return url.toString();
  }

  async function copyToClipboard(value, successMessage) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else throw new Error('clipboard unavailable');
      toast(successMessage);
    } catch {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed'; field.style.opacity = '0';
      document.body.append(field); field.select();
      const copied = document.execCommand('copy');
      field.remove();
      toast(copied ? successMessage : 'No se pudo copiar. Selecciona el enlace para compartirlo.');
    }
  }

  function addSharedParticipant(name, email, id) {
    const normalizedEmail = email.trim().toLowerCase();
    if (state.sharedParticipants.some((person) => person.email === normalizedEmail)) return false;
    const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
    state.sharedParticipants.push({ id, name: name.trim(), email: normalizedEmail, initials: initials || 'A' });
    write('shared-participants', state.sharedParticipants);
    return true;
  }

  function showInviteOptions() {
    openModal('Invita a colaborar', `<p>Comparte el álbum con amigos. Invitar o copiar el enlace no concede puntos por sí solo.</p><div class="invite-link-box"><small>ENLACE DEL ÁLBUM</small><span>${albumInviteLink()}</span></div><button class="button button-dark" data-action="copy-album-link">Copiar enlace del álbum</button><button class="button button-outline" data-action="share-album-link">Compartir enlace</button><div class="invite-divider"><span>SIMULAR EN ESTA DEMO</span></div><button class="invite-choice" data-action="simulate-existing-invite"><span class="invite-choice-icon">◎</span><span><b>Invitar a alguien que ya usa la app</b><small>Se une al álbum · 0 puntos de referido</small></span><i>›</i></button><button class="invite-choice" data-action="simulate-referral"><span class="invite-choice-icon">＋</span><span><b>Simular registro de un usuario nuevo</b><small>+100 puntos al completar el registro</small></span><i>›</i></button>`, 'ÁLBUM COMPARTIDO');
  }

  function showExistingInviteForm() {
    openModal('Invitar a un usuario actual', `<p>Simula que alguien que ya tiene NextMoments acepta y se une al álbum. Esta acción suma 0 puntos de referido.</p><form id="existing-invite-form"><label for="existing-name">Nombre</label><input id="existing-name" name="name" required placeholder="Nombre de tu amigo"><label for="existing-email">Correo de demostración</label><input id="existing-email" name="email" type="email" required placeholder="amigo@correo.com"><button class="button button-dark" type="submit">Simular incorporación · 0 pts</button></form>`);
  }

  function showReferralRegistrationForm() {
    openModal('Registro desde tu invitación', `<p>Simula el alta de una persona nueva usando tu código <b>${state.referralCode}</b>. Se sumarán 100 puntos una sola vez por correo.</p><form id="referral-register-form"><label for="referral-name">Nombre del nuevo usuario</label><input id="referral-name" name="name" required placeholder="Nombre de tu amigo"><label for="referral-email">Correo de demostración</label><input id="referral-email" name="email" type="email" required placeholder="nuevo@correo.com"><button class="button button-accent" type="submit">Completar registro · ganar 100 pts</button></form><p class="modal-note">Prototipo local: no envía invitaciones ni crea cuentas reales.</p>`);
  }

  function renderStore() {
    $('#points-balance').textContent = `${state.points.toLocaleString('es-ES')} PTS`;
    $('#cart-count').textContent = state.cart.length;
    $('#store-grid').innerHTML = DATA.products.map((product) => `
      <button class="product-card" data-product="${product.id}" aria-label="Ver ${product.title}">
      <span class="product-art"><img src="${product.localImage || imageUrl(product.image, 560)}" alt="${product.title}" loading="lazy"><span class="product-points">${product.nfc ? 'NFC · idea' : 'Precio por definir'}</span>${product.nfc ? '<span class="product-nfc-mark" aria-label="Concepto de tecnología NFC">)))</span>' : ''}</span>
        <span class="product-info"><b>${product.title}</b><small>${product.subtitle}</small></span>
      </button>`).join('');
  }

  function favoritePhotos() {
    const indexed = new Map(state.photos.map((photo) => [photo.id, photo]));
    return state.favorites.map((id) => indexed.get(id) || DATA.photos.find((photo) => photo.id === id)).filter(Boolean);
  }

  function renderFavorites() {
    const photos = favoritePhotos();
    $('#favorite-grid').innerHTML = photos.length ? photos.slice(0, 9).map((photo) => `
      <button class="favorite-card" data-open-photo="${photo.id}" aria-label="Abrir ${photo.title}"><img src="${photo.src || imageUrl(photo.image, 360)}" alt="${photo.title}" loading="lazy"><span class="favorite-star">★</span></button>`).join('') : '<div class="empty-state">Todavía no guardas favoritos.</div>';
    $('#saved-count').textContent = state.kept.length.toLocaleString('es-ES');
    $('#space-count').textContent = 'No disponible';
  }

  function renderResults() {
    const findPhoto = (id) => state.photos.find((photo) => photo.id === id) || DATA.photos.find((photo) => photo.id === id);
    const discards = state.discarded.map(findPhoto).filter(Boolean);
    const keeps = state.kept.map(findPhoto).filter(Boolean);
    $('#discarded-total').textContent = state.discarded.length;
    $('#kept-total').textContent = state.kept.length;
    $('#discarded-thumbs').innerHTML = discards.slice(0, 5).map((photo) => `<img src="${photo.src || imageUrl(photo.image, 260)}" alt="${photo.title}">`).join('');
    $('#kept-thumbs').innerHTML = keeps.slice(0, 5).map((photo) => `<img src="${photo.src || imageUrl(photo.image, 260)}" alt="${photo.title}">`).join('');
  }

  function renderAll() { renderPhoto(); renderAlbums(); renderStore(); renderFavorites(); renderSharedAlbum(); }

  function review(action) {
    if (state.transitioning || !['discard', 'keep'].includes(action)) return;
    const photo = state.photos[state.current];
    if (!photo) { toast('Añade fotos para continuar'); return; }
    state.transitioning = true;
    const card = $('#review-card');
    card.classList.remove('is-moving');
    card.style.transform = '';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exitClass = action === 'discard' ? 'fly-left' : 'fly-right';
    const enterClass = action === 'discard' ? 'next-from-right' : 'next-from-left';
    const commit = () => {
      if (action === 'discard') {
        if (!state.discarded.includes(photo.id)) state.discarded.push(photo.id);
      } else if (!state.kept.includes(photo.id)) state.kept.push(photo.id);
      state.reviewed += 1;
      state.current += 1;
      write('swipe-kept', state.kept);
      write('swipe-discarded', state.discarded);
      write('swipe-reviewed-v2', state.reviewed);
      renderFavorites();
    };
    if (reducedMotion) {
      commit();
      card.classList.remove('fly-left', 'fly-right', 'next-from-left', 'next-from-right');
      state.transitioning = false;
      renderPhoto();
      toast(action === 'discard' ? 'Descartada en la demo · original intacto' : 'Foto conservada');
      return;
    }
    card.classList.add(exitClass);
    state.transitionTimer = window.setTimeout(() => {
      commit();
      card.classList.remove('fly-left', 'fly-right');
      card.classList.add(enterClass);
      renderPhoto();
      void card.offsetWidth;
      window.requestAnimationFrame(() => card.classList.remove(enterClass));
      state.transitionTimer = window.setTimeout(() => {
        state.transitionTimer = null;
        state.transitioning = false;
        renderPhoto();
        toast(action === 'discard' ? 'Descartada en la demo · original intacto' : 'Foto conservada');
      }, 320);
    }, 320);
  }

  function modalPhoto(photo) {
    openModal(photo.title, `<img class="modal-photo" src="${photo.src || imageUrl(photo.image, 900)}" alt="${photo.title}"><p>${photo.date} · ${photo.album || photo.category}</p><div class="modal-actions"><button class="button button-outline" data-action="toggle-favorite" data-photo-id="${photo.id}">${state.favorites.includes(photo.id) ? '★ En favoritos' : '☆ Guardar en favoritos'}</button><button class="button button-dark" data-action="use-photo" data-photo-id="${photo.id}">Usar en un producto</button></div><p class="modal-note">Tus fotos originales permanecen en tu dispositivo. Esta demo solo cambia su estado visual.</p>`);
  }

  function showAlbum(albumId) {
    const album = state.albums.find((item) => item.id === albumId);
    if (!album) return;
    if (album.shared) {
      state.sharedAlbumId = album.id;
      renderSharedAlbum();
      setScreen('shared-album-screen');
      return;
    }
    const photos = state.photos.filter((photo) => photo.album === album.title || photo.category === album.category);
    const tiles = photos.length ? photos.slice(0, 8).map((photo) => `<button class="favorite-card" data-open-photo="${photo.id}"><img src="${photo.src || imageUrl(photo.image, 340)}" alt="${photo.title}"></button>`).join('') : `<img class="modal-photo" src="${imageUrl(album.image, 800)}" alt="${album.title}">`;
    openModal(album.title, `<p>${album.count} · Colección de demostración NextMoment</p><div class="favorite-grid">${tiles}</div><button class="button button-dark" data-action="start-album-review" data-album-id="${album.id}">Revisar este álbum</button>`);
  }

  function addProduct(productId) {
    const product = DATA.products.find((item) => item.id === productId);
    if (!product) return;
    if (product.nfc) {
      openModal(product.title, `<div class="nfc-preview"><img src="${product.localImage || imageUrl(product.image, 520)}" alt="Álbum fotográfico con un móvil cerca"><span class="nfc-wave">)))</span></div><p>${product.subtitle}</p><div class="modal-note">El chip NFC se muestra como concepto. El precio y la integración todavía están por definir; esta demo no lee etiquetas NFC reales.</div><button class="button button-dark" data-action="nfc-preview">Ver experiencia conceptual</button>`, 'NUEVO PRODUCTO · DEMO');
      return;
    }
    openModal(product.title, `<div class="product-modal-row"><img src="${product.localImage || imageUrl(product.image, 300)}" alt="${product.title}"><span><b>Precio por definir</b><small>${product.subtitle}</small></span></div><label for="product-story">Elige una historia de ejemplo</label><select id="product-story"><option>Viaje a París</option><option>Verano</option><option>Fin de semana</option><option>Días en familia</option></select><label for="product-quantity">Cantidad</label><select id="product-quantity"><option value="1">1 unidad</option><option value="2">2 unidades</option><option value="3">3 unidades</option></select><button class="button button-accent" data-action="add-to-cart" data-product-id="${product.id}">Añadir a la selección</button><p class="modal-note">Producto propuesto. El precio real requiere validar producción y envío. Esta demo no procesa pagos ni suma puntos por compras simuladas.</p>`, 'CATÁLOGO CONCEPTUAL');
  }

  function openCart() {
    if (!state.cart.length) {
      openModal('Tu cesta está vacía', '<p>Elige un producto y conviértelo en un recuerdo para conservar.</p><button class="button button-dark" data-action="close-modal">Ver productos</button>');
      return;
    }
    openModal('Tu selección', `${state.cart.map((item) => `<div class="cart-row"><b>${item.title}</b><span>${item.quantity} unidad(es) · Precio por definir</span></div>`).join('')}<button class="button button-accent" data-action="checkout">Simular solicitud</button><p class="modal-note">Resumen conceptual. No se realiza un pedido, pago ni cálculo de puntos real.</p>`);
  }

  function finishSession() {
    renderResults();
    setScreen('results-screen');
  }

  function addFiles(files) {
    const valid = [...files].filter((file) => file.type.startsWith('image/'));
    if (!valid.length) { toast('Selecciona archivos de imagen'); return; }
    valid.forEach((file, index) => {
      const src = URL.createObjectURL(file);
      const id = `upload-${Date.now()}-${index}`;
      state.photos.push({ id, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), date: 'Añadida ahora', album: state.addingToSharedAlbum ? 'Verano 2026' : 'Tus fotos', category: 'Otros', src });
      if (state.addingToSharedAlbum) state.sharedPhotoIds.push(id);
    });
    if (state.addingToSharedAlbum) write('shared-photo-ids', state.sharedPhotoIds);
    state.addingToSharedAlbum = false;
    renderPhoto(); renderAlbums(); renderFavorites(); renderSharedAlbum();
    toast(`${valid.length} foto${valid.length === 1 ? '' : 's'} añadida${valid.length === 1 ? '' : 's'} a la demo`);
  }

  $('#album-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    state.filter = button.dataset.filter;
    renderAlbums();
  });

  $$('.nav-item').forEach((button) => button.addEventListener('click', () => setScreen(button.dataset.screen)));

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    const action = actionButton?.dataset.action;
    if (event.target.closest('[data-open-photo]')) {
      const id = event.target.closest('[data-open-photo]').dataset.openPhoto;
      const photo = state.photos.find((item) => item.id === id) || DATA.photos.find((item) => item.id === id);
      if (photo) modalPhoto(photo);
      return;
    }
    if (event.target.closest('[data-favorite-album]')) {
      event.stopPropagation();
      const id = event.target.closest('[data-favorite-album]').dataset.favoriteAlbum;
      state.favorites = state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [id, ...state.favorites];
      write('favorites', state.favorites); renderAlbums(); renderFavorites();
      toast(state.favorites.includes(id) ? 'Álbum añadido a favoritos' : 'Álbum eliminado de favoritos');
      return;
    }
    if (event.target.closest('[data-album]')) { showAlbum(event.target.closest('[data-album]').dataset.album); return; }
    if (event.target.closest('[data-product]')) { addProduct(event.target.closest('[data-product]').dataset.product); return; }

    if (action === 'login' || action === 'register') { showAuth(action); return; }
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'discard' || action === 'keep' || action === 'favorite') { review(action); return; }
    if (action === 'add-photo' || action === 'add-shared-photos') {
      state.addingToSharedAlbum = action === 'add-shared-photos';
      if (action === 'add-shared-photos') closeModal();
      $('#photo-picker').click(); return;
    }
    if (action === 'invite-friends') { showInviteOptions(); return; }
    if (action === 'copy-album-link') { copyToClipboard(albumInviteLink(), 'Enlace del álbum copiado · compartir no suma puntos'); return; }
    if (action === 'share-album-link') {
      const url = albumInviteLink();
      if (navigator.share) {
        try { navigator.share({ title: 'Álbum compartido · Verano 2026', text: 'Ven a colaborar en este álbum de recuerdos.', url }).then(() => toast('Invitación compartida · sin puntos todavía')).catch(() => {}); }
        catch { copyToClipboard(url, 'Enlace del álbum copiado · sin puntos todavía'); }
      } else copyToClipboard(url, 'Enlace del álbum copiado · sin puntos todavía');
      return;
    }
    if (action === 'copy-referral-link') { copyToClipboard(personalReferralLink(), 'Enlace personal copiado · los puntos llegan tras un registro válido'); return; }
    if (action === 'simulate-existing-invite') { showExistingInviteForm(); return; }
    if (action === 'simulate-referral') { showReferralRegistrationForm(); return; }
    if (action === 'photo-info') {
      const photo = state.photos[state.current];
      if (photo) modalPhoto(photo);
      return;
    }
    if (action === 'header-action') {
      if (state.screen === 'swipe-screen') finishSession();
      else if (state.screen === 'albums-screen') openModal('Buscar álbum', '<label for="album-search">Nombre o categoría</label><input id="album-search" type="search" placeholder="Por ejemplo, verano"><button class="button button-dark" data-action="apply-album-search">Buscar</button>');
      else if (state.screen === 'store-screen') openCart();
      else openSettings();
      return;
    }
    if (action === 'browse-products') { $('#store-grid').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (action === 'apply-album-search') {
      state.albumSearch = ($('#album-search')?.value || '').trim();
      closeModal(); renderAlbums(); setScreen('albums-screen'); return;
    }
    if (action === 'add-album') {
      openModal('Crea un álbum', '<p>Reúne fotos relacionadas en una colección.</p><form id="album-form"><label for="album-name">Nombre del álbum</label><input id="album-name" name="name" required placeholder="Ej. Escapada de verano"><label for="album-category">Categoría</label><select id="album-category"><option>Viajes</option><option>Personas</option><option>Celebraciones</option><option>Otros</option></select><button class="button button-dark" type="submit">Crear álbum</button></form>'); return;
    }
    if (action === 'rewards') {
      openModal('Puntos propuestos', `<p>Saldo de demostración: <b>${state.points.toLocaleString('es-ES')} puntos</b>. El documento plantea 5 puntos por euro y descuentos para pedidos futuros.</p>${[[500, 5], [1250, 15], [2500, 35]].map(([cost, discount]) => `<div class="reward-option"><span>Descuento propuesto de ${discount} €</span><b>${cost.toLocaleString('es-ES')} puntos</b><button ${state.points >= cost ? '' : 'disabled'} data-action="redeem" data-cost="${cost}">${state.points >= cost ? 'Canjear en demo' : 'Puntos insuficientes'}</button></div>`).join('')}<p class="modal-note">Los puntos, descuentos y condiciones son una propuesta, no un programa comercial activo.</p>`, 'FIDELIZACIÓN · PROPUESTA'); return;
    }
    if (action === 'redeem') {
      const cost = Number(actionButton.dataset.cost);
      if (state.points >= cost) { state.points -= cost; write('points-v2', state.points); renderStore(); closeModal(); toast('Canje visual simulado'); }
      return;
    }
    if (action === 'toggle-favorite') {
      const id = actionButton.dataset.photoId;
      state.favorites = state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [id, ...state.favorites];
      write('favorites', state.favorites); renderFavorites(); closeModal(); toast('Favoritos actualizados'); return;
    }
    if (action === 'use-photo') { closeModal(); setScreen('store-screen'); toast('Elige un producto para esta foto'); return; }
    if (action === 'add-to-cart') {
      const product = DATA.products.find((item) => item.id === actionButton.dataset.productId);
      const quantity = Number($('#product-quantity')?.value || 1);
      if (!product) return;
      state.cart.push({ id: product.id, title: product.title, quantity });
      write('cart', state.cart); renderStore(); closeModal(); toast(`${product.title} añadido a la cesta`); return;
    }
    if (action === 'checkout') {
      state.cart = []; write('cart', state.cart); renderStore(); closeModal();
      openModal('Selección de demostración', '<p>La propuesta se completaría con precio, impresión y envío validados. No se ha realizado un pedido ni se han sumado puntos.</p><button class="button button-dark" data-action="close-modal">Volver a la tienda</button>'); return;
    }
    if (action === 'show-favorites') { closeModal(); setScreen('profile-screen'); toast('Aquí tienes tus recuerdos favoritos'); return; }
    if (action === 'show-discarded') {
      const photos = state.discarded.map((id) => state.photos.find((photo) => photo.id === id) || DATA.photos.find((photo) => photo.id === id)).filter(Boolean);
      openModal('Fotos marcadas para revisar', `<div class="favorite-grid">${photos.map((photo) => `<img class="favorite-card" src="${photo.src || imageUrl(photo.image, 350)}" alt="${photo.title}">`).join('')}</div><p class="modal-note">No se ha borrado ninguna foto del dispositivo.</p>`); return;
    }
    if (action === 'finish-review') { setScreen('swipe-screen'); toast('Puedes continuar revisando cuando quieras'); return; }
    if (action === 'nfc-preview') { openModal('Una historia, al acercar el móvil', '<div class="nfc-demo-mark">)))</div><p>En una versión conectada, el chip del álbum podría abrir una experiencia digital vinculada a tus fotos.</p><div class="modal-note">Representación conceptual. No se activa NFC ni se abre contenido externo.</div><button class="button button-dark" data-action="close-modal">Entendido</button>'); return; }
    if (action === 'start-album-review') { closeModal(); setScreen('swipe-screen'); toast('La revisión del álbum está lista'); return; }
    if (action === 'settings') { openSettings(); return; }
    if (action === 'back') { closeModal(); setScreen(state.screen === 'shared-album-screen' ? 'albums-screen' : 'swipe-screen'); return; }
    if (event.target.id === 'modal') closeModal();
  });

  function openSettings() {
    openModal('Ajustes', '<div class="settings-list"><button data-action="about">Acerca de NextMoment <span>›</span></button><button data-action="welcome">Volver a bienvenida <span>›</span></button><button data-action="reset-demo">Restablecer datos de demo <span>›</span></button></div>');
  }

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'about') openModal('Una propuesta para Imaxel', '<p>NextMoment propone revisar, organizar y volver a disfrutar las fotografías, y conectar los recuerdos elegidos con productos impresos.</p><p>El análisis visual, el borrado, los puntos y las compras se representan como una demostración. No hay servicios de Imaxel ni IA conectados.</p>');
    if (action === 'welcome') { closeModal(); $('#workspace').classList.remove('active'); $('#welcome').classList.add('active'); }
    if (action === 'reset-demo') {
      if (state.transitionTimer) window.clearTimeout(state.transitionTimer);
      state.transitionTimer = null; state.transitioning = false; state.pointerX = null;
      $('#review-card').classList.remove('fly-left', 'fly-right', 'next-from-left', 'next-from-right', 'is-moving');
      $('#review-card').style.transform = '';
      state.photos = [...DATA.photos]; state.reviewed = 0; state.current = 0; state.kept = []; state.discarded = []; state.filter = 'Todos'; state.albumSearch = ''; state.cart = []; state.points = 0;
      state.favorites = ['mountain-road', 'friends', 'coast', 'hike', 'friends-beach', 'paris'];
      state.sharedPhotoIds = [...initialSharedPhotoIds]; state.sharedParticipants = initialParticipants.map((person) => ({ ...person })); state.referralRegistrations = []; state.referralHistory = []; state.existingUsers = [];
      write('cart', []); write('points-v2', 0); write('favorites', state.favorites); write('swipe-kept', []); write('swipe-discarded', []); write('swipe-reviewed-v2', 0);
      write('shared-photo-ids', state.sharedPhotoIds); write('shared-participants', state.sharedParticipants); write('referral-registrations', []); write('referral-history', []); write('existing-album-invites', []);
      renderAll(); closeModal(); toast('Datos de demostración restablecidos');
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id === 'auth-form') {
      event.preventDefault();
      const mode = event.target.dataset.mode;
      if (!event.target.reportValidity()) return;
      closeModal(); enterApp(); toast(mode === 'register' ? 'Cuenta de demostración creada' : 'Sesión de demostración iniciada');
    }
    if (event.target.id === 'album-form') {
      event.preventDefault();
      const name = $('#album-name').value.trim();
      if (!name) return;
      const category = $('#album-category').value;
      const photo = DATA.photos.find((item) => item.category === category) || DATA.photos[0];
      state.albums.unshift({ id: `album-${Date.now()}`, title: name, count: '0 fotos', category, image: photo.image });
      state.filter = 'Todos'; renderAlbums(); closeModal(); setScreen('albums-screen'); toast('Álbum creado');
    }
    if (event.target.id === 'existing-invite-form') {
      event.preventDefault();
      const name = $('#existing-name').value.trim();
      const email = $('#existing-email').value.trim().toLowerCase();
      if (!event.target.reportValidity()) return;
      if (state.existingUsers.includes(email) || state.sharedParticipants.some((person) => person.email === email)) {
        closeModal(); toast('Esa persona ya utiliza la app o participa · 0 puntos'); return;
      }
      state.existingUsers.push(email);
      write('existing-album-invites', state.existingUsers);
      addSharedParticipant(name, email, `existing-${Date.now()}`);
      renderSharedAlbum(); renderAlbums(); closeModal(); toast('Se ha unido al álbum · 0 puntos de referido');
    }
    if (event.target.id === 'referral-register-form') {
      event.preventDefault();
      const name = $('#referral-name').value.trim();
      const email = $('#referral-email').value.trim().toLowerCase();
      if (!event.target.reportValidity()) return;
      if (state.existingUsers.includes(email) || state.sharedParticipants.some((person) => person.email === email && !state.referralRegistrations.includes(email))) {
        closeModal(); toast('Ese amigo ya usaba la app · 0 puntos de referido'); return;
      }
      if (state.referralRegistrations.includes(email)) {
        closeModal(); toast('Este registro ya recibió sus puntos · no se duplica'); return;
      }
      state.referralRegistrations.push(email);
      state.referralHistory.unshift({ email, name, points: 100, date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) });
      state.points += 100;
      write('referral-registrations', state.referralRegistrations);
      write('referral-history', state.referralHistory);
      write('points-v2', state.points);
      addSharedParticipant(name, email, `referred-${Date.now()}`);
      renderSharedAlbum(); renderAlbums(); renderStore(); closeModal(); toast('Registro completado · +100 puntos');
    }
  });

  $('#photo-picker').addEventListener('change', (event) => {
    addFiles(event.target.files);
    event.target.value = '';
  });

  const reviewCard = $('#review-card');
  reviewCard.addEventListener('pointerdown', (event) => {
    if (state.transitioning) return;
    state.pointerX = event.clientX;
    reviewCard.classList.add('is-moving');
    reviewCard.setPointerCapture(event.pointerId);
  });
  reviewCard.addEventListener('pointermove', (event) => {
    if (state.pointerX === null || state.transitioning) return;
    const distance = event.clientX - state.pointerX;
    reviewCard.style.transform = `translateX(${distance}px) rotate(${distance * 0.035}deg)`;
  });
  reviewCard.addEventListener('pointerup', (event) => {
    if (state.pointerX === null) return;
    const distance = event.clientX - state.pointerX;
    state.pointerX = null;
    if (Math.abs(distance) < 75) { reviewCard.style.transform = ''; reviewCard.classList.remove('is-moving'); return; }
    reviewCard.style.transform = '';
    reviewCard.classList.remove('is-moving');
    review(distance < 0 ? 'discard' : 'keep');
  });
  reviewCard.addEventListener('pointercancel', () => { state.pointerX = null; reviewCard.style.transform = ''; reviewCard.classList.remove('is-moving'); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

  /* Entrar al prototipo en la bienvenida cada vez permite enseñar el recorrido completo. */
  renderAll();
})();
