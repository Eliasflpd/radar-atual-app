/* ============================================================================
   RADAR — AVISO DE REPETIÇÃO  (public/_pregado.js)
   ----------------------------------------------------------------------------
   O app LEMBRA o que o pastor já pregou e AVISA ANTES dele repetir.

   Liga sozinho em qualquer página onde for incluído. Descobre em que modo está:

     1) PEÇA      (mensagem/sermão aberta)  -> faixa de aviso no topo
                                            + pino "📌 Já preguei esta"
     2) LISTA     (índice com cartões)      -> selo "✅ pregada" nos cartões
     3) GERADOR   (#cr-tema / #ed-tema)     -> avisa enquanto ele digita o tema

   COMO COMPARA (nesta ordem):
     a) TEXTO BÍBLICO — normaliza "Gênesis 28 · João 1:51" em chaves "gn 28",
        "jo 1" e cruza com o que já foi pregado. Mesmo livro+capítulo = aviso.
     b) TEMA por palavras — palavras fortes do título/descrição em comum.
     c) SIGNIFICADO (opcional, sob 1 toque) — reaproveita o índice vetorial que
        já existe em /busca/mensagens.*, comparando a peça aberta com as peças
        já pregadas. Não gasta servidor: o índice é estático e a peça atual já
        está dentro dele. Depois do primeiro uso passa a rodar sozinho, porque
        aí o arquivo já está no cache do aparelho.

   O AVISO INFORMA, NÃO BLOQUEIA. Sempre há "seguir mesmo assim".
   Mesmo texto por ângulo diferente é DITO — não é impedimento.

   ⚠️ NUNCA escreve nem apaga a chave 'radar_user'. Só LÊ. É sagrada.
   ⚠️ Falha SEMPRE em silêncio: nada aqui pode travar ou atrasar o app.

   Servidor:  GET/POST /api/dados?fn=pregado
   ============================================================================ */
(function () {
  'use strict';
  if (window.RadarPregado) return;

  var API      = '/api/dados?fn=pregado';
  var DEV_KEY  = 'radar_pregador';        // chave PRÓPRIA (aparelho sem cadastro)
  var CACHE_K  = 'radar_pregado_cache';   // cópia local, pra faixa aparecer na hora
  var SEM_K    = 'radar_pregado_semantico';
  var NAVY='#0f3d5c', TEAL='#0f6d78', OURO='#a9791c', VINHO='#8a1c1c';

  function seguro(fn){ try { return fn(); } catch(e){ return undefined; } }
  function lim(t, n){ return String(t==null?'':t).replace(/\s+/g,' ').trim().slice(0, n||220); }
  function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function sAcento(t){
    t = String(t==null?'':t).toLowerCase();
    // "Jó" e "João" viram a MESMA coisa sem acento — separa antes de tirar o acento
    t = t.replace(/(^|[^a-zà-ú])jó(?![a-zà-ú])/g, '$1job');
    return t.normalize ? t.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : t;
  }
  function hoje(){ var d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
  function brData(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||'')); return m? (m[3]+'/'+m[2]+'/'+m[1]) : ''; }

  /* ═══════════ QUEM É ═══════════════════════════════════════════════════════
     Primeiro o WhatsApp do cadastro (mesma chave de leitura_progresso/radar_uso).
     Sem cadastro, um apelido só deste aparelho — pra o caderno não se perder. */
  function quemSou(){
    var w = seguro(function(){
      var raw = localStorage.getItem('radar_user');     // <- SÓ getItem. Jamais setItem.
      if(!raw) return '';
      var u = JSON.parse(raw);
      return (u && typeof u==='object') ? String(u.whatsapp||'').replace(/\D/g,'').slice(0,60) : '';
    }) || '';
    if(w.length >= 8) return w;
    return seguro(function(){
      var d = localStorage.getItem(DEV_KEY);
      if(!d){ d = 'aparelho-' + Math.random().toString(36).slice(2,10); localStorage.setItem(DEV_KEY, d); }
      return d;
    }) || '';
  }

  /* ═══════════ OS 66 LIVROS ══════════════════════════════════════════════════
     nome normalizado -> código curto. Os numerados ganham variantes sozinhos
     (1/I/primeira/1a) pra "1 Coríntios", "I Coríntios" e "1a Coríntios" caírem
     todos no mesmo lugar. */
  var BASE = [
    ['gn','genesis'],['ex','exodo'],['lv','levitico'],['nm','numeros'],['dt','deuteronomio'],
    ['js','josue'],['jz','juizes'],['rt','rute'],['ed','esdras'],['ne','neemias'],['et','ester'],
    ['job','job'],['sl','salmo'],['sl','salmos'],['sl','salterio'],['pv','proverbios'],
    ['ec','eclesiastes'],['ct','cantares'],['ct','canticos'],['ct','cantico dos canticos'],
    ['is','isaias'],['jr','jeremias'],['lm','lamentacoes'],['lm','lamentacoes de jeremias'],
    ['ez','ezequiel'],['dn','daniel'],['os','oseias'],['jl','joel'],['am','amos'],
    ['ob','obadias'],['jn','jonas'],['mq','miqueias'],['na','naum'],['hc','habacuque'],
    ['sf','sofonias'],['ag','ageu'],['zc','zacarias'],['ml','malaquias'],
    ['mt','mateus'],['mc','marcos'],['lc','lucas'],['jo','joao'],['at','atos'],
    ['at','atos dos apostolos'],['rm','romanos'],['gl','galatas'],['ef','efesios'],
    ['fp','filipenses'],['cl','colossenses'],['tt','tito'],['fm','filemom'],['fm','filemon'],
    ['hb','hebreus'],['tg','tiago'],['jd','judas'],['ap','apocalipse']
  ];
  // abreviaturas usuais
  var ABREV = ['gn','ex','lv','nm','dt','js','jz','rt','ed','ne','et','sl','pv','ec','ct','is',
               'jr','lm','ez','dn','os','jl','am','ob','jn','mq','na','hc','sf','ag','zc','ml',
               'mt','mc','lc','jo','at','rm','gl','ef','fp','cl','tt','fm','hb','tg','jd','ap'];
  var NUMERADOS = [
    ['sm','samuel',2],['rs','reis',2],['cr','cronicas',2],['co','corintios',2],
    ['ts','tessalonicenses',2],['tm','timoteo',2],['pe','pedro',2],['jo','joao',3]
  ];
  var ORD = { '1':['1','i','1a','1o','primeira','primeiro'],
              '2':['2','ii','2a','2o','segunda','segundo'],
              '3':['3','iii','3a','3o','terceira','terceiro'] };

  // Abreviaturas ("na", "os", "at"…) são também palavras do português. Só valem
  // como livro quando vem um CAPÍTULO logo atrás — senão "jogos de aposta na
  // igreja" viraria o profeta Naum.
  var LIVRO = {}, CURTO = {};
  BASE.forEach(function(p){ LIVRO[p[1]] = p[0]; });
  ABREV.forEach(function(a){ if(!LIVRO[a]){ LIVRO[a] = a; CURTO[a] = 1; } });
  LIVRO['jo'] = 'jo';        // "Jo" abreviado é João; "Jó" já virou "job" no sAcento
  LIVRO['job'] = 'job';
  NUMERADOS.forEach(function(n){
    for(var k=1; k<=n[2]; k++){
      ORD[String(k)].forEach(function(o){
        LIVRO[o+' '+n[1]] = k+n[0];          // "1 corintios"
        LIVRO[o+n[0]]     = k+n[0];          // "1co"
        LIVRO[o+' '+n[0]] = k+n[0];          // "1 co"
      });
    }
  });
  var NOME_LIVRO = {};
  BASE.concat([['1sm','1 Samuel'],['2sm','2 Samuel'],['1rs','1 Reis'],['2rs','2 Reis'],
    ['1cr','1 Crônicas'],['2cr','2 Crônicas'],['1co','1 Coríntios'],['2co','2 Coríntios'],
    ['1ts','1 Tessalonicenses'],['2ts','2 Tessalonicenses'],['1tm','1 Timóteo'],['2tm','2 Timóteo'],
    ['1pe','1 Pedro'],['2pe','2 Pedro'],['1jo','1 João'],['2jo','2 João'],['3jo','3 João']])
    .forEach(function(p){ if(!NOME_LIVRO[p[0]]) NOME_LIVRO[p[0]] = p[1].charAt(0).toUpperCase()+p[1].slice(1); });
  NOME_LIVRO['job']='Jó'; NOME_LIVRO['jo']='João'; NOME_LIVRO['sl']='Salmos'; NOME_LIVRO['ct']='Cânticos';

  /* referência escrita -> chaves "gn 28" (e "gn" quando não tem capítulo) */
  function chavesDaRef(txt){
    var out = [], vistos = {};
    String(txt==null?'':txt).split(/[·•;|\n\/]+|,\s*(?=[A-ZÀ-Ú1-3I])/).forEach(function(parte){
      var p = sAcento(parte).replace(/[".]/g,' ').replace(/\s+/g,' ').trim();
      if(!p) return;
      var toks = p.split(' ');
      for(var i=0; i<toks.length; i++){
        var achou = 0;
        for(var w=3; w>=1 && !achou; w--){
          if(i+w > toks.length) continue;
          var nome = toks.slice(i,i+w).join(' ');
          var cod = LIVRO[nome];
          if(!cod) continue;
          var resto = toks.slice(i+w).join(' ');
          var m = resto.match(/^(\d+)\s*(?::\s*\d+(?:\s*[-–—]\s*\d+)?)?(?:\s*[-–—]\s*(\d+))?/);
          if(!m && CURTO[nome]) continue;          // abreviatura sem capítulo não é livro
          achou = w;
          if(m){
            var a = parseInt(m[1],10), b = m[2] ? parseInt(m[2],10) : a;
            if(!(b >= a) || b-a > 60) b = a;
            for(var cp=a; cp<=b; cp++){
              var k = cod+' '+cp;
              if(!vistos[k]){ vistos[k]=1; out.push(k); }
            }
          } else if(!vistos[cod]){ vistos[cod]=1; out.push(cod); }
        }
        if(achou) i += achou - 1;
      }
    });
    return out.slice(0, 40);
  }
  function bonito(chave){
    var m = /^(\d?[a-z]+)\s*(\d+)?$/.exec(String(chave||''));
    if(!m) return chave;
    return (NOME_LIVRO[m[1]] || m[1]) + (m[2] ? ' '+m[2] : '');
  }

  /* ═══════════ TEMA por palavras fortes ════════════════════════════════════ */
  var PARE = ('a as o os um uma uns umas de do da dos das em no na nos nas por para com sem sob ' +
    'que quem qual quais e ou mas nem se ja nao sim ao aos à as pelo pela pelos pelas ate apos ' +
    'entre sobre sua seu suas seus meu minha nosso nossa isso isto aquele aquela ele ela eles elas ' +
    'deus jesus cristo senhor biblia palavra versiculo capitulo texto pregacao mensagem sermao estudo ' +
    'quando onde como porque muito mais menos todo toda todos todas ser sao foi era esta estao tem ' +
    'nunca sempre ninguem alguem coisa parte ').split(' ');
  var EPARE = {}; PARE.forEach(function(w){ if(w) EPARE[w]=1; });

  function palavrasFortes(txt){
    var vis = {}, out = [];
    sAcento(txt).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).forEach(function(w){
      if(w.length < 4 || EPARE[w]) return;
      var r = w.replace(/(coes|oes|aos|ais|eis|is|ns|s)$/,'');   // plural tosco, serve
      if(r.length < 4) r = w;
      if(!vis[r]){ vis[r]=1; out.push(r); }
    });
    return out.slice(0, 40);
  }
  function emComum(a, b){
    var m = {}, out = [];
    (a||[]).forEach(function(w){ m[w]=1; });
    (b||[]).forEach(function(w){ if(m[w]) out.push(w); });
    return out;
  }

  /* ═══════════ O CADERNO (servidor + cópia local) ══════════════════════════ */
  var REGISTROS = null, pedido = null, ouvintes = [];

  function cacheLer(){
    return seguro(function(){
      var o = JSON.parse(localStorage.getItem(CACHE_K)||'null');
      return (o && o.k === quemSou() && Array.isArray(o.itens)) ? o.itens : null;
    }) || null;
  }
  function cacheGravar(itens){
    seguro(function(){ localStorage.setItem(CACHE_K, JSON.stringify({ k:quemSou(), em:Date.now(), itens:itens })); });
  }
  function avisarOuvintes(){ ouvintes.forEach(function(f){ seguro(function(){ f(REGISTROS); }); }); }

  function carregar(forcar){
    if(REGISTROS && !forcar) return Promise.resolve(REGISTROS);
    if(pedido && !forcar) return pedido;
    var k = quemSou();
    pedido = fetch(API+'&user='+encodeURIComponent(k), { cache:'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(d){
        REGISTROS = (d && Array.isArray(d.itens)) ? d.itens : [];
        REGISTROS.forEach(preparar);
        cacheGravar(REGISTROS);
        avisarOuvintes();
        return REGISTROS;
      })
      ['catch'](function(){
        if(!REGISTROS) REGISTROS = cacheLer() || [];
        REGISTROS.forEach(preparar);
        avisarOuvintes();
        return REGISTROS;
      });
    // enquanto o servidor não responde, a cópia local já deixa a faixa aparecer
    var loc = cacheLer();
    if(loc && !REGISTROS){ REGISTROS = loc; REGISTROS.forEach(preparar); }
    return pedido;
  }
  function preparar(r){
    if(r.__p) return r;
    r.__p = 1;
    if(!r.livros || !r.livros.length) r.livros = chavesDaRef(r.ref||'');
    // A comparação por tema olha só o TÍTULO e o ÂNGULO. O parágrafo de abertura
    // fica de fora de propósito: prosa longa acha parecença em tudo e o aviso
    // viraria alarme falso toda hora.
    r.__pal = palavrasFortes((r.titulo||'') + ' ' + (r.angulo||''));
    return r;
  }

  function registrar(dados){
    var corpo = {
      user: quemSou(),
      slug: lim(dados.slug, 160), titulo: lim(dados.titulo),
      ref: lim(dados.ref), livros: dados.livros || chavesDaRef(dados.ref||''),
      tema: lim(dados.tema, 400), angulo: lim(dados.angulo, 400),
      publico: lim(dados.publico, 120), data: dados.data || hoje()
    };
    return fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(corpo) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d && d.item){
          REGISTROS = REGISTROS || [];
          if(!REGISTROS.some(function(x){ return x.id === d.item.id; })){ REGISTROS.unshift(preparar(d.item)); }
          cacheGravar(REGISTROS); avisarOuvintes();
        }
        return d;
      });
  }
  function apagar(id){
    return fetch(API, { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ acao:'apagar', user:quemSou(), id:id }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        REGISTROS = (REGISTROS||[]).filter(function(x){ return x.id !== id; });
        cacheGravar(REGISTROS); avisarOuvintes();
        return d;
      });
  }

  /* ═══════════ O CONFRONTO ═════════════════════════════════════════════════ */
  // peça = { slug, titulo, ref, chaves[], palavras[] }
  function confrontar(peca, lista){
    var res = { mesma:[], texto:[], livro:[], tema:[] };
    (lista||[]).forEach(function(r){
      preparar(r);
      if(peca.slug && r.slug && r.slug === peca.slug){ res.mesma.push({ r:r }); return; }
      if(!peca.slug && peca.titulo && sAcento(r.titulo) === sAcento(peca.titulo)){ res.mesma.push({ r:r }); return; }

      var caps = emComum(peca.chaves, r.livros);
      if(caps.length){ res.texto.push({ r:r, caps:caps }); return; }

      var pal = emComum(peca.palavras, r.__pal);
      if(pal.length >= 2){ res.tema.push({ r:r, pal:pal }); return; }

      // "mesmo livro, outro capítulo" só vale entre os livros PRINCIPAIS das duas
      // peças. Senão João e Salmos, que aparecem de raspão em quase tudo, viravam
      // alarme falso em cima de alarme falso.
      var pA = (peca.chaves[0]||'').split(' ')[0];
      var pB = ((r.livros||[])[0]||'').split(' ')[0];
      if(pA && pA === pB) res.livro.push({ r:r, livs:[pA] });
    });
    return res;
  }

  /* ═══════════ SIGNIFICADO (índice vetorial já existente) ══════════════════ */
  var IDX = null;
  function carregarIndice(){
    if(IDX) return Promise.resolve(IDX);
    return fetch('/busca/mensagens.idx.json')
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(meta){
        return fetch('/busca/mensagens.vec.bin?v='+(meta.gerado||'1'))
          .then(function(r){ if(!r.ok) throw 0; return r.arrayBuffer(); })
          .then(function(buf){
            var D = meta.dims, vet = new Int8Array(buf), medio = {};
            // vetor médio de cada peça (a média das partes dela)
            meta.itens.forEach(function(it, linha){
              var d = it[0], m = medio[d] || (medio[d] = new Float32Array(D));
              for(var j=0;j<D;j++) m[j] += vet[linha*D+j];
            });
            Object.keys(medio).forEach(function(d){
              var m = medio[d], s = 0, j;
              for(j=0;j<D;j++) s += m[j]*m[j];
              s = Math.sqrt(s) || 1;
              for(j=0;j<D;j++) m[j] /= s;
            });
            var porArquivo = {};
            meta.docs.forEach(function(doc, i){ if(medio[i]) porArquivo[doc.a] = medio[i]; });
            IDX = { dims:D, docs:meta.docs, vet:porArquivo };
            seguro(function(){ localStorage.setItem(SEM_K,'1'); });
            return IDX;
          });
      });
  }
  function cosseno(a,b){ var s=0; for(var i=0;i<a.length;i++) s += a[i]*b[i]; return s; }
  function poupaDados(){
    return !!seguro(function(){
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return c && (c.saveData === true || /^(slow-)?2g$/.test(c.effectiveType||''));
    });
  }

  // devolve [{r, sim}] das peças já pregadas parecidas POR SIGNIFICADO.
  // Corte 0.80 não foi chutado: medimos os 276 pares do acervo (scripts de prova).
  // 0.70 acusaria 22% de tudo (alarme falso); 0.80 deixa 1% — e ainda pega o caso
  // que só o significado enxerga: "O Sacerdote sem Genealogia" × "Você Não é
  // Levita" (0.817), mesmo assunto em textos bíblicos diferentes.
  function porSignificado(peca, lista, corte){
    return carregarIndice().then(function(ix){
      var meu = ix.vet[peca.slug];
      if(!meu) return [];
      var out = [];
      (lista||[]).forEach(function(r){
        var v = r.slug && ix.vet[r.slug];
        if(!v || r.slug === peca.slug) return;
        var s = cosseno(meu, v);
        if(s >= (corte || 0.80)) out.push({ r:r, sim:s });
      });
      return out.sort(function(a,b){ return b.sim-a.sim; }).slice(0,4);
    })['catch'](function(){ return []; });
  }

  /* ═══════════ VISUAL ══════════════════════════════════════════════════════ */
  var CSS = '' +
  '.rp-faixa{border-radius:14px;padding:13px 14px;margin:0 0 14px;font:400 15px/1.5 "Segoe UI",system-ui,Arial,sans-serif;text-align:left}' +
  '.rp-alerta{background:#fdf1ef;border:1px solid #e7c3bd;border-left:5px solid '+VINHO+'}' +
  '.rp-nota{background:#f2f7f8;border:1px solid #d5e6e8;border-left:5px solid '+TEAL+'}' +
  '.rp-faixa .rp-t{font-weight:800;color:'+VINHO+';font-size:15.5px;margin:0 0 5px;display:block}' +
  '.rp-nota .rp-t{color:'+TEAL+'}' +
  '.rp-faixa ul{margin:6px 0 0;padding:0 0 0 17px}' +
  '.rp-faixa li{margin:0 0 6px;color:#3a4250}' +
  '.rp-faixa b{color:'+NAVY+'}' +
  '.rp-q{color:'+OURO+';font-weight:800}' +
  '.rp-ang{display:block;color:#6b7280;font-size:13.5px;font-style:italic;margin-top:1px}' +
  '.rp-bt{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}' +
  '.rp-bt button{flex:1 1 130px;border:none;border-radius:11px;padding:10px 9px;font:800 14px inherit;font-family:inherit;cursor:pointer}' +
  '.rp-b1{background:'+NAVY+';color:#fff}.rp-b2{background:rgba(15,61,92,.09);color:'+NAVY+'}' +
  '.rp-pino{position:fixed;left:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:99989;' +
    'display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;border:1px solid '+OURO+'55;' +
    'background:'+NAVY+';color:#fff;font:600 12.5px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
    'box-shadow:0 4px 14px rgba(0,0,0,.28);cursor:pointer;opacity:.9;-webkit-tap-highlight-color:transparent}' +
  '.rp-pino.on{background:'+TEAL+';border-color:'+OURO+';opacity:1}' +
  '.rp-fundo{position:fixed;inset:0;background:rgba(10,20,30,.55);z-index:99995;display:flex;align-items:flex-end;justify-content:center}' +
  '.rp-folha{background:#fff;width:100%;max-width:480px;max-height:86vh;overflow:auto;border-radius:18px 18px 0 0;' +
    'padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));font:400 15px/1.55 "Segoe UI",system-ui,Arial,sans-serif;color:#1c2230}' +
  '.rp-folha h3{font-family:Georgia,serif;color:'+NAVY+';font-size:1.22rem;margin:0 0 3px;text-align:center}' +
  '.rp-folha .rp-sub{text-align:center;color:#6b7280;font-size:13.5px;margin:0 0 14px}' +
  '.rp-campo{display:block;margin:0 0 10px}' +
  '.rp-campo span{display:block;font-weight:700;color:'+NAVY+';font-size:13.5px;margin-bottom:4px}' +
  '.rp-campo input{width:100%;box-sizing:border-box;border:2px solid #e4e7ec;border-radius:11px;padding:10px 11px;font:inherit;color:#1c2230}' +
  '.rp-campo input:focus{outline:none;border-color:'+TEAL+'}' +
  '.rp-ok{display:block;width:100%;margin-top:6px;background:linear-gradient(135deg,'+VINHO+','+OURO+');color:#fff;border:none;' +
    'border-radius:13px;padding:13px;font:800 16px inherit;font-family:inherit;cursor:pointer}' +
  '.rp-linha{border:1px solid #e4e7ec;border-radius:12px;padding:10px 12px;margin:0 0 9px;display:flex;gap:10px;align-items:flex-start}' +
  '.rp-linha .rp-d{flex:0 0 auto;background:'+NAVY+';color:#fff;border-radius:9px;padding:4px 7px;font-size:11.5px;font-weight:800;white-space:nowrap}' +
  '.rp-linha .rp-i{flex:1 1 auto;min-width:0}' +
  '.rp-linha .rp-i b{display:block;color:'+NAVY+';font-size:14.5px;line-height:1.3}' +
  '.rp-linha .rp-i em{color:'+OURO+';font-style:normal;font-weight:700;font-size:12.5px}' +
  '.rp-linha .rp-x{flex:0 0 auto;background:none;border:none;color:#b0b7c2;font-size:17px;cursor:pointer;padding:0 2px;font-family:inherit}' +
  '.rp-selo{display:inline-block;background:'+TEAL+';color:#fff;border-radius:999px;padding:3px 9px;font-size:11.5px;font-weight:800;margin-top:7px}' +
  '.rp-fechar{display:block;width:100%;margin-top:8px;background:rgba(15,61,92,.09);color:'+NAVY+';border:none;border-radius:12px;padding:11px;font:800 15px inherit;font-family:inherit;cursor:pointer}' +
  '.rp-vazio{text-align:center;color:#9aa1ad;padding:22px 0;font-size:14.5px}';

  function estilo(){
    if(document.getElementById('rp-css')) return;
    var s = document.createElement('style'); s.id='rp-css'; s.textContent = CSS;
    (document.head||document.documentElement).appendChild(s);
  }

  function folha(html, aoMontar){
    estilo();
    var f = document.createElement('div'); f.className='rp-fundo';
    f.innerHTML = '<div class="rp-folha">'+html+'</div>';
    f.addEventListener('click', function(e){ if(e.target===f) fecha(); });
    function fecha(){ seguro(function(){ f.parentNode.removeChild(f); }); }
    document.body.appendChild(f);
    var cx = f.firstChild;
    cx.querySelectorAll('[data-fecha]').forEach(function(b){ b.addEventListener('click', fecha); });
    if(aoMontar) seguro(function(){ aoMontar(cx, fecha); });
    return { el:cx, fecha:fecha };
  }

  /* ─── painel "O que eu já preguei" ─── */
  function painel(){
    return carregar().then(function(lista){
      var corpo = !lista.length
        ? '<div class="rp-vazio">Ainda não há nada no caderno.<br>Abra uma mensagem e toque em <b>📌 Já preguei esta</b>.</div>'
        : lista.map(function(r){
            return '<div class="rp-linha" data-id="'+r.id+'">'
              + '<div class="rp-d">'+esc(brData(r.data)||'—')+'</div>'
              + '<div class="rp-i"><b>'+esc(r.titulo)+'</b>'
              + (r.ref?'<em>'+esc(r.ref)+'</em>':'')
              + (r.publico?'<span class="rp-ang">para '+esc(r.publico)+'</span>':'')
              + (r.angulo?'<span class="rp-ang">o ângulo: '+esc(r.angulo)+'</span>':'')
              + '</div><button class="rp-x" title="Tirar do caderno">✕</button></div>';
          }).join('');
      var h = '<h3>📜 O que eu já preguei</h3>'
        + '<div class="rp-sub">'+(lista.length? lista.length+' registro'+(lista.length>1?'s':'') : 'caderno vazio')+'</div>'
        + '<div id="rp-lista">'+corpo+'</div>'
        + '<button class="rp-fechar" data-fecha>← Voltar</button>';
      return folha(h, function(cx){
        cx.querySelectorAll('.rp-x').forEach(function(b){
          b.addEventListener('click', function(){
            var li = b.closest('.rp-linha'), id = parseInt(li.getAttribute('data-id'),10);
            b.disabled = true; li.style.opacity = '.4';
            apagar(id).then(function(){ seguro(function(){ li.parentNode.removeChild(li); }); });
          });
        });
      });
    });
  }

  /* ─── folha de registro ─── */
  function folhaRegistrar(peca, feito){
    var h = '<h3>📌 Já preguei esta</h3>'
      + '<div class="rp-sub">'+esc(peca.titulo)+(peca.ref?' · '+esc(peca.ref):'')+'</div>'
      + '<label class="rp-campo"><span>Quando</span><input id="rp-data" type="date" value="'+hoje()+'"></label>'
      + '<label class="rp-campo"><span>Para quem (opcional)</span><input id="rp-pub" type="text" placeholder="culto de domingo, célula, EBD…"></label>'
      + '<label class="rp-campo"><span>O ângulo (opcional)</span><input id="rp-ang" type="text" placeholder="ex.: os anjos sobem primeiro"></label>'
      + '<button class="rp-ok" id="rp-salvar">✅ Guardar no caderno</button>'
      + '<button class="rp-fechar" data-fecha>Cancelar</button>';
    folha(h, function(cx, fecha){
      cx.querySelector('#rp-salvar').addEventListener('click', function(){
        var b = cx.querySelector('#rp-salvar');
        b.disabled = true; b.textContent = 'Guardando…';
        registrar({
          slug: peca.slug, titulo: peca.titulo, ref: peca.ref, livros: peca.chaves,
          tema: peca.tema || '', publico: cx.querySelector('#rp-pub').value,
          angulo: cx.querySelector('#rp-ang').value, data: cx.querySelector('#rp-data').value
        }).then(function(d){
          fecha();
          if(feito) feito(d);
        })['catch'](function(){ b.disabled=false; b.textContent='✅ Guardar no caderno'; });
      });
    });
  }

  /* ═══════════ MODO 1 — PEÇA ABERTA ════════════════════════════════════════ */
  function lerPeca(){
    var p = (location.pathname||'').toLowerCase();
    var arq = (p.split('/').pop()||'');
    // é uma PEÇA quando o endereço aponta pra um arquivo de mensagem/sermão
    var ehPeca = (/\/(mensagens|sermoes)\/[^\/]+\.html$/.test(p) && arq !== 'index.html')
              || /\/publicacao\.html$/.test(p);
    if(!ehPeca) return null;
    if(/\/publicacao\.html$/.test(p)){
      var s = seguro(function(){ return new URLSearchParams(location.search).get('s'); }) || '';
      arq = s ? ('pub:'+s) : '';
      if(!arq) return null;
    }
    var h1 = document.querySelector('h1');
    if(!h1) return null;

    var refEl = document.querySelector('.ref, .cr-ref, .std-ref');
    var ref = refEl ? lim(refEl.textContent) : '';
    if(!ref){                                  // cai pro <title>: "Título — Gênesis 28 · João 1"
      var t = document.title || '';
      var i = t.search(/[—–]/);
      if(i > 0) ref = lim(t.slice(i+1));
    }
    if(ref && !chavesDaRef(ref).length) ref = '';   // "Escavador de Pérolas" não é referência
    var titulo = lim(h1.textContent);
    if(!titulo) return null;
    return {
      slug: arq, titulo: titulo, ref: ref, tema: '',
      chaves: chavesDaRef(ref), palavras: palavrasFortes(titulo)
    };
  }

  function faixaHTML(peca, res, sem){
    var itens = [], alerta = false, tit = '';

    if(res.mesma.length){
      alerta = true; tit = '⚠️ Você já pregou ESTA mensagem';
      res.mesma.forEach(function(x){ itens.push(linhaAviso(x.r, '')); });
    } else if(res.texto.length){
      alerta = true;
      tit = '⚠️ Você já pregou este texto';
      res.texto.forEach(function(x){
        itens.push(linhaAviso(x.r, x.caps.map(bonito).join(', ')));
      });
    } else if(sem && sem.length){
      tit = '💡 Parecido com o que você já pregou';
      sem.forEach(function(x){ itens.push(linhaAviso(x.r, 'assunto parecido')); });
    } else if(res.tema.length){
      tit = '💡 Tema parecido com o que você já pregou';
      res.tema.slice(0,3).forEach(function(x){ itens.push(linhaAviso(x.r, x.pal.slice(0,3).join(', '))); });
    } else if(res.livro.length){
      tit = '📖 Do mesmo livro, outro capítulo';
      res.livro.slice(0,3).forEach(function(x){ itens.push(linhaAviso(x.r, x.livs.map(bonito).join(', '))); });
    } else return null;

    // mesmo texto, título diferente = ângulo diferente. Isso é informação, não trava.
    var nota = '';
    if(res.texto.length && !res.mesma.length){
      nota = '<li style="list-style:none;margin-left:-17px;color:#6b7280;font-size:13.5px">'
           + 'Mesmo texto, <b>mensagem diferente</b> — pode ser de propósito.</li>';
    }
    return '<div class="rp-faixa '+(alerta?'rp-alerta':'rp-nota')+'">'
      + '<span class="rp-t">'+tit+'</span>'
      + '<ul>'+itens.join('')+nota+'</ul>'
      + '<div class="rp-bt">'
      + '<button class="rp-b1" data-rp="ver">👀 Ver o que eu preguei</button>'
      + '<button class="rp-b2" data-rp="seguir">✔️ Seguir mesmo assim</button>'
      + '</div></div>';
  }
  function linhaAviso(r, marca){
    return '<li><b>'+esc(r.titulo)+'</b>'
      + (r.ref?' · '+esc(r.ref):'')
      + ' — <span class="rp-q">'+esc(brData(r.data)||'sem data')+'</span>'
      + (marca?' <span style="color:#6b7280">('+esc(marca)+')</span>':'')
      + (r.publico?'<span class="rp-ang">para '+esc(r.publico)+'</span>':'')
      + (r.angulo?'<span class="rp-ang">o ângulo: '+esc(r.angulo)+'</span>':'')
      + '</li>';
  }

  function ancora(){
    // a faixa entra logo abaixo dos botões Voltar/Início, antes do título
    var b = document.querySelector('.voltar');
    var alvo = b ? (b.parentNode.classList && b.parentNode.classList.contains('rp-faixa') ? null : b.parentNode) : null;
    var box = document.getElementById('rp-faixa-box');
    if(box) return box;
    box = document.createElement('div'); box.id = 'rp-faixa-box';
    if(alvo && alvo.parentNode) alvo.parentNode.insertBefore(box, alvo.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
    return box;
  }

  function modoPeca(peca){
    estilo();
    var box = ancora(), pino = null, semFeito = false;

    function pintar(sem){
      var res = confrontar(peca, REGISTROS||[]);
      var h = faixaHTML(peca, res, sem);
      box.innerHTML = h || '';
      if(h){
        box.querySelector('[data-rp="ver"]').addEventListener('click', function(){ painel(); });
        box.querySelector('[data-rp="seguir"]').addEventListener('click', function(){
          box.innerHTML = '<div class="rp-faixa rp-nota" style="padding:9px 12px">'
            + '<span class="rp-t" style="font-size:14px">✔️ Seguindo mesmo assim — o aviso só informa.</span></div>';
        });
      }
      // O índice de significado só entra quando o texto bíblico NÃO acusou nada —
      // e só depois da página já estar na tela, nunca atrasando a leitura.
      // Respeita "economizar dados" do celular: aí fica só o texto e as palavras.
      if(!sem && !semFeito && !res.mesma.length && !res.texto.length
         && (REGISTROS||[]).length && peca.slug && !poupaDados()){
        semFeito = true;
        setTimeout(function(){
          porSignificado(peca, REGISTROS).then(function(s){ if(s.length) pintar(s); });
        }, 1400);
      }
      atualizarPino();
    }

    function jaFoi(){
      return (REGISTROS||[]).filter(function(r){ return r.slug === peca.slug; })
        .sort(function(a,b){ return (b.data||'') < (a.data||'') ? -1 : 1; })[0];
    }
    function atualizarPino(){
      if(!pino) return;
      var j = jaFoi();
      pino.className = 'rp-pino' + (j ? ' on' : '');
      pino.innerHTML = j ? '<span>✅</span><span>Pregada em '+esc(brData(j.data))+'</span>'
                         : '<span>📌</span><span>Já preguei esta</span>';
    }
    pino = document.createElement('button');
    pino.type = 'button'; pino.className = 'rp-pino';
    pino.innerHTML = '<span>📌</span><span>Já preguei esta</span>';
    pino.addEventListener('click', function(){
      var j = jaFoi();
      if(j) return painel();
      folhaRegistrar(peca, function(){ pintar(); });
    });
    (document.body||document.documentElement).appendChild(pino);

    ouvintes.push(function(){ pintar(); });
    carregar().then(function(){ pintar(); });
    if(REGISTROS) pintar();
  }

  /* ═══════════ MODO 2 — LISTA DE CARTÕES ═══════════════════════════════════ */
  function modoLista(){
    estilo();
    function decorar(){
      var lista = REGISTROS || [];
      document.querySelectorAll('a.card[href]').forEach(function(a){
        var href = a.getAttribute('href')||'';
        var arq = href.split('?')[0].split('/').pop();
        if(/publicacao\.html$/i.test(arq)){                 // mensagem forjada no Concílio
          var m = /[?&]s=([^&]+)/.exec(href);
          arq = m ? ('pub:'+decodeURIComponent(m[1])) : '';
        }
        if(!arq) return;
        var velho = a.querySelector('.rp-selo');
        var j = lista.filter(function(r){ return r.slug === arq; })
                     .sort(function(x,y){ return (y.data||'') < (x.data||'') ? -1 : 1; })[0];
        if(!j){ if(velho) velho.parentNode.removeChild(velho); return; }
        var txt = '✅ preguei em '+brData(j.data);
        if(velho){ velho.textContent = txt; return; }
        var s = document.createElement('div'); s.className='rp-selo'; s.textContent = txt;
        a.appendChild(s);
      });
    }
    ouvintes.push(decorar);
    carregar().then(decorar);
    // a lista é pintada por JS da própria página; redecora quando ela mudar
    seguro(function(){
      var alvo = document.getElementById('lista') || document.body;
      if(!window.MutationObserver) return;
      var mo = new MutationObserver(function(){ decorar(); });
      mo.observe(alvo, { childList:true, subtree:true });
    });
    // atalho pro caderno, no cabeçalho
    seguro(function(){
      var b = document.querySelector('.voltar');
      if(!b || document.getElementById('rp-atalho')) return;
      var a = document.createElement('button');
      a.id='rp-atalho'; a.className = b.className; a.type='button';
      a.style.cssText = 'margin:0;background:'+OURO;
      a.textContent = '📜 Já preguei';
      a.addEventListener('click', function(){ painel(); });
      b.parentNode.style.flexWrap = 'wrap';    // 375px: se não couber, desce de linha
      b.parentNode.appendChild(a);
    });
  }

  /* ═══════════ MODO 3 — GERADOR (ele digita o tema) ════════════════════════ */
  function modoGerador(campo){
    estilo();
    var box = document.createElement('div'); box.id = 'rp-gerador';
    campo.parentNode.insertBefore(box, campo.nextSibling);
    var timer = null;

    function olhar(){
      var txt = lim(campo.value, 300);
      if(txt.length < 3){ box.innerHTML=''; return; }
      var peca = { slug:'', titulo:txt, ref:txt, tema:txt,
                   chaves: chavesDaRef(txt), palavras: palavrasFortes(txt) };
      var res = confrontar(peca, REGISTROS||[]);
      res.mesma = [];                              // no gerador não existe "a mesma peça"
      var h = faixaHTML(peca, res, null);
      box.innerHTML = h ? '<div style="margin-top:10px">'+h+'</div>' : '';
      if(h){
        box.querySelector('[data-rp="ver"]').addEventListener('click', function(){ painel(); });
        box.querySelector('[data-rp="seguir"]').addEventListener('click', function(){ box.innerHTML=''; });
      }
    }
    campo.addEventListener('input', function(){ clearTimeout(timer); timer = setTimeout(olhar, 600); });
    ouvintes.push(function(){ if(campo.value) olhar(); });
    carregar();
  }

  /* ═══════════ LIGAÇÃO ═════════════════════════════════════════════════════ */
  function ligar(){
    var peca = lerPeca();
    if(peca) modoPeca(peca);
    else if(/\/publicacao\.html$/i.test(location.pathname||'')){
      // essa página nasce vazia e se pinta com o que vem do banco — espera o título
      var tentativas = 0;
      var t = setInterval(function(){
        var p = lerPeca();
        if(p){ clearInterval(t); modoPeca(p); }
        else if(++tentativas > 12) clearInterval(t);
      }, 500);
    }
    if(document.querySelectorAll('a.card[href]').length >= 2) modoLista();
    else if(document.getElementById('lista')) modoLista();   // lista pintada por JS
    var campo = document.getElementById('cr-tema') || document.getElementById('ed-tema');
    if(campo) modoGerador(campo);
  }

  window.RadarPregado = {
    versao: 1,
    quemSou: quemSou,
    chavesDaRef: chavesDaRef,
    palavrasFortes: palavrasFortes,
    lista: function(f){ return carregar(f); },
    registrar: registrar,
    apagar: apagar,
    painel: painel,
    peca: lerPeca,
    checar: function(texto){
      var p = { slug:'', titulo:texto, ref:texto, chaves:chavesDaRef(texto), palavras:palavrasFortes(texto) };
      return carregar().then(function(l){ return confrontar(p, l); });
    },
    porSignificado: function(){ var p = lerPeca(); return p ? porSignificado(p, REGISTROS||[]) : Promise.resolve([]); }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ seguro(ligar); }, false);
  } else { seguro(ligar); }
})();
