/* PERGUNTE À LIÇÃO (16/11/2026) — caixa de dúvida no fim de cada lição da EBD.
 * Lê turma e número da lição pelo endereço (/ebd/<turma>/html/licao-NN.html), pergunta ao servidor
 * (POST /api/pergunte) e mostra: a resposta, o trecho da própria revista (achado aqui, no aparelho)
 * e o vídeo do Dr. Wagner aberto no minuto em que ele explica. O texto do autor nunca vem para cá.
 * Sem dependências. Todo texto que vem de fora entra por textContent (nada de innerHTML). */
(function () {
  var m = /\/ebd\/([a-z]+\d)\/html\/licao-(\d+)\.html/.exec(location.pathname);
  if (!m) return;
  var TURMA = m[1], N = parseInt(m[2], 10), NN = (N < 10 ? '0' : '') + N;
  var PARADAS = ['porque', 'como', 'qual', 'quais', 'quando', 'onde', 'sobre', 'entre', 'deus', 'senhor', 'para', 'pelo', 'pela',
    'uma', 'umas', 'uns', 'isso', 'esse', 'essa', 'aquele', 'aquela', 'muito', 'mais', 'tambem', 'quem', 'seria', 'fazer', 'licao',
    'texto', 'dizer', 'falar', 'explica', 'explique', 'minha', 'meu'];
  var licaoP = null;

  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function conteudo(s) {
    var out = [], seen = {}, w = semAcento(s).match(/[a-z]{4,}/g) || [];
    for (var i = 0; i < w.length; i++) if (PARADAS.indexOf(w[i]) < 0 && !seen[w[i]]) { seen[w[i]] = 1; out.push(w[i]); }
    return out;
  }
  function fmt(s) {
    s = Math.max(0, parseInt(s, 10) || 0);
    var h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = s % 60;
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return h ? h + ':' + p(mi) + ':' + p(se) : p(mi) + ':' + p(se);
  }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function lerLicao() {
    if (!licaoP) licaoP = fetch('/ebd/' + TURMA + '/voz/' + NN + '.json').then(function (r) {
      if (!r.ok) throw new Error('lição');
      return r.json();
    });
    return licaoP;
  }
  // Trechos da própria revista que tratam da dúvida: escolhidos aqui, no aparelho, pela lição já carregada.
  function trechosDaRevista(L, pergunta) {
    var chaves = conteudo(pergunta), blocos = [];
    if (!chaves.length) return [];
    (L.topicos || []).forEach(function (t) {
      (t.subtopicos || []).forEach(function (s) {
        var txt = (s.titulo ? s.titulo + '. ' : '') + (s.texto || '');
        var base = semAcento(txt), pontos = 0;
        for (var i = 0; i < chaves.length; i++) if (base.indexOf(chaves[i]) >= 0) pontos++;
        if (pontos) blocos.push({ p: pontos, titulo: t.titulo || '', texto: s.texto || '', sub: s.titulo || '' });
      });
    });
    blocos.sort(function (a, b) { return b.p - a.p; });
    return blocos.slice(0, 2);
  }

  var CSS = '' +
    '#pl-box{box-sizing:border-box;width:100%;max-width:720px;margin:26px auto 8px;padding:0 0 16px;border:1.5px solid #1458ad;border-radius:12px;background:#f6f8fd;font-family:Georgia,serif;color:#1a1a1a;overflow:hidden;font-size:17px;line-height:1.55}' +
    '#pl-box *{box-sizing:border-box;max-width:100%;text-align:left}' +
    '#pl-box .pl-band{margin:0;padding:8px 14px;background:#1458ad;color:#fff;font:900 15px/1.3 Georgia,serif;letter-spacing:1.5px;text-transform:uppercase;text-align:center}' +
    '#pl-box .pl-in{padding:12px 14px 0}' +
    '#pl-box .pl-sub{margin:0 0 10px;font-size:16px;color:#333}' +
    '#pl-box label{display:block;font-size:15px;font-weight:700;margin:0 0 6px;color:#1458ad}' +
    '#pl-box textarea{display:block;width:100%;min-height:72px;padding:10px 12px;border:1.5px solid #9fb8dc;border-radius:8px;background:#fff;font:18px/1.4 Georgia,serif;color:#1a1a1a;resize:vertical}' +
    '#pl-box textarea:focus{outline:3px solid #cfe0f7;border-color:#1458ad}' +
    '#pl-box .pl-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;flex-wrap:wrap}' +
    '#pl-box .pl-cont{font-size:15px;color:#555}' +
    '#pl-box button{min-height:44px;padding:0 20px;border:0;border-radius:8px;background:#1458ad;color:#fff;font:700 17px Georgia,serif;cursor:pointer}' +
    '#pl-box button:disabled{background:#8aa6c9;cursor:wait}' +
    '#pl-box button.pl-sec{background:#fff;color:#1458ad;border:1.5px solid #1458ad;min-height:40px;font-size:16px}' +
    '#pl-box .pl-out{padding:14px 14px 0}' +
    '#pl-box .pl-card{background:#fff;border:1px solid #d5dfef;border-left:4px solid #1458ad;border-radius:10px;padding:12px 14px;margin:0 0 12px}' +
    '#pl-box .pl-card h3{margin:0 0 6px;font:700 15px/1.3 Georgia,serif;color:#1458ad;letter-spacing:.3px}' +
    '#pl-box .pl-resp{font-size:18px;line-height:1.6;margin:0}' +
    '#pl-box .pl-rev{font-size:16px;line-height:1.55;margin:0 0 6px}' +
    '#pl-box .pl-rev b{display:block;margin-bottom:2px}' +
    '#pl-box .pl-more{background:none;border:0;color:#1458ad;padding:0;min-height:32px;font-size:15px;text-decoration:underline}' +
    '#pl-box .pl-vid{font-size:16px;margin:0 0 6px;font-weight:700}' +
    '#pl-box .pl-vid small{display:block;font-weight:400;color:#555;font-size:15px}' +
    '#pl-box .pl-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#000}' +
    '#pl-box .pl-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
    '#pl-box .pl-aviso{font-size:16px;padding:12px 14px;border-radius:8px;background:#fff7e6;border:1px solid #e9c46a;color:#4a3b00;margin:0 0 12px}' +
    '#pl-box .pl-nota{font-size:15px;color:#555;margin:6px 0 0}' +
    '#pl-box .pl-carrega{font-size:17px;padding:14px 4px;color:#1458ad}' +
    '#pl-box .pl-carrega i{font-style:normal;animation:plpisca 1.2s infinite both}' +
    '#pl-box .pl-carrega i:nth-child(2){animation-delay:.2s}#pl-box .pl-carrega i:nth-child(3){animation-delay:.4s}' +
    '@keyframes plpisca{0%,80%,100%{opacity:.2}40%{opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){#pl-box .pl-carrega i{animation:none;opacity:1}}' +
    '@media (min-width:600px){#pl-box .pl-in{padding:16px 22px 0}#pl-box .pl-out{padding:16px 22px 0}#pl-box .pl-band{font-size:16px}}';

  var box = el('section'); box.id = 'pl-box'; box.setAttribute('aria-label', 'Pergunte à lição');
  var st = el('style'); st.textContent = CSS; box.appendChild(st);
  box.appendChild(el('p', 'pl-band', 'Pergunte à lição'));

  var inn = el('div', 'pl-in');
  inn.appendChild(el('p', 'pl-sub', 'Escreva uma dúvida sobre esta lição. Você recebe uma resposta curta, o trecho da revista que trata disso e o momento em que o Dr. Wagner Cordeiro explica no vídeo.'));
  var form = el('form'); form.setAttribute('novalidate', '');
  var lab = el('label', null, 'Sua dúvida'); lab.setAttribute('for', 'pl-q'); form.appendChild(lab);
  var ta = el('textarea'); ta.id = 'pl-q'; ta.maxLength = 300; ta.rows = 2;
  ta.placeholder = 'ex.: por que Deus endureceu o coração de Faraó?';
  form.appendChild(ta);
  var row = el('div', 'pl-row');
  var cont = el('span', 'pl-cont', '0/300');
  var btn = el('button', null, 'Perguntar'); btn.type = 'submit';
  row.appendChild(cont); row.appendChild(btn); form.appendChild(row);
  inn.appendChild(form); box.appendChild(inn);
  var out = el('div', 'pl-out'); out.setAttribute('aria-live', 'polite'); box.appendChild(out);
  document.body.appendChild(box);

  ta.addEventListener('input', function () { cont.textContent = ta.value.length + '/300'; });

  function mostrarErro(msg) {
    out.textContent = '';
    out.appendChild(el('p', 'pl-aviso', msg));
  }
  function mostrarCarregando() {
    out.textContent = '';
    var c = el('p', 'pl-carrega', 'Procurando na lição e no ensino do Dr. Wagner');
    c.appendChild(el('i', null, '.')); c.appendChild(el('i', null, '.')); c.appendChild(el('i', null, '.'));
    out.appendChild(c);
  }

  function montarResultado(dado, pergunta) {
    out.textContent = '';
    var r = el('div', 'pl-card');
    r.appendChild(el('h3', null, 'Resposta'));
    r.appendChild(el('p', 'pl-resp', dado.resposta));
    out.appendChild(r);

    lerLicao().then(function (L) {
      var ts = trechosDaRevista(L, pergunta);
      if (!ts.length) return;
      var c = el('div', 'pl-card');
      c.appendChild(el('h3', null, 'Na sua revista'));
      ts.forEach(function (t) {
        var p = el('p', 'pl-rev');
        if (t.titulo) p.appendChild(el('b', null, t.titulo));
        var corpo = t.texto, curto = corpo.length > 420;
        var span = el('span', null, curto ? corpo.slice(0, 420).replace(/\s+\S*$/, '') + '…' : corpo);
        p.appendChild(span);
        if (curto) {
          var more = el('button', 'pl-more', 'ler tudo');
          more.type = 'button';
          more.addEventListener('click', function () { span.textContent = corpo; more.remove(); });
          p.appendChild(document.createTextNode(' '));
          p.appendChild(more);
        }
        c.appendChild(p);
      });
      out.insertBefore(c, out.children[1] || null);
    }).catch(function () { /* sem a revista no aparelho, a resposta continua */ });

    (dado.videos || []).forEach(function (v) {
      var c = el('div', 'pl-card');
      c.appendChild(el('h3', null, 'Vídeo do Dr. Wagner Cordeiro'));
      var t = el('p', 'pl-vid', 'Ele explica a partir de ' + fmt(v.inicio));
      t.appendChild(el('small', null, v.titulo + ' · pregado em ' + v.data));
      c.appendChild(t);
      var fr = el('div', 'pl-frame');
      var ifr = el('iframe');
      ifr.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) + '?start=' + parseInt(v.inicio, 10) + '&rel=0';
      ifr.title = 'Dr. Wagner Cordeiro — ' + v.titulo;
      ifr.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      ifr.setAttribute('allowfullscreen', '');
      ifr.loading = 'lazy';
      fr.appendChild(ifr); c.appendChild(fr);
      out.appendChild(c);
    });

    out.appendChild(el('p', 'pl-nota', 'Resposta escrita com base nesta lição e no ensino do Dr. Wagner. Confira sempre na revista e na Bíblia.'));
    var nova = el('button', 'pl-sec', 'Nova pergunta');
    nova.type = 'button';
    nova.addEventListener('click', function () { out.textContent = ''; ta.value = ''; cont.textContent = '0/300'; ta.focus(); });
    out.appendChild(el('div', null)).appendChild(nova);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pergunta = ta.value.replace(/\s+/g, ' ').trim();
    if (pergunta.length < 5) { mostrarErro('Escreva a sua dúvida com pelo menos 5 letras.'); return; }
    btn.disabled = true;
    mostrarCarregando();
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var prazo = ctl ? setTimeout(function () { ctl.abort(); }, 30000) : null;
    fetch('/api/pergunte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turma: TURMA, n: N, pergunta: pergunta }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false }; }).then(function (d) { return { st: r.status, d: d }; });
    }).then(function (x) {
      if (x.d && x.d.ok) return montarResultado(x.d, pergunta);
      var msg = (x.d && x.d.erro) || 'Não consegui responder agora. Tente de novo em instantes.';
      mostrarErro(msg);
    }).catch(function (err) {
      mostrarErro(err && err.name === 'AbortError'
        ? 'Demorou mais do que o normal. Tente de novo em instantes.'
        : 'Sem conexão no momento. Verifique a internet e tente de novo.');
    }).then(function () {
      if (prazo) clearTimeout(prazo);
      btn.disabled = false;
    });
  });
})();
