/* ==========================================================================
   4Metas — telas
   Rotas: #/entrar · #/senha · #/painel · #/meta/<id>
   ========================================================================== */

const tela     = document.getElementById('tela');
const topo     = document.getElementById('topo');
const topoNome = document.getElementById('topoNome');
const aviso    = document.getElementById('aviso');

const NIVEIS = {
  nao_atingida: 'Não atingida',
  atingida:     'Atingida',
  superada:     'Superada'
};

const PERIODICIDADES = [
  ['semanal', 'Semanal'],
  ['quinzenal', 'Quinzenal'],
  ['mensal', 'Mensal'],
  ['trimestral', 'Trimestral'],
  ['campanha', 'Por campanha']
];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ------------------------------------------------------------- utilidades

const esc = (t) => String(t ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function dia(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).substring(0, 10).split('-');
  return `${d}/${m}`;
}

function periodoLongo(inicio, fim) {
  if (!inicio) return '';
  const [a, m, d] = inicio.split('-');
  const [, mf, df] = (fim || inicio).split('-');
  if (d === '01' && m === mf) return `${MESES[+m - 1]} de ${a}`;
  return `${dia(inicio)} a ${dia(fim)}`;
}

function diasRestantes(fim) {
  if (!fim) return null;
  const hoje = new Date();
  const alvo = new Date(fim + 'T12:00:00Z');
  return Math.ceil((alvo - hoje) / 86400000);
}

let avisoTimer;
function avisar(texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { aviso.hidden = true; }, 3200);
}

function carregando(texto = 'Carregando') {
  tela.innerHTML = `<p class="carregando">${esc(texto)}…</p>`;
}

function mostrarTopo() {
  const u = sessao.usuario;
  if (!u) { topo.hidden = true; return; }
  topo.hidden = false;
  topoNome.textContent = u.nome;
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
        <div class="campo">
          <label for="email">E-mail</label>
          <input id="email" type="email" autocomplete="username" required>
        </div>
        <div class="campo">
          <label for="senha">Senha</label>
          <input id="senha" type="password" autocomplete="current-password" required>
        </div>
        <button class="btn" type="submit" id="btnEntrar">Entrar</button>
      </form>
    </div>`;

  document.getElementById('formEntrar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('btnEntrar');
    btn.disabled = true;
    btn.textContent = 'Entrando';

    try {
      const d = await api('auth.login', {
        email: document.getElementById('email').value.trim(),
        senha: document.getElementById('senha').value
      });
      sessao.abrir(d.token, d.usuario);
      location.hash = d.usuario.precisa_trocar_senha ? '#/senha' : '#/painel';
    } catch (e) {
      telaEntrar(e.message);
    }
  });
}

// ------------------------------------------------------------ trocar senha

function telaSenha() {
  mostrarTopo();
  tela.innerHTML = `
    <div class="entrar">
      <h1 style="font-size:28px;letter-spacing:-.025em;margin-bottom:8px">Crie sua senha</h1>
      <p class="linha-fina">Você entrou com a senha inicial. Escolha uma sua para continuar.</p>
      <div id="erroSenha"></div>
      <form id="formSenha" novalidate>
        <div class="campo">
          <label for="atual">Senha inicial</label>
          <input id="atual" type="password" autocomplete="current-password" required>
        </div>
        <div class="campo">
          <label for="nova">Nova senha</label>
          <input id="nova" type="password" autocomplete="new-password" required>
          <p class="campo-dica">Mínimo de 8 caracteres.</p>
        </div>
        <div class="campo">
          <label for="conf">Repita a nova senha</label>
          <input id="conf" type="password" autocomplete="new-password" required>
        </div>
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
      await api('auth.trocarSenha', {
        senha_atual: document.getElementById('atual').value,
        senha_nova: nova
      });
      const u = sessao.usuario;
      u.precisa_trocar_senha = false;
      sessao.abrir(sessao.token, u);
      avisar('Senha salva.');
      location.hash = '#/painel';
    } catch (e) {
      erro.innerHTML = `<div class="erro">${esc(e.message)}</div>`;
    }
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
  const execMedia = comCiclo.length
    ? Math.round(comCiclo.reduce((s, e) => s + e.ciclo.progresso_pct, 0) / comCiclo.length)
    : 0;

  const ref = comCiclo[0]?.ciclo;
  const restam = ref ? diasRestantes(ref.periodo_fim) : null;

  tela.innerHTML = `
    <section class="abertura">
      <h1>${esc(d.usuario)}</h1>
      <p class="periodo">${ref ? esc(periodoLongo(ref.periodo_inicio, ref.periodo_fim)) : 'Sem ciclo aberto'}${
        restam !== null && restam >= 0 ? ` — faltam ${restam} ${restam === 1 ? 'dia' : 'dias'}` : ''}</p>

      <div class="leituras">
        <div class="leitura">
          <p class="rotulo">Execução</p>
          <div class="leitura-num exec">${execMedia}%</div>
          <div class="barra-clara"><i style="--pct:${execMedia}%"></i></div>
          <p class="leitura-sub">${d.xp_periodo} pontos no período</p>
        </div>
        <div class="leitura">
          <p class="rotulo">Resultado</p>
          <div class="leitura-num res">${batidas} de ${comCiclo.length}</div>
          <p class="leitura-sub">metas batidas até agora</p>
        </div>
      </div>
    </section>

    <h2 style="font-size:19px;letter-spacing:-.018em;margin-bottom:14px">Seus entregáveis</h2>
    ${d.entregaveis.length ? `<div class="trilha">${d.entregaveis.map(faixa).join('')}</div>`
      : '<div class="vazio">Nenhum entregável ativo por aqui.</div>'}`;
}

function faixa(e) {
  const c = e.ciclo;
  const nivel = c ? c.resultado_nivel : 'nao_atingida';
  const pct = c ? c.progresso_pct : 0;

  return `
    <a class="faixa" href="#/meta/${e.id}" data-nivel="${nivel}">
      <span class="faixa-aresta"></span>
      <div class="faixa-corpo">
        <h2>${esc(e.nome)}</h2>
        <p class="faixa-meta">${c ? esc(periodoLongo(c.periodo_inicio, c.periodo_fim)) : 'Sem ciclo aberto'}</p>
        <div class="barra"><i style="--pct:${pct}%"></i></div>
        <div class="barra-legenda">
          <span>Execução ${pct}%</span>
          <span>${c ? c.xp_total : 0} pontos</span>
        </div>
      </div>
      <div class="selo" data-nivel="${nivel}">
        <p class="rotulo">Resultado</p>
        <span class="selo-nivel">${NIVEIS[nivel]}</span>
      </div>
    </a>`;
}

// ----------------------------------------------------------------- detalhe

let painelAtual = null;

async function telaMeta(id) {
  mostrarTopo();
  carregando('Abrindo o entregável');

  try { painelAtual = await api('painel.entregavel', { id }); }
  catch (e) { tela.innerHTML = `<div class="erro">${esc(e.message)}</div>`; return; }

  desenharMeta();
}

function desenharMeta() {
  const d = painelAtual;
  const e = d.entregavel;
  const c = d.ciclo;
  const nivel = c ? c.resultado_nivel : 'nao_atingida';

  tela.innerHTML = `
    <a class="voltar" href="#/painel">Voltar ao painel</a>

    <div class="detalhe">
      <aside class="contrato">
        <h1>${esc(e.nome)}</h1>
        <p>${esc(e.descricao)}</p>

        <p class="rotulo">Objetivo</p>
        <p>${esc(e.objetivo)}</p>

        <p class="rotulo">Como é medido</p>
        <p class="formula">${esc(e.formula_texto)}</p>

        <p class="rotulo">Os três níveis</p>
        <div class="degraus">
          ${['nao_atingida', 'atingida', 'superada'].map(n => {
            const cr = d.criterios.find(x => x.nivel === n);
            if (!cr) return '';
            return `<div class="degrau" data-nivel="${n}" data-ativo="${nivel === n ? 1 : 0}">
              <b>${NIVEIS[n]}</b>${esc(cr.texto)}</div>`;
          }).join('')}
        </div>
      </aside>

      <section class="trabalho">
        <div class="cabeca-secao">
          <h2>Resultados-chave</h2>
          ${d.sou_dono ? '<button class="btn btn-vazio btn-p" id="btnNovoRk">Adicionar</button>' : ''}
        </div>

        <div id="formaRk"></div>

        ${d.resultados_chave.length
          ? d.resultados_chave.map(rk => blocoRk(rk, d.sou_dono)).join('')
          : `<div class="vazio">Nenhum resultado-chave ainda. ${d.sou_dono
              ? 'Adicione o primeiro para começar a medir a execução deste entregável.'
              : ''}</div>`}
      </section>
    </div>`;

  ligarEventosMeta();
}

function blocoRk(rk, souDono) {
  const feitas = rk.ocorrencias.filter(o => o.progresso_pct >= 100).length;

  return `
    <article class="rk" data-rk="${rk.id}">
      <div class="rk-topo">
        <div style="min-width:0">
          <h3>${esc(rk.titulo)}</h3>
          <p class="rk-sub">${rotuloPeriodicidade(rk.periodicidade)}${
            rk.alvo ? ` — alvo ${esc(rk.alvo)}${esc(rk.unidade || '')}` : ''} · ${
            feitas} de ${rk.ocorrencias.length} concluídos</p>
        </div>
        ${souDono ? `<div class="rk-acoes">
          <button class="btn-texto" data-editar-rk="${rk.id}" style="color:var(--cinza)">Editar</button>
          <button class="btn-texto link-perigo" data-arquivar-rk="${rk.id}">Arquivar</button>
        </div>` : ''}
      </div>

      <div class="ocorrencias">
        ${rk.ocorrencias.length ? rk.ocorrencias.map(o => `
          <div class="oc" data-feito="${o.progresso_pct >= 100 ? 1 : 0}">
            <span class="oc-periodo">${dia(o.periodo_inicio)} a ${dia(o.periodo_fim)}</span>
            <input type="number" min="0" max="100" value="${o.progresso_pct}"
                   ${souDono ? '' : 'disabled'} data-oc="${o.id}" aria-label="Avanço em porcentagem">
            <span>%</span>
          </div>`).join('')
          : '<p class="rk-sub">Sem ocorrências neste ciclo.</p>'}
      </div>

      <div class="rotinas">
        ${rk.rotinas.map(r => linhaRotina(r, rk, souDono)).join('')}
        ${souDono ? `<button class="btn-texto" data-nova-rotina="${rk.id}"
          style="margin-top:10px;color:var(--azul)">Adicionar rotina</button>` : ''}
      </div>
    </article>`;
}

function linhaRotina(r, rk, souDono) {
  const atual = rk.ocorrencias[rk.ocorrencias.length - 1];
  const feita = atual ? r.execucoes.find(x => x.kr_ciclo_id === atual.id) : null;

  return `
    <label class="rotina">
      <input type="checkbox" ${feita ? 'checked' : ''} ${souDono && atual ? '' : 'disabled'}
             data-rotina="${r.id}" data-oc-atual="${atual ? atual.id : ''}"
             data-execucao="${feita ? feita.id : ''}">
      <span class="rotina-txt">
        <span class="${feita ? 'rotina-feita' : ''}">${esc(r.titulo)}</span>
        ${r.execucoes.length
          ? `<span class="rotina-quando">Feita ${r.execucoes.length}${
              r.execucoes.length === 1 ? ' vez' : ' vezes'} neste ciclo, última em ${
              dia(r.execucoes[r.execucoes.length - 1].data)}</span>`
          : ''}
      </span>
    </label>`;
}

function rotuloPeriodicidade(p) {
  const achado = PERIODICIDADES.find(x => x[0] === p);
  return achado ? achado[1] : 'Mensal';
}

// ------------------------------------------------------- eventos da meta

function ligarEventosMeta() {
  const btnNovo = document.getElementById('btnNovoRk');
  if (btnNovo) btnNovo.addEventListener('click', () => formaRk());

  document.querySelectorAll('[data-editar-rk]').forEach(b =>
    b.addEventListener('click', () => {
      const rk = painelAtual.resultados_chave.find(x => x.id === b.dataset.editarRk);
      formaRk(rk);
    }));

  document.querySelectorAll('[data-arquivar-rk]').forEach(b =>
    b.addEventListener('click', async () => {
      if (!confirm('Arquivar este resultado-chave? Ele sai do ciclo atual, mas o histórico fica.')) return;
      try {
        await api('rk.arquivar', { id: b.dataset.arquivarRk });
        avisar('Resultado-chave arquivado.');
        telaMeta(painelAtual.entregavel.id);
      } catch (e) { avisar(e.message); }
    }));

  document.querySelectorAll('[data-oc]').forEach(inp =>
    inp.addEventListener('change', async () => {
      const pct = Math.max(0, Math.min(100, Number(inp.value) || 0));
      inp.value = pct;
      try {
        await api('rk.progresso', { kr_ciclo_id: inp.dataset.oc, progresso_pct: pct });
        avisar('Avanço registrado.');
        telaMeta(painelAtual.entregavel.id);
      } catch (e) { avisar(e.message); }
    }));

  document.querySelectorAll('[data-rotina]').forEach(chk =>
    chk.addEventListener('change', async () => {
      try {
        if (chk.checked) {
          await api('rotina.marcar', {
            rotina_id: chk.dataset.rotina,
            kr_ciclo_id: chk.dataset.ocAtual
          });
          avisar('Rotina marcada como feita.');
        } else if (chk.dataset.execucao) {
          await api('rotina.desmarcar', { id: chk.dataset.execucao });
          avisar('Marcação desfeita.');
        }
        telaMeta(painelAtual.entregavel.id);
      } catch (e) {
        chk.checked = !chk.checked;
        avisar(e.message);
      }
    }));

  document.querySelectorAll('[data-nova-rotina]').forEach(b =>
    b.addEventListener('click', () => formaRotina(b.dataset.novaRotina)));
}

// --------------------------------------------------------------- formas

function formaRk(rk) {
  const alvo = document.getElementById('formaRk');
  alvo.innerHTML = `
    <div class="forma">
      <h3>${rk ? 'Editar resultado-chave' : 'Novo resultado-chave'}</h3>
      <div class="campo">
        <label for="rkTitulo">O que precisa acontecer</label>
        <input id="rkTitulo" value="${esc(rk?.titulo || '')}"
               placeholder="Ex: Rodar 4 testes de criativo por mês">
      </div>
      <div class="dupla">
        <div class="campo">
          <label for="rkPeriodo">Com que frequência</label>
          <select id="rkPeriodo">
            ${PERIODICIDADES.map(([v, t]) =>
              `<option value="${v}" ${rk?.periodicidade === v ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <p class="campo-dica">Pode ser diferente da periodicidade da meta.</p>
        </div>
        <div class="campo">
          <label for="rkAlvo">Número a alcançar</label>
          <input id="rkAlvo" value="${esc(rk?.alvo || '')}" placeholder="Opcional">
        </div>
      </div>
      <div class="dupla">
        <div class="campo">
          <label for="rkPeso">Peso dentro da meta</label>
          <input id="rkPeso" type="number" min="1" max="10" value="${rk?.peso || 1}">
          <p class="campo-dica">Deixe 1 em todos se pesam igual.</p>
        </div>
        <div class="campo">
          <label for="rkXp">Pontos ao concluir</label>
          <input id="rkXp" type="number" min="10" step="10" value="${rk?.xp || 100}">
        </div>
      </div>
      <div class="forma-pe">
        <button class="btn" id="rkSalvar">Salvar</button>
        <button class="btn btn-vazio" id="rkCancelar">Cancelar</button>
      </div>
    </div>`;

  document.getElementById('rkTitulo').focus();
  document.getElementById('rkCancelar').addEventListener('click', () => { alvo.innerHTML = ''; });

  document.getElementById('rkSalvar').addEventListener('click', async () => {
    const titulo = document.getElementById('rkTitulo').value.trim();
    if (!titulo) { avisar('Escreva o que precisa acontecer.'); return; }

    try {
      await api('rk.salvar', {
        id: rk?.id,
        entregavel_id: painelAtual.entregavel.id,
        titulo,
        periodicidade: document.getElementById('rkPeriodo').value,
        alvo: document.getElementById('rkAlvo').value.trim(),
        peso: document.getElementById('rkPeso').value,
        xp: document.getElementById('rkXp').value
      });
      avisar(rk ? 'Resultado-chave atualizado.' : 'Resultado-chave criado.');
      telaMeta(painelAtual.entregavel.id);
    } catch (e) { avisar(e.message); }
  });
}

function formaRotina(rkId) {
  const titulo = prompt('Qual rotina você faz para chegar neste resultado?');
  if (!titulo || !titulo.trim()) return;

  api('rotina.salvar', { resultado_chave_id: rkId, titulo: titulo.trim() })
    .then(() => {
      avisar('Rotina adicionada.');
      telaMeta(painelAtual.entregavel.id);
    })
    .catch(e => avisar(e.message));
}

// ----------------------------------------------------------------- rotas

function rotear() {
  const rota = location.hash.replace(/^#/, '') || '/painel';

  if (!sessao.token && rota !== '/entrar') { location.hash = '#/entrar'; return; }

  if (rota === '/entrar') return telaEntrar();
  if (rota === '/senha')  return telaSenha();
  if (rota === '/painel') return telaPainel();

  const meta = rota.match(/^\/meta\/(.+)$/);
  if (meta) return telaMeta(meta[1]);

  location.hash = '#/painel';
}

document.getElementById('btnSair').addEventListener('click', async () => {
  try { await api('auth.logout'); } catch {}
  sessao.fechar();
  location.hash = '#/entrar';
});

window.addEventListener('hashchange', rotear);
rotear();
