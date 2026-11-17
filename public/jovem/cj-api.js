/* CONEXÃO JOVEM — camada de API (Módulo 1 · 17/11/2026)
   Fala com POST /api/dados?fn=jovem usando o MESMO crachá do Radar Atual
   (localStorage 'radar_chave', mesma origem), sempre no cabeçalho x-radar-chave — nunca na URL.

   MODO AUTOMÁTICO (nada pode quebrar):
     · 'real'       → a função respondeu e a pessoa tem crachá válido: telas do módulo usam o banco.
     · 'sem_cracha' → a função está no ar, mas este aparelho não tem crachá do Radar (ou o número
                      não foi confirmado): o app segue na demonstração e orienta a fazer o cadastro em /?radar.
     · 'demo'       → função não configurada, fora do ar, sem internet, erro, ou ?demo na URL:
                      o app segue exatamente como na Fase 1, com o selo "Demonstração".
   Este arquivo não guarda nada no aparelho e não lê nenhum outro dado do Radar além do crachá
   e do nome de exibição (radar_user.nome), usado só para sugerir o nome na entrada. */
(function () {
  'use strict';
  var URL_API = '/api/dados?fn=jovem';
  var TEMPO = 9000;

  function cracha() {
    try { var k = String(localStorage.getItem('radar_chave') || '').trim(); return /^rk_[A-Za-z0-9_-]{20,120}$/.test(k) ? k : ''; } catch (e) { return ''; }
  }
  function usuarioRadar() {
    try { var u = JSON.parse(localStorage.getItem('radar_user') || 'null'); return u && typeof u === 'object' ? { nome: String(u.nome || ''), confirmado: u.confirmado !== false } : null; } catch (e) { return null; }
  }

  // Sempre resolve (nunca rejeita): { ok, status, dados, motivo, mensagem, ...resto do JSON }.
  function chamar(acao, dados) {
    var corpo = {}, k = cracha(), h = { 'Content-Type': 'application/json' };
    if (dados && typeof dados === 'object') for (var x in dados) if (Object.prototype.hasOwnProperty.call(dados, x)) corpo[x] = dados[x];
    corpo.acao = acao;
    if (k) h['x-radar-chave'] = k;
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var relogio = ctl ? setTimeout(function () { ctl.abort(); }, TEMPO) : null;
    return fetch(URL_API, { method: 'POST', headers: h, body: JSON.stringify(corpo), credentials: 'same-origin', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null;
          try { j = JSON.parse(t); } catch (e) { j = null; }
          if (!j || typeof j !== 'object') return { ok: false, status: r.status, motivo: 'offline' };
          j.status = r.status;
          if (typeof j.ok !== 'boolean') j.ok = r.ok;
          return j;
        });
      })
      .catch(function () { return { ok: false, status: 0, motivo: 'offline' }; })
      .then(function (r) { if (relogio) clearTimeout(relogio); return r; });
  }

  var estado = { modo: 'verificando', motivo: '', eu: null, vinculou: false };

  // Descobre o modo. Sempre resolve com o objeto `estado`.
  function iniciar() {
    estado.modo = 'verificando'; estado.motivo = ''; estado.vinculou = false;
    var forcado = /(?:^|[?&])demo(?:=|&|$)/.test(location.search.slice(1));
    if (forcado || location.protocol === 'file:' || typeof fetch !== 'function') return Promise.resolve(fim('demo', forcado ? 'forcado' : 'offline'));
    var k = cracha();
    // Sem crachá: pergunta só se a função está configurada (ação 'status' não exige crachá).
    return chamar(k ? 'eu' : 'status').then(function (r) {
      if (r.motivo === 'nao_configurado') return fim('demo', 'nao_configurado');
      if (r.motivo === 'offline' || r.status === 404 || r.status === 405 || r.status >= 500) return fim('demo', r.motivo === 'offline' ? 'offline' : 'erro');
      if (!k) return fim(r.ok ? 'sem_cracha' : 'demo', r.ok ? 'cracha_ausente' : 'erro');
      if (r.status === 401) return fim('sem_cracha', r.motivo || 'cracha_invalido');
      if (r.ok && r.dados) { estado.eu = r.dados.perfil || null; estado.vinculou = !!r.dados.acabou_de_vincular; return fim('real', ''); }
      return fim('demo', 'erro');
    });
  }
  function fim(modo, motivo) { estado.modo = modo; estado.motivo = motivo; if (modo !== 'real') estado.eu = null; return estado; }

  // Atualiza "quem sou eu" (depois de entrar, aceitar termos, editar perfil...).
  function atualizarEu() {
    return chamar('eu').then(function (r) {
      if (r.ok && r.dados) { estado.eu = r.dados.perfil || null; if (r.dados.acabou_de_vincular) estado.vinculou = true; }
      return r;
    });
  }

  window.CJAPI = { chamar: chamar, iniciar: iniciar, atualizarEu: atualizarEu, cracha: cracha, usuarioRadar: usuarioRadar, estado: estado };
})();
