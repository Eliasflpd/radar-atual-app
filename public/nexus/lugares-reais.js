// LUGARES DE JESUS EM IMAGEM REAL: a foto de hoje (Wikimedia Commons, licença livre) e a reconstituição do ano 30
// (imagem do ChatGPT, com base nos evangelhos e na arqueologia), lado a lado, com um controle que desliza entre as duas.
// Quando houver a chave do Google (GOOGLE_MAPS_KEY), a vista 360° real do Street View entra como terceira aba.

export const LUGARES = {
  getsemani: {
    titulo: 'Getsêmani', atlas: 'Gethsemane', sub: 'MONTE DAS OLIVEIRAS · JERUSALÉM',
    refs: [['Marcos 14:32', 'E foram a um lugar chamado Getsêmani, e disse aos seus discípulos: Assentai-vos aqui, enquanto eu oro.'], ['João 18:1', 'Tendo Jesus dito isto, saiu com os seus discípulos para além do ribeiro de Cedrom, onde havia um horto.'], ['Lucas 22:39', 'E, saindo, foi, como costumava, para o Monte das Oliveiras.']],
    nota: 'O nome vem do aramaico gat-shemanim, "prensa de azeite". A localização ao pé do Monte das Oliveiras, do outro lado do Cedrom, é antiga e bem aceita; o ponto exato do jardim é tradição (a Basílica da Agonia, de 1924, está sobre restos de igrejas dos séculos IV e XII).',
    status: 'Local tradicional, área bem aceita',
    hoje: { src: '/nexus/lugares/getsemani-hoje.jpg', credito: 'Oliveiras antigas do Jardim do Getsêmani · foto de Beko · CC BY-SA 4.0 · Wikimedia Commons' },
    antes: { src: '/nexus/lugares/getsemani-30dC.jpg', credito: 'Reconstituição do ano 30 (imagem gerada pelo ChatGPT a pedido do NEXUS; ilustrativa)' },
  },
  golgota: {
    titulo: 'Gólgota', atlas: 'Golgotha', sub: 'LUGAR DA CAVEIRA · JERUSALÉM',
    refs: [['Mateus 27:33', 'E, chegando ao lugar chamado Gólgota, que se diz: Lugar da Caveira.'], ['João 19:20', 'E muitos dos judeus leram este título, porque o lugar onde Jesus estava crucificado era próximo da cidade.'], ['João 19:41', 'E havia um horto naquele lugar onde fora crucificado, e no horto um sepulcro novo, em que ainda ninguém havia sido posto.'], ['Hebreus 13:12', 'E por isso também Jesus, para santificar o povo pelo seu próprio sangue, padeceu fora da porta.']],
    nota: 'Local tradicional: a Igreja do Santo Sepulcro, identificada no século IV (tempo de Constantino). A arqueologia mostrou que ali havia uma antiga pedreira com túmulos escavados na rocha, fora da muralha do tempo de Jesus. Alternativa: o Túmulo do Jardim, proposto no século XIX; seu túmulo, porém, é da Idade do Ferro (séc. VIII–VII a.C.), não um "sepulcro novo".',
    status: 'Local tradicional (Santo Sepulcro); alternativa: Túmulo do Jardim',
    hoje: { src: '/nexus/lugares/golgota-hoje.jpg', credito: 'Edícula do Santo Sepulcro, que guarda o túmulo · foto de Gary Todd · CC0 (domínio público) · Wikimedia Commons' },
    antes: { src: '/nexus/lugares/golgota-30dC.jpg', credito: 'Reconstituição do ano 30 segundo a hipótese do Santo Sepulcro (imagem gerada pelo ChatGPT; ilustrativa)' },
  },
  lazaro: {
    titulo: 'Túmulo de Lázaro', atlas: 'Bethany 1', sub: 'BETÂNIA (AL-EIZARIYA) · MONTE DAS OLIVEIRAS',
    refs: [['João 11:1', 'Estava enfermo um certo Lázaro, de Betânia, aldeia de Maria e de sua irmã Marta.'], ['João 11:18', 'Ora, Betânia distava de Jerusalém quase quinze estádios.'], ['João 11:38', 'Jesus, pois, movendo-se outra vez muito em si mesmo, foi ao sepulcro; e era uma caverna, e tinha uma pedra posta sobre ela.'], ['João 11:43–44', 'Clamou com grande voz: Lázaro, sai para fora. E o defunto saiu.']],
    nota: 'Betânia fica a cerca de 3 km de Jerusalém (15 estádios, Jo 11:18), na encosta leste do Monte das Oliveiras; hoje é a vila de al-Eizariya ("lugar de Lázaro"). O túmulo venerado ali é citado por peregrinos desde o século IV (Eusébio; a peregrina de Bordeaux, 333 d.C.); que seja o túmulo exato é tradição.',
    status: 'Local tradicional (desde o século IV)',
    hoje: { src: '/nexus/lugares/lazaro-hoje.jpg', credito: 'Túmulo de Lázaro, Betânia · foto de Thomasccnawiki · CC BY-SA 4.0 · Wikimedia Commons' },
    antes: { src: '/nexus/lugares/lazaro-30dC.jpg', credito: 'Reconstituição do ano 30 (imagem gerada pelo ChatGPT; ilustrativa)' },
  },
  nazare: {
    titulo: 'Nazaré', atlas: 'Nazareth', sub: 'BAIXA GALILEIA · ONDE JESUS FOI CRIADO',
    refs: [['Lucas 4:16', 'E, chegando a Nazaré, onde fora criado, entrou num dia de sábado, segundo o seu costume, na sinagoga, e levantou-se para ler.'], ['Lucas 4:29', 'E, levantando-se, o expulsaram da cidade, e o levaram até ao cume do monte em que a cidade deles estava edificada, para dali o precipitarem.'], ['João 1:46', 'Disse-lhe Natanael: Pode vir alguma coisa boa de Nazaré? Disse-lhe Filipe: Vem, e vê.']],
    nota: 'No século I, Nazaré era uma aldeia agrícola pequena (estimativas de algumas centenas de habitantes). As escavações sob a Basílica da Anunciação e no Convento das Irmãs de Nazaré mostram casas simples, cisternas, silos e túmulos escavados na rocha; uma casa do século I foi achada em 2009 perto da basílica.',
    status: 'Local seguro (a cidade); as casas exatas são tradição',
    hoje: { src: '/nexus/lugares/nazare-hoje.jpg', credito: 'Vista de Nazaré a partir do bairro El Kishleh · foto de Tiamat · CC BY-SA 3.0 · Wikimedia Commons' },
    antes: { nota: 8.4, src: '/nexus/lugares/nazare-30dC.jpg', credito: 'Reconstituição do ano 30 (imagem gerada pelo ChatGPT a pedido do NEXUS; ilustrativa)' },
  },
  cafarnaum: {
    titulo: 'Cafarnaum', atlas: 'Capernaum', sub: 'MAR DA GALILEIA · A CIDADE DE JESUS',
    refs: [['Mateus 4:13', 'E, deixando Nazaré, foi habitar em Cafarnaum, cidade marítima, nos confins de Zebulom e Naftali.'], ['Marcos 1:21', 'Entraram em Cafarnaum e, logo no sábado, indo ele à sinagoga, ali ensinava.'], ['Marcos 2:1', 'E alguns dias depois entrou outra vez em Cafarnaum, e soube-se que estava em casa.']],
    nota: 'Escavada desde 1905. A sinagoga de calcário branco que se vê hoje é dos séculos IV–V; sob ela há alicerces de basalto mais antigos, que muitos arqueólogos associam à sinagoga do século I. Perto dali, a "casa de Pedro" mostra uma casa do século I transformada em lugar de culto já no século I–II, depois igreja octogonal no século V. As ruínas de basalto (prensas, mós) mostram a vida da cidade.',
    status: 'Local seguro; a casa de Pedro é identificação provável',
    hoje: { src: '/nexus/lugares/cafarnaum-hoje.jpg', credito: 'Ruínas de Cafarnaum: prensa de azeite e mós de basalto · foto de Berthold Werner · domínio público · Wikimedia Commons' },
    antes: { nota: 8.2, src: '/nexus/lugares/cafarnaum-30dC.jpg', credito: 'Reconstituição do ano 30 (imagem gerada pelo ChatGPT; ilustrativa)' },
  },
  magdala: {
    titulo: 'Magdala', atlas: 'Magadan', sub: 'MARGEM OESTE DO LAGO · TERRA DE MARIA MADALENA',
    refs: [['Lucas 8:2', 'E algumas mulheres que haviam sido curadas de espíritos malignos e de enfermidades: Maria, chamada Madalena, da qual saíram sete demônios.'], ['Mateus 15:39', 'E, tendo despedido a multidão, entrou no barco, e dirigiu-se ao território de Magdala.'], ['Mateus 4:23', 'E percorria Jesus toda a Galileia, ensinando nas suas sinagogas.']],
    nota: 'Em 2009 foi escavada aqui uma sinagoga do século I, usada antes do ano 70: bancos de pedra ao redor, colunas, mosaicos e a "pedra de Magdala", com a mais antiga menorá esculpida conhecida fora de Jerusalém. É uma das sinagogas onde Jesus pode ter ensinado (Mt 4:23). Mateus 15:39 diz "Magadã" em vários manuscritos; a identificação com Magdala é provável.',
    status: 'Sinagoga do século I escavada (evidência arqueológica direta)',
    hoje: { src: '/nexus/lugares/magdala-hoje.jpg', credito: 'Sinagoga de Magdala (século I) · foto de Bahnfrend · CC BY-SA 4.0 · Wikimedia Commons' },
    antes: { nota: 7.5, revisao: 'a pedra de Magdala e o salão aparecem maiores que os escavados (cerca de 60 × 50 cm e 120 m²)', src: '/nexus/lugares/magdala-30dC.jpg', credito: 'Reconstituição do ano 30 (imagem gerada pelo ChatGPT; ilustrativa)' },
  },
  mar: {
    titulo: 'Mar da Galileia', atlas: 'Sea of Galilee', sub: 'LAGO DE GENEZARÉ · TIBERÍADES',
    refs: [['Marcos 4:39', 'E ele, despertando, repreendeu o vento, e disse ao mar: Cala-te, aquieta-te. E o vento se aquietou, e houve grande bonança.'], ['Mateus 14:25', 'Mas, à quarta vigília da noite, dirigiu-se Jesus para eles, andando por cima do mar.'], ['João 21:6', 'E ele lhes disse: Lançai a rede para a banda direita do barco, e achareis. Lançaram-na, pois, e já não a podiam tirar, pela multidão dos peixes.']],
    nota: 'Lago de água doce de cerca de 21 × 13 km, a uns 210 m abaixo do nível do mar; ventos fortes descem de repente das colinas (Mc 4:37). Em 1986, na seca, foi achado perto de Magdala o "barco da Galileia": 8,2 m, de cedro e carvalho, datado entre o século I a.C. e o I d.C., o tipo de barco usado pelos pescadores do tempo de Jesus.',
    status: 'Local seguro',
    hoje: { src: '/nexus/lugares/mar-galileia-hoje.jpg', credito: 'Mar da Galileia visto do monte Arbel · foto de Jesse Davis · CC BY 2.0 · Wikimedia Commons' },
    antes: { nota: 7.8, revisao: 'o barco não reproduz com precisão o casco do barco da Galileia de 1986', src: '/nexus/lugares/mar-galileia-30dC.jpg', credito: 'Reconstituição do ano 30: barco de pesca do século I (imagem gerada pelo ChatGPT; ilustrativa)' },
  },
};

export function abrirLugar(id, host, { aoFechar } = {}) {
  const L = LUGARES[id]; if (!L) return null;
  const raiz = document.createElement('div'); raiz.className = 'lr-raiz';
  raiz.innerHTML = `<style>
    .lr-raiz{pointer-events:auto;position:absolute;inset:0;z-index:30;background:#05080f;overflow:hidden;font:13px Inter,system-ui,sans-serif;color:#fff;opacity:0;transition:opacity 1s ease}
    .lr-raiz.on{opacity:1}
    .lr-palco{position:absolute;inset:0;overflow:hidden;cursor:grab;touch-action:none}.lr-palco:active{cursor:grabbing}
    .lr-cam{position:absolute;inset:0;will-change:transform;transform-origin:0 0}
    .lr-cam img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;user-select:none;-webkit-user-drag:none}
    .lr-antes{clip-path:inset(0 0 0 var(--corte,100%));transition:clip-path .05s linear}
    .lr-raiz.so-antes .lr-antes{clip-path:inset(0 0 0 0)}.lr-raiz.so-hoje .lr-antes{clip-path:inset(0 0 0 100%)}
    .lr-vinheta{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 55%,transparent 55%,rgba(0,0,0,.55) 100%),linear-gradient(180deg,rgba(0,0,0,.55),transparent 22%,transparent 72%,rgba(0,0,0,.7))}
    .lr-linha{position:absolute;top:0;bottom:0;width:2px;background:#F3D38E;box-shadow:0 0 12px rgba(243,211,142,.8);left:var(--corte,100%);pointer-events:none}
    .lr-alca{position:absolute;top:50%;transform:translate(-50%,-50%);left:var(--corte,100%);width:44px;height:44px;border-radius:50%;background:#C9A24E;color:#1B1405;display:grid;place-items:center;font:800 16px Inter,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.5);cursor:ew-resize;pointer-events:auto}
    .lr-raiz.so-antes .lr-linha,.lr-raiz.so-antes .lr-alca,.lr-raiz.so-hoje .lr-linha,.lr-raiz.so-hoje .lr-alca{display:none}
    .lr-cab{position:absolute;left:24px;top:18px;pointer-events:none}
    .lr-cab h2{margin:0;font:600 40px/1 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 16px rgba(0,0,0,.7)}
    .lr-cab p{margin:6px 0 0;font-size:12.5px;letter-spacing:.12em;color:rgba(255,255,255,.88)}
    .lr-cab .st{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;background:rgba(201,162,78,.25);border:1px solid rgba(243,211,142,.5);font:600 11.5px Inter,sans-serif;letter-spacing:0;color:#FFE8B0}
    .lr-rot{position:absolute;top:120px;padding:4px 10px;border-radius:6px;background:rgba(0,0,0,.55);font:700 11.5px Inter,sans-serif;letter-spacing:.12em;pointer-events:none}
    .lr-rot.h{left:24px;top:232px}.lr-rot.a{right:24px;color:#FFE3A3}
    .lr-barra{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:4px;padding:5px;background:rgba(10,18,36,.75);backdrop-filter:blur(10px);border:1px solid rgba(233,200,120,.3);border-radius:999px}
    .lr-barra button{border:0;background:transparent;color:#EDE3C8;border-radius:999px;padding:8px 14px;font:600 12.5px Inter,sans-serif;cursor:pointer;white-space:nowrap}
    .lr-barra button.ativo{background:#C9A24E;color:#1B1405}.lr-barra button:hover:not(.ativo){background:rgba(233,200,120,.16)}
    .lr-sair{position:absolute;right:20px;top:18px;border:1px solid rgba(255,255,255,.5);background:rgba(10,18,36,.55);backdrop-filter:blur(8px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .lr-texto{position:absolute;right:20px;bottom:80px;width:min(400px,calc(100% - 40px));max-height:calc(100% - 220px);overflow:auto;background:rgba(252,248,238,.95);color:#1E2A44;border-radius:14px;padding:14px 16px;box-shadow:0 18px 40px rgba(0,0,0,.45);transition:transform .4s ease,opacity .4s ease}
    .lr-texto.fechado{transform:translateX(30px);opacity:0;pointer-events:none}
    .lr-texto blockquote{margin:0 0 10px;font:16px/1.5 "Cormorant Garamond",Georgia,serif}.lr-texto cite{display:block;font:700 11px Inter,sans-serif;color:#8A6420;letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
    .lr-texto .nota{font:12.5px/1.55 Inter,sans-serif;color:#3a3a3a;border-top:1px solid rgba(201,162,78,.35);padding-top:10px;margin-top:4px}
    .lr-cred{position:absolute;left:24px;bottom:24px;max-width:38%;font-size:10.5px;color:rgba(255,255,255,.7);text-shadow:0 1px 4px #000}
    .lr-falta{position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.75);font:15px Inter,sans-serif;text-align:center;padding:30px}
    @media (max-width:900px){.lr-cab h2{font-size:30px}.lr-texto{bottom:76px}.lr-cred{display:none}.lr-barra{left:10px;right:10px;transform:none;overflow-x:auto}}
  </style>
  <div class="lr-palco"><div class="lr-cam"><img class="lr-hoje" alt=""><img class="lr-antes" alt=""></div><div class="lr-vinheta"></div><div class="lr-linha"></div><div class="lr-alca" title="Arraste para comparar">⟷</div></div>
  <div class="lr-cab"><h2>${L.titulo}</h2><p>${L.sub}</p><span class="st">${L.status}</span></div>
  <div class="lr-rot a">NO ANO 30${L.antes.nota ? ` · JUIZ ${String(L.antes.nota).replace(".", ",")}/10${L.antes.revisao ? " · EM REVISÃO" : ""}` : ""}</div><div class="lr-rot h">HOJE</div>
  <button type="button" class="lr-sair">↩ Voltar ao globo</button>
  <div class="lr-texto fechado">${L.refs.map(([r, t]) => `<blockquote>“${t}”<cite>${r} · Almeida</cite></blockquote>`).join('')}<div class="nota">${L.nota}</div></div>
  <div class="lr-cred"></div>
  <div class="lr-barra"><button type="button" data-m="comparar" class="ativo">⟷ Comparar</button><button type="button" data-m="hoje">Hoje (foto real)</button><button type="button" data-m="antes">No ano 30</button><button type="button" data-m="texto">📖 Texto e fontes</button></div>`;
  host.appendChild(raiz);
  const palco = raiz.querySelector('.lr-palco'), cam = raiz.querySelector('.lr-cam'), imH = raiz.querySelector('.lr-hoje'), imA = raiz.querySelector('.lr-antes'), cred = raiz.querySelector('.lr-cred');
  imH.src = L.hoje.src; imA.src = L.antes.src;
  let temAntes = true; imA.onerror = () => { temAntes = false; raiz.classList.add('so-hoje'); raiz.querySelector('.lr-rot.a').hidden = true; raiz.querySelectorAll('[data-m="comparar"],[data-m="antes"]').forEach((b) => { b.disabled = true; b.title = 'A imagem do ano 30 ainda está sendo gerada'; }); modo('hoje'); };
  imH.onerror = () => { palco.insertAdjacentHTML('beforeend', '<div class="lr-falta">A foto deste lugar não pôde ser carregada.</div>'); };
  // corte do comparador (0–100%) e câmera de cinema (zoom lento + arrastar)
  let corte = 50, z = 1.12, ox = 0, oy = 0, alvoZ = 1.12, auto = true, t0 = performance.now(), m = 'comparar';
  const aplicar = () => { raiz.style.setProperty('--corte', corte + '%'); cam.style.transform = `translate(${ox}px,${oy}px) scale(${z})`; };
  function limitar() { const w = palco.clientWidth, h = palco.clientHeight; ox = Math.min(0, Math.max(w - w * z, ox)); oy = Math.min(0, Math.max(h - h * z, oy)); }
  function modo(nv) { m = nv; raiz.classList.toggle('so-antes', nv === 'antes'); raiz.classList.toggle('so-hoje', nv === 'hoje' || !temAntes); raiz.querySelectorAll('.lr-barra [data-m]').forEach((b) => { if (b.dataset.m !== 'texto') b.classList.toggle('ativo', b.dataset.m === nv); });
    const rev = L.antes.revisao ? ` · Em revisão: ${L.antes.revisao}.` : ''; cred.textContent = nv === 'antes' ? L.antes.credito + rev : nv === 'hoje' || !temAntes ? L.hoje.credito : L.hoje.credito + '  ·  ' + L.antes.credito; }
  raiz.querySelector('.lr-barra').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b || b.disabled) return; if (b.dataset.m === 'texto') { raiz.querySelector('.lr-texto').classList.toggle('fechado'); b.classList.toggle('ativo'); return; } modo(b.dataset.m); });
  let arr = null;
  palco.addEventListener('pointerdown', (e) => { auto = false; const al = e.target.closest('.lr-alca'); arr = { x: e.clientX, y: e.clientY, alca: !!al }; try { palco.setPointerCapture(e.pointerId); } catch (_) {} });
  palco.addEventListener('pointermove', (e) => { if (!arr) return; const r = palco.getBoundingClientRect();
    if (arr.alca || (m === 'comparar' && e.shiftKey)) { corte = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)); aplicar(); return; }
    ox += e.clientX - arr.x; oy += e.clientY - arr.y; arr.x = e.clientX; arr.y = e.clientY; limitar(); aplicar(); });
  palco.addEventListener('pointerup', () => { arr = null; }); palco.addEventListener('pointercancel', () => { arr = null; });
  palco.addEventListener('wheel', (e) => { e.preventDefault(); auto = false; const r = palco.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, nz = Math.max(1, Math.min(4, z * Math.exp(-e.deltaY * 0.0012))); ox = px - (px - ox) * nz / z; oy = py - (py - oy) * nz / z; z = nz; limitar(); aplicar(); }, { passive: false });
  // abertura de cinema: a foto de hoje surge e, aos poucos, a cortina do ano 30 se abre; a câmera desliza devagar
  let raf = 0, ativo = true;
  function quadro(t) { if (!ativo) return; const s = (t - t0) / 1000;
    if (auto) { z = 1.12 + 0.06 * Math.min(1, s / 14); const w = palco.clientWidth, h = palco.clientHeight; ox = -(w * (z - 1)) * (0.5 + 0.45 * Math.sin(s * 0.07)); oy = -(h * (z - 1)) * 0.5; if (m === 'comparar' && temAntes) corte = s < 2.2 ? 100 : Math.max(50, 100 - (s - 2.2) * 30); }
    aplicar(); raf = requestAnimationFrame(quadro); }
  modo('comparar'); corte = 100; aplicar(); requestAnimationFrame(() => raiz.classList.add('on')); raf = requestAnimationFrame(quadro);
  function fechar() { ativo = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', tecla); raiz.classList.remove('on'); setTimeout(() => raiz.remove(), 600); if (aoFechar) aoFechar(); }
  raiz.querySelector('.lr-sair').onclick = fechar; function tecla(e) { if (e.key === 'Escape') fechar(); } window.addEventListener('keydown', tecla);
  return { fechar, modo, estado: () => ({ id, temAntes, modo: m, corte }) };
}
