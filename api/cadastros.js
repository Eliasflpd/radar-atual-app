// Cadastros do RADAR — salva na nuvem (Supabase pessoal) e lista pro admin (Elias).
const { Client } = require('pg');
// A CHAVE DO APARELHO. É AQUI que ela nasce pra quem tem WhatsApp — e é de
// propósito: este POST já manda uma mensagem no WhatsApp DA PRÓPRIA PESSOA.
// Então quem tentar pegar um crachá com o número dos outros acende uma luz no
// celular do dono na mesma hora. Ver o cabeçalho de api/_lib/chave.js.
const CHAVE = require('./_lib/chave.js');
const crypto = require('crypto');

// ── A CONFIRMAÇÃO POR WHATSAPP (24/09/2026, pedido do Elias) ─────────────────
// "QUEM CADASTRAR PRECISA RECEBER UM CÓDIGO CONFIRMANDO."
// É a tampa do pior buraco da auditoria (AUDITORIA-2026-09-23.md, nº 1): até
// ontem este POST entregava um crachá válido pra QUALQUER número — provei ao
// vivo. Com um número roubado, o sujeito lia o caderno de pregações, o plano de
// leitura e a memória do globo do pastor.
// Agora o crachá só nasce com PROVA de que quem cadastra controla aquele
// WhatsApp: o código de 6 dígitos que o /api/send-otp mandou pra ele. Quem
// digita o número de outro nunca recebe o código — ele foi pro celular do dono.
//
// O token vem do send-otp assim:  base64(payload) + '.' + hmac(payload, OTP_SECRET)
// e payload = { phone, code, exp }. Conferimos aqui a MESMA assinatura, e que o
// código é DESTE número, não de outro. Sem OTP_SECRET forte na Vercel isto NÃO
// passa — nada de cair num segredo escrito no código.
function confereCodigo(token, code, whatsapp) {
  try {
    const secret = process.env.OTP_SECRET;
    if (!secret || !token || !code) return false;
    const i = String(token).indexOf('.');
    if (i < 0) return false;
    const payloadB64 = String(token).slice(0, i);
    const assinaturaVinda = String(token).slice(i + 1);
    const esperada = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
    // comparação de tempo constante — não entrega o segredo pela demora
    const a = Buffer.from(assinaturaVinda), b = Buffer.from(esperada);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    if (Date.now() > payload.exp) return false;
    if (String(code).trim() !== String(payload.code)) return false;
    // ⚠️ o código foi emitido PRA ESTE número — sem esta linha, um código
    // legítimo do próprio atacante liberaria o crachá do número da vítima.
    if (String(payload.phone).replace(/\D/g, '') !== String(whatsapp).replace(/\D/g, '')) return false;
    return true;
  } catch (_) { return false; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const cs = process.env.RADAR_DB;
  if (!cs) { res.status(500).json({ error: 'db não configurado' }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    if (req.method === 'POST') {
      let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      const nome = (b && b.nome || '').trim();
      const cargo = (b && b.cargo || '').trim();
      const whatsapp = (b && b.whatsapp || '').replace(/\D/g, '');
      if (!nome) { res.status(400).json({ error: 'sem nome' }); return; }
      let jaExistia = false;
      if (whatsapp) {
        // 1 cadastro por WhatsApp — se já existe, ATUALIZA nome/cargo mas PRESERVA trial_inicio/liberado_ate
        const ex = await c.query('select id from radar_cadastros where regexp_replace(coalesce(whatsapp,\'\'),\'\\D\',\'\',\'g\') = $1 limit 1', [whatsapp]);
        jaExistia = !!ex.rows[0];
        if (ex.rows[0]) await c.query('update radar_cadastros set nome=$1, cargo=$2 where id=$3', [nome, cargo, ex.rows[0].id]);
        else await c.query('insert into radar_cadastros(nome,cargo,whatsapp) values($1,$2,$3)', [nome, cargo, whatsapp]);
      } else {
        await c.query('insert into radar_cadastros(nome,cargo,whatsapp) values($1,$2,$3)', [nome, cargo, whatsapp]);
      }

      // ── O CRACHÁ DO APARELHO ────────────────────────────────────────────
      // Nasce aqui e desce UMA vez, nesta resposta. Nunca mais sai do banco em
      // texto — lá só fica o SHA-256. Por isso o "Já cadastrado?" (o GET com
      // ?phone=) não devolve crachá nenhum: se devolvesse, quem rouba a conta
      // pelo telefone roubaria a chave junto e a trava não valeria nada.
      // Se isto falhar, o cadastro segue em frente sem crachá: a pessoa cai no
      // período de tolerância e o app continua inteiro. Cadastro que não
      // termina é pior que conta destrancada.
      // O aparelho manda o crachá que ele JÁ TEM, quando tem. Se for válido e
      // for desta mesma pessoa, NÃO se emite outro e NÃO se avisa nada: é o
      // mesmo celular de sempre re-mandando o cadastro (o app faz isso sozinho
      // em várias situações). Sem esta conferência, cada re-envio gastava uma
      // vaga de aparelho e acendia o alarme de invasão sem ninguém ter invadido.
      let chaveNova = '', eraNovo = true, mesmoAparelho = false, precisaCodigo = false;
      if (whatsapp) {
        try {
          await CHAVE.tabela(c);
          const dono = CHAVE.chaveDe(whatsapp);
          const jaTinha = await c.query(
            'select count(*)::int as n from radar_chaves where user_key=$1', [dono]);
          eraNovo = !((jaTinha.rows[0] && jaTinha.rows[0].n) > 0);

          const trazido = CHAVE.daRequisicao(req, b);
          if (trazido) {
            const conf = await CHAVE.conferir(c, dono, trazido);
            mesmoAparelho = !!(conf && conf.ok && conf.dono);
          }
          // ⚠️ A RESERVA DE TERRENO — brecha vista na produção em 23/09/2026.
          // Número que ainda NÃO está no cadastro é adotado por quem chegar
          // primeiro (é o que mantém vivo o caderno de quem nunca se cadastrou).
          // Só que dava pra abusar disso: bastava alguém pedir de véspera o
          // caderno de um monte de números e ficar com o crachá de cada um.
          // Quando o pastor de verdade se cadastrasse depois, o crachá reservado
          // continuava valendo — e o sujeito lia tudo o que ele fosse guardar.
          // Por isso: cadastro NASCENDO agora zera todo crachá que existia antes
          // dele. Nenhum aparelho honesto perde nada — antes do cadastro o app
          // guarda o caderno debaixo de um id de aparelho, não do telefone — e
          // este mesmo POST já devolve o crachá novo, na linha de baixo.
          if (!jaExistia) {
            try { await c.query('delete from radar_chaves where user_key=$1', [dono]); } catch (_) {}
          }
          // ⚠️ A TRAVA: crachá só nasce pra APARELHO CONHECIDO (que já provou ser
          // desta conta) OU pra quem trouxe o código de confirmação DESTE número.
          // Sem uma das duas coisas, nenhum crachá sai — e o app avisa que
          // precisa do código (precisa_codigo abaixo). É isto que fecha o buraco.
          const codigoOk = confereCodigo(b && b.otp_token, b && b.otp_code, whatsapp);
          if (!mesmoAparelho && codigoOk) {
            const e = await CHAVE.emitir(c, whatsapp, cargo || 'aparelho');
            if (e && e.ok) chaveNova = e.chave;
          } else if (!mesmoAparelho) {
            precisaCodigo = true;
          }
        } catch (_) { chaveNova = ''; }
      }

      // Confirmação no WhatsApp da própria pessoa (evita gente mentirosa) — via Fonnte, sem bloquear o cadastro se falhar
      //
      // ⚠️ O SILÊNCIO DA AUTO-CURA — a linha que evita um desastre:
      // quando a trava entrar no ar, TODO mundo que já usa o app vai refazer o
      // cadastro sozinho pra ganhar crachá. Sem este `calado`, isso dispararia
      // a mensagem de boas-vindas pra BASE INTEIRA de uma vez — centenas de
      // WhatsApp iguais, no mesmo minuto, pra gente que não pediu nada.
      // Cadastro que JÁ EXISTIA e ainda não tinha crachá nenhum = é a auto-cura
      // passando, e ela passa CALADA. A mensagem sai só quando é gente nova
      // (boas-vindas) ou quando um aparelho NOVO entra numa conta que já tinha
      // dono (o aviso que protege o pastor).
      // ...e o mesmo silêncio vale pro celular que só re-mandou o cadastro com o
      // crachá dele no bolso: nada nasceu, nada mudou, ninguém precisa saber.
      const calado = (jaExistia && eraNovo) || mesmoAparelho;
      let avisado = false;
      const FT = process.env.FONNTE_TOKEN;
      if (FT && whatsapp && !calado) {
        let alvo = String(whatsapp || '').replace(/\D/g, '');
        // 10 ou 11 digitos = Brasil sem o codigo do pais -> completa com 55.
        // 12 ou mais = ja veio com codigo de pais (55 ou de fora) -> NAO mexe,
        // senao numero de Angola (244...) virava 55244... e a mensagem nunca chega.
        const ehBrasilCurto = (alvo.length === 10 || alvo.length === 11);
        if (ehBrasilCurto) alvo = '55' + alvo;
        const primeiroNome = nome.split(/\s+/)[0];
        // QUANDO JÁ HAVIA APARELHO NA CONTA, a mensagem muda: não é "bem-vindo",
        // é AVISO. Esta linha é a rede de segurança da trava — se alguém tentar
        // entrar na conta do pastor com o número dele, o celular DELE apita.
        const msg = (!eraNovo && chaveNova)
          ? ('Ola ' + primeiroNome + '! 🔔 Um *novo aparelho* acabou de entrar na sua conta do *RADAR*.'
             + '\n\nSe foi voce, esta tudo certo — pode ignorar.'
             + '\nSe NAO foi voce, responda esta mensagem que a gente tira o acesso dele.')
          : ('Ola ' + primeiroNome + '! ✅ Seu cadastro no *RADAR* foi feito com sucesso.'
             + (cargo ? ('\nCargo: ' + cargo) : '')
             + '\n\nAcesse o app aqui:\nhttps://radar-atual.vercel.app\n\n_Avisos e agenda da igreja na palma da mao._ 🙏');
        try {
          const fr = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': FT, 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ target: alvo, message: msg },
              alvo.startsWith('55') ? { countryCode: '55' } : {}))
          });
          const fj = await fr.json().catch(() => ({}));
          avisado = !!(fj && (fj.status === true || fj.status === 'true'));
        } catch (e) { avisado = false; }
      }
      // `chave` sai daqui UMA vez na vida deste aparelho. O app guarda em
      // localStorage 'radar_chave' e manda no cabeçalho x-radar-chave depois.
      res.json({ ok: true, avisado, chave: chaveNova || undefined,
                 precisa_codigo: precisaCodigo || undefined });
    } else {
      const phone = ((req.query && req.query.phone) || '').replace(/\D/g, '');
      if (phone) { // "Já cadastrado?" — restaura pelo WhatsApp
        const r = await c.query('select nome,cargo,whatsapp from radar_cadastros where regexp_replace(coalesce(whatsapp,\'\'),\'\\D\',\'\',\'g\') = $1 limit 1', [phone]);
        res.json({ cadastro: r.rows[0] || null });
        return;
      }
      const token = (req.query && req.query.token) || '';
      if (token !== process.env.RADAR_ADMIN_TOKEN) { res.status(401).json({ error: 'não autorizado' }); return; }
      const del = ((req.query && req.query.del) || '').replace(/\D/g, ''); // admin apaga um cadastro pelo WhatsApp
      if (del) {
        const rd = await c.query('delete from radar_cadastros where regexp_replace(coalesce(whatsapp,\'\'),\'\\D\',\'\',\'g\') = $1', [del]);
        res.json({ ok: true, apagados: rd.rowCount });
        return;
      }
      const r = await c.query('select nome,cargo,whatsapp,criado_em from radar_cadastros order by criado_em desc');
      res.json({ total: r.rows.length, cadastros: r.rows });
    }
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  } finally {
    try { await c.end(); } catch (_) {}
  }
};
