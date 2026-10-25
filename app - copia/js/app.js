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
    reviewed: read('swipe-reviewed', 47),
    photos: DATA.photos.filter((photo) => !reviewedIds.has(photo.id)),
    kept: savedKept,
    discarded: savedDiscarded,
    filter: 'Todos',
    albumFilter: 'Todos',
    albumSearch: '',
    albums: [...DATA.albums],
    favorites: read('favorites', ['mountain-road', 'friends', 'coast', 'hike', 'friends-beach', 'paris']),
    cart: read('cart', []),
    points: read('points', 1250),
    toastTimer: null,
    pointerX: null,
    transitioning: false
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
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.screen === id));
    const titles = { 'swipe-screen': 'Siguiente foto', 'albums-screen': 'Mis Álbumes', 'store-screen': 'Imprimir', 'profile-screen': 'Mi Perfil', 'results-screen': 'Sesión finalizada' };
    $('#screen-title').textContent = titles[id] || 'NextMoments';
    $('#header-action').innerHTML = id === 'swipe-screen' ? icon('trash') : id === 'albums-screen' ? icon('search') : id === 'store-screen' ? icon('bag') : id === 'profile-screen' ? icon('settings') : '';
    $('#header-action').setAttribute('aria-label', id === 'swipe-screen' ? 'Finalizar revisión' : id === 'albums-screen' ? 'Buscar álbum' : id === 'store-screen' ? 'Ver cesta' : 'Configuración');
    $('#header-action').hidden = id === 'results-screen';
    $('.header-side').hidden = true;
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
    $('#photo-counter').textContent = `FOTO ${state.reviewed + 1}`;
    $('#side-left').src = next ? (next.src || imageUrl(next.image, 220)) : (photo.src || imageUrl(photo.image, 220));
    $('#side-right').src = after ? (after.src || imageUrl(after.image, 220)) : (photo.src || imageUrl(photo.image, 220));
    $('#progress-label').textContent = `${state.reviewed} / 120`;
    $('#progress-bar').style.width = `${Math.min(100, Math.max(4, state.reviewed / 120 * 100))}%`;
    if (state.transitioning) return;
  }

  function renderAlbums() {
    $('#album-filters').innerHTML = DATA.filters.map((filter) => `<button class="filter-chip ${state.filter === filter ? 'active' : ''}" role="tab" aria-selected="${state.filter === filter}" data-filter="${filter}">${filter}</button>`).join('');
    let albums = state.albums;
    if (state.filter !== 'Todos') albums = albums.filter((album) => album.category === state.filter);
    if (state.albumSearch) albums = albums.filter((album) => album.title.toLowerCase().includes(state.albumSearch.toLowerCase()));
    $('#album-grid').innerHTML = albums.length ? albums.map((album) => `
      <article class="album-card" data-album="${album.id}">
        <div class="album-cover"><img src="${album.src || imageUrl(album.image, 500)}" alt="${album.title}" loading="lazy"><button class="album-favorite" data-favorite-album="${album.id}" aria-label="${state.favorites.includes(album.id) ? 'Quitar favorito' : 'Añadir favorito'}">${state.favorites.includes(album.id) ? '★' : '☆'}</button></div>
        <h3>${album.title}</h3><p>${album.count}</p>
      </article>`).join('') : '<div class="empty-state"><b>No hay álbumes en esta categoría</b>Prueba otro filtro o crea un álbum nuevo.</div>';
  }

  function renderStore() {
    $('#points-balance').textContent = `${state.points.toLocaleString('es-ES')} PTS`;
    $('#cart-count').textContent = state.cart.length;
    $('#store-grid').innerHTML = DATA.products.map((product) => `
      <button class="product-card" data-product="${product.id}" aria-label="Ver ${product.title}">
        <span class="product-art"><img src="${product.localImage || imageUrl(product.image, 560)}" alt="${product.title}" loading="lazy"><span class="product-points">${product.nfc ? 'NFC' : product.points}</span>${product.nfc ? '<span class="product-nfc-mark" aria-label="Tecnología NFC">)))</span>' : ''}</span>
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
    $('#saved-count').textContent = (1248 + state.kept.length).toLocaleString('es-ES');
    $('#space-count').textContent = `${(4.8 + state.discarded.length * 0.01).toFixed(1).replace('.', ',')} GB`;
  }

  function renderResults() {
    const findPhoto = (id) => state.photos.find((photo) => photo.id === id) || DATA.photos.find((photo) => photo.id === id);
    const discards = state.discarded.map(findPhoto).filter(Boolean);
    const keeps = state.kept.map(findPhoto).filter(Boolean);
    $('#discarded-total').textContent = state.discarded.length;
    $('#kept-total').textContent = state.kept.length;
    $('#released-gb').textContent = (state.discarded.length * 0.018).toFixed(1).replace('.', ',');
    $('#discarded-thumbs').innerHTML = discards.slice(0, 5).map((photo) => `<img src="${photo.src || imageUrl(photo.image, 260)}" alt="${photo.title}">`).join('');
    $('#kept-thumbs').innerHTML = keeps.slice(0, 5).map((photo) => `<img src="${photo.src || imageUrl(photo.image, 260)}" alt="${photo.title}">`).join('');
  }

  function renderAll() { renderPhoto(); renderAlbums(); renderStore(); renderFavorites(); }

  function review(action) {
    const photo = state.photos[state.current];
    if (!photo) { toast('Añade fotos para continuar'); return; }
    if (state.transitioning || !['discard', 'keep'].includes(action)) return;
    state.transitioning = true;
    const card = $('#review-card');
    card.classList.remove('is-moving');
    card.style.transform = '';
    card.classList.add(action === 'discard' ? 'fly-left' : 'fly-right');
    window.setTimeout(() => {
      if (action === 'discard') state.discarded.push(photo.id);
      else state.kept.push(photo.id);
      state.reviewed += 1;
      state.current += 1;
      write('swipe-kept', state.kept);
      write('swipe-discarded', state.discarded);
      write('swipe-reviewed', state.reviewed);
      card.classList.remove('fly-left', 'fly-right');
      state.transitioning = false;
      renderPhoto(); renderFavorites();
      toast(action === 'discard' ? 'Descartada en la demo · original intacto' : 'Foto conservada');
    }, 280);
  }

  function modalPhoto(photo) {
    openModal(photo.title, `<img class="modal-photo" src="${photo.src || imageUrl(photo.image, 900)}" alt="${photo.title}"><p>${photo.date} · ${photo.album || photo.category}</p><div class="modal-actions"><button class="button button-outline" data-action="toggle-favorite" data-photo-id="${photo.id}">${state.favorites.includes(photo.id) ? '★ En favoritos' : '☆ Guardar en favoritos'}</button><button class="button button-dark" data-action="use-photo" data-photo-id="${photo.id}">Usar en un producto</button></div><p class="modal-note">Tus fotos originales permanecen en tu dispositivo. Esta demo solo cambia su estado visual.</p>`);
  }

  function showAlbum(albumId) {
    const album = state.albums.find((item) => item.id === albumId);
    if (!album) return;
    const photos = state.photos.filter((photo) => photo.album === album.title || photo.category === album.category);
    const tiles = photos.length ? photos.slice(0, 8).map((photo) => `<button class="favorite-card" data-open-photo="${photo.id}"><img src="${photo.src || imageUrl(photo.image, 340)}" alt="${photo.title}"></button>`).join('') : `<img class="modal-photo" src="${imageUrl(album.image, 800)}" alt="${album.title}">`;
    openModal(album.title, `<p>${album.count} · Colección organizada por NextMoments</p><div class="favorite-grid">${tiles}</div><button class="button button-dark" data-action="start-album-review" data-album-id="${album.id}">Revisar este álbum</button>`);
  }

  function addProduct(productId) {
    const product = DATA.products.find((item) => item.id === productId);
    if (!product) return;
    if (product.nfc) {
      openModal(product.title, `<div class="nfc-preview"><img src="${product.localImage || imageUrl(product.image, 520)}" alt="Álbum fotográfico con un móvil cerca"><span class="nfc-wave">)))</span></div><p>${product.subtitle}</p><div class="modal-note">El chip NFC se muestra como concepto. El precio y la integración todavía están por definir; esta demo no lee etiquetas NFC reales.</div><button class="button button-dark" data-action="nfc-preview">Ver experiencia conceptual</button>`, 'NUEVO PRODUCTO · DEMO');
      return;
    }
    openModal(product.title, `<div class="product-modal-row"><img src="${product.localImage || imageUrl(product.image, 300)}" alt="${product.title}"><span><b>${product.price}</b><small>${product.points} en puntos · ${product.subtitle}</small></span></div><label for="product-story">Elige una historia</label><select id="product-story"><option>Viaje a París</option><option>Verano</option><option>Fin de semana</option><option>Días en familia</option></select><label for="product-quantity">Cantidad</label><select id="product-quantity"><option value="1">1 unidad</option><option value="2">2 unidades</option><option value="3">3 unidades</option></select><button class="button button-accent" data-action="add-to-cart" data-product-id="${product.id}">Añadir a la cesta · ${product.price}</button><p class="modal-note">Catálogo ilustrativo. No se procesan pagos en esta demostración.</p>`, 'PRODUCTOS CON TUS FOTOS');
  }

  function openCart() {
    if (!state.cart.length) {
      openModal('Tu cesta está vacía', '<p>Elige un producto y conviértelo en un recuerdo para conservar.</p><button class="button button-dark" data-action="close-modal">Ver productos</button>');
      return;
    }
    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    openModal('Tu cesta', `${state.cart.map((item) => `<div class="cart-row"><b>${item.title}</b><span>${item.quantity} × ${item.price.toFixed(2).replace('.', ',')} €</span></div>`).join('')}<div class="cart-total"><b>Total de demostración</b><b>${total.toFixed(2).replace('.', ',')} €</b></div><button class="button button-accent" data-action="checkout">Continuar</button><p class="modal-note">No se realiza ningún pago real.</p>`);
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
      state.photos.push({ id: `upload-${Date.now()}-${index}`, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), date: 'Añadida ahora', album: 'Tus fotos', category: 'Otros', src });
    });
    renderPhoto(); renderAlbums(); renderFavorites();
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
    if (action === 'add-photo') { $('#photo-picker').click(); return; }
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
      const reward = state.points >= 999;
      openModal('Tus puntos NextMoments', `<p>Tienes <b>${state.points.toLocaleString('es-ES')} puntos</b>. Acumula puntos con tus productos impresos.</p><div class="reward-option"><span>Pack de 20 Polaroids</span><b>999 pts</b><button ${reward ? '' : 'disabled'} data-action="redeem" data-cost="999">${reward ? 'Canjear' : 'Te faltan puntos'}</button></div><div class="reward-option"><span>Álbum fotográfico</span><b>1.990 pts</b><button ${state.points >= 1990 ? '' : 'disabled'} data-action="redeem" data-cost="1990">${state.points >= 1990 ? 'Canjear' : 'Te faltan puntos'}</button></div><p class="modal-note">Los puntos y premios son ilustrativos y no tienen valor monetario.</p>`, 'TU PROGRAMA DE PUNTOS'); return;
    }
    if (action === 'redeem') {
      const cost = Number(actionButton.dataset.cost);
      if (state.points >= cost) { state.points -= cost; write('points', state.points); renderStore(); closeModal(); toast('Premio canjeado en esta demo'); }
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
      state.cart.push({ id: product.id, title: product.title, price: Number(product.price.replace(',', '.').replace(' €', '')), quantity });
      write('cart', state.cart); renderStore(); closeModal(); toast(`${product.title} añadido a la cesta`); return;
    }
    if (action === 'checkout') {
      state.points += state.cart.reduce((sum, item) => sum + Math.round(item.price * item.quantity * 100), 0);
      write('points', state.points); state.cart = []; write('cart', state.cart); renderStore(); closeModal();
      openModal('Pedido de demostración', '<p>¡Listo! Hemos simulado el pedido y sumado puntos a tu cuenta. No se han enviado datos ni procesado pagos.</p><button class="button button-dark" data-action="close-modal">Volver a la tienda</button>'); return;
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
    if (action === 'back') { closeModal(); setScreen('swipe-screen'); return; }
    if (event.target.id === 'modal') closeModal();
  });

  function openSettings() {
    openModal('Ajustes', '<div class="settings-list"><button data-action="about">Acerca de NextMoments <span>›</span></button><button data-action="welcome">Volver a bienvenida <span>›</span></button><button data-action="reset-demo">Restablecer datos de demo <span>›</span></button></div>');
  }

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'about') openModal('Una propuesta para Imaxel', '<p>NextMoments ayuda a revisar, ordenar y volver a disfrutar las fotografías, y conecta las historias digitales con productos impresos.</p><p>El análisis visual, la limpieza y el catálogo se representan como una demostración. No hay servicios de Imaxel ni IA conectados.</p>');
    if (action === 'welcome') { closeModal(); $('#workspace').classList.remove('active'); $('#welcome').classList.add('active'); }
    if (action === 'reset-demo') {
      state.reviewed = 47; state.current = 0; state.kept = []; state.discarded = []; state.filter = 'Todos'; state.albumSearch = ''; state.cart = []; state.points = 1250;
      state.favorites = ['mountain-road', 'friends', 'coast', 'hike', 'friends-beach', 'paris'];
      write('cart', []); write('points', 1250); write('favorites', state.favorites); write('swipe-kept', []); write('swipe-discarded', []); write('swipe-reviewed', 47); renderAll(); closeModal(); toast('Datos de demostración restablecidos');
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
