/* ==========================================================================
   4Metas — cliente da API

   Regra que não pode ser quebrada: POST com Content-Type text/plain e o
   token dentro do corpo. Qualquer header extra (Authorization, JSON, X-Token)
   faz o navegador disparar um OPTIONS antes, o Apps Script não responde a
   OPTIONS, e a chamada morre com um erro de CORS que parece queda de rede.
   ========================================================================== */

const API_URL = 'https://script.google.com/macros/s/AKfycbyftOsjOuWjIH3-TCIkouPjBgER-i1UoPXWpT-yerzMAKCn0X2tV9_owpVzD1BTKUNkcw/exec';

const CHAVE_TOKEN = '4metas_token';
const CHAVE_USER  = '4metas_usuario';

const sessao = {
  get token() {
    try { return localStorage.getItem(CHAVE_TOKEN) || ''; } catch { return ''; }
  },
  get usuario() {
    try { return JSON.parse(localStorage.getItem(CHAVE_USER) || 'null'); }
    catch { return null; }
  },
  abrir(token, usuario) {
    try {
      localStorage.setItem(CHAVE_TOKEN, token);
      localStorage.setItem(CHAVE_USER, JSON.stringify(usuario));
    } catch {}
  },
  fechar() {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
      localStorage.removeItem(CHAVE_USER);
    } catch {}
  }
};

class ErroApi extends Error {
  constructor(mensagem, tipo) {
    super(mensagem);
    this.tipo = tipo || 'ERRO';
  }
}

async function api(acao, params = {}) {
  let resposta;
  try {
    resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ acao, token: sessao.token, params })
    });
  } catch {
    throw new ErroApi('Não foi possível falar com o servidor. Verifique a conexão.', 'REDE');
  }

  let json;
  try {
    json = await resposta.json();
  } catch {
    throw new ErroApi('O servidor respondeu em um formato inesperado.', 'FORMATO');
  }

  if (!json.ok) {
    if (json.tipo === 'AUTH') {
      sessao.fechar();
      location.hash = '#/entrar';
    }
    throw new ErroApi(json.erro || 'Algo não funcionou.', json.tipo);
  }

  return json.dados;
}
