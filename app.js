/* ==========================================================================
   4Metas — telas
   Rotas: #/entrar · #/senha · #/painel · #/novo · #/meta/<id>[/<periodo>]

   Gramática visual, que vale para tudo:
     execução (o que foi feito)  → azul. Barra contínua. RK concluído fica azul.
     resultado (o número bateu)  → ouro. Bloco sólido, três degraus.
   ========================================================================== */

const tela     = document.getElementById('tela');
const topo     = document.getElementById('topo');
const topoNome = document.getElementById('topoNome');
const aviso    = document.getElementById('aviso');

const NIVEIS = { nao_atingida: 'Não atingida', atingida: 'Atingida', superada: 'Superada' };

const MEDIDAS = {
  marco:      { nome: 'Feito ou não', dica: 'Sem número: ou aconteceu, ou não.' },
  percentual: { nome: 'Porcentagem',  dica: 'Avança de 0 a 100% ao longo do período.' },
  numero:     { nome: 'Número',       dica: 'Um valor contra um alvo. Ex: 4 testes, 3 bugs.' },
  dinheiro:   { nome: 'Dinheiro',     dica: 'Um valor em reais contra um alvo.' }
};

const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "no máximo R$ 10,00" · "pelo menos 4 testes" · "100%" */
function alvoTexto(m) {
  if (m.tipo === 'marco') return 'feito ou não';
  if (m.tipo === 'percentual') return 'até 100%';
  const n = m.tipo === 'dinheiro' ? brl(m.alvo) : `${m.alvo}${m.unidade || ''}`;
  return `${m.sentido === 'max' ? 'no máximo' : 'pelo menos'} ${n}`;
}

const PERIODICIDADES = [
  ['mensal', 'Mensal'], ['quinzenal', 'Quinzenal'], ['semanal', 'Semanal'],
  ['trimestral', 'Trimestral'], ['campanha', 'Por campanha']
];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ------------------------------------------------------------- utilidades

const esc = (t) => String(t ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dia = (iso) => {
  if (!iso) return '';
  const [, m, d] = String(iso).substring(0, 10).split('-');
  return `${d}/${m}`;
};

function janela(inicio, fim) {
  if (!inicio) return '';
  const [a, m, d] = inicio.split('-');
  const [af, mf] = fim.split('-');
  const ultimo = new Date(Date.UTC(+af, +mf, 0)).getUTCDate();
  if (d === '01' && m === mf && a === af && +fim.split('-')[2] === ultimo) {
    return `${MESES[+m - 1]} de ${a}`;
  }
  return `${dia(inicio)} a ${dia(fim)}${a !== af ? '/' + af : ''}`;
}

function hojeIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().substring(0, 10);
}

function faltam(fim) {
  const n = Math.round((new Date(fim + 'T12:00:00') - new Date(hojeIso() + 'T12:00:00')) / 86400000);
  if (n < 0) return 'encerrado';
  if (n === 0) return 'termina hoje';
  return `faltam ${n} ${n === 1 ? 'dia' : 'dias'}`;
}

function quando(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function mesAtual() {
  const h = hojeIso();
  const [a, m] = h.split('-');
  const ult = new Date(Date.UTC(+a, +m, 0)).getUTCDate();
  return { inicio: `${a}-${m}-01`, fim: `${a}-${m}-${String(ult).padStart(2, '0')}` };
}

let avisoTimer;
function avisar(texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { aviso.hidden = true; }, 3400);
}

function carregando(texto) {
  tela.innerHTML = `<p class="carregando">${esc(texto)}…</p>`;
}

function mostrarTopo(rotaAtual) {
  const u = sessao.usuario;
  topo.hidden = !u;
  if (!u) return;
  topoNome.textContent = u.nome;
  const link = document.getElementById('linkEquipe');
  if (link) link.hidden = !(u.papeis || []).some(p => p === 'coordenador' || p === 'diretor');

  document.querySelectorAll('#menu a').forEach(a => {
    const dele = rotaAtual && rotaAtual.indexOf(a.dataset.rota) === 0;
    if (dele) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/** Trava o botão enquanto a chamada acontece e devolve o texto depois. */
async function comBotao(btn, texto, fn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = texto;
  try { return await fn(); }
  finally { btn.disabled = false; btn.textContent = original; }
}

// ------------------------------------------------------------------ entrar

function telaEntrar(mensagem) {
  topo.hidden = true;
  tela.innerHTML = `
    <div class="entrar">
      <div class="marca-grande"><span>4</span>Metas</div>
      <p class="linha-fina">Metas, resultados-chave e rotina da equipe de Marketing.</p>
      ${mensagem ? `<div class="erro">${esc(mensagem)}</div>` : ''}
      <form id="formEntrar" novalidate>
        <div class="campo"><label for="email">E-mail</label>
          <input id="email" type="email" autocomplete="username" required></div>
        <div class="campo"><label for="senha">Senha</label>
          <input id="senha" type="password" autocomplete="current-password" required></div>
        <button class="btn" type="submit" id="btnEntrar">Entrar</button>
      </form>
    </div>`;

  document.getElementById('formEntrar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('btnEntrar');
    btn.disabled = true; btn.textContent = 'Entrando';
    try {
      const d = await api('auth.login', {
        email: document.getElementById('email').value.trim(),
        senha: document.getElementById('senha').value
      });
      sessao.abrir(d.token, d.usuario);
      location.hash = d.usuario.precisa_trocar_senha ? '#/senha' : '#/painel';
    } catch (e) { telaEntrar(e.message); }
  });
}

function telaSenha(primeiroAcesso) {
  mostrarTopo(primeiroAcesso ? null : '/acesso');
  tela.innerHTML = `
    <div class="entrar">
      <h1 class="titulo-pagina">${primeiroAcesso ? 'Crie sua senha' : 'Acesso'}</h1>
      <p class="linha-fina">${primeiroAcesso
        ? 'Você entrou com a senha inicial. Escolha uma sua para continuar.'
        : 'Troque sua senha quando quiser. O e-mail de entrada é ' + esc(sessao.usuario.email || '') + '.'}</p>
      <div id="erroSenha"></div>
      <form id="formSenha" novalidate>
        <div class="campo"><label for="atual">${primeiroAcesso ? 'Senha inicial' : 'Senha atual'}</label>
          <input id="atual" type="password" autocomplete="current-password"></div>
        <div class="campo"><label for="nova">Nova senha</label>
          <input id="nova" type="password" autocomplete="new-password">
          <p class="campo-dica">Mínimo de 8 caracteres.</p></div>
        <div class="campo"><label for="conf">Repita a nova senha</label>
          <input id="conf" type="password" autocomplete="new-password"></div>
        <button class="btn" type="submit">Salvar senha</button>
      </form>
      ${primeiroAcesso ? '' : '<div id="blocoReset"></div>'}
    </div>`;

  if (!primeiroAcesso) _blocoResetSenha();

  document.getElementById('formSenha').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const erro = document.getElementById('erroSenha');
    const nova = document.getElementById('nova').value;
    if (nova !== document.getElementById('conf').value) {
      erro.innerHTML = '<div class="erro">As duas senhas novas não são iguais.</div>';
      return;
    }
    try {
      await api('auth.trocarSenha', { senha_atual: document.getElementById('atual').value, senha_nova: nova });
      const u = sessao.usuario; u.precisa_trocar_senha = false;
      sessao.abrir(sessao.token, u);
      avisar('Senha salva.');
      if (primeiroAcesso) location.hash = '#/painel';
      else erro.innerHTML = '';
    } catch (e) { erro.innerHTML = `<div class="erro">${esc(e.message)}</div>`; }
  });
}

/**
 * Reset de senha de outra pessoa, só para coordenador e diretor.
 * Aparece dentro da tela de Acesso; quem não é gestor nem enxerga.
 */
async function _blocoResetSenha() {
  let pessoas = [];
  try { pessoas = await api('catalogo.usuarios'); } catch { return; }
  if (pessoas.length < 2) return;

  const eu = sessao.usuario;
  const alvo = document.getElementById('blocoReset');
  if (!alvo) return;

  alvo.innerHTML = `
    <div class="forma" style="margin-top:28px">
      <h3>Resetar a senha de alguém</h3>
      <p class="rk-sub" style="margin-bottom:14px">Gera uma senha temporária e obriga a pessoa a criar outra no próximo acesso. Passe por canal direto, nunca em grupo.</p>
      <div class="campo"><label for="rQuem">Pessoa</label>
        <select id="rQuem">${pessoas.filter(p => p.id !== eu.id)
          .map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></div>
      <div class="forma-pe"><button class="btn btn-vazio" id="rGerar">Gerar senha temporária</button></div>
      <div id="rSaida"></div>
    </div>`;

  document.getElementById('rGerar').addEventListener('click', (ev) => comBotao(ev.target, 'Gerando', async () => {
    try {
      const r = await api('auth.resetarSenha', { usuario_id: document.getElementById('rQuem').value });
      document.getElementById('rSaida').innerHTML =
        `<div class="senha-temp">Senha temporária: <code>${esc(r.senha_temporaria)}</code>
         <span>Aparece uma vez só. Copie agora.</span></div>`;
    } catch (e) { avisar(e.message); }
  }));
}

// ------------------------------------------------------------------ painel

async function telaPainel() {
  mostrarTopo('/painel');
  carregando('Abrindo seu painel');

  let d;
  try { d = await api('painel'); }
  catch (e) { tela.innerHTML = `<div class="erro">${esc(e.message)}</div>`; return; }

  const comCiclo = d.entregaveis.filter(e => e.ciclo);
  const batidas = comCiclo.filter(e => e.ciclo.resultado_nivel !== 'nao_atingida').length;
  const exec = comCiclo.length
    ? Math.round(comCiclo.reduce((s, e) => s + e.ciclo.progresso_pct, 0) / comCiclo.length) : 0;
  const [, m, dd] = d.hoje.split('-');

  tela.innerHTML = `
    <section class="abertura">
      <h1>${esc(d.usuario)}</h1>
      <p class="periodo">Hoje, ${+dd} de ${MESES[+m - 1]}</p>
      <div class="leituras">
        <div class="leitura">
          <p class="rotulo">Execução</p>
          <div class="leitura-num exec">${exec}%</div>
          <div class="barra-clara"><i style="--pct:${exec}%"></i></div>
          <p class="leitura-sub">${d.xp_periodo} pontos nos períodos em andamento</p>
        </div>
        <div class="leitura">
          <p class="rotulo">Resultado</p>
          <div class="leitura-num res">${batidas} de ${comCiclo.length}</div>
          <p class="leitura-sub">metas batidas até agora</p>
        </div>
      </div>
    </section>

    <div class="cabeca-secao">
      <h2>Seus entregáveis</h2>
      <a class="btn btn-vazio btn-p" href="#/novo">Novo entregável</a>
    </div>
    ${d.entregaveis.length
      ? `<div class="trilha">${d.entregaveis.map(faixa).join('')}</div>`
      : '<div class="vazio">Nenhum entregável por aqui. Crie o primeiro no botão acima.</div>'}`;

  ligarPainel();
}

function faixa(e) {
  const c = e.ciclo;
  const nivel = c ? c.resultado_nivel : 'nao_atingida';
  const pct = c ? c.progresso_pct : 0;

  return `
    <div class="faixa" data-nivel="${nivel}" data-ir="#/meta/${e.id}">
      <span class="faixa-aresta"></span>
      <div class="faixa-corpo">
        <h2><a href="#/meta/${e.id}">${esc(e.nome)}</a></h2>
        <div class="faixa-periodo" data-nao-navegar>
          ${c ? `<span class="per-datas">${esc(janela(c.periodo_inicio, c.periodo_fim))}</span>
                 <span class="per-falta">${faltam(c.periodo_fim)}</span>`
              : '<span class="per-datas">Sem período aberto</span>'}
          ${c && e.pode_ajustar && c.status === 'aberto'
            ? `<button class="btn-link" data-ajustar="${c.id}" data-ini="${c.periodo_inicio}" data-fim="${c.periodo_fim}">Ajustar período</button>`
            : ''}
        </div>
        <div class="per-editor" id="ed-${c ? c.id : ''}" data-nao-navegar></div>
        <div class="barra"><i style="--pct:${pct}%"></i></div>
        <div class="barra-legenda">
          <span>Execução ${pct}%</span>
          <span>${e.rks_concluidos} de ${e.rks_total} resultados-chave concluídos</span>
        </div>
      </div>
      <div class="selo" data-nivel="${nivel}">
        <p class="rotulo">Resultado</p>
        <span class="selo-nivel">${NIVEIS[nivel]}</span>
      </div>
    </div>`;
}

function ligarPainel() {
  document.querySelectorAll('.faixa').forEach(f =>
    f.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-nao-navegar], a, button, input')) return;
      location.hash = f.dataset.ir;
    }));

  document.querySelectorAll('[data-ajustar]').forEach(b =>
    b.addEventListener('click', () =>
      editorPeriodo(document.getElementById('ed-' + b.dataset.ajustar),
        b.dataset.ajustar, b.dataset.ini, b.dataset.fim, telaPainel)));
}

/** Editor de datas do período, usado no painel e na tela da meta. */
function editorPeriodo(alvo, cicloId, ini, fim, depois) {
  alvo.innerHTML = `
    <div class="per-form">
      <label>Início <input type="date" value="${ini}" data-i></label>
      <label>Fim <input type="date" value="${fim}" data-f></label>
      <button class="btn btn-p" data-salvar>Salvar</button>
      <button class="btn btn-vazio btn-p" data-cancelar>Cancelar</button>
    </div>
    <p class="campo-dica">Resultados-chave com datas fora da nova janela são trazidos para dentro dela.</p>`;

  alvo.querySelector('[data-cancelar]').onclick = () => { alvo.innerHTML = ''; };
  alvo.querySelector('[data-salvar]').onclick = (ev) => comBotao(ev.target, 'Salvando', async () => {
    try {
      const r = await api('periodo.ajustar', {
        ciclo_id: cicloId,
        inicio: alvo.querySelector('[data-i]').value,
        fim: alvo.querySelector('[data-f]').value
      });
      avisar(r.rks_ajustados
        ? `Período ajustado. ${r.rks_ajustados} resultado(s)-chave tiveram as datas trazidas para dentro.`
        : 'Período ajustado.');
      depois();
    } catch (e) { avisar(e.message); }
  });
}

// ------------------------------------------------------------ novo entregável

async function telaNovo() {
  mostrarTopo('/painel');
  carregando('Preparando');

  let pessoas = [], bases = [];
  try { [pessoas, bases] = await Promise.all([api('catalogo.usuarios'), api('entregavel.bases')]); }
  catch { }
  const eu = sessao.usuario;
  const mes = mesAtual();

  tela.innerHTML = `
    <a class="voltar" href="#/painel">Voltar ao painel</a>
    <div class="pagina-forma">
      <h1 class="titulo-pagina">Novo entregável</h1>
      <p class="linha-fina">Comece do zero ou aproveite a estrutura de um que já existe.</p>

      <div class="campo"><label>Como começar</label>
        <div class="tipos tipos-2">
          <label class="tipo-op"><input type="radio" name="nModo" value="zero" checked>
            <span><b>Do zero</b>Você escreve tudo: descrição, objetivo, como é medido e os três níveis.</span></label>
          <label class="tipo-op"><input type="radio" name="nModo" value="base" ${bases.length ? '' : 'disabled'}>
            <span><b>A partir de um existente</b>Copia descrição, objetivo, os três níveis, os resultados-chave com suas medidas e a rotina. Sem nenhum valor lançado.</span></label>
        </div>
      </div>

      <div class="campo" id="blocoBase" hidden><label for="nBase">Copiar de</label>
        <select id="nBase">${bases.map(b =>
          `<option value="${b.id}">${esc(b.nome)}</option>`).join('')}</select>
        <p class="campo-dica">Vem a estrutura inteira. Avanço, check-ins e valores das medidas começam zerados.</p></div>

      ${pessoas.length > 1 ? `
      <div class="campo"><label for="nResp">Responsável</label>
        <select id="nResp">${pessoas.filter(p => p.ativo !== false).map(p =>
          `<option value="${p.id}" ${p.id === eu.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
        </select></div>` : ''}

      ${existentes.length ? `
      <div class="campo"><label for="nBase">Começar a partir de</label>
        <select id="nBase">
          <option value="">Do zero</option>
          ${existentes.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
        </select>
        <p class="campo-dica">Traz os resultados-chave, as medidas e a rotina do entregável escolhido, sem nenhum valor lançado. Os textos abaixo você escreve do jeito que quiser.</p>
      </div>` : ''}

      <div class="campo"><label for="nNome">Nome</label>
        <input id="nNome" placeholder="Ex: MKT - Migração do CRM"></div>

      <div id="camposDoZero">
        <div class="campo"><label for="nDesc">Descrição</label>
          <textarea id="nDesc" rows="3" placeholder="O que é este entregável e o que envolve"></textarea></div>
        <div class="campo"><label for="nObj">Objetivo</label>
          <textarea id="nObj" rows="2" placeholder="Por que ele existe, qual resultado para a empresa"></textarea></div>
        <div class="campo"><label for="nForm">Como é medido</label>
          <textarea id="nForm" rows="2" placeholder="A fórmula ou o critério de medição"></textarea></div>

        <p class="rotulo rotulo-secao">Os três níveis</p>
        <div class="niveis-forma">
          <div class="campo nivel-campo" data-nivel="nao_atingida"><label for="nN0">Não atingida</label>
            <textarea id="nN0" rows="2"></textarea></div>
          <div class="campo nivel-campo" data-nivel="atingida"><label for="nN1">Atingida</label>
            <textarea id="nN1" rows="2"></textarea></div>
          <div class="campo nivel-campo" data-nivel="superada"><label for="nN2">Superada</label>
            <textarea id="nN2" rows="2"></textarea></div>
        </div>
        <p class="campo-dica">Como os níveis são escritos em texto, o resultado será declarado ao fim do período, com uma justificativa.</p>
      </div>

      <p class="rotulo rotulo-secao">Período em análise</p>
      <div class="dupla">
        <div class="campo"><label for="nIni">Início</label><input id="nIni" type="date" value="${mes.inicio}"></div>
        <div class="campo"><label for="nFim">Fim</label><input id="nFim" type="date" value="${mes.fim}"></div>
      </div>
      <div class="campo"><label for="nPer">Quando este período acabar</label>
        <select id="nPer">${PERIODICIDADES.map(([v, t]) =>
          `<option value="${v}">${v === 'campanha' ? 'Não abrir outro sozinho' : 'Abrir o próximo: ' + t.toLowerCase()}</option>`).join('')}
        </select></div>

      <div id="nErro"></div>
      <div class="forma-pe"><button class="btn" id="nSalvar">Criar entregável</button>
        <a class="btn btn-vazio" href="#/painel">Cancelar</a></div>
    </div>`;

  const modo = () => document.querySelector('input[name="nModo"]:checked').value;
  const aplicarModo = () => {
    const base = modo() === 'base';
    document.getElementById('blocoBase').hidden = !base;
    document.getElementById('camposDoZero').hidden = base;
    if (base && !document.getElementById('nNome').value) {
      const sel = document.getElementById('nBase');
      document.getElementById('nNome').value = sel.options[sel.selectedIndex]?.text || '';
    }
  };
  document.querySelectorAll('input[name="nModo"]').forEach(r => r.addEventListener('change', aplicarModo));
  document.getElementById('nBase')?.addEventListener('change', (ev) => {
    document.getElementById('nNome').value = ev.target.options[ev.target.selectedIndex].text;
  });

  document.getElementById('nSalvar').addEventListener('click', (ev) => comBotao(ev.target, 'Criando', async () => {
    const v = (id) => (document.getElementById(id)?.value || '').trim();
    try {
      const comum = {
        usuario_id: v('nResp') || eu.id, nome: v('nNome'),
        inicio: v('nIni'), fim: v('nFim'), periodicidade: v('nPer')
      };
      const r = modo() === 'base'
        ? await api('entregavel.duplicar', { ...comum, entregavel_id: v('nBase') })
        : await api('entregavel.criar', { ...comum,
            descricao: v('nDesc'), objetivo: v('nObj'), formula_texto: v('nForm'),
            nao_atingida: v('nN0'), atingida: v('nN1'), superada: v('nN2') });

      avisar(r.rks_copiados
        ? `Entregável criado com ${r.rks_copiados} resultado(s)-chave copiados.`
        : 'Entregável criado. Agora adicione os resultados-chave.');
      location.hash = `#/meta/${r.id}`;
    } catch (e) {
      document.getElementById('nErro').innerHTML = `<div class="erro">${esc(e.message)}</div>`;
    }
  }));
}

// ----------------------------------------------------------------- detalhe

let M = null;          // estado da tela aberta
let rotaMeta = null;   // { id, ciclo }

async function telaMeta(id, cicloId, silencioso) {
  mostrarTopo('/painel');
  rotaMeta = { id, ciclo: cicloId || null };
  const y = window.scrollY;
  if (!silencioso) carregando('Abrindo o entregável');

  try { M = await api('painel.entregavel', { id, ciclo_id: cicloId || undefined }); }
  catch (e) { tela.innerHTML = `<div class="erro">${esc(e.message)}</div>`; return; }

  desenharMeta();
  if (silencioso) window.scrollTo(0, y);
}

const recarregar = () => telaMeta(rotaMeta.id, rotaMeta.ciclo, true);

function desenharMeta() {
  const e = M.entregavel, c = M.ciclo;
  const nivel = c ? c.resultado_nivel : 'nao_atingida';
  const passado = c && c.status !== 'aberto';

  tela.innerHTML = `
    <a class="voltar" href="#/painel">Voltar ao painel</a>
    <div class="detalhe">
      <aside class="contrato">
        ${M.sou_dono ? '' : `<p class="rotulo">De ${esc(e.usuario_nome)}</p>`}
        <h1>${esc(e.nome)}</h1>
        <p>${esc(e.descricao)}</p>
        <p class="rotulo">Objetivo</p><p>${esc(e.objetivo)}</p>
        <p class="rotulo">Como é medido</p><p class="formula">${esc(e.formula_texto)}</p>
        <p class="rotulo">Os três níveis</p>
        <div class="degraus">
          ${['nao_atingida', 'atingida', 'superada'].map(n => {
            const cr = M.criterios.find(x => x.nivel === n);
            return cr ? `<div class="degrau" data-nivel="${n}" data-ativo="${nivel === n ? 1 : 0}">
              <b>${NIVEIS[n]}</b>${esc(cr.texto)}</div>` : '';
          }).join('')}
        </div>
        ${blocoResultado()}
      </aside>

      <section class="trabalho">
        <div class="barra-periodo">
          <div>
            <p class="rotulo">Período em análise</p>
            ${M.ciclos.length > 1 ? `
              <select id="selPeriodo" class="sel-periodo">
                ${M.ciclos.map(x => `<option value="${x.id}" ${c && x.id === c.id ? 'selected' : ''}>
                  ${esc(janela(x.periodo_inicio, x.periodo_fim))}${x.status === 'aberto' ? ' (em andamento)' : ''}</option>`).join('')}
              </select>`
              : `<span class="per-grande">${c ? esc(janela(c.periodo_inicio, c.periodo_fim)) : 'Sem período'}</span>`}
            ${c ? `<span class="per-falta">${passado ? 'encerrado' : faltam(c.periodo_fim)}</span>` : ''}
          </div>
          ${M.pode_gerir ? `<div class="barra-periodo-acoes">
            <button class="btn-link" id="btnAjustar">Ajustar datas</button>
            <button class="btn-link" id="btnNovoPer">Iniciar novo período</button></div>` : ''}
        </div>
        <div id="edPeriodo"></div>

        ${passado ? `<div class="faixa-aviso">Este período foi encerrado. Você está vendo o registro de como ele terminou.</div>` : ''}

        ${c ? `<div class="resumo-exec">
          <div class="barra"><i style="--pct:${c.progresso_pct}%"></i></div>
          <div class="barra-legenda"><span>Execução ${c.progresso_pct}%</span><span>${c.xp_total} pontos</span></div>
        </div>` : ''}

        ${blocoIndicadores()}

        <div class="cabeca-secao">
          <h2>Resultados-chave</h2>
          ${M.pode_editar ? '<button class="btn btn-vazio btn-p" id="btnNovoRk">Adicionar</button>' : ''}
        </div>
        <div id="formaRk"></div>

        ${M.resultados_chave.length
          ? M.resultados_chave.map(cartaoRk).join('')
          : `<div class="vazio">
              ${M.pode_editar ? 'Nenhum resultado-chave neste período ainda.' : 'Nenhum resultado-chave neste período.'}
              ${M.pode_editar && M.tem_anterior
                ? '<div style="margin-top:14px"><button class="btn btn-vazio btn-p" id="btnCopiar">Trazer os do período anterior</button></div>' : ''}
            </div>`}

        ${blocoFeedback()}

        <div class="cabeca-secao cabeca-historico"><h2>Check-ins do período</h2></div>
        ${M.historico.length ? `<ol class="linha-tempo">${M.historico.map(itemHistorico).join('')}</ol>`
          : '<p class="rk-sub">Cada vez que alguém registra uma atualização num resultado-chave, ela aparece aqui.</p>'}
      </section>
    </div>`;

  ligarMeta();
}

function blocoResultado() {
  const c = M.ciclo;
  if (!c) return '';
  if (M.tem_regra) {
    return `<div class="resultado-bloco"><p class="rotulo">Resultado</p>
      <p class="res-nota">Calculado a partir dos números lançados no período.</p></div>`;
  }
  const declarado = c.resultado_manual;
  return `
    <div class="resultado-bloco">
      <p class="rotulo">Resultado declarado</p>
      ${declarado ? `<p class="res-nivel" data-nivel="${declarado}">${NIVEIS[declarado]}</p>
                     <p class="res-nota">${esc(c.resultado_nota)}</p>`
                  : '<p class="res-nota">Ainda não declarado. Declare ao fim do período, com base nos três níveis.</p>'}
      ${M.pode_gerir ? `
        <button class="btn-link btn-link-claro" id="btnDeclarar">${declarado ? 'Rever declaração' : 'Declarar resultado'}</button>
        <div id="formDeclarar"></div>` : ''}
    </div>`;
}

const TIPOS_EVIDENCIA = {
  teste_ab: 'Teste A/B', link: 'Link', mensagem: 'Mensagem', nota: 'Nota'
};

/** Os números do período: valor corrente, lançamento e como está a avaliação. */
function blocoIndicadores() {
  if (!M.indicadores || !M.indicadores.length) return '';
  const ed = M.pode_lancar;

  return `
    <div class="cabeca-secao"><h2>Indicadores do período</h2></div>
    <div class="indicadores">
      ${M.indicadores.map(m => `
        <div class="ind">
          <div class="ind-nome">${esc(m.rotulo)}</div>
          <div class="ind-valor">${m.valor_atual === null ? '<span class="rk-sub">não lançado</span>'
            : `<b>${esc(String(m.valor_atual))}</b><span class="ind-un">${esc(m.unidade || '')}</span>`}</div>
          ${ed ? `<div class="ind-lanca">
            <input type="number" step="any" placeholder="novo valor" data-ind="${m.id}">
            <button class="btn btn-vazio btn-p" data-lancar="${m.id}">Lançar</button>
          </div>` : '<div></div>'}
          <div class="ind-hist">${m.lancamentos.length
            ? `<button class="btn-link" data-hist="${m.id}">${m.lancamentos.length} lançamento${m.lancamentos.length > 1 ? 's' : ''}</button>`
            : ''}</div>
          <div class="ind-lista" id="hist-${m.id}" hidden>
            ${m.lancamentos.slice().reverse().map(l => `
              <div class="ind-linha">
                <span>${esc(String(l.valor))}</span>
                <span class="rk-sub">${dia(l.data)} por ${esc(l.por)}</span>
                ${ed ? `<button class="btn-x btn-x-fixo" data-apagar-lanc="${l.id}">apagar</button>` : ''}
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>
    ${blocoAvaliacao()}`;
}

/** Qual condição da meta passou e qual não, com valor ao lado do alvo. */
function blocoAvaliacao() {
  if (!M.tem_regra || !M.avaliacao || !M.avaliacao.detalhe) return '';

  const linhas = [];
  ['atingida', 'superada'].forEach(nivel => {
    const d = M.avaliacao.detalhe.find(x => x.nivel === nivel);
    if (!d) return;
    linhas.push(`<div class="aval-nivel" data-passou="${d.passou ? 1 : 0}">
      <span class="aval-titulo">${NIVEIS[nivel]}</span>
      ${d.condicoes.map(c => {
        const ind = (M.indicadores || []).find(i => i.chave === c.metrica);
        const nome = ind ? ind.rotulo : c.metrica;
        const alvo = (c.alvo === null || c.alvo === undefined || String(c.alvo) === 'null')
          ? 'sem ciclo anterior para comparar'
          : `${esc(c.op)} ${esc(String(c.alvo))}`;
        return `<div class="aval-cond" data-passou="${c.passou ? 1 : 0}">
          <span class="aval-marca">${c.passou ? '✓' : '✗'}</span>
          <span class="aval-nome">${esc(nome)}</span>
          <span class="rk-sub">${c.valor === null ? 'ainda sem valor' : esc(String(c.valor))} ${alvo}</span>
        </div>`;
      }).join('')}
    </div>`);
  });

  return `<div class="avaliacao">
    <p class="rotulo">Como está a avaliação</p>
    ${linhas.join('')}
  </div>`;
}

/** Testes A/B, links, mensagens e notas do período. */
function blocoEvidencias() {
  const ed = M.pode_lancar;
  const lista = M.evidencias || [];

  return `
    <div class="cabeca-secao cabeca-evidencias">
      <h2>Evidências</h2>
      ${ed ? '<button class="btn btn-vazio btn-p" id="btnNovaEv">Registrar</button>' : ''}
    </div>
    <div id="formaEv"></div>
    ${lista.length ? `<div class="evidencias">
      ${lista.map(r => `
        <div class="ev">
          <div class="ev-topo">
            <span class="tag">${TIPOS_EVIDENCIA[r.tipo] || 'Nota'}</span>
            <b>${esc(r.titulo)}</b>
            <span class="rk-sub">${dia(r.data)} por ${esc(r.por)}</span>
            ${ed ? `<button class="btn-link link-perigo ev-x" data-apagar-ev="${r.id}">Excluir</button>` : ''}
          </div>
          ${r.conteudo ? `<p class="ev-txt">${esc(r.conteudo)}</p>` : ''}
          ${r.resultado ? `<p class="ev-txt"><span class="lt-rot">Resultado</span>${esc(r.resultado)}</p>` : ''}
          ${r.url ? `<a class="ev-link" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>` : ''}
        </div>`).join('')}
    </div>` : `<p class="rk-sub">Nenhuma evidência neste período. ${ed ? 'Registre testes A/B, links e mensagens disparadas para comprovar o que foi feito.' : ''}</p>`}`;
}

/** Lê o que está digitado num cartão de resultado-chave. */
function _dadosDoCartao(card, id) {
  const valores = {};
  card.querySelectorAll('[data-medida]').forEach(el => {
    valores[el.dataset.medida] = el.dataset.tipo === 'marco' ? (el.checked ? 1 : 0) : el.value;
  });
  return {
    id: id,
    valores: valores,
    feito: card.querySelector('[data-feito]')?.value || '',
    falta: card.querySelector('[data-falta]')?.value || ''
  };
}

/** Conversa do período: gestor comenta, o dono responde, tudo fica no ciclo. */
function blocoFeedback() {
  const lista = M.feedbacks || [];
  if (!lista.length && !M.pode_comentar) return '';

  return `
    <div class="cabeca-secao cabeca-feedback"><h2>Conversa do período</h2></div>
    ${lista.length ? `<div class="conversa">
      ${lista.map(f => `
        <div class="fala" data-meu="${f.meu ? 1 : 0}">
          <div class="fala-topo">
            <b>${esc(f.por)}</b><time>${quando(f.quando)}</time>
            ${f.meu ? `<button class="btn-link link-perigo fala-x" data-apagar-fb="${f.id}">Excluir</button>` : ''}
          </div>
          <p>${esc(f.texto)}</p>
        </div>`).join('')}
    </div>` : '<p class="rk-sub">Nenhum comentário neste período.</p>'}
    ${M.pode_comentar ? `
      <div class="fala-nova">
        <textarea id="fbTexto" rows="2" placeholder="Escreva um comentário sobre este período"></textarea>
        <button class="btn btn-p" id="fbEnviar">Enviar</button>
      </div>` : ''}`;
}

function cartaoRk(rk) {
  const ed = M.pode_editar;

  return `
    <article class="rk" data-rk="${rk.id}" data-concluido="${rk.concluido ? 1 : 0}">
      <div class="rk-topo">
        <div class="rk-cabeca">
          <div class="rk-titulo-linha">
            <h3>${esc(rk.titulo)}</h3>
            ${rk.concluido ? '<span class="tag tag-ok">Concluído</span>' : ''}
          </div>
          <p class="rk-sub">${dia(rk.periodo_inicio)} a ${dia(rk.periodo_fim)}${
            rk.atravessa ? ' <span class="chip chip-ok">continua no próximo período</span>' : ''}</p>
          ${rk.tags && rk.tags.length ? `<div class="chips">${rk.tags.map(t =>
            `<span class="chip-tag" data-tipo="${t.tipo}">${esc(t.nome)}</span>`).join('')}</div>` : ''}
        </div>
        ${ed ? `<div class="rk-acoes">
          <button class="btn-link" data-editar-rk="${rk.id}">Editar</button>
          ${rk.pode_excluir
            ? `<button class="btn-link link-perigo" data-excluir-rk="${rk.id}">Excluir</button>`
            : `<button class="btn-link link-perigo" data-arquivar-rk="${rk.id}">Arquivar</button>`}
          </div>` : ''}
      </div>

      <div class="medidas">
        ${rk.medidas.length
          ? rk.medidas.map(m => linhaMedida(m, ed)).join('')
          : '<p class="rk-sub">Sem medidas. Edite o resultado-chave para definir como ele é medido.</p>'}
      </div>

      <div class="mini mini-rk">
        <div class="barra"><i style="--pct:${rk.pct}%"></i></div>
        <span>${rk.pct}% na meta</span>
      </div>

      <div class="rk-notas">
        <div class="campo"><label>O que já foi feito</label>
          ${ed ? `<textarea rows="3" data-feito>${esc(rk.feito)}</textarea>`
               : `<p class="nota-lida">${esc(rk.feito) || '<span class="rk-sub">Nada registrado.</span>'}</p>`}</div>
        <div class="campo"><label>O que falta</label>
          ${ed ? `<textarea rows="3" data-falta>${esc(rk.falta)}</textarea>`
               : `<p class="nota-lida">${esc(rk.falta) || '<span class="rk-sub">Nada registrado.</span>'}</p>`}</div>
      </div>

      ${ed ? `<div class="rk-pe">
        <div class="seg" role="radiogroup" aria-label="Concluído">
          <span class="seg-rotulo">Concluído?</span>
          <label><input type="radio" name="c-${rk.id}" value="nao" ${rk.concluido ? '' : 'checked'}><span>Não</span></label>
          <label><input type="radio" name="c-${rk.id}" value="sim" ${rk.concluido ? 'checked' : ''}><span>Sim</span></label>
        </div>
        <button class="btn btn-p" data-registrar="${rk.id}">Registrar check-in</button>
      </div>` : ''}

      <div class="rotina">
        <p class="rotulo">Rotina</p>
        ${rk.rotina.length ? `<ul class="bullets">${rk.rotina.map(r => `
          <li><span>${esc(r.titulo)}</span>${ed
            ? `<button class="btn-x" data-tirar-item="${r.id}" aria-label="Remover item">remover</button>` : ''}</li>`).join('')}</ul>`
          : '<p class="rk-sub">Nenhum item de rotina.</p>'}
        ${ed ? `<div class="add-item"><input placeholder="Novo item da rotina" data-novo-item="${rk.id}">
          <button class="btn btn-vazio btn-p" data-add-item="${rk.id}">Adicionar</button></div>` : ''}
      </div>
    </article>`;
}

/** Uma linha de medida dentro do cartão: rótulo, campo de valor, alvo e situação. */
function linhaMedida(m, ed) {
  const v = (m.valor_atual === '' || m.valor_atual === null) ? '' : m.valor_atual;
  let campo, situacao = '';

  if (m.tipo === 'marco') {
    campo = ed
      ? `<label class="marco"><input type="checkbox" data-medida="${m.id}" data-tipo="marco" ${Number(v) === 1 ? 'checked' : ''}> feito</label>`
      : `<b>${Number(v) === 1 ? 'Feito' : 'Ainda não'}</b>`;
  } else if (m.tipo === 'percentual') {
    campo = ed
      ? `<input type="number" class="inp-valor" min="0" max="100" value="${v}" data-medida="${m.id}" data-tipo="percentual"><span class="sufixo">%</span>`
      : `<b>${v === '' ? '—' : v + '%'}</b>`;
  } else {
    const pre = m.tipo === 'dinheiro' ? '<span class="prefixo">R$</span>' : '';
    campo = ed
      ? `${pre}<input type="number" class="inp-valor" step="${m.tipo === 'dinheiro' ? '0.01' : '1'}" value="${v}" data-medida="${m.id}" data-tipo="${m.tipo}">
         ${m.unidade && m.tipo !== 'dinheiro' ? `<span class="sufixo">${esc(m.unidade)}</span>` : ''}`
      : `<b>${v === '' ? '—' : (m.tipo === 'dinheiro' ? brl(v) : v + (m.unidade || ''))}</b>`;

    if (m.sentido === 'max' && v !== '') {
      situacao = m.pct === 100
        ? '<span class="chip chip-ok">Dentro do limite</span>'
        : '<span class="chip chip-alerta">Acima do limite</span>';
    }
  }

  return `
    <div class="medida" data-pct="${m.pct}">
      <div class="medida-nome">${esc(m.rotulo)}</div>
      <div class="medida-campo">${campo}</div>
      <div class="medida-alvo">${esc(alvoTexto(m))}</div>
      <div class="medida-fim">${situacao}<span class="medida-pct">${m.pct}%</span></div>
    </div>`;
}

function itemHistorico(h) {
  return `<li>
    <div class="lt-cabeca">
      <time>${quando(h.quando)}</time>
      <b>${esc(h.rk_titulo)}</b>
      ${h.concluido ? '<span class="tag tag-ok">Concluído</span>' : `<span class="tag">${h.progresso_pct}%</span>`}
      ${h.valor !== '' && h.valor !== null ? `<span class="rk-sub">valor ${esc(h.valor)}</span>` : ''}
    </div>
    ${h.feito ? `<p><span class="lt-rot">Feito</span>${esc(h.feito)}</p>` : ''}
    ${h.falta ? `<p><span class="lt-rot">Falta</span>${esc(h.falta)}</p>` : ''}
  </li>`;
}

// ------------------------------------------------------- eventos da meta

function ligarMeta() {
  const $ = (s) => document.querySelector(s);
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener('click', fn));

  $('#selPeriodo')?.addEventListener('change', (ev) => {
    const id = ev.target.value;
    location.hash = id === M.ciclo_atual_id ? `#/meta/${M.entregavel.id}` : `#/meta/${M.entregavel.id}/${id}`;
  });

  $('#btnAjustar')?.addEventListener('click', () =>
    editorPeriodo($('#edPeriodo'), M.ciclo.id, M.ciclo.periodo_inicio, M.ciclo.periodo_fim, recarregar));

  $('#btnNovoPer')?.addEventListener('click', formaNovoPeriodo);

  on('[data-lancar]', (ev) => {
    const id = ev.target.dataset.lancar;
    const campo = document.querySelector(`[data-ind="${id}"]`);
    if (!campo.value.trim()) { avisar('Digite o valor antes de lançar.'); return; }
    comBotao(ev.target, 'Lançando', async () => {
      try {
        await api('metrica.lancar', { ciclo_id: M.ciclo.id, metrica_id: id, valor: campo.value });
        avisar('Indicador lançado.');
        recarregar();
      } catch (e) { avisar(e.message); }
    });
  });

  on('[data-hist]', (ev) => {
    const box = document.getElementById('hist-' + ev.target.dataset.hist);
    box.hidden = !box.hidden;
  });

  on('[data-apagar-lanc]', async (ev) => {
    if (!confirm('Apagar este lançamento? O valor anterior volta a valer.')) return;
    try { await api('metrica.excluirLancamento', { id: ev.target.dataset.apagarLanc }); recarregar(); }
    catch (e) { avisar(e.message); }
  });

  $('#btnNovaEv')?.addEventListener('click', formaEvidencia);

  $('#fbEnviar')?.addEventListener('click', (ev) => comBotao(ev.target, 'Enviando', async () => {
    const campo = document.getElementById('fbTexto');
    if (!campo.value.trim()) { avisar('Escreva o comentário antes de enviar.'); return; }
    try {
      await api('feedback.salvar', { ciclo_id: M.ciclo.id, texto: campo.value });
      avisar('Comentário enviado.');
      recarregar();
    } catch (e) { avisar(e.message); }
  }));

  on('[data-apagar-fb]', async (ev) => {
    if (!confirm('Excluir este comentário?')) return;
    try { await api('feedback.excluir', { id: ev.target.dataset.apagarFb }); recarregar(); }
    catch (e) { avisar(e.message); }
  });

  on('[data-apagar-ev]', async (ev) => {
    if (!confirm('Excluir esta evidência?')) return;
    try { await api('registro.excluir', { id: ev.target.dataset.apagarEv }); avisar('Evidência excluída.'); recarregar(); }
    catch (e) { avisar(e.message); }
  });
  $('#btnNovoRk')?.addEventListener('click', () => formaRk());
  $('#btnDeclarar')?.addEventListener('click', formaDeclarar);

  $('#btnCopiar')?.addEventListener('click', (ev) => comBotao(ev.target, 'Copiando', async () => {
    try {
      const r = await api('periodo.copiarRks', { ciclo_id: M.ciclo.id });
      avisar(`${r.copiados} resultado(s)-chave trazidos, zerados para este período.`);
      recarregar();
    } catch (e) { avisar(e.message); }
  }));

  on('[data-editar-rk]', (ev) =>
    formaRk(M.resultados_chave.find(x => x.id === ev.target.dataset.editarRk)));

  const tirarRk = (id) => {
    M.resultados_chave = M.resultados_chave.filter(x => x.id !== id);
    desenharMeta();
  };

  on('[data-excluir-rk]', async (ev) => {
    if (!confirm('Excluir este resultado-chave de vez? Só é possível porque nada foi registrado nele ainda.')) return;
    try { await api('rk.excluir', { id: ev.target.dataset.excluirRk }); avisar('Resultado-chave excluído.'); recarregar(); }
    catch (e) { avisar(e.message); }
  });

  on('[data-arquivar-rk]', async (ev) => {
    if (!confirm('Arquivar este resultado-chave? Ele sai deste período, mas os check-ins continuam no histórico.')) return;
    const id = ev.target.dataset.arquivarRk;
    try { await api('rk.arquivar', { id }); avisar('Resultado-chave arquivado.'); tirarRk(id); }
    catch (e) { avisar(e.message); }
  });

  on('[data-excluir-rk]', async (ev) => {
    if (!confirm('Excluir este resultado-chave de vez? Ele nunca teve check-in, então nada de histórico se perde.')) return;
    const id = ev.target.dataset.excluirRk;
    try { await api('rk.excluir', { id }); avisar('Resultado-chave excluído.'); tirarRk(id); }
    catch (e) { avisar(e.message); }
  });

  /**
   * Concluir é uma decisão, não um rascunho: salva no clique.
   * Leva junto o que estiver escrito no cartão, para nada se perder.
   */
  document.querySelectorAll('.seg input[type="radio"]').forEach(r =>
    r.addEventListener('change', async () => {
      const card = r.closest('.rk');
      const id = card.dataset.rk;
      try {
        await api('rk.atualizar', Object.assign(_dadosDoCartao(card, id), { concluido: r.value === 'sim' }));
        avisar(r.value === 'sim' ? 'Resultado-chave concluído.' : 'Marcação desfeita.');
        recarregar();
      } catch (e) {
        avisar(e.message);
        recarregar();
      }
    }));

  on('[data-registrar]', (ev) => {
    const card = ev.target.closest('.rk');
    const rk = M.resultados_chave.find(x => x.id === ev.target.dataset.registrar);
    const concluido = card.querySelector(`input[name="c-${rk.id}"]:checked`).value === 'sim';
    const valores = {};
    card.querySelectorAll('[data-medida]').forEach(el => {
      valores[el.dataset.medida] = el.dataset.tipo === 'marco' ? (el.checked ? 1 : 0) : el.value;
    });
    const p = {
      id: rk.id, concluido, valores,
      feito: card.querySelector('[data-feito]').value,
      falta: card.querySelector('[data-falta]').value
    };

    comBotao(ev.target, 'Registrando', async () => {
      try {
        const r = await api('rk.atualizar', p);
        avisar(concluido && !rk.concluido ? 'Resultado-chave concluído.' : 'Check-in registrado.');

        // A resposta já traz o estado novo: a tela se corrige sozinha, sem
        // buscar o entregável inteiro de novo.
        rk.feito = p.feito; rk.falta = p.falta;
        rk.concluido = concluido; rk.pct = r.rk_pct; rk.pode_excluir = false;
        (r.medidas || []).forEach(nm => {
          const m = rk.medidas.find(x => x.id === nm.id);
          if (m) { m.valor_atual = nm.valor_atual; m.pct = nm.pct; }
        });
        M.ciclo.progresso_pct = r.progresso_pct;
        M.ciclo.xp_total = r.xp_total;
        M.ciclo.resultado_nivel = r.resultado_nivel;
        M.historico.unshift({
          rk_titulo: rk.titulo, quando: new Date().toISOString(),
          feito: p.feito, falta: p.falta,
          valor: rk.medidas.filter(m => m.valor_atual !== '' && m.valor_atual !== null)
            .map(m => m.rotulo + ': ' + (m.tipo === 'dinheiro' ? brl(m.valor_atual)
              : m.tipo === 'marco' ? (Number(m.valor_atual) === 1 ? 'feito' : 'não')
              : m.valor_atual + (m.tipo === 'percentual' ? '%' : (m.unidade || '')))).join(' · '),
          progresso_pct: r.rk_pct, concluido
        });
        desenharMeta();
      } catch (e) { avisar(e.message); }
    });
  });

  const addItem = async (rkId) => {
    const inp = document.querySelector(`[data-novo-item="${rkId}"]`);
    const titulo = inp.value.trim();
    if (!titulo) return;
    try {
      const r = await api('rotina.salvar', { resultado_chave_id: rkId, titulo });
      M.resultados_chave.find(x => x.id === rkId).rotina.push({ id: r.id, titulo });
      desenharMeta();
    } catch (e) { avisar(e.message); }
  };
  on('[data-add-item]', (ev) => addItem(ev.target.dataset.addItem));
  document.querySelectorAll('[data-novo-item]').forEach(i => i.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); addItem(i.dataset.novoItem); }
  }));

  on('[data-tirar-item]', async (ev) => {
    const id = ev.target.dataset.tirarItem;
    try {
      await api('rotina.arquivar', { id });
      M.resultados_chave.forEach(rk => { rk.rotina = rk.rotina.filter(r => r.id !== id); });
      desenharMeta();
    } catch (e) { avisar(e.message); }
  });
}

// --------------------------------------------------------------- formas

let medidasForma = [];
let tagsForma = [];

function formaRk(rk) {
  const alvo = document.getElementById('formaRk');
  const c = M.ciclo;

  tagsForma = rk && rk.tags ? rk.tags.map(t => t.id) : [];
  medidasForma = rk && rk.medidas.length
    ? rk.medidas.map(m => ({ ...m }))
    : [{ rotulo: '', tipo: 'percentual', sentido: 'min', alvo: '', unidade: '', peso: 1 }];

  alvo.innerHTML = `
    <div class="forma">
      <h3>${rk ? 'Editar resultado-chave' : 'Novo resultado-chave'}</h3>
      <div class="campo"><label for="fTitulo">O que precisa acontecer</label>
        <input id="fTitulo" value="${esc(rk?.titulo || '')}" placeholder="Ex: Campanha de setembro dentro do custo"></div>

      <p class="rotulo rotulo-secao">Como este resultado-chave é medido</p>
      <p class="campo-dica" style="margin:-6px 0 12px">Pode ter mais de uma medida. Ex: custo por lead no máximo R$ 10 e investimento de pelo menos R$ 15 mil. O avanço do resultado-chave é a média delas.</p>
      <div id="listaMedidas"></div>
      <button class="btn-link" id="addMedida">Adicionar outra medida</button>

      <p class="rotulo rotulo-secao">Tags</p>
      <p class="campo-dica" style="margin:-6px 0 12px">Duas camadas, ambas com escolha múltipla. Clique para marcar e desmarcar.</p>
      <div id="tagsForma"></div>

      <div class="dupla" style="margin-top:22px">
        <div class="campo"><label for="fIni">De</label>
          <input id="fIni" type="date" value="${rk?.periodo_inicio || c.periodo_inicio}" min="${c.periodo_inicio}" max="${c.periodo_fim}"></div>
        <div class="campo"><label for="fFim">Até</label>
          <input id="fFim" type="date" value="${rk?.periodo_fim || c.periodo_fim}" min="${c.periodo_inicio}" max="${c.periodo_fim}"></div>
      </div>
      <p class="campo-dica" style="margin-top:-8px">Dentro do período da meta: ${dia(c.periodo_inicio)} a ${dia(c.periodo_fim)}.</p>

      <div class="dupla">
        <div class="campo"><label for="fPeso">Peso dentro da meta</label>
          <input id="fPeso" type="number" min="1" max="10" value="${rk?.peso || 1}">
          <p class="campo-dica">Deixe 1 em todos se pesam igual.</p></div>
        <div class="campo"><label for="fXp">Pontos ao concluir</label>
          <input id="fXp" type="number" min="10" step="10" value="${rk?.xp || 100}"></div>
      </div>

      <div class="forma-pe"><button class="btn" id="fSalvar">Salvar</button>
        <button class="btn btn-vazio" id="fCancelar">Cancelar</button></div>
    </div>`;

  desenharMedidas();
  desenharTags();
  alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('fTitulo').focus({ preventScroll: true });

  document.getElementById('addMedida').onclick = () => {
    guardarMedidas();
    medidasForma.push({ rotulo: '', tipo: 'numero', sentido: 'min', alvo: '', unidade: '', peso: 1 });
    desenharMedidas();
  };
  document.getElementById('fCancelar').onclick = () => { alvo.innerHTML = ''; };

  document.getElementById('fSalvar').addEventListener('click', (ev) => comBotao(ev.target, 'Salvando', async () => {
    guardarMedidas();
    const v = (id) => document.getElementById(id).value.trim();
    try {
      const salvo = await api('rk.salvar', {
        id: rk?.id, entregavel_id: M.entregavel.id, ciclo_id: c.id,
        titulo: v('fTitulo'), medidas: medidasForma,
        periodo_inicio: v('fIni'), periodo_fim: v('fFim'),
        peso: v('fPeso'), xp: v('fXp')
      });
      await api('rk.tags', { resultado_chave_id: salvo.id, tag_ids: tagsForma });
      avisar(rk ? 'Resultado-chave atualizado.' : 'Resultado-chave criado.');
      recarregar();
    } catch (e) { avisar(e.message); }
  }));
}

/** Lê o que está na tela de volta para o estado, antes de redesenhar. */
function guardarMedidas() {
  document.querySelectorAll('[data-linha]').forEach((el, i) => {
    const g = (sel) => el.querySelector(sel)?.value ?? '';
    medidasForma[i] = {
      ...medidasForma[i],
      rotulo: g('[data-rot]'), tipo: g('[data-tipo]'), sentido: g('[data-sent]'),
      alvo: g('[data-alvo]'), unidade: g('[data-unid]'), peso: g('[data-peso]') || 1
    };
  });
}

function desenharTags() {
  const box = document.getElementById('tagsForma');
  if (!box) return;
  const cat = M.catalogo_tags || { produto: [], funil: [] };

  const grupo = (titulo, lista, tipo) => `
    <div class="tag-grupo">
      <p class="tag-grupo-nome">${titulo}</p>
      <div class="chips">
        ${lista.map(t => `<button type="button" class="chip-sel" data-tag="${t.id}"
          data-tipo="${t.tipo}" data-on="${tagsForma.includes(t.id) ? 1 : 0}">${esc(t.nome)}</button>`).join('')}
      </div>
      <div class="nova-tag">
        <input placeholder="Criar tag de ${titulo.toLowerCase()}" data-nova="${tipo}">
        <button type="button" class="btn-link" data-criar="${tipo}">Criar</button>
      </div>
    </div>`;

  box.innerHTML = grupo('Produto ou campanha', cat.produto, 'produto') +
                  grupo('Etapa do funil', cat.funil, 'funil');

  box.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.tag;
    const i = tagsForma.indexOf(id);
    if (i >= 0) tagsForma.splice(i, 1); else tagsForma.push(id);
    b.dataset.on = i >= 0 ? '0' : '1';
  }));

  box.querySelectorAll('[data-criar]').forEach(b => b.addEventListener('click', async () => {
    const tipo = b.dataset.criar;
    const campo = box.querySelector(`[data-nova="${tipo}"]`);
    const nome = campo.value.trim();
    if (!nome) return;
    try {
      const r = await api('tag.criar', { tipo, nome });
      const cat = M.catalogo_tags[tipo === 'funil' ? 'funil' : 'produto'];
      if (!cat.some(t => t.id === r.id)) cat.push({ id: r.id, nome, tipo });
      if (!tagsForma.includes(r.id)) tagsForma.push(r.id);
      campo.value = '';
      desenharTags();
      avisar(r.ja_existia ? 'Essa tag já existia e foi marcada.' : 'Tag criada e marcada.');
    } catch (e) { avisar(e.message); }
  }));
}

function desenharMedidas() {
  const box = document.getElementById('listaMedidas');
  box.innerHTML = medidasForma.map((m, i) => {
    const numerica = m.tipo === 'numero' || m.tipo === 'dinheiro';
    return `
    <div class="medida-forma" data-linha="${i}">
      <div class="mf-linha1">
        <input data-rot value="${esc(m.rotulo)}" placeholder="Nome da medida. Ex: custo por lead">
        <select data-tipo>${Object.entries(MEDIDAS).map(([k, v]) =>
          `<option value="${k}" ${m.tipo === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select>
        <label class="mf-peso">peso <input data-peso type="number" min="1" max="10" value="${m.peso || 1}"></label>
        ${medidasForma.length > 1 ? `<button class="btn-x btn-x-fixo" data-tirar="${i}">remover</button>` : '<span></span>'}
      </div>
      <div class="mf-linha2" ${numerica ? '' : 'hidden'}>
        <select data-sent>
          <option value="min" ${m.sentido !== 'max' ? 'selected' : ''}>Pelo menos</option>
          <option value="max" ${m.sentido === 'max' ? 'selected' : ''}>No máximo</option>
        </select>
        <input data-alvo type="number" step="${m.tipo === 'dinheiro' ? '0.01' : '1'}" value="${esc(m.alvo)}" placeholder="alvo">
        ${m.tipo === 'dinheiro' ? '<span class="mf-fixo">reais</span>'
          : `<input data-unid value="${esc(m.unidade || '')}" placeholder="unidade, ex: bugs">`}
      </div>
      <p class="campo-dica mf-dica">${MEDIDAS[m.tipo]?.dica || ''}</p>
    </div>`;
  }).join('');

  box.querySelectorAll('[data-tipo]').forEach((sel, i) => sel.addEventListener('change', () => {
    guardarMedidas();
    if (medidasForma[i].tipo === 'dinheiro') medidasForma[i].unidade = 'R$';
    desenharMedidas();
  }));
  box.querySelectorAll('[data-tirar]').forEach(b => b.addEventListener('click', () => {
    guardarMedidas();
    medidasForma.splice(Number(b.dataset.tirar), 1);
    desenharMedidas();
  }));
}

function formaEvidencia() {
  const alvo = document.getElementById('formaEv');
  alvo.innerHTML = `
    <div class="forma">
      <h3>Registrar evidência</h3>
      <div class="dupla">
        <div class="campo"><label for="evTipo">Tipo</label>
          <select id="evTipo">${Object.entries(TIPOS_EVIDENCIA)
            .map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="campo"><label for="evData">Data</label>
          <input id="evData" type="date" value="${hojeIso()}"></div>
      </div>
      <div class="campo"><label for="evTitulo">Título</label>
        <input id="evTitulo" placeholder="Ex: Teste de criativo, vídeo contra estático"></div>
      <div class="campo"><label for="evConteudo">O que foi testado ou feito</label>
        <textarea id="evConteudo" rows="2"></textarea></div>
      <div class="campo"><label for="evResultado">Resultado</label>
        <textarea id="evResultado" rows="2" placeholder="O que o teste mostrou"></textarea></div>
      <div class="campo"><label for="evUrl">Link</label>
        <input id="evUrl" type="url" placeholder="Opcional"></div>
      <div class="forma-pe"><button class="btn" id="evSalvar">Salvar</button>
        <button class="btn btn-vazio" id="evCancelar">Cancelar</button></div>
    </div>`;

  document.getElementById('evTitulo').focus();
  document.getElementById('evCancelar').onclick = () => { alvo.innerHTML = ''; };
  document.getElementById('evSalvar').addEventListener('click', (ev) => comBotao(ev.target, 'Salvando', async () => {
    const v = (id) => document.getElementById(id).value.trim();
    try {
      await api('registro.salvar', {
        ciclo_id: M.ciclo.id, tipo: v('evTipo'), titulo: v('evTitulo'),
        conteudo: v('evConteudo'), resultado: v('evResultado'), url: v('evUrl'), data: v('evData')
      });
      avisar('Evidência registrada.');
      recarregar();
    } catch (e) { avisar(e.message); }
  }));
}

function formaNovoPeriodo() {
  const alvo = document.getElementById('edPeriodo');
  const c = M.ciclo;
  const [a, m, d] = c.periodo_fim.split('-');
  const prox = new Date(Date.UTC(+a, +m - 1, +d + 1));
  const ini = prox.toISOString().substring(0, 10);
  const fimProx = new Date(Date.UTC(prox.getUTCFullYear(), prox.getUTCMonth() + 1, 0)).toISOString().substring(0, 10);

  alvo.innerHTML = `
    <div class="forma">
      <h3>Iniciar novo período</h3>
      <p class="rk-sub" style="margin-bottom:14px">O período atual é encerrado e guardado como está. Se o novo começar antes do fim do atual, o atual termina na véspera.</p>
      <div class="dupla">
        <div class="campo"><label for="pIni">Início</label><input id="pIni" type="date" value="${ini}"></div>
        <div class="campo"><label for="pFim">Fim</label><input id="pFim" type="date" value="${fimProx}"></div>
      </div>
      ${M.resultados_chave.length ? `<label class="check-linha"><input type="checkbox" id="pCopiar" checked>
        Trazer os ${M.resultados_chave.length} resultados-chave deste período, zerados, com a rotina</label>` : ''}
      <div class="forma-pe"><button class="btn" id="pSalvar">Encerrar este e iniciar o novo</button>
        <button class="btn btn-vazio" id="pCancelar">Cancelar</button></div>
    </div>`;

  document.getElementById('pCancelar').onclick = () => { alvo.innerHTML = ''; };
  document.getElementById('pSalvar').addEventListener('click', (ev) => comBotao(ev.target, 'Iniciando', async () => {
    try {
      await api('periodo.novo', {
        entregavel_id: M.entregavel.id,
        inicio: document.getElementById('pIni').value,
        fim: document.getElementById('pFim').value,
        copiar: !!document.getElementById('pCopiar')?.checked
      });
      avisar('Novo período iniciado.');
      location.hash = `#/meta/${M.entregavel.id}`;
      telaMeta(M.entregavel.id, null, true);
    } catch (e) { avisar(e.message); }
  }));
}

function formaDeclarar() {
  const alvo = document.getElementById('formDeclarar');
  const atual = M.ciclo.resultado_manual;
  alvo.innerHTML = `
    <div class="declarar">
      ${['nao_atingida', 'atingida', 'superada'].map(n => `
        <label class="dec-op"><input type="radio" name="dNivel" value="${n}" ${atual === n ? 'checked' : ''}>
          <span>${NIVEIS[n]}</span></label>`).join('')}
      <textarea id="dNota" rows="3" placeholder="Por que este é o resultado? Obrigatório.">${esc(M.ciclo.resultado_nota || '')}</textarea>
      <button class="btn btn-ouro btn-p" id="dSalvar">Salvar declaração</button>
    </div>`;

  document.getElementById('dSalvar').addEventListener('click', (ev) => comBotao(ev.target, 'Salvando', async () => {
    const n = document.querySelector('input[name="dNivel"]:checked');
    if (!n) { avisar('Escolha um dos três níveis.'); return; }
    try {
      await api('resultado.declarar', { ciclo_id: M.ciclo.id, nivel: n.value, nota: document.getElementById('dNota').value });
      avisar('Resultado declarado.');
      recarregar();
    } catch (e) { avisar(e.message); }
  }));
}

// ------------------------------------------------ meus resultados-chave

async function telaResultados() {
  mostrarTopo('/resultados');
  carregando('Reunindo seus resultados-chave');

  let d;
  try { d = await api('meus.resultados'); }
  catch (e) { tela.innerHTML = `<div class="erro">${esc(e.message)}</div>`; return; }

  const abertos = d.resultados.filter(r => !r.concluido);
  const prontos = d.resultados.filter(r => r.concluido);

  tela.innerHTML = `
    <h1 class="titulo-pagina">Seus resultados-chave</h1>
    <p class="linha-fina">Tudo que está em andamento agora, atravessando os entregáveis.</p>
    ${d.resultados.length ? `
      ${abertos.length ? `<div class="grupo-dia"><h3>Em andamento — ${abertos.length}</h3>
        <div class="lista-rk">${abertos.map(cartaoLista).join('')}</div></div>` : ''}
      ${prontos.length ? `<div class="grupo-dia"><h3>Concluídos — ${prontos.length}</h3>
        <div class="lista-rk">${prontos.map(cartaoLista).join('')}</div></div>` : ''}`
      : '<div class="vazio">Nenhum resultado-chave em período aberto.</div>'}`;
}

function cartaoLista(r) {
  return `
    <article class="cartao-rk" data-concluido="${r.concluido ? 1 : 0}">
      <h3><a href="#/meta/${r.entregavel_id}">${esc(r.titulo)}</a></h3>
      <p class="cartao-de">${esc(r.entregavel_nome)}</p>
      <div class="mini">
        <div class="barra"><i style="--pct:${r.pct}%"></i></div>
        <span>${r.concluido ? 'Concluído' : r.pct + '%'}</span>
      </div>
      <div class="medidinhas">
        <span class="medidinha">${dia(r.periodo_inicio)} a ${dia(r.periodo_fim)}</span>
        ${r.medidas.map(m => `<span class="medidinha">${esc(m.rotulo)}
          <b>${m.valor_atual === '' || m.valor_atual === null ? '—'
            : (m.tipo === 'dinheiro' ? brl(m.valor_atual)
            : m.tipo === 'marco' ? (Number(m.valor_atual) === 1 ? 'feito' : 'não')
            : m.valor_atual + (m.tipo === 'percentual' ? '%' : (m.unidade || '')))}</b></span>`).join('')}
      </div>
    </article>`;
}

// ------------------------------------------------------- meu histórico

async function telaHistorico() {
  mostrarTopo('/historico');
  carregando('Buscando seus check-ins');

  let d;
  try { d = await api('meu.historico'); }
  catch (e) { tela.innerHTML = `<div class="erro">${esc(e.message)}</div>`; return; }

  const porDia = {};
  d.historico.forEach(h => {
    const dt = new Date(h.quando);
    const chave = isNaN(dt) ? 'Sem data'
      : `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    (porDia[chave] = porDia[chave] || []).push(h);
  });

  tela.innerHTML = `
    <h1 class="titulo-pagina">Meu histórico</h1>
    <p class="linha-fina">Cada check-in que você registrou, do mais recente para o mais antigo.</p>
    ${d.historico.length
      ? Object.entries(porDia).map(([dataTxt, itens]) => `
        <div class="grupo-dia"><h3>${esc(dataTxt)}</h3>
          <ol class="linha-tempo">${itens.map(h => `<li>
            <div class="lt-cabeca">
              <time>${quando(h.quando).split(' às ')[1] || ''}</time>
              <b>${esc(h.rk_titulo)}</b>
              ${h.concluido ? '<span class="tag tag-ok">Concluído</span>'
                            : `<span class="tag">${h.progresso_pct}%</span>`}
              <a class="rk-sub" href="#/meta/${h.entregavel_id}">${esc(h.entregavel_nome)}</a>
            </div>
            ${h.valor ? `<p><span class="lt-rot">Valores</span>${esc(h.valor)}</p>` : ''}
            ${h.feito ? `<p><span class="lt-rot">Feito</span>${esc(h.feito)}</p>` : ''}
            ${h.falta ? `<p><span class="lt-rot">Falta</span>${esc(h.falta)}</p>` : ''}
          </li>`).join('')}</ol>
        </div>`).join('')
      : '<div class="vazio">Você ainda não registrou nenhum check-in.</div>'}`;
}


// ------------------------------------------------------------- equipe

const JANELAS = [
  { chave: 'atual', texto: 'Período em andamento', params: {} },
  { chave: '3', texto: 'Últimos 3 meses', params: { meses: 3 } },
  { chave: '6', texto: 'Últimos 6 meses', params: { meses: 6 } },
  { chave: '12', texto: 'Últimos 12 meses', params: { meses: 12 } }
];

let janelaEquipe = 'atual';

async function telaEquipe(silencioso) {
  mostrarTopo('/equipe');
  if (!silencioso) carregando('Reunindo a equipe');

  const j = JANELAS.find(x => x.chave === janelaEquipe) || JANELAS[0];

  let d;
  try { d = await api('equipe.painel', j.params); }
  catch (e) { tela.innerHTML = `<div class="erro">${esc(e.message)}</div>`; return; }

  const r = d.resumo;

  tela.innerHTML = `
    <section class="abertura">
      <h1>Equipe</h1>
      <p class="periodo">${esc(d.janela.rotulo)} — ${dia(d.janela.inicio)} a ${dia(d.janela.fim)}</p>
      <div class="leituras">
        <div class="leitura">
          <p class="rotulo">Execução média</p>
          <div class="leitura-num exec">${r.execucao}%</div>
          <div class="barra-clara"><i style="--pct:${r.execucao}%"></i></div>
          <p class="leitura-sub">${r.pessoas} pessoas, ${r.entregaveis} entregáveis</p>
        </div>
        <div class="leitura">
          <p class="rotulo">Metas batidas</p>
          <div class="leitura-num res">${r.metas_batidas} de ${r.metas_total}</div>
          <p class="leitura-sub">contando todos os períodos da janela</p>
        </div>
      </div>
    </section>

    <div class="cabeca-secao">
      <h2>Quem precisa de atenção primeiro</h2>
      <select id="selJanela" class="sel-periodo">
        ${JANELAS.map(x => `<option value="${x.chave}" ${x.chave === janelaEquipe ? 'selected' : ''}>${x.texto}</option>`).join('')}
      </select>
    </div>

    ${d.pessoas.length ? d.pessoas.map(linhaPessoa).join('')
      : '<div class="vazio">Ninguém com entregável nesta janela.</div>'}

    <div class="em-obras">
      <p class="rotulo">Gráfico de evolução</p>
      <p>Em desenvolvimento. Vai mostrar a curva de execução e de resultado de cada pessoa ao longo dos períodos, assim que houver períodos fechados suficientes para a linha fazer sentido.</p>
    </div>`;

  document.getElementById('selJanela').addEventListener('change', (ev) => {
    janelaEquipe = ev.target.value;
    telaEquipe(true);
  });
}

function linhaPessoa(p) {
  return `
    <article class="pessoa">
      <div class="pessoa-cabeca">
        <div>
          <h3>${esc(p.nome)}</h3>
          <p class="rk-sub">${p.papeis.filter(x => x !== 'colaborador').join(', ') || 'colaborador'}</p>
        </div>
        <div class="pessoa-nums">
          <div><span class="pessoa-num">${p.execucao}%</span><span class="rotulo">execução</span></div>
          <div><span class="pessoa-num ouro">${p.metas_batidas}/${p.metas_total}</span><span class="rotulo">metas</span></div>
        </div>
      </div>
      <div class="pessoa-metas">
        ${p.entregaveis.map(e => {
          const a = e.atual;
          return `<a class="mini-meta" href="#/meta/${e.id}" data-nivel="${a ? a.resultado_nivel : 'nao_atingida'}">
            <span class="mini-nome">${esc(e.nome)}</span>
            <span class="mini-per">${a ? `${dia(a.inicio)} a ${dia(a.fim)}` : ''}${
              e.periodos_total > 1 ? ` e mais ${e.periodos_total - 1}` : ''}</span>
            <span class="mini-barra"><i style="--pct:${a ? a.progresso_pct : 0}%"></i></span>
            <span class="mini-pct">${a ? a.progresso_pct : 0}%</span>
            <span class="mini-rk">${a ? `${a.rks_concluidos}/${a.rks_total}` : '0/0'}</span>
            <span class="mini-selo" data-nivel="${a ? a.resultado_nivel : 'nao_atingida'}">${
              NIVEIS[a ? a.resultado_nivel : 'nao_atingida']}</span>
          </a>`;
        }).join('')}
      </div>
    </article>`;
}

// ---------------------------------------------------------- relatório

let relatorio = null;

async function telaRelatorio() {
  mostrarTopo('/relatorio');
  carregando('Preparando o relatório');

  let op;
  try { op = await api('relatorio.opcoes'); }
  catch (e) { tela.innerHTML = `<div class="erro">${esc(e.message)}</div>`; return; }

  const mes = mesAtual();

  tela.innerHTML = `
    <h1 class="titulo-pagina">Relatório do período</h1>
    <p class="linha-fina">O consolidado de um intervalo, para levar para a reunião ou para fora do sistema.</p>

    <div class="filtros">
      ${op.pessoas.length > 1 ? `
        <div class="campo"><label for="relQuem">Pessoa</label>
          <select id="relQuem">${op.pessoas.map(p =>
            `<option value="${p.id}" ${p.id === sessao.usuario.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
          </select></div>` : ''}
      <div class="campo"><label for="relIni">De</label><input id="relIni" type="date" value="${mes.inicio}"></div>
      <div class="campo"><label for="relFim">Até</label><input id="relFim" type="date" value="${mes.fim}"></div>
      <button class="btn" id="relGerar">Gerar</button>
    </div>

    <div id="saidaRel"></div>`;

  document.getElementById('relGerar').addEventListener('click', (ev) =>
    comBotao(ev.target, 'Gerando', gerarRelatorio));

  gerarRelatorio();
}

async function gerarRelatorio() {
  const saida = document.getElementById('saidaRel');
  saida.innerHTML = '<p class="carregando">Montando…</p>';

  try {
    relatorio = await api('relatorio.gerar', {
      usuario_id: document.getElementById('relQuem')?.value,
      inicio: document.getElementById('relIni').value,
      fim: document.getElementById('relFim').value
    });
  } catch (e) {
    saida.innerHTML = `<div class="erro">${esc(e.message)}</div>`;
    return;
  }

  const d = relatorio, r = d.resumo;

  saida.innerHTML = `
    <div class="rel-cabeca">
      <div>
        <h2>${esc(d.pessoa.nome)}</h2>
        <p class="rk-sub">${dia(d.janela.inicio)} a ${dia(d.janela.fim)} — ${r.periodos} ${r.periodos === 1 ? 'período' : 'períodos'}</p>
      </div>
      <button class="btn btn-vazio" id="relCsv" ${r.periodos ? '' : 'disabled'}>Baixar CSV</button>
    </div>

    <div class="rel-numeros">
      ${[['Execução média', r.execucao + '%'], ['Metas batidas', r.metas_batidas + ' de ' + r.periodos],
         ['Resultados-chave', r.rks_concluidos + ' de ' + r.rks],
         ['Evidências', r.evidencias], ['Check-ins', r.checkins]]
        .map(([t, v]) => `<div class="rel-num"><span>${v}</span><p class="rotulo">${t}</p></div>`).join('')}
    </div>

    ${d.blocos.length ? d.blocos.map(blocoRelatorio).join('')
      : '<div class="vazio">Nenhum período nesse intervalo.</div>'}`;

  document.getElementById('relCsv')?.addEventListener('click', baixarCsv);
}

function blocoRelatorio(b) {
  const linha = (rot, val) => val ? `<p class="rel-linha"><span class="lt-rot">${rot}</span>${esc(val)}</p>` : '';

  return `
    <section class="rel-bloco">
      <div class="rel-bloco-topo" data-nivel="${b.resultado_nivel}">
        <div>
          <h3>${esc(b.entregavel)}</h3>
          <p class="rk-sub">${dia(b.periodo_inicio)} a ${dia(b.periodo_fim)}${b.status === 'aberto' ? ' (em andamento)' : ''}</p>
        </div>
        <div class="rel-selo">
          <span class="selo-nivel">${NIVEIS[b.resultado_nivel]}</span>
          <span class="rk-sub">execução ${b.progresso_pct}%</span>
        </div>
      </div>

      ${b.indicadores.length ? `
        <p class="rotulo rel-rotulo">Indicadores</p>
        <table class="rel-tabela"><tbody>
          ${b.indicadores.map(m => `<tr><td>${esc(m.rotulo)}</td>
            <td class="num">${m.valor_atual === null ? '—' : esc(String(m.valor_atual)) + esc(m.unidade || '')}</td>
            <td class="rk-sub">${m.lancamentos.length} lançamento${m.lancamentos.length === 1 ? '' : 's'}</td></tr>`).join('')}
        </tbody></table>` : ''}

      ${b.resultados_chave.length ? `
        <p class="rotulo rel-rotulo">Resultados-chave</p>
        ${b.resultados_chave.map(r => `
          <div class="rel-rk">
            <div class="rel-rk-topo">
              <b>${esc(r.titulo)}</b>
              <span class="${r.concluido ? 'tag tag-ok' : 'tag'}">${r.concluido ? 'Concluído' : r.pct + '%'}</span>
              <span class="rk-sub">${dia(r.periodo_inicio)} a ${dia(r.periodo_fim)}</span>
            </div>
            ${r.medidas.length ? `<table class="rel-tabela"><tbody>
              ${r.medidas.map(m => `<tr><td>${esc(m.rotulo)}</td>
                <td class="num">${m.tipo === 'marco' ? (Number(m.valor_atual) === 1 ? 'feito' : 'não')
                  : (m.valor_atual === '' || m.valor_atual === null ? '—'
                    : (m.tipo === 'dinheiro' ? brl(m.valor_atual) : esc(String(m.valor_atual)) + esc(m.unidade || '')))}</td>
                <td class="rk-sub">${esc(alvoTexto(m))}</td>
                <td class="num">${m.pct}%</td></tr>`).join('')}
            </tbody></table>` : ''}
            ${linha('Feito', r.feito)}${linha('Falta', r.falta)}
          </div>`).join('')}` : ''}

      ${b.evidencias.length ? `
        <p class="rotulo rel-rotulo">Evidências</p>
        ${b.evidencias.map(e => `<div class="rel-ev">
          <b>${esc(e.titulo)}</b> <span class="rk-sub">${dia(e.data)} — ${esc(TIPOS_EVIDENCIA[e.tipo] || 'Nota')}</span>
          ${e.resultado ? `<p class="rel-linha">${esc(e.resultado)}</p>` : ''}</div>`).join('')}` : ''}

      ${b.conversa.length ? `
        <p class="rotulo rel-rotulo">Conversa</p>
        ${b.conversa.map(f => `<p class="rel-linha"><span class="lt-rot">${esc(f.por)}</span>${esc(f.texto)}</p>`).join('')}` : ''}
    </section>`;
}

/**
 * CSV em formato longo: uma linha por item, com a seção na coluna.
 * Ponto e vírgula e BOM porque é o que o Excel em português abre sem
 * perguntar nada e sem quebrar acento.
 */
function baixarCsv() {
  if (!relatorio) return;
  const d = relatorio;
  const linhas = [['Pessoa', 'Entregável', 'Período', 'Seção', 'Item', 'Detalhe', 'Valor', 'Situação']];

  d.blocos.forEach(b => {
    const per = `${b.periodo_inicio} a ${b.periodo_fim}`;
    const base = [d.pessoa.nome, b.entregavel, per];

    linhas.push([...base, 'Resumo', 'Execução', '', b.progresso_pct + '%', NIVEIS[b.resultado_nivel]]);

    b.indicadores.forEach(m => linhas.push([...base, 'Indicador', m.rotulo, m.unidade || '',
      m.valor_atual === null ? '' : m.valor_atual, m.lancamentos.length + (m.lancamentos.length === 1 ? ' lançamento' : ' lançamentos')]));

    b.resultados_chave.forEach(r => {
      linhas.push([...base, 'Resultado-chave', r.titulo,
        `${r.periodo_inicio} a ${r.periodo_fim}`, r.pct + '%',
        r.concluido ? 'Concluído' : 'Em andamento']);
      r.medidas.forEach(m => linhas.push([...base, 'Medida', r.titulo + ' — ' + m.rotulo,
        alvoTexto(m), m.valor_atual === '' || m.valor_atual === null ? '' : m.valor_atual, m.pct + '%']));
      if (r.feito) linhas.push([...base, 'Feito', r.titulo, '', r.feito, '']);
      if (r.falta) linhas.push([...base, 'Falta', r.titulo, '', r.falta, '']);
    });

    b.evidencias.forEach(e => linhas.push([...base, 'Evidência', e.titulo,
      TIPOS_EVIDENCIA[e.tipo] || 'Nota', e.resultado || e.conteudo || '', e.data]));

    b.checkins.forEach(h => linhas.push([...base, 'Check-in', h.rk_titulo,
      h.quando, (h.feito || '') + (h.falta ? ' | Falta: ' + h.falta : ''),
      h.concluido ? 'Concluído' : h.progresso_pct + '%']));

    b.conversa.forEach(f => linhas.push([...base, 'Conversa', f.por, f.quando, f.texto, '']));
  });

  const escapa = (v) => {
    const t = String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return /[";]/.test(t) ? `"${t}"` : t;
  };
  const csv = '\ufeff' + linhas.map(l => l.map(escapa).join(';')).join('\r\n');

  const nome = `4metas_${d.pessoa.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${d.janela.inicio}_a_${d.janela.fim}.csv`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
  avisar('CSV baixado.');
}

// ----------------------------------------------------------------- rotas

function rotear() {
  const rota = location.hash.replace(/^#/, '') || '/painel';
  if (!sessao.token && rota !== '/entrar') { location.hash = '#/entrar'; return; }

  if (rota === '/entrar') return telaEntrar();
  if (rota === '/senha') return telaSenha(true);
  if (rota === '/acesso') return telaSenha(false);
  if (rota === '/painel') return telaPainel();
  if (rota === '/resultados') return telaResultados();
  if (rota === '/historico') return telaHistorico();
  if (rota === '/novo') return telaNovo();
  if (rota === '/equipe') return telaEquipe();
  if (rota === '/relatorio') return telaRelatorio();

  const m = rota.match(/^\/meta\/([^/]+)(?:\/([^/]+))?$/);
  if (m) return telaMeta(m[1], m[2]);

  location.hash = '#/painel';
}

document.getElementById('btnSair').addEventListener('click', async () => {
  try { await api('auth.logout'); } catch { }
  sessao.fechar();
  location.hash = '#/entrar';
});

window.addEventListener('hashchange', rotear);
rotear();
