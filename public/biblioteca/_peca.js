/* ══════════════════════════════════════════════════════════════════════════════
   FECHAR O CICLO — "Gerar uma mensagem" e "Gerar um estudo"
   ------------------------------------------------------------------------------
   Terminou de cavar um texto com qualquer um dos 42 servos do Concílio?
   Um clique e aquilo vira peça pronta, publicada no devido lugar do RADAR:
     • mensagem -> /biblioteca/mensagens/
     • estudo   -> /biblioteca/estudo/
   Este arquivo é ÚNICO de propósito: a sala, o consultar e o que vier depois
   chamam o mesmo código. Melhorou aqui, melhorou em todo lugar.

   Como usar numa página:
     <script src="/biblioteca/_peca.js"></script>
     RadarPeca.botoes(elemento, { expositor: {...}, estudo: '...', tema: '...' });
   ══════════════════════════════════════════════════════════════════════════════ */
(function (janela) {
  'use strict';

  var TOKEN = 'radar-elias-2026';           // mesmo token já usado no /api/estudo-busca
  var LISTA = { mensagem: '/biblioteca/mensagens/', estudo: '/biblioteca/estudo/' };
  var ROTULO = { mensagem: 'Mensagem', estudo: 'Estudo' };

  /* ── estilo: navy, teal, dourado, vinho, Georgia nos títulos (o visual das peças) ── */
  var CSS = ''
    + '.pc-ov{position:fixed;inset:0;z-index:9999;background:rgba(15,61,92,.55);display:flex;align-items:center;justify-content:center;padding:14px}'
    + '.pc-cx{width:100%;max-width:760px;max-height:100%;background:#fff;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(15,61,92,.35)}'
    + '.pc-top{flex-shrink:0;display:flex;align-items:center;gap:10px;background:#0f3d5c;color:#fff;padding:11px 13px}'
    + '.pc-top b{flex:1;font-family:Georgia,serif;font-size:1.05rem;line-height:1.2;min-width:0}'
    + '.pc-top small{display:block;color:#e9c877;font-weight:700;font-size:.74rem;letter-spacing:.4px}'
    + '.pc-x{background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:10px;width:36px;height:36px;font-size:1rem;font-weight:800;cursor:pointer;flex-shrink:0;font-family:inherit}'
    + '.pc-x:hover{background:rgba(255,255,255,.3)}'
    + '.pc-corpo{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:15px 16px 6px;color:#1c2230;font-family:"Segoe UI",system-ui,Arial,sans-serif;line-height:1.7}'
    + '.pc-selo{text-align:center;color:#0f6d78;font-size:.72rem;font-weight:800;letter-spacing:2.6px;text-transform:uppercase;margin-bottom:3px}'
    + '.pc-corpo h1{font-family:Georgia,serif;text-align:center;color:#0f3d5c;font-size:1.5rem;line-height:1.22;font-weight:800;margin:2px 0 4px}'
    + '.pc-ref{text-align:center;color:#a9791c;font-weight:800;font-size:1rem;margin-bottom:12px}'
    + '.pc-div{height:3px;width:60px;background:#a9791c;border-radius:3px;margin:0 auto 18px}'
    + '.pc-intro{background:#f2f7f8;border:1px solid #d5e6e8;border-radius:14px;padding:13px 14px;margin-bottom:20px}'
    + '.pc-intro p{margin:0;font-size:1.02rem;text-align:justify}'
    + '.pc-corpo p{font-size:1.06rem;margin:0 0 14px;text-align:justify;text-justify:inter-word}'
    + '.pc-corpo strong{color:#8a1c1c;font-weight:800}'
    + '.pc-corpo em{color:#0f3d5c;font-style:italic}'
    + '.pc-corpo h2.sec{font-family:Georgia,serif;text-align:center;color:#0f3d5c;font-size:1.18rem;font-weight:800;line-height:1.35;margin:24px 0 12px;padding-top:15px;border-top:1px solid #e8e8ee}'
    + '.pc-corpo h2.sec .num{display:inline-block;background:#0f3d5c;color:#fff;border-radius:50%;width:1.7em;height:1.7em;line-height:1.7em;font-size:.82rem;margin-right:6px;font-family:inherit}'
    + '.pc-corpo ul{list-style:none;margin:0 0 14px;padding:0}'
    + '.pc-corpo ul li{position:relative;padding:0 0 0 21px;margin:0 0 9px;font-size:1.04rem;text-align:left}'
    + '.pc-corpo ul li::before{content:"\\25C6";color:#a9791c;position:absolute;left:2px;top:0}'
    + '.pc-corpo .final{background:#fbf6ea;border:2px solid #ecd9ad;border-radius:16px;padding:16px 15px;margin-top:20px}'
    + '.pc-corpo .final h2.sec{margin-top:0;border-top:none;padding-top:0}'
    + '.pc-corpo .final p:last-child{margin-bottom:0}'
    + '.pc-espera{text-align:center;color:#0f6d78;font-weight:800;padding:26px 8px;font-size:1rem}'
    + '.pc-espera i{font-style:normal;animation:pcpisca 1.2s infinite}'
    + '.pc-espera i:nth-child(2){animation-delay:.2s}.pc-espera i:nth-child(3){animation-delay:.4s}'
    + '@keyframes pcpisca{0%,60%,100%{opacity:.25}30%{opacity:1}}'
    + '.pc-erro{background:#fdeaea;border:1px solid #f2c2c2;color:#8a1c1c;border-radius:12px;padding:12px 14px;font-weight:700}'
    + '.pc-ok{background:#eef8f0;border:2px solid #bfe3c8;border-radius:14px;padding:12px 13px;margin:0 0 8px}'
    + '.pc-ok .t{color:#166534;font-weight:800;font-size:.98rem;margin-bottom:6px}'
    + '.pc-ok a{display:block;color:#0f3d5c;font-weight:800;word-break:break-all;font-size:.9rem;text-decoration:none;background:#fff;border:1px solid #d7e6da;border-radius:10px;padding:9px 10px}'
    + '.pc-pe{flex-shrink:0;display:flex;flex-wrap:wrap;gap:8px;background:#fff;border-top:1px solid #e4e7ec;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}'
    + '.pc-b{flex:1;min-width:120px;border:none;border-radius:12px;padding:12px 10px;font-size:.97rem;font-weight:800;font-family:inherit;cursor:pointer}'
    + '.pc-b[disabled]{opacity:.45;cursor:not-allowed}'
    + '.pc-b.pub{background:linear-gradient(135deg,#0f6d78,#0f3d5c);color:#fff}'
    + '.pc-b.cop{background:#a9791c;color:#fff}'
    + '.pc-b.fec{background:#eef2f4;color:#0f3d5c;border:1px solid #e4e7ec;flex:0 0 auto;min-width:96px}'
    /* os dois botões que aparecem no fim de uma resposta */
    + '.pc-ger{display:flex;flex-wrap:wrap;gap:7px;flex:1 1 260px}'
    + '.pc-ger button{flex:1;min-width:132px;border:none;border-radius:11px;padding:10px 12px;font-size:.9rem;font-weight:800;font-family:inherit;cursor:pointer;color:#fff}'
    + '.pc-ger button.msg{background:linear-gradient(135deg,#8a1c1c,#a9791c)}'
    + '.pc-ger button.est{background:linear-gradient(135deg,#0f6d78,#0f3d5c)}'
    /* reprovar/melhorar com o servo (vai-e-volta em cima da peça pronta) */
    + '.pc-b.mel{background:#8a1c1c;color:#fff}'
    + '.pc-mel{flex-shrink:0;display:none;flex-direction:column;gap:7px;background:#fbf6ea;border-top:1px solid #ecd9ad;padding:11px 12px}'
    + '.pc-mel.on{display:flex}'
    + '.pc-mel label{font-size:.84rem;font-weight:800;color:#8a1c1c;line-height:1.35}'
    + '.pc-mel textarea{width:100%;resize:vertical;min-height:58px;max-height:150px;border:1.5px solid #ecd9ad;border-radius:12px;padding:9px 11px;font-family:inherit;font-size:1rem;line-height:1.4;color:#1c2230}'
    + '.pc-mel textarea:focus{outline:none;border-color:#a9791c}'
    + '.pc-mel .go{background:linear-gradient(135deg,#8a1c1c,#a9791c);color:#fff;border:none;border-radius:11px;padding:11px 12px;font-size:.94rem;font-weight:800;font-family:inherit;cursor:pointer}'
    + '@media(max-width:430px){.pc-ov{padding:0}.pc-cx{max-width:100%;border-radius:0;height:100%;max-height:100%}.pc-corpo h1{font-size:1.3rem}}'
    /* notebook 1366x768: a caixa nunca passa da tela — quem rola é o miolo, não a página.
       Só de 431px pra cima: no celular a janela é de borda a borda (regra acima). */
    + '@media(min-width:431px) and (max-height:800px){.pc-cx{max-height:calc(100vh - 20px)}.pc-corpo{padding-top:11px}}';

  function estilo() {
    if (document.getElementById('pc-css')) return;
    var s = document.createElement('style');
    s.id = 'pc-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ─────────── utilidades ─────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function inl(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                 .replace(/(^|[\s(«"])\*([^*]+?)\*/g, '$1<em>$2</em>');
  }
  function copiar(texto, botao) {
    function fb() {
      try {
        var a = document.createElement('textarea');
        a.value = texto; a.style.position = 'fixed'; a.style.opacity = '0';
        document.body.appendChild(a); a.focus(); a.select();
        document.execCommand('copy'); document.body.removeChild(a);
      } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).catch(fb);
    else fb();
    if (botao) {
      var o = botao.textContent;
      botao.textContent = '✅ Copiado';
      setTimeout(function () { botao.textContent = o; }, 1600);
    }
  }

  /* ─────────── ler o que a IA devolveu ───────────
     Formato combinado no /api/peca:
       TITULO: / REFERENCIA: / EMOJI: / RESUMO: / CORPO:
     Funciona no meio do streaming (o pastor vê a peça se formando).            */
  function separar(bruto) {
    var t = String(bruto || '');
    var p = { titulo: '', ref: '', emoji: '', resumo: '', corpo: '' };
    var mC = t.match(/^\s*CORPO:\s*$/m);
    var cabeca = mC ? t.slice(0, mC.index) : t;
    var corpo = mC ? t.slice(mC.index + mC[0].length) : '';
    var pega = function (re) { var m = cabeca.match(re); return m ? m[1].trim() : ''; };
    p.titulo = pega(/^\s*T[IÍ]TULO:\s*(.+)$/mi).replace(/^["“”']|["“”']$/g, '');
    p.ref    = pega(/^\s*REFER[EÊ]NCIA:\s*(.+)$/mi);
    p.emoji  = pega(/^\s*EMOJI:\s*(.+)$/mi).slice(0, 4);
    p.resumo = pega(/^\s*RESUMO:\s*([\s\S]*?)$/mi).split(/\n\s*(?:CORPO|T[IÍ]TULO|EMOJI|REFER)/i)[0].trim();
    p.corpo  = corpo.replace(/^\s+/, '');
    // ainda não chegou o "CORPO:"? mostra o que já veio, pra não ficar tela morta
    if (!mC && !p.titulo && t.trim()) p.corpo = t;
    return p;
  }

  /* ─────────── montar o HTML no visual das peças do RADAR ─────────── */
  function paraHTML(tipo, corpo) {
    var linhas = String(corpo || '').split(/\r?\n/);
    var blocos = [], para = [], itens = [], secAtual = null, n = 0;

    function soltaPara() { if (para.length) { blocos.push({ t: 'p', x: para.join(' ') }); para = []; } }
    function soltaLista() { if (itens.length) { blocos.push({ t: 'ul', x: itens.slice() }); itens = []; } }
    function solta() { soltaPara(); soltaLista(); }

    for (var i = 0; i < linhas.length; i++) {
      var L = linhas[i].trim();
      if (!L) { solta(); continue; }
      var mH = L.match(/^#{2,4}\s*(.+)$/) || L.match(/^\*\*(.+?)\*\*:?\s*$/);
      if (mH) { solta(); n++; blocos.push({ t: 'h', x: mH[1].replace(/^\d+[.)]\s*/, ''), n: n }); secAtual = blocos[blocos.length - 1]; continue; }
      if (/^([•\-*]|\d+[.)])\s+/.test(L)) { soltaPara(); itens.push(L.replace(/^([•\-*]|\d+[.)])\s+/, '')); continue; }
      soltaLista(); para.push(L);
    }
    solta();

    // o fechamento vai na caixa dourada (é o padrão das páginas que já existem):
    // no ESTUDO é a última seção inteira; na MENSAGEM é o último parágrafo (o fecho que queima).
    var corte = blocos.length;
    if (tipo === 'estudo') {
      for (var j = blocos.length - 1; j >= 0; j--) if (blocos[j].t === 'h') { corte = j; break; }
    } else {
      for (var k = blocos.length - 1; k >= 0; k--) if (blocos[k].t === 'p') { corte = k; break; }
    }
    if (corte >= blocos.length) corte = blocos.length;   // nada a destacar ainda

    function um(b) {
      if (b.t === 'h') return '<h2 class="sec">' + (tipo === 'estudo' ? '<span class="num">' + b.n + '</span>' : '') + inl(b.x) + '</h2>';
      if (b.t === 'ul') return '<ul>' + b.x.map(function (li) { return '<li>' + inl(li) + '</li>'; }).join('') + '</ul>';
      return '<p>' + inl(b.x) + '</p>';
    }
    var h = '';
    for (var a = 0; a < corte; a++) h += um(blocos[a]);
    if (corte < blocos.length) {
      h += '<div class="final">';
      for (var c = corte; c < blocos.length; c++) h += um(blocos[c]);
      h += '</div>';
    }
    return h;
  }

  /* texto puro pro botão Copiar (sem tag nenhuma) */
  function paraTexto(p, expositorNome) {
    return (p.emoji ? p.emoji + ' ' : '') + p.titulo + '\n' + (p.ref || '') + '\n\n'
      + String(p.corpo || '').replace(/^#{2,4}\s*/gm, '').replace(/\*\*/g, '').replace(/(^|\s)\*([^*]+)\*/g, '$1$2').trim()
      + '\n\n— ' + (expositorNome || 'Concílio dos Expositores') + ' · RADAR'
      + '\nhttps://radar-atual.vercel.app/biblioteca/concilio/';
  }

  /* ═══════════════════ A JANELA (gerar → conferir → publicar) ═══════════════════ */
  function abrir(op) {
    estilo();
    var tipo = op.tipo === 'estudo' ? 'estudo' : 'mensagem';
    var exp = op.expositor || {};
    var bruto = '', pronto = false, publicado = null, peca = null;

    var ov = document.createElement('div');
    ov.className = 'pc-ov';
    ov.innerHTML =
      '<div class="pc-cx" role="dialog" aria-modal="true">'
      + '<div class="pc-top"><b>' + esc(tipo === 'estudo' ? '📚 Gerar um estudo' : '🔥 Gerar uma mensagem')
      + '<small>' + esc((exp.nome || 'Concílio dos Expositores') + ' · vai para ' + LISTA[tipo]) + '</small></b>'
      + '<button class="pc-x" title="Fechar" aria-label="Fechar">✕</button></div>'
      + '<div class="pc-corpo"><div class="pc-espera">✍️ forjando a ' + esc(ROTULO[tipo].toLowerCase())
      + ' <i>·</i><i>·</i><i>·</i><br><span style="font-weight:600;color:#6b7280;font-size:.9rem">pode levar alguns segundos — ore enquanto isso 🙏</span></div></div>'
      + '<div class="pc-mel"><label>✎ Reprove e melhore COM ele — aponte o que mudar:</label>'
      + '<textarea class="pc-mel-t" placeholder="Ex.: o fecho ficou fraco; explique melhor a ligação da pomba com o Espírito; corte o ponto 3; puxe mais a prova real…"></textarea>'
      + '<button class="go" type="button">✎ Melhorar com o servo</button></div>'
      + '<div class="pc-pe">'
      + '<button class="pc-b cop" disabled>📋 Copiar</button>'
      + '<button class="pc-b mel" disabled>✎ Melhorar</button>'
      + '<button class="pc-b pub" disabled>🚀 Publicar no RADAR</button>'
      + '<button class="pc-b fec">✖ Fechar</button>'
      + '</div></div>';
    document.body.appendChild(ov);

    var travaRolagem = document.body.style.overflow;
    document.body.style.overflow = 'hidden';   // a página de trás não rola enquanto isto está aberto

    var elCorpo = ov.querySelector('.pc-corpo');
    var bCop = ov.querySelector('.pc-b.cop');
    var bPub = ov.querySelector('.pc-b.pub');

    function fechar() {
      document.body.style.overflow = travaRolagem;
      document.removeEventListener('keydown', aoTeclar);
      ov.remove();
    }
    function aoTeclar(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', aoTeclar);
    ov.querySelector('.pc-x').addEventListener('click', fechar);
    ov.querySelector('.pc-b.fec').addEventListener('click', fechar);
    ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });

    function pintar() {
      peca = separar(bruto);
      var h = '';
      if (publicado) {
        h += '<div class="pc-ok"><div class="t">✅ ' + esc(ROTULO[tipo])
           + (tipo === 'estudo' ? ' publicado' : ' publicada') + ' no RADAR — o link direto é este:</div>'
           + '<a href="' + esc(publicado.url) + '" target="_blank" rel="noopener">' + esc(publicado.abs) + '</a></div>';
      }
      h += '<div class="pc-selo">✦ Escavador de Pérolas Bíblicas ✦</div>';
      h += '<h1>' + (peca.emoji ? esc(peca.emoji) + ' ' : '') + esc(peca.titulo || '…') + '</h1>';
      if (peca.ref) h += '<div class="pc-ref">' + esc(peca.ref) + '</div>';
      h += '<div class="pc-div"></div>';
      if (peca.resumo) h += '<div class="pc-intro"><p>' + inl(peca.resumo) + '</p></div>';
      h += paraHTML(tipo, peca.corpo);
      elCorpo.innerHTML = h;
    }

    function erro(msg) {
      elCorpo.innerHTML = '<div class="pc-erro">Não deu certo agora: ' + esc(msg) + '<br>Tente de novo em instantes.</div>';
    }

    var bMel = ov.querySelector('.pc-b.mel');
    var caixaMel = ov.querySelector('.pc-mel');
    var txtMel = ov.querySelector('.pc-mel-t');
    var goMel = ov.querySelector('.pc-mel .go');

    /* ── gerar (1ª vez) e RE-gerar melhorando (reprovar → apontar → melhorar com ele) ──
       `refino` = null na 1ª vez; { rascunho, criticas } quando o pastor manda melhorar. */
    function gerar(refino) {
      bruto = ''; pronto = false; peca = null;
      bCop.disabled = true; bPub.disabled = true; bMel.disabled = true;
      caixaMel.classList.remove('on');
      var espera = refino
        ? '✎ revendo a ' + esc(ROTULO[tipo].toLowerCase()) + ' com os seus apontamentos'
        : '✍️ forjando a ' + esc(ROTULO[tipo].toLowerCase());
      elCorpo.innerHTML = '<div class="pc-espera">' + espera + ' <i>·</i><i>·</i><i>·</i><br>'
        + '<span style="font-weight:600;color:#6b7280;font-size:.9rem">pode levar alguns segundos — ore enquanto isso 🙏</span></div>';
      var corpoReq = { tipo: tipo, expositor: exp, estudo: op.estudo || '', tema: op.tema || '' };
      if (refino) { corpoReq.rascunho = refino.rascunho; corpoReq.criticas = refino.criticas; }
      fetch('/api/peca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoReq)
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('erro ' + r.status)); });
        if (!r.body || !r.body.getReader) return r.text().then(function (t) { bruto = t; pintar(); });
        var lei = r.body.getReader(), dec = new TextDecoder();
        elCorpo.innerHTML = '';
        return (function puxa() {
          return lei.read().then(function (x) {
            if (x.done) return;
            bruto += dec.decode(x.value, { stream: true });
            pintar();
            return puxa();
          });
        })();
      }).then(function () {
        if (!String(bruto).trim()) { erro('a IA devolveu vazio'); return; }
        pronto = true; pintar();
        bCop.disabled = false; bPub.disabled = false; bMel.disabled = false;
        elCorpo.scrollTop = 0;
      }).catch(function (e) { erro((e && e.message) || 'falha de conexão'); });
    }
    gerar(null);

    /* ── reprovar / melhorar COM o servo (vai-e-volta em cima da peça pronta) ── */
    bMel.addEventListener('click', function () {
      if (!pronto) return;
      caixaMel.classList.toggle('on');
      if (caixaMel.classList.contains('on')) { txtMel.focus(); elCorpo.scrollTop = elCorpo.scrollHeight; }
    });
    goMel.addEventListener('click', function () {
      var c = (txtMel.value || '').trim();
      if (!c) { txtMel.focus(); return; }
      if (!peca || !pronto) return;
      var rascunho = paraTexto(peca, exp.nome);
      txtMel.value = '';
      gerar({ rascunho: rascunho, criticas: c });
    });

    /* ── 2) copiar ── */
    bCop.addEventListener('click', function () {
      if (!peca) return;
      copiar(paraTexto(peca, exp.nome), bCop);
    });

    /* ── 3) publicar ── */
    bPub.addEventListener('click', function () {
      if (!pronto || !peca || publicado) return;
      if (!peca.titulo) { alert('A peça veio sem título. Gere de novo, por favor.'); return; }
      bPub.disabled = true; bPub.textContent = '🚀 Publicando…';
      fetch('/api/publicacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: TOKEN,
          tipo: tipo,
          titulo: peca.titulo,
          referencia: peca.ref,
          emoji: peca.emoji,
          resumo: peca.resumo,
          corpo_html: paraHTML(tipo, peca.corpo),
          corpo_texto: paraTexto(peca, exp.nome),
          expositor_id: exp.id || '',
          expositor_nome: exp.nome || '',
          status: 'publicado'
        })
      }).then(function (r) { return r.json().catch(function () { return { ok: false, erro: 'resposta inválida do servidor' }; }); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error((d && d.erro) || 'o servidor recusou');
          publicado = { url: d.url, abs: location.origin + d.url, lista: d.lista };
          bPub.textContent = '📋 Copiar o link';
          bPub.disabled = false;
          bPub.onclick = function () { copiar(publicado.abs, bPub); };
          bMel.disabled = true; caixaMel.classList.remove('on');   // publicou: encerra o loop de melhorar desta peça
          var pe = ov.querySelector('.pc-pe');
          var ver = document.createElement('button');
          ver.className = 'pc-b cop';
          ver.textContent = '📖 Ver na lista';
          ver.addEventListener('click', function () { location.href = publicado.lista; });
          pe.insertBefore(ver, pe.firstChild);
          pintar();
          elCorpo.scrollTop = 0;
        }).catch(function (e) {
          bPub.disabled = false; bPub.textContent = '🚀 Publicar no RADAR';
          alert('Não consegui publicar agora: ' + ((e && e.message) || 'falha') + '\nO texto continua aqui — dá pra copiar e tentar de novo.');
        });
    });
  }

  /* ═══ os dois botões, prontos pra grudar no fim de uma resposta ═══
     `dados` pode ser um objeto ou uma função que devolve {expositor, estudo, tema}
     (função é melhor quando a conversa ainda vai crescer).                        */
  function botoes(onde, dados) {
    estilo();
    var cx = document.createElement('div');
    cx.className = 'pc-ger';
    cx.innerHTML = '<button class="msg" type="button">🔥 Gerar uma mensagem</button>'
                 + '<button class="est" type="button">📚 Gerar um estudo</button>';
    function pega() { return (typeof dados === 'function' ? dados() : dados) || {}; }
    cx.querySelector('.msg').addEventListener('click', function () {
      var d = pega(); abrir({ tipo: 'mensagem', expositor: d.expositor, estudo: d.estudo, tema: d.tema });
    });
    cx.querySelector('.est').addEventListener('click', function () {
      var d = pega(); abrir({ tipo: 'estudo', expositor: d.expositor, estudo: d.estudo, tema: d.tema });
    });
    // o pai (ex.: o rodapé da resposta, que já tem o Copiar) precisa poder quebrar
    // linha — senão no celular o Copiar fica espremido em duas sílabas.
    if (onde) { try { onde.style.flexWrap = 'wrap'; } catch (e) {} onde.appendChild(cx); }
    return cx;
  }

  janela.RadarPeca = { abrir: abrir, botoes: botoes, paraHTML: paraHTML, separar: separar, copiar: copiar };
})(window);
