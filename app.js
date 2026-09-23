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

function mostrarTopo() {
  const u = sessao.usuario;
  topo.hidden = !u;
  if (u) topoNome.textContent = u.nome;
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

function telaSenha() {
  mostrarTopo();
  tela.innerHTML = `
    <div class="entrar">
      <h1 class="titulo-pagina">Crie sua senha</h1>
      <p class="linha-fina">Você entrou com a senha inicial. Escolha uma sua para continuar.</p>
      <div id="erroSenha"></div>
      <form id="formSenha" novalidate>
        <div class="campo"><label for="atual">Senha inicial</label>
          <input id="atual" type="password" autocomplete="current-password"></div>
        <div class="campo"><label for="nova">Nova senha</label>
          <input id="nova" type="password" autocomplete="new-password">
          <p class="campo-dica">Mínimo de 8 caracteres.</p></div>
        <div class="campo"><label for="conf">Repita a nova senha</label>
          <input id="conf" type="password" autocomplete="new-password"></div>
        <button class="btn" type="submit">Salvar senha</button>
      </form>
    </div>`;

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
      location.hash = '#/painel';
    } catch (e) { erro.innerHTML = `<div class="erro">${esc(e.message)}</div>`; }
  });
}

// ------------------------------------------------------------------ painel

async function telaPainel() {
  mostrarTopo();
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
  mostrarTopo();
  carregando('Preparando');

  let pessoas = [];
  try { pessoas = await api('catalogo.usuarios'); } catch { }
  const eu = sessao.usuario;
  const mes = mesAtual();

  tela.innerHTML = `
    <a class="voltar" href="#/painel">Voltar ao painel</a>
    <div class="pagina-forma">
      <h1 class="titulo-pagina">Novo entregável</h1>
      <p class="linha-fina">Depois de criar, você adiciona os resultados-chave e a rotina de cada um.</p>

      ${pessoas.length > 1 ? `
      <div class="campo"><label for="nResp">Responsável</label>
        <select id="nResp">${pessoas.filter(p => p.ativo !== false).map(p =>
          `<option value="${p.id}" ${p.id === eu.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
        </select></div>` : ''}

      <div class="campo"><label for="nNome">Nome</label>
        <input id="nNome" placeholder="Ex: MKT - Migração do CRM"></div>
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
      <p class="campo-dica">Como os níveis são escritos em texto, o resultado deste entregável será declarado ao fim do período, com uma justificativa.</p>

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

  document.getElementById('nSalvar').addEventListener('click', (ev) => comBotao(ev.target, 'Criando', async () => {
    const v = (id) => (document.getElementById(id)?.value || '').trim();
    try {
      const r = await api('entregavel.criar', {
        usuario_id: v('nResp') || eu.id,
        nome: v('nNome'), descricao: v('nDesc'), objetivo: v('nObj'), formula_texto: v('nForm'),
        nao_atingida: v('nN0'), atingida: v('nN1'), superada: v('nN2'),
        inicio: v('nIni'), fim: v('nFim'), periodicidade: v('nPer')
      });
      avisar('Entregável criado. Agora adicione os resultados-chave.');
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
  mostrarTopo();
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

        <div class="cabeca-secao cabeca-historico"><h2>Histórico do período</h2></div>
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
          <p class="rk-sub">${dia(rk.periodo_inicio)} a ${dia(rk.periodo_fim)}</p>
        </div>
        ${ed ? `<div class="rk-acoes">
          <button class="btn-link" data-editar-rk="${rk.id}">Editar</button>
          <button class="btn-link link-perigo" data-arquivar-rk="${rk.id}">Arquivar</button></div>` : ''}
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
        <button class="btn btn-p" data-registrar="${rk.id}">Registrar atualização</button>
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

  on('[data-arquivar-rk]', async (ev) => {
    if (!confirm('Arquivar este resultado-chave? Ele sai deste período, mas o que foi registrado continua no histórico.')) return;
    try { await api('rk.arquivar', { id: ev.target.dataset.arquivarRk }); avisar('Resultado-chave arquivado.'); recarregar(); }
    catch (e) { avisar(e.message); }
  });

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
        await api('rk.atualizar', p);
        avisar(concluido && !rk.concluido ? 'Resultado-chave concluído.' : 'Atualização registrada no histórico.');
        recarregar();
      } catch (e) { avisar(e.message); }
    });
  });

  const addItem = async (rkId) => {
    const inp = document.querySelector(`[data-novo-item="${rkId}"]`);
    const titulo = inp.value.trim();
    if (!titulo) return;
    try { await api('rotina.salvar', { resultado_chave_id: rkId, titulo }); recarregar(); }
    catch (e) { avisar(e.message); }
  };
  on('[data-add-item]', (ev) => addItem(ev.target.dataset.addItem));
  document.querySelectorAll('[data-novo-item]').forEach(i => i.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); addItem(i.dataset.novoItem); }
  }));

  on('[data-tirar-item]', async (ev) => {
    try { await api('rotina.arquivar', { id: ev.target.dataset.tirarItem }); recarregar(); }
    catch (e) { avisar(e.message); }
  });
}

// --------------------------------------------------------------- formas

let medidasForma = [];

function formaRk(rk) {
  const alvo = document.getElementById('formaRk');
  const c = M.ciclo;

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
      await api('rk.salvar', {
        id: rk?.id, entregavel_id: M.entregavel.id, ciclo_id: c.id,
        titulo: v('fTitulo'), medidas: medidasForma,
        periodo_inicio: v('fIni'), periodo_fim: v('fFim'),
        peso: v('fPeso'), xp: v('fXp')
      });
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

// ----------------------------------------------------------------- rotas

function rotear() {
  const rota = location.hash.replace(/^#/, '') || '/painel';
  if (!sessao.token && rota !== '/entrar') { location.hash = '#/entrar'; return; }

  if (rota === '/entrar') return telaEntrar();
  if (rota === '/senha') return telaSenha();
  if (rota === '/painel') return telaPainel();
  if (rota === '/novo') return telaNovo();

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
