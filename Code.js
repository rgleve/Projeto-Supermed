// Teste de sincronização via VS Code e clasp
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Portal Supermed')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const ID_PLANILHA_DADOS = '1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg';
const ID_PLANILHA_AUTH = '1GJO1tynFgWm2j34wNpNSFOlErXJ9cyeGoW9Fntoucc8';
const DURACAO_SESSAO_HORAS = 12;
const AUTH_SHEET_HEADERS = {
  Usuarios: [
    'usuario_id', 'cpf', 'nome', 'email', 'cargo', 'perfil', 'status',
    'senha_hash', 'senha_salt', 'troca_senha_obrigatoria',
    'criado_em', 'criado_por', 'atualizado_em', 'atualizado_por', 'ultimo_login_em'
  ],
  Sessoes: [
    'sessao_id', 'usuario_id', 'token_hash', 'criado_em', 'expira_em',
    'revogado_em', 'user_agent', 'status'
  ],
  LogsAcesso: [
    'log_id', 'usuario_id', 'cpf_informado', 'evento', 'detalhe', 'sucesso', 'timestamp'
  ],
  PerfisAcesso: [
    'perfil',
    'pode_ver_dashboard',
    'pode_ver_usuarios',
    'pode_criar_usuario',
    'pode_editar_usuario',
    'pode_resetar_senha',
    'pode_alterar_status_usuario',
    'pode_ver_todos_os_dados',
    'status',
    'atualizado_em',
    'atualizado_por'
  ],
  EscoposUsuario: [
    'escopo_id',
    'usuario_id',
    'site',
    'produto',
    'supervisor',
    'status',
    'criado_em',
    'criado_por',
    'atualizado_em',
    'atualizado_por'
  ]
};
const COLUNAS_AUTORIZACAO_DADOS = {
  supervisor: 9,
  site: 81,
  tipo: 91,
  produto: 106
};
const COLUNAS_METAS_AUTORIZACAO = {
  site: 1,
  produto: 2
};
const ADMIN_INICIAL_PORTAL = {
  cpf: '77879872000',
  nome: 'Ronicler Guimarães da Leve',
  email: 'ronny.leve@gmail.com',
  cargo: 'ADMIN',
  perfil: 'ADMIN_MASTER'
};

function normalizarNomeAba(nome) {
  return String(nome || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function localizarAba(ss, nomeEsperado) {
  const alvo = normalizarNomeAba(nomeEsperado);
  return ss.getSheets().find(sheet => normalizarNomeAba(sheet.getName()) === alvo) || null;
}

function obterPlanilhaDados_() {
  return SpreadsheetApp.openById(ID_PLANILHA_DADOS);
}

function obterPlanilhaAuth_() {
  return SpreadsheetApp.openById(ID_PLANILHA_AUTH);
}

function garantirAbaComCabecalho_(ss, nomeAba, headers) {
  let sheet = localizarAba(ss, nomeAba);
  if (!sheet) sheet = ss.insertSheet(nomeAba);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (String(nomeAba || '').trim() === 'Usuarios') {
      sheet.getRange('B:B').setNumberFormat('@');
    }
    return sheet;
  }

  const atuais = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  const diferentes = headers.some((header, idx) => String(atuais[idx] || '').trim() !== header);
  if (diferentes) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  if (String(nomeAba || '').trim() === 'Usuarios') {
    sheet.getRange('B:B').setNumberFormat('@');
  }
  return sheet;
}

function obterAuthSheets_() {
  const ss = obterPlanilhaAuth_();
  return {
    ss,
    usuarios: garantirAbaComCabecalho_(ss, 'Usuarios', AUTH_SHEET_HEADERS.Usuarios),
    sessoes: garantirAbaComCabecalho_(ss, 'Sessoes', AUTH_SHEET_HEADERS.Sessoes),
    logs: garantirAbaComCabecalho_(ss, 'LogsAcesso', AUTH_SHEET_HEADERS.LogsAcesso)
  };
}

function valorSimNaoParaBool_(valor) {
  return String(valor || '').trim().toUpperCase() === 'SIM';
}

function normalizarValorEscopoPortal_(valor) {
  const texto = String(valor || '').trim();
  return texto || 'TODOS';
}

function normalizarStatusUsuarioPortal_(status, fallback) {
  const valor = String(status || '').trim().toUpperCase();
  const permitido = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
  if (!valor) return fallback || 'ATIVO';
  return permitido.includes(valor) ? valor : '';
}

function gerarSenhaTemporariaPortal_() {
  return `Tmp@${Utilities.getUuid().slice(0, 8)}`;
}

function contarAdminMastersAtivos_() {
  const auth = garantirEstruturaAutorizacaoPortal_();
  return sheetRowsToObjects_(auth.usuarios).filter(row =>
    String(row.perfil || '').trim().toUpperCase() === 'ADMIN_MASTER' &&
    String(row.status || '').trim().toUpperCase() === 'ATIVO'
  ).length;
}

function obterPerfilAtivoPortal_(perfil) {
  const nomePerfil = String(perfil || '').trim().toUpperCase();
  if (!nomePerfil) return null;
  const auth = garantirEstruturaAutorizacaoPortal_();
  return sheetRowsToObjects_(auth.perfis).find(row =>
    String(row.perfil || '').trim().toUpperCase() === nomePerfil &&
    String(row.status || '').trim().toUpperCase() === 'ATIVO'
  ) || null;
}

function montarResumoUsuarioPortal_(usuario) {
  return {
    usuario_id: usuario.usuario_id,
    nome: usuario.nome || '',
    cpf: normalizarCPF(usuario.cpf),
    email: usuario.email || '',
    cargo: usuario.cargo || '',
    perfil: usuario.perfil || '',
    status: usuario.status || '',
    ultimo_login_em: usuario.ultimo_login_em || ''
  };
}

function garantirEstruturaAutorizacaoPortal_() {
  const auth = obterAuthSheets_();
  const perfis = garantirAbaComCabecalho_(auth.ss, 'PerfisAcesso', AUTH_SHEET_HEADERS.PerfisAcesso);
  const escopos = garantirAbaComCabecalho_(auth.ss, 'EscoposUsuario', AUTH_SHEET_HEADERS.EscoposUsuario);
  inicializarPerfisAcessoPortal_(perfis);
  return { ...auth, perfis, escopos };
}

function inicializarPerfisAcessoPortal_(perfisSheet) {
  if (!perfisSheet) {
    throw new Error('PerfisAcesso sheet é obrigatória para inicialização.');
  }

  const existentes = sheetRowsToObjects_(perfisSheet);
  const agora = agoraIso_();
  const defaults = [
    {
      perfil: 'ADMIN_MASTER',
      pode_ver_dashboard: 'SIM',
      pode_ver_usuarios: 'SIM',
      pode_criar_usuario: 'SIM',
      pode_editar_usuario: 'SIM',
      pode_resetar_senha: 'SIM',
      pode_alterar_status_usuario: 'SIM',
      pode_ver_todos_os_dados: 'SIM',
      status: 'ATIVO',
      atualizado_em: agora,
      atualizado_por: 'SISTEMA'
    },
    {
      perfil: 'DIRETOR',
      pode_ver_dashboard: 'SIM',
      pode_ver_usuarios: 'NAO',
      pode_criar_usuario: 'NAO',
      pode_editar_usuario: 'NAO',
      pode_resetar_senha: 'NAO',
      pode_alterar_status_usuario: 'NAO',
      pode_ver_todos_os_dados: 'SIM',
      status: 'ATIVO',
      atualizado_em: agora,
      atualizado_por: 'SISTEMA'
    },
    {
      perfil: 'GERENTE',
      pode_ver_dashboard: 'SIM',
      pode_ver_usuarios: 'NAO',
      pode_criar_usuario: 'NAO',
      pode_editar_usuario: 'NAO',
      pode_resetar_senha: 'NAO',
      pode_alterar_status_usuario: 'NAO',
      pode_ver_todos_os_dados: 'NAO',
      status: 'ATIVO',
      atualizado_em: agora,
      atualizado_por: 'SISTEMA'
    },
    {
      perfil: 'COORDENADOR',
      pode_ver_dashboard: 'SIM',
      pode_ver_usuarios: 'NAO',
      pode_criar_usuario: 'NAO',
      pode_editar_usuario: 'NAO',
      pode_resetar_senha: 'NAO',
      pode_alterar_status_usuario: 'NAO',
      pode_ver_todos_os_dados: 'NAO',
      status: 'ATIVO',
      atualizado_em: agora,
      atualizado_por: 'SISTEMA'
    },
    {
      perfil: 'SUPERVISOR',
      pode_ver_dashboard: 'SIM',
      pode_ver_usuarios: 'NAO',
      pode_criar_usuario: 'NAO',
      pode_editar_usuario: 'NAO',
      pode_resetar_senha: 'NAO',
      pode_alterar_status_usuario: 'NAO',
      pode_ver_todos_os_dados: 'NAO',
      status: 'ATIVO',
      atualizado_em: agora,
      atualizado_por: 'SISTEMA'
    }
  ];

  defaults.forEach(defaultPerfil => {
    const existente = existentes.find(row => String(row.perfil || '').trim().toUpperCase() === defaultPerfil.perfil);
    if (!existente) {
      appendLinhaPorObjeto_(perfisSheet, AUTH_SHEET_HEADERS.PerfisAcesso, defaultPerfil);
    }
  });
}

function sheetRowsToObjects_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(h => String(h || '').trim());
  return values.slice(1).map((row, index) => {
    const obj = { _rowNumber: index + 2 };
    headers.forEach((header, colIndex) => {
      obj[header] = row[colIndex];
    });
    return obj;
  });
}

function appendLinhaPorObjeto_(sheet, headers, data) {
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);
}

function atualizarLinhaPorObjeto_(sheet, rowNumber, headers, data) {
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function bytesToHex_(bytes) {
  return bytes.map(function(b) {
    const value = b < 0 ? b + 256 : b;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function agoraIso_() {
  return new Date().toISOString();
}

function adicionarHoras_(date, horas) {
  return new Date(date.getTime() + (horas * 60 * 60 * 1000));
}

function normalizarCPF(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(11, '0').slice(-11);
}

function gerarSalt() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function hashSenha(senha, salt) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${salt}::${String(senha || '')}`,
    Utilities.Charset.UTF_8
  );
  return bytesToHex_(digest);
}

function compararSenha(senha, hash, salt) {
  return hashSenha(senha, salt) === String(hash || '');
}

function gerarTokenSessao() {
  return `${Utilities.getUuid()}${Utilities.getUuid()}`.replace(/-/g, '');
}

function hashTokenSessao(token) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token || ''),
    Utilities.Charset.UTF_8
  );
  return bytesToHex_(digest);
}

function registrarLogAcesso(evento, dados) {
  const auth = obterAuthSheets_();
  appendLinhaPorObjeto_(auth.logs, AUTH_SHEET_HEADERS.LogsAcesso, {
    log_id: Utilities.getUuid(),
    usuario_id: dados && dados.usuario_id ? dados.usuario_id : '',
    cpf_informado: dados && dados.cpf_informado ? dados.cpf_informado : '',
    evento: evento || '',
    detalhe: dados && dados.detalhe ? dados.detalhe : '',
    sucesso: dados && dados.sucesso ? 'SIM' : 'NAO',
    timestamp: agoraIso_()
  });
}

function obterUsuarioPorCPF_(cpfNormalizado) {
  const auth = obterAuthSheets_();
  const cpfBusca = normalizarCPF(cpfNormalizado);
  return sheetRowsToObjects_(auth.usuarios).find(row => normalizarCPF(row.cpf) === cpfBusca) || null;
}

function obterUsuarioPorId_(usuarioId) {
  const auth = obterAuthSheets_();
  return sheetRowsToObjects_(auth.usuarios).find(row => String(row.usuario_id || '') === String(usuarioId || '')) || null;
}

function montarPayloadUsuarioSessao_(usuario) {
  return {
    usuario_id: usuario.usuario_id,
    cpf: normalizarCPF(usuario.cpf),
    nome: usuario.nome || '',
    email: usuario.email || '',
    cargo: usuario.cargo || '',
    perfil: usuario.perfil || '',
    status: usuario.status || ''
  };
}

function obterPermissoesUsuario_(usuario) {
  const perfilUsuario = String((usuario && usuario.perfil) || '').trim().toUpperCase();
  if (!perfilUsuario) {
    return {
      perfil: '',
      pode_ver_dashboard: false,
      pode_ver_usuarios: false,
      pode_criar_usuario: false,
      pode_editar_usuario: false,
      pode_resetar_senha: false,
      pode_alterar_status_usuario: false,
      pode_ver_todos_os_dados: false
    };
  }

  const auth = garantirEstruturaAutorizacaoPortal_();
  const perfil = sheetRowsToObjects_(auth.perfis).find(row =>
    String(row.perfil || '').trim().toUpperCase() === perfilUsuario &&
    String(row.status || '').trim().toUpperCase() === 'ATIVO'
  );

  if (!perfil) {
    return {
      perfil: perfilUsuario,
      pode_ver_dashboard: false,
      pode_ver_usuarios: false,
      pode_criar_usuario: false,
      pode_editar_usuario: false,
      pode_resetar_senha: false,
      pode_alterar_status_usuario: false,
      pode_ver_todos_os_dados: false
    };
  }

  return {
    perfil: String(perfil.perfil || '').trim(),
    pode_ver_dashboard: valorSimNaoParaBool_(perfil.pode_ver_dashboard),
    pode_ver_usuarios: valorSimNaoParaBool_(perfil.pode_ver_usuarios),
    pode_criar_usuario: valorSimNaoParaBool_(perfil.pode_criar_usuario),
    pode_editar_usuario: valorSimNaoParaBool_(perfil.pode_editar_usuario),
    pode_resetar_senha: valorSimNaoParaBool_(perfil.pode_resetar_senha),
    pode_alterar_status_usuario: valorSimNaoParaBool_(perfil.pode_alterar_status_usuario),
    pode_ver_todos_os_dados: valorSimNaoParaBool_(perfil.pode_ver_todos_os_dados)
  };
}

function obterEscoposUsuario_(usuarioId) {
  const auth = garantirEstruturaAutorizacaoPortal_();
  return sheetRowsToObjects_(auth.escopos)
    .filter(row =>
      String(row.usuario_id || '') === String(usuarioId || '') &&
      String(row.status || '').trim().toUpperCase() === 'ATIVO'
    )
    .map(row => ({
      escopo_id: row.escopo_id,
      usuario_id: row.usuario_id,
      site: row.site || 'TODOS',
      produto: row.produto || 'TODOS',
      supervisor: row.supervisor || 'TODOS',
      status: row.status
    }));
}

function usuarioEhAdminMaster_(usuario) {
  return String((usuario && usuario.perfil) || '').trim().toUpperCase() === 'ADMIN_MASTER';
}

function usuarioPodeAdministrarUsuarios_(usuario) {
  return usuarioEhAdminMaster_(usuario);
}

function normalizarComparacaoEscopo_(valor) {
  return String(valor || '').trim().toUpperCase();
}

function valorEscopoCompativel_(valorLinha, valorEscopo) {
  const escopo = normalizarComparacaoEscopo_(valorEscopo || 'TODOS');
  if (escopo === 'TODOS') return true;
  return normalizarComparacaoEscopo_(valorLinha) === escopo;
}

function montarLabelAcessoPortal_(acessoTotal, escopos) {
  if (acessoTotal) {
    return 'Visão atual: Geral';
  }

  if (!Array.isArray(escopos) || !escopos.length) {
    return 'Visão atual: Sem escopo configurado';
  }

  if (escopos.length === 1) {
    const escopo = escopos[0];
    return `Visão atual: ${escopo.site} > ${escopo.produto} > ${escopo.supervisor}`;
  }

  return `Visão atual: ${escopos.length} escopos configurados`;
}

function validarAcessoPortal_(token, options) {
  const opts = options || {};
  const sessao = validarSessao(token);
  if (!sessao || !sessao.ok) return { ok: false, message: 'Sessão inválida ou expirada.' };
  if (sessao.trocaSenhaObrigatoria) return { ok: false, message: 'Troca de senha obrigatória.' };

  garantirEstruturaAutorizacaoPortal_();
  const usuario = obterUsuarioPorId_(sessao.user.usuario_id);
  if (!usuario) return { ok: false, message: 'Usuário não encontrado.' };

  const permissoes = obterPermissoesUsuario_(usuario);
  if (opts.apenasAdminMaster && !usuarioPodeAdministrarUsuarios_(usuario)) {
    return { ok: false, message: 'Acesso negado.' };
  }

  return { ok: true, sessao, usuario, permissoes };
}

function obterContextoAcessoInterno_(usuario) {
  const permissions = obterPermissoesUsuario_(usuario);
  const escopos = obterEscoposUsuario_(usuario.usuario_id);

  let acessoTotal = false;
  if (usuarioEhAdminMaster_(usuario)) {
    acessoTotal = true;
  } else if (escopos.length > 0) {
    acessoTotal = false;
  } else {
    acessoTotal = !!permissions.pode_ver_todos_os_dados;
  }

  return {
    acessoTotal,
    perfil: String(usuario.perfil || '').trim(),
    escopos,
    permissions,
    label: montarLabelAcessoPortal_(acessoTotal, escopos)
  };
}

function linhaDentroDoEscopoPortal_(site, produto, supervisor, escopos) {
  if (!Array.isArray(escopos) || !escopos.length) return false;

  return escopos.some(escopo =>
    valorEscopoCompativel_(site, escopo.site) &&
    valorEscopoCompativel_(produto, escopo.produto) &&
    valorEscopoCompativel_(supervisor, escopo.supervisor)
  );
}

function filtrarBasePorEscopoPortal_(base, escopos) {
  if (!Array.isArray(base) || base.length <= 1) return base;
  const header = base[0];
  const linhas = base.slice(1).filter(row =>
    linhaDentroDoEscopoPortal_(
      row[COLUNAS_AUTORIZACAO_DADOS.site],
      row[COLUNAS_AUTORIZACAO_DADOS.produto],
      row[COLUNAS_AUTORIZACAO_DADOS.supervisor],
      escopos
    )
  );
  return [header].concat(linhas);
}

function filtrarMetasPorEscopoPortal_(metas, escopos) {
  if (!Array.isArray(metas) || metas.length <= 1) return metas;
  const header = metas[0];

  // A aba Metas hoje é utilizada pelo front por site/produto.
  // Mantemos o filtro apenas nessas dimensões para preservar segurança
  // e compatibilidade sem inferir regra de supervisor.
  const linhas = metas.slice(1).filter(row =>
    escopos.some(escopo =>
      valorEscopoCompativel_(row[COLUNAS_METAS_AUTORIZACAO.site], escopo.site) &&
      valorEscopoCompativel_(row[COLUNAS_METAS_AUTORIZACAO.produto], escopo.produto)
    )
  );

  return [header].concat(linhas);
}

function obterContextoAcessoUsuarioPortal(token) {
  const acesso = validarAcessoPortal_(token, {});
  if (!acesso.ok) return acesso;

  const contexto = obterContextoAcessoInterno_(acesso.usuario);
  return {
    ok: true,
    acessoTotal: contexto.acessoTotal,
    perfil: contexto.perfil,
    escopos: contexto.escopos,
    label: contexto.label
  };
}

function loginPortal(cpf, senha) {
  garantirEstruturaAutorizacaoPortal_();
  const cpfNormalizado = normalizarCPF(cpf);
  const usuario = obterUsuarioPorCPF_(cpfNormalizado);

  if (!usuario) {
    registrarLogAcesso('LOGIN_FALHO', {
      cpf_informado: cpfNormalizado,
      detalhe: 'CPF nao encontrado.',
      sucesso: false
    });
    return { ok: false, message: 'CPF ou senha inválidos.' };
  }

  const status = String(usuario.status || '').trim().toUpperCase();
  if (status !== 'ATIVO') {
    registrarLogAcesso('LOGIN_FALHO', {
      usuario_id: usuario.usuario_id,
      cpf_informado: cpfNormalizado,
      detalhe: `Status sem acesso: ${status || 'VAZIO'}.`,
      sucesso: false
    });
    return { ok: false, message: 'Usuário sem acesso ao portal.' };
  }

  if (!compararSenha(senha, usuario.senha_hash, usuario.senha_salt)) {
    registrarLogAcesso('LOGIN_FALHO', {
      usuario_id: usuario.usuario_id,
      cpf_informado: cpfNormalizado,
      detalhe: 'Senha inválida.',
      sucesso: false
    });
    return { ok: false, message: 'CPF ou senha inválidos.' };
  }

  const auth = obterAuthSheets_();
  const token = gerarTokenSessao();
  const agora = new Date();
  const expiraEm = adicionarHoras_(agora, DURACAO_SESSAO_HORAS);

  appendLinhaPorObjeto_(auth.sessoes, AUTH_SHEET_HEADERS.Sessoes, {
    sessao_id: Utilities.getUuid(),
    usuario_id: usuario.usuario_id,
    token_hash: hashTokenSessao(token),
    criado_em: agora.toISOString(),
    expira_em: expiraEm.toISOString(),
    revogado_em: '',
    user_agent: '',
    status: 'ATIVA'
  });

  usuario.ultimo_login_em = agora.toISOString();
  usuario.atualizado_em = agora.toISOString();
  usuario.atualizado_por = usuario.usuario_id;
  atualizarLinhaPorObjeto_(auth.usuarios, usuario._rowNumber, AUTH_SHEET_HEADERS.Usuarios, usuario);

  registrarLogAcesso('LOGIN_SUCESSO', {
    usuario_id: usuario.usuario_id,
    cpf_informado: cpfNormalizado,
    detalhe: 'Login realizado com sucesso.',
    sucesso: true
  });

  const permissoes = obterPermissoesUsuario_(usuario);
  return {
    ok: true,
    token: token,
    user: montarPayloadUsuarioSessao_(usuario),
    trocaSenhaObrigatoria: String(usuario.troca_senha_obrigatoria || '').trim().toUpperCase() === 'SIM',
    permissions: permissoes
  };
}

function validarSessao(token) {
  if (!token) return { ok: false, message: 'Sessão ausente.' };
  garantirEstruturaAutorizacaoPortal_();

  const auth = obterAuthSheets_();
  const tokenHash = hashTokenSessao(token);
  const sessao = sheetRowsToObjects_(auth.sessoes).find(row =>
    String(row.token_hash || '') === tokenHash &&
    String(row.status || '').trim().toUpperCase() === 'ATIVA'
  );

  if (!sessao) return { ok: false, message: 'Sessão inválida.' };

  const agora = new Date();
  const expiraEm = new Date(sessao.expira_em);
  if (!sessao.expira_em || isNaN(expiraEm) || expiraEm <= agora) {
    sessao.status = 'EXPIRADA';
    sessao.revogado_em = agora.toISOString();
    atualizarLinhaPorObjeto_(auth.sessoes, sessao._rowNumber, AUTH_SHEET_HEADERS.Sessoes, sessao);
    return { ok: false, message: 'Sessão expirada.' };
  }

  const usuario = sheetRowsToObjects_(auth.usuarios).find(row =>
    String(row.usuario_id || '') === String(sessao.usuario_id || '')
  );
  if (!usuario) return { ok: false, message: 'Usuário não encontrado.' };

  const status = String(usuario.status || '').trim().toUpperCase();
  if (status !== 'ATIVO') {
    return { ok: false, message: 'Usuário sem acesso ao portal.' };
  }

  const permissoes = obterPermissoesUsuario_(usuario);
  return {
    ok: true,
    user: montarPayloadUsuarioSessao_(usuario),
    trocaSenhaObrigatoria: String(usuario.troca_senha_obrigatoria || '').trim().toUpperCase() === 'SIM',
    permissions: permissoes
  };
}

function logoutPortal(token) {
  if (!token) return { ok: true };

  const auth = obterAuthSheets_();
  const tokenHash = hashTokenSessao(token);
  const sessao = sheetRowsToObjects_(auth.sessoes).find(row =>
    String(row.token_hash || '') === tokenHash &&
    String(row.status || '').trim().toUpperCase() === 'ATIVA'
  );

  if (sessao) {
    sessao.status = 'REVOGADA';
    sessao.revogado_em = agoraIso_();
    atualizarLinhaPorObjeto_(auth.sessoes, sessao._rowNumber, AUTH_SHEET_HEADERS.Sessoes, sessao);
    registrarLogAcesso('LOGOUT', {
      usuario_id: sessao.usuario_id,
      detalhe: 'Logout manual.',
      sucesso: true
    });
  }

  return { ok: true };
}

function trocarSenhaPrimeiroAcesso(token, senhaAtual, novaSenha) {
  const sessaoValidada = validarSessao(token);
  if (!sessaoValidada || !sessaoValidada.ok) return sessaoValidada;
  if (sessaoValidada.trocaSenhaObrigatoria !== true) {
    return { ok: false, message: 'Troca obrigatória não pendente.' };
  }

  const usuario = obterUsuarioPorId_(sessaoValidada.user.usuario_id);
  if (!usuario) return { ok: false, message: 'Usuário não encontrado.' };

  if (!compararSenha(senhaAtual, usuario.senha_hash, usuario.senha_salt)) {
    registrarLogAcesso('TROCA_SENHA_FALHA', {
      usuario_id: usuario.usuario_id,
      detalhe: 'Senha atual inválida.',
      sucesso: false
    });
    return { ok: false, message: 'Senha atual inválida.' };
  }

  if (String(novaSenha || '').trim().length < 8) {
    return { ok: false, message: 'A nova senha deve ter pelo menos 8 caracteres.' };
  }

  const auth = obterAuthSheets_();
  const novoSalt = gerarSalt();
  usuario.senha_salt = novoSalt;
  usuario.senha_hash = hashSenha(novaSenha, novoSalt);
  usuario.troca_senha_obrigatoria = 'NAO';
  usuario.atualizado_em = agoraIso_();
  usuario.atualizado_por = usuario.usuario_id;
  atualizarLinhaPorObjeto_(auth.usuarios, usuario._rowNumber, AUTH_SHEET_HEADERS.Usuarios, usuario);

  registrarLogAcesso('TROCA_SENHA_SUCESSO', {
    usuario_id: usuario.usuario_id,
    detalhe: 'Troca obrigatória de senha concluída.',
    sucesso: true
  });

  const permissoes = obterPermissoesUsuario_(usuario);
  return {
    ok: true,
    user: montarPayloadUsuarioSessao_(usuario),
    trocaSenhaObrigatoria: false,
    permissions: permissoes
  };
}

function setupAdminInicialPortal() {
  const auth = garantirEstruturaAutorizacaoPortal_();
  const usuarios = sheetRowsToObjects_(auth.usuarios);
  if (usuarios.length > 0) {
    return {
      ok: false,
      message: 'Setup já foi executado. A aba Usuarios já possui registros.'
    };
  }

  const senhaTemporaria = `Tmp@${Utilities.getUuid().slice(0, 8)}`;
  const salt = gerarSalt();
  const agora = agoraIso_();
  const usuarioId = Utilities.getUuid();

  appendLinhaPorObjeto_(auth.usuarios, AUTH_SHEET_HEADERS.Usuarios, {
    usuario_id: usuarioId,
    cpf: ADMIN_INICIAL_PORTAL.cpf,
    nome: ADMIN_INICIAL_PORTAL.nome,
    email: ADMIN_INICIAL_PORTAL.email,
    cargo: ADMIN_INICIAL_PORTAL.cargo,
    perfil: ADMIN_INICIAL_PORTAL.perfil,
    status: 'ATIVO',
    senha_hash: hashSenha(senhaTemporaria, salt),
    senha_salt: salt,
    troca_senha_obrigatoria: 'SIM',
    criado_em: agora,
    criado_por: 'SETUP',
    atualizado_em: agora,
    atualizado_por: 'SETUP',
    ultimo_login_em: ''
  });

  registrarLogAcesso('SETUP_ADMIN_INICIAL', {
    usuario_id: usuarioId,
    cpf_informado: ADMIN_INICIAL_PORTAL.cpf,
    detalhe: 'Usuário ADMIN_MASTER inicial criado.',
    sucesso: true
  });

  const retorno = {
    ok: true,
    message: 'Admin inicial criado com sucesso.',
    cpf: ADMIN_INICIAL_PORTAL.cpf,
    senhaTemporaria: senhaTemporaria
  };
  Logger.log(JSON.stringify(retorno, null, 2));

  return retorno;
}

function listarPerfisAcessoPortal(token) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const auth = garantirEstruturaAutorizacaoPortal_();
  const perfis = sheetRowsToObjects_(auth.perfis)
    .filter(row => String(row.status || '').trim().toUpperCase() === 'ATIVO')
    .map(row => ({
      perfil: row.perfil,
      pode_ver_dashboard: valorSimNaoParaBool_(row.pode_ver_dashboard),
      pode_ver_usuarios: valorSimNaoParaBool_(row.pode_ver_usuarios),
      pode_criar_usuario: valorSimNaoParaBool_(row.pode_criar_usuario),
      pode_editar_usuario: valorSimNaoParaBool_(row.pode_editar_usuario),
      pode_resetar_senha: valorSimNaoParaBool_(row.pode_resetar_senha),
      pode_alterar_status_usuario: valorSimNaoParaBool_(row.pode_alterar_status_usuario),
      pode_ver_todos_os_dados: valorSimNaoParaBool_(row.pode_ver_todos_os_dados)
    }));

  return { ok: true, perfis };
}

function listarDimensoesAcessoPortal(token) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'portal_dimensoes_acesso_v1';
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Se o cache estiver inválido, recalcula normalmente.
    }
  }

  const ss = obterPlanilhaDados_();
  const baseSheet = localizarAba(ss, 'Base');
  if (!baseSheet) return { ok: false, message: 'Aba Base não encontrada.' };

  const values = baseSheet.getDataRange().getDisplayValues();
  const sites = new Set();
  const produtosGlobais = new Set();
  const supervisoresGlobais = new Set();
  const produtosPorSite = {};
  const supervisoresPorChave = {};

  values.slice(1).forEach(row => {
    if (String(row[COLUNAS_AUTORIZACAO_DADOS.tipo] || '').trim() !== 'Operador') return;

    const site = String(row[COLUNAS_AUTORIZACAO_DADOS.site] || '').trim();
    const produto = String(row[COLUNAS_AUTORIZACAO_DADOS.produto] || '').trim();
    const supervisor = String(row[COLUNAS_AUTORIZACAO_DADOS.supervisor] || '').trim();
    if (!site) return;

    sites.add(site);
    if (!produtosPorSite[site]) produtosPorSite[site] = new Set();
    if (!supervisoresPorChave[`${site}__TODOS`]) supervisoresPorChave[`${site}__TODOS`] = new Set();
    if (!supervisoresPorChave['TODOS__TODOS']) supervisoresPorChave['TODOS__TODOS'] = new Set();

    if (produto) {
      produtosGlobais.add(produto);
      produtosPorSite[site].add(produto);
      if (!supervisoresPorChave[`${site}__${produto}`]) supervisoresPorChave[`${site}__${produto}`] = new Set();
    }

    if (supervisor) {
      supervisoresGlobais.add(supervisor);
      supervisoresPorChave[`${site}__TODOS`].add(supervisor);
      supervisoresPorChave['TODOS__TODOS'].add(supervisor);
      if (produto) supervisoresPorChave[`${site}__${produto}`].add(supervisor);
    }
  });

  const ordenar = set => [...set].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  const produtosPorSiteResponse = { TODOS: ['TODOS', ...ordenar(produtosGlobais)] };
  Object.keys(produtosPorSite).forEach(site => {
    produtosPorSiteResponse[site] = ['TODOS', ...ordenar(produtosPorSite[site])];
  });

  const supervisoresPorSiteProdutoResponse = { TODOS__TODOS: ['TODOS', ...ordenar(supervisoresGlobais)] };
  Object.keys(supervisoresPorChave).forEach(chave => {
    supervisoresPorSiteProdutoResponse[chave] = ['TODOS', ...ordenar(supervisoresPorChave[chave])];
  });

  const response = {
    ok: true,
    dimensoes: {
      sites: ['TODOS', ...ordenar(sites)],
      produtosPorSite: produtosPorSiteResponse,
      supervisoresPorSiteProduto: supervisoresPorSiteProdutoResponse
    }
  };

  try {
    cache.put(cacheKey, JSON.stringify(response), 600);
  } catch (e) {
    // Se o payload exceder o limite do cache, mantém apenas o cálculo em memória da requisição.
  }

  return response;
}

function listarUsuariosPortal(token) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const auth = garantirEstruturaAutorizacaoPortal_();
  const usuarios = sheetRowsToObjects_(auth.usuarios)
    .map(row => montarResumoUsuarioPortal_(row))
    .sort((a, b) => {
      const nomeComp = String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
      if (nomeComp !== 0) return nomeComp;
      return String(a.cpf || '').localeCompare(String(b.cpf || ''), 'pt-BR');
    });

  return { ok: true, usuarios };
}

function criarUsuarioPortal(token, payload) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const data = payload || {};
  const cpf = normalizarCPF(data.cpf);
  const nome = String(data.nome || '').trim();
  const email = String(data.email || '').trim();
  const cargo = String(data.cargo || '').trim();
  const perfil = String(data.perfil || '').trim().toUpperCase();
  const status = normalizarStatusUsuarioPortal_(data.status, 'ATIVO');

  if (!cpf) return { ok: false, message: 'CPF é obrigatório.' };
  if (cpf.length !== 11) return { ok: false, message: 'CPF inválido.' };
  if (!nome) return { ok: false, message: 'Nome é obrigatório.' };
  if (!perfil) return { ok: false, message: 'Perfil é obrigatório.' };
  if (!status) return { ok: false, message: 'Status inválido.' };
  if (!obterPerfilAtivoPortal_(perfil)) return { ok: false, message: 'Perfil inválido ou inativo.' };
  if (obterUsuarioPorCPF_(cpf)) return { ok: false, message: 'Já existe um usuário com este CPF.' };

  const auth = garantirEstruturaAutorizacaoPortal_();
  const agora = agoraIso_();
  const usuarioId = Utilities.getUuid();
  const senhaTemporaria = gerarSenhaTemporariaPortal_();
  const senhaSalt = gerarSalt();
  const novoUsuario = {
    usuario_id: usuarioId,
    cpf: cpf,
    nome: nome,
    email: email,
    cargo: cargo,
    perfil: perfil,
    status: status,
    senha_hash: hashSenha(senhaTemporaria, senhaSalt),
    senha_salt: senhaSalt,
    troca_senha_obrigatoria: 'SIM',
    criado_em: agora,
    criado_por: acesso.usuario.usuario_id,
    atualizado_em: agora,
    atualizado_por: acesso.usuario.usuario_id,
    ultimo_login_em: ''
  };

  appendLinhaPorObjeto_(auth.usuarios, AUTH_SHEET_HEADERS.Usuarios, novoUsuario);

  registrarLogAcesso('CRIAR_USUARIO_PORTAL', {
    usuario_id: acesso.usuario.usuario_id,
    cpf_informado: cpf,
    detalhe: `Usuário criado: ${usuarioId}.`,
    sucesso: true
  });

  return {
    ok: true,
    user: montarResumoUsuarioPortal_(novoUsuario),
    senhaTemporaria: senhaTemporaria
  };
}

function editarUsuarioPortal(token, usuarioId, payload) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const data = payload || {};
  const usuario = obterUsuarioPorId_(usuarioId);
  if (!usuario) return { ok: false, message: 'Usuário não encontrado.' };

  const nome = String(data.nome || '').trim();
  const email = String(data.email || '').trim();
  const cargo = String(data.cargo || '').trim();
  const perfil = String(data.perfil || '').trim().toUpperCase();
  const status = normalizarStatusUsuarioPortal_(data.status, String(usuario.status || '').trim().toUpperCase() || 'ATIVO');
  const perfilAtual = String(usuario.perfil || '').trim().toUpperCase();
  const statusAtual = String(usuario.status || '').trim().toUpperCase();
  const adminMastersAtivos = contarAdminMastersAtivos_();
  const ehUltimoAdminMasterAtivo = perfilAtual === 'ADMIN_MASTER' && statusAtual === 'ATIVO' && adminMastersAtivos <= 1;

  if (!nome) return { ok: false, message: 'Nome é obrigatório.' };
  if (!perfil) return { ok: false, message: 'Perfil é obrigatório.' };
  if (!status) return { ok: false, message: 'Status inválido.' };
  if (!obterPerfilAtivoPortal_(perfil)) return { ok: false, message: 'Perfil inválido ou inativo.' };
  if (ehUltimoAdminMasterAtivo) {
    if (perfil !== 'ADMIN_MASTER' || status === 'INATIVO' || status === 'BLOQUEADO') {
      return { ok: false, message: 'Não é permitido remover ou bloquear o último ADMIN_MASTER ativo.' };
    }
  }
  if (
    String(acesso.usuario.usuario_id || '') === String(usuarioId || '') &&
    (status === 'INATIVO' || status === 'BLOQUEADO')
  ) {
    return { ok: false, message: 'Você não pode inativar ou bloquear a própria conta.' };
  }

  const auth = garantirEstruturaAutorizacaoPortal_();
  usuario.nome = nome;
  usuario.email = email;
  usuario.cargo = cargo;
  usuario.perfil = perfil;
  usuario.status = status;
  usuario.atualizado_em = agoraIso_();
  usuario.atualizado_por = acesso.usuario.usuario_id;

  atualizarLinhaPorObjeto_(auth.usuarios, usuario._rowNumber, AUTH_SHEET_HEADERS.Usuarios, usuario);

  registrarLogAcesso('EDITAR_USUARIO_PORTAL', {
    usuario_id: acesso.usuario.usuario_id,
    cpf_informado: normalizarCPF(usuario.cpf),
    detalhe: `Usuário editado: ${usuarioId}.`,
    sucesso: true
  });

  return {
    ok: true,
    user: montarResumoUsuarioPortal_(usuario)
  };
}

function resetarSenhaUsuarioPortal(token, usuarioId) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const usuario = obterUsuarioPorId_(usuarioId);
  if (!usuario) return { ok: false, message: 'Usuário não encontrado.' };

  const auth = garantirEstruturaAutorizacaoPortal_();
  const senhaTemporaria = gerarSenhaTemporariaPortal_();
  const senhaSalt = gerarSalt();

  usuario.senha_salt = senhaSalt;
  usuario.senha_hash = hashSenha(senhaTemporaria, senhaSalt);
  usuario.troca_senha_obrigatoria = 'SIM';
  usuario.atualizado_em = agoraIso_();
  usuario.atualizado_por = acesso.usuario.usuario_id;

  atualizarLinhaPorObjeto_(auth.usuarios, usuario._rowNumber, AUTH_SHEET_HEADERS.Usuarios, usuario);

  registrarLogAcesso('RESETAR_SENHA_USUARIO_PORTAL', {
    usuario_id: acesso.usuario.usuario_id,
    cpf_informado: normalizarCPF(usuario.cpf),
    detalhe: `Senha resetada para ${usuarioId}.`,
    sucesso: true
  });

  return {
    ok: true,
    user: montarResumoUsuarioPortal_(usuario),
    senhaTemporaria: senhaTemporaria
  };
}

function alterarStatusUsuarioPortal(token, usuarioId, status) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const novoStatus = normalizarStatusUsuarioPortal_(status, '');
  if (!novoStatus) return { ok: false, message: 'Status inválido.' };

  const usuario = obterUsuarioPorId_(usuarioId);
  if (!usuario) return { ok: false, message: 'Usuário não encontrado.' };
  const perfilAtual = String(usuario.perfil || '').trim().toUpperCase();
  const statusAtual = String(usuario.status || '').trim().toUpperCase();
  const adminMastersAtivos = contarAdminMastersAtivos_();
  const ehUltimoAdminMasterAtivo = perfilAtual === 'ADMIN_MASTER' && statusAtual === 'ATIVO' && adminMastersAtivos <= 1;

  if (
    String(acesso.usuario.usuario_id || '') === String(usuarioId || '') &&
    (novoStatus === 'INATIVO' || novoStatus === 'BLOQUEADO')
  ) {
    return { ok: false, message: 'Você não pode inativar ou bloquear a própria conta.' };
  }
  if (ehUltimoAdminMasterAtivo && (novoStatus === 'INATIVO' || novoStatus === 'BLOQUEADO')) {
    return { ok: false, message: 'Não é permitido remover ou bloquear o último ADMIN_MASTER ativo.' };
  }

  const auth = garantirEstruturaAutorizacaoPortal_();
  usuario.status = novoStatus;
  usuario.atualizado_em = agoraIso_();
  usuario.atualizado_por = acesso.usuario.usuario_id;

  atualizarLinhaPorObjeto_(auth.usuarios, usuario._rowNumber, AUTH_SHEET_HEADERS.Usuarios, usuario);

  registrarLogAcesso('ALTERAR_STATUS_USUARIO_PORTAL', {
    usuario_id: acesso.usuario.usuario_id,
    cpf_informado: normalizarCPF(usuario.cpf),
    detalhe: `Status ${novoStatus} aplicado ao usuário ${usuarioId}.`,
    sucesso: true
  });

  return {
    ok: true,
    user: montarResumoUsuarioPortal_(usuario)
  };
}

function listarEscoposUsuarioPortal(token, usuarioId) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;
  return { ok: true, escopos: obterEscoposUsuario_(usuarioId) };
}

function salvarEscoposUsuarioPortal(token, usuarioId, escopos) {
  const acesso = validarAcessoPortal_(token, { apenasAdminMaster: true });
  if (!acesso.ok) return acesso;

  const usuarioAlvo = obterUsuarioPorId_(usuarioId);
  if (!usuarioAlvo) return { ok: false, message: 'Usuário alvo não encontrado.' };

  const auth = garantirEstruturaAutorizacaoPortal_();
  const agora = agoraIso_();
  const atuais = sheetRowsToObjects_(auth.escopos).filter(row =>
    String(row.usuario_id || '') === String(usuarioId || '') &&
    String(row.status || '').trim().toUpperCase() === 'ATIVO'
  );

  atuais.forEach(row => {
    const atualizado = {
      ...row,
      status: 'INATIVO',
      atualizado_em: agora,
      atualizado_por: acesso.usuario.usuario_id
    };
    atualizarLinhaPorObjeto_(auth.escopos, row._rowNumber, AUTH_SHEET_HEADERS.EscoposUsuario, atualizado);
  });

  const unicos = [];
  const vistos = new Set();
  (Array.isArray(escopos) ? escopos : []).forEach(item => {
    const site = normalizarValorEscopoPortal_(item && item.site);
    const produto = normalizarValorEscopoPortal_(item && item.produto);
    const supervisor = normalizarValorEscopoPortal_(item && item.supervisor);
    const chave = `${site}__${produto}__${supervisor}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    unicos.push({ site, produto, supervisor });
  });

  unicos.forEach(item => {
    appendLinhaPorObjeto_(auth.escopos, AUTH_SHEET_HEADERS.EscoposUsuario, {
      escopo_id: Utilities.getUuid(),
      usuario_id: usuarioId,
      site: item.site,
      produto: item.produto,
      supervisor: item.supervisor,
      status: 'ATIVO',
      criado_em: agora,
      criado_por: acesso.usuario.usuario_id,
      atualizado_em: agora,
      atualizado_por: acesso.usuario.usuario_id
    });
  });

  registrarLogAcesso('SALVAR_ESCOPOS_USUARIO', {
    usuario_id: acesso.usuario.usuario_id,
    detalhe: `Escopos atualizados para ${usuarioId} (${unicos.length} registro(s)).`,
    sucesso: true
  });

  return { ok: true, escopos: obterEscoposUsuario_(usuarioId) };
}

function obterDadosExcelInterno_() {
  try {
    const ss = obterPlanilhaDados_();
    const baseSheet = localizarAba(ss, 'Base');
    const metasSheet = localizarAba(ss, 'Metas');
    const feriadosSheet = localizarAba(ss, 'Feriados');

    if (!baseSheet) {
      return JSON.stringify([["Erro", "Aba Base nao encontrada."]]);
    }

    const base = baseSheet.getDataRange().getDisplayValues();
    const metas = metasSheet ? metasSheet.getDataRange().getDisplayValues() : [];
    const feriados = feriadosSheet ? feriadosSheet.getDataRange().getDisplayValues() : [];

    if (base.length <= 1) {
      return JSON.stringify([["Erro", "Aba Base sem dados."]]);
    }

    return JSON.stringify({
      base,
      metas,
      feriados,
      debugAbas: {
        abas: ss.getSheets().map(s => s.getName()),
        encontrouBase: !!baseSheet,
        encontrouMetas: !!metasSheet,
        encontrouFeriados: !!feriadosSheet,
        baseRows: base.length,
        metasRows: metas.length,
        feriadosRows: feriados.length
      }
    });
  } catch (e) {
    return JSON.stringify([["Erro", e.message]]);
  }
}

function obterDadosExcelAutenticado(token) {
  const sessao = validarSessao(token);

  if (!sessao || !sessao.ok) {
    return JSON.stringify([['Erro', 'Sessão inválida ou expirada.']]);
  }

  if (sessao.trocaSenhaObrigatoria) {
    return JSON.stringify([['Erro', 'Troca de senha obrigatória.']]);
  }

  const usuario = obterUsuarioPorId_(sessao.user.usuario_id);
  if (!usuario) {
    return JSON.stringify([['Erro', 'Usuário não encontrado.']]);
  }

  const contexto = obterContextoAcessoInterno_(usuario);
  if (contexto.acessoTotal) {
    return obterDadosExcelInterno_();
  }

  try {
    const ss = obterPlanilhaDados_();
    const baseSheet = localizarAba(ss, 'Base');
    const metasSheet = localizarAba(ss, 'Metas');
    const feriadosSheet = localizarAba(ss, 'Feriados');

    if (!baseSheet) {
      return JSON.stringify([['Erro', 'Aba Base nao encontrada.']]);
    }

    const base = baseSheet.getDataRange().getDisplayValues();
    const metas = metasSheet ? metasSheet.getDataRange().getDisplayValues() : [];
    const feriados = feriadosSheet ? feriadosSheet.getDataRange().getDisplayValues() : [];

    if (!contexto.escopos.length) {
      return JSON.stringify({
        base: base.length ? [base[0]] : [],
        metas: metas.length ? [metas[0]] : [],
        feriados,
        debugAbas: {
          abas: ss.getSheets().map(s => s.getName()),
          encontrouBase: !!baseSheet,
          encontrouMetas: !!metasSheet,
          encontrouFeriados: !!feriadosSheet,
          baseRows: base.length ? 1 : 0,
          metasRows: metas.length ? 1 : 0,
          feriadosRows: feriados.length,
          escopoFiltrado: true,
          escopos: 0
        }
      });
    }

    const baseFiltrada = filtrarBasePorEscopoPortal_(base, contexto.escopos);
    const metasFiltradas = filtrarMetasPorEscopoPortal_(metas, contexto.escopos);

    return JSON.stringify({
      base: baseFiltrada,
      metas: metasFiltradas,
      feriados,
      debugAbas: {
        abas: ss.getSheets().map(s => s.getName()),
        encontrouBase: !!baseSheet,
        encontrouMetas: !!metasSheet,
        encontrouFeriados: !!feriadosSheet,
        baseRows: baseFiltrada.length,
        metasRows: metasFiltradas.length,
        feriadosRows: feriados.length,
        escopoFiltrado: true,
        escopos: contexto.escopos.length
      }
    });
  } catch (e) {
    return JSON.stringify([['Erro', e.message]]);
  }
}

function obterDadosExcel() {
  return JSON.stringify([['Erro', 'Use obterDadosExcelAutenticado(token).']]);
}

function logSyncExcelToBridge_(mensagem, detalhe) {
  const texto = detalhe === undefined ? mensagem : `${mensagem}: ${JSON.stringify(detalhe)}`;
  console.log(texto);
  Logger.log(texto);
}

function garantirDimensoesAbaSync_(sheet, numRows, numCols) {
  if (sheet.getMaxRows() < numRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), numRows - sheet.getMaxRows());
  }

  if (sheet.getMaxColumns() < numCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), numCols - sheet.getMaxColumns());
  }
}

function obterOuCriarAbaSync_(ss, nomeAba) {
  return localizarAba(ss, nomeAba) || ss.insertSheet(nomeAba);
}

function validarDadosBaseSync_(data) {
  if (!Array.isArray(data)) throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: retorno nao e array.');
  if (data.length <= 1) throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: sem linhas de dados.');
  if (!data[0] || data[0].length < 141) throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: cabecalho sem colunas criticas ate EK.');

  const possuiOperador = data.slice(1).some(row => String(row && row[91] || '').trim().toUpperCase() === 'OPERADOR');
  if (!possuiOperador) throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: nenhuma linha Operador encontrada na coluna CN.');

  const possuiMes = data.slice(1).some(row => String(row && row[140] || '').trim());
  if (!possuiMes) throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: nenhuma linha com mes preenchido na coluna EK.');

  const linhasOperadorMai26 = data.slice(1).filter(row =>
    String(row && row[91] || '').trim().toUpperCase() === 'OPERADOR' &&
    String(row && row[140] || '').trim().toLowerCase() === 'mai/26'
  );

  if (!linhasOperadorMai26.length) {
    throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: nenhuma linha Operador em mai/26 encontrada.');
  }

  const somaCadastradas = linhasOperadorMai26.reduce((soma, row) => soma + parseNumeroDiagnosticoSync_(row[121]), 0);
  const somaAprovadas = linhasOperadorMai26.reduce((soma, row) => soma + parseNumeroDiagnosticoSync_(row[103]), 0);

  if (somaCadastradas <= 0) {
    throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: soma DR para Operador em mai/26 nao e maior que zero.');
  }

  if (somaAprovadas < 0) {
    throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: soma CZ para Operador em mai/26 e negativa.');
  }

  const linhaSemSite = linhasOperadorMai26.find(row => !String(row && row[81] || '').trim());
  if (linhaSemSite) {
    throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: existe Operador em mai/26 com Site vazio.');
  }

  const linhaSemProduto = linhasOperadorMai26.find(row => !String(row && row[106] || '').trim());
  if (linhaSemProduto) {
    throw new Error('Dados da BASE_DASH_EXPORT.xlsx invalidos: existe Operador em mai/26 com Produto vazio.');
  }
}

function gravarDadosEmAbaSync_(sheet, data) {
  const numRows = data.length;
  const numCols = data[0].length;

  garantirDimensoesAbaSync_(sheet, numRows, numCols);
  sheet.clearContents();
  sheet.getRange(1, 1, numRows, numCols).setValues(data);
}

function validarAbaRecebeuDadosSync_(sheet, data) {
  if (sheet.getLastRow() < data.length) throw new Error(`Aba ${sheet.getName()} recebeu menos linhas que o esperado.`);
  if (sheet.getLastColumn() < data[0].length) throw new Error(`Aba ${sheet.getName()} recebeu menos colunas que o esperado.`);
}

function normalizarCamposCriticosBaseBridge_(data) {
  const indicesTempo = [86, 87, 88, 93, 108, 115, 122, 126, 127, 128, 129, 130];
  const indicesPercentual = [131];

  data.slice(1).forEach(row => {
    indicesTempo.forEach(indiceJs => {
      if (indiceJs < row.length) {
        row[indiceJs] = normalizarTempoBridge_(row[indiceJs]);
      }
    });

    indicesPercentual.forEach(indiceJs => {
      if (indiceJs < row.length) {
        row[indiceJs] = normalizarPercentualBridge_(row[indiceJs]);
      }
    });
  });

  return data;
}

function normalizarPercentualBridge_(valor) {
  if (valor === null || valor === undefined || valor === '') return valor;

  if (typeof valor === 'number') {
    if (valor === 0) return 0;
    if (Math.abs(valor) > 1000) return valor / 1000000000;
    if (Math.abs(valor) > 1 && Math.abs(valor) <= 100) return valor / 100;
    return valor;
  }

  let texto = String(valor).trim();
  if (!texto) return valor;

  texto = texto
    .replace(/\s/g, '')
    .replace('%', '');

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');

  if (temVirgula && temPonto) {
    const ultimaVirgula = texto.lastIndexOf(',');
    const ultimoPonto = texto.lastIndexOf('.');

    if (ultimaVirgula > ultimoPonto) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(/,/g, '');
    }
  } else if (temVirgula) {
    texto = texto.replace(',', '.');
  }

  const n = Number(texto);
  if (!Number.isFinite(n)) return valor;

  if (n === 0) return 0;
  if (Math.abs(n) > 1000) return n / 1000000000;
  if (Math.abs(n) > 1 && Math.abs(n) <= 100) return n / 100;
  return n;
}

function aplicarFormatosCriticosBaseBridge_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return;

  const aplicarFormato = (coluna, formato) => {
    sheet.getRange(1, coluna, lastRow, 1).setNumberFormat(formato);
  };

  [82, 92, 107, 141].forEach(coluna => aplicarFormato(coluna, '@'));
  aplicarFormato(93, 'dd/mm/yyyy');
  [104, 122].forEach(coluna => aplicarFormato(coluna, '0'));
  [87, 88, 89, 94, 109, 116, 123, 127, 128, 129, 130, 131].forEach(coluna => aplicarFormato(coluna, '[h]:mm:ss'));
  aplicarFormato(132, '0.0%');
  aplicarFormato(125, '0.00');
}

function substituirBasePorAbaTemporariaSync_(ss, tempSheetName, baseSheetName, backupSheetName) {
  const tempSheet = localizarAba(ss, tempSheetName);
  if (!tempSheet) throw new Error(`Aba temporaria ${tempSheetName} nao encontrada para troca.`);

  const baseSheet = localizarAba(ss, baseSheetName);
  if (!baseSheet) throw new Error(`Aba ${baseSheetName} nao encontrada para troca.`);

  const backupAntigo = localizarAba(ss, backupSheetName);
  if (backupAntigo) {
    logSyncExcelToBridge_('Excluindo backup antigo antes da troca de abas', {
      aba: backupAntigo.getName()
    });
    ss.deleteSheet(backupAntigo);
  }

  let baseRenomeadaParaBackup = false;

  try {
    logSyncExcelToBridge_('Renomeando Base atual para backup', {
      origem: baseSheet.getName(),
      destino: backupSheetName
    });
    baseSheet.setName(backupSheetName);
    baseRenomeadaParaBackup = true;

    logSyncExcelToBridge_('Renomeando aba temporaria para Base', {
      origem: tempSheet.getName(),
      destino: baseSheetName
    });
    tempSheet.setName(baseSheetName);

    const novaBase = localizarAba(ss, baseSheetName);
    if (!novaBase) throw new Error(`Aba ${baseSheetName} nao encontrada apos troca.`);

    logSyncExcelToBridge_('Troca de abas concluida por rename', {
      base: novaBase.getName(),
      backup: backupSheetName
    });

    return novaBase;
  } catch (erroTroca) {
    logSyncExcelToBridge_('Falha na troca de abas por rename', {
      erro: erroTroca.message
    });

    if (baseRenomeadaParaBackup && !localizarAba(ss, baseSheetName)) {
      try {
        const backupAtual = localizarAba(ss, backupSheetName);
        if (backupAtual) {
          backupAtual.setName(baseSheetName);
          logSyncExcelToBridge_('Backup restaurado como Base apos falha na troca');
        }
      } catch (erroRestore) {
        logSyncExcelToBridge_('Falha ao restaurar backup como Base', {
          erro: erroRestore.message
        });
      }
    }

    throw erroTroca;
  }
}

function syncExcelToBridge() {
  const excelId = '14PkWwjkXD6jeKgGtajg9n1Y1QbaXfBlF';
  const bridgeId = '1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg';
  const nomeArquivoOrigem = 'BASE_DASH_EXPORT.xlsx';
  let tempFileId = null;
  
  try {
    logSyncExcelToBridge_('Inicio da sincronizacao BASE_DASH_EXPORT.xlsx -> Bridge');

    const excelFile = DriveApp.getFileById(excelId);
    logSyncExcelToBridge_('Arquivo BASE_DASH_EXPORT.xlsx encontrado', {
      id: excelId,
      nome: excelFile.getName()
    });

    const blob = excelFile.getBlob();
    
    const resource = {
      name: "TempSync",
      mimeType: MimeType.GOOGLE_SHEETS
    };
    
    const tempFile = Drive.Files.create(resource, blob);
    tempFileId = tempFile.id;
    logSyncExcelToBridge_('Conversao temporaria criada', { id: tempFileId });

    const tempSs = SpreadsheetApp.openById(tempFile.id);
    
    const sourceSheet =
      tempSs.getSheetByName('Base') ||
      tempSs.getSheetByName('BASE ESPELHO');
    
    if (!sourceSheet) {
      throw new Error('Aba Base nao encontrada no arquivo BASE_DASH_EXPORT.xlsx convertido.');
    }
    logSyncExcelToBridge_('Aba de origem encontrada em BASE_DASH_EXPORT.xlsx', {
      aba: sourceSheet.getName()
    });
    
    const data = sourceSheet.getDataRange().getValues();
    logSyncExcelToBridge_('Linhas e colunas carregadas', {
      origem: nomeArquivoOrigem,
      linhas: data.length,
      colunas: data[0] ? data[0].length : 0
    });

    normalizarCamposCriticosBaseBridge_(data);
    validarDadosBaseSync_(data);
    logSyncExcelToBridge_('Validacao aprovada');
    
    const bridgeSs = SpreadsheetApp.openById(bridgeId);
    const bridgeSheet = localizarAba(bridgeSs, 'Base');
    if (!bridgeSheet) throw new Error('Aba destino Base nao encontrada na planilha bridge.');

    const tempBridgeSheet = obterOuCriarAbaSync_(bridgeSs, '_TEMP_BASE_SYNC');
    gravarDadosEmAbaSync_(tempBridgeSheet, data);
    aplicarFormatosCriticosBaseBridge_(tempBridgeSheet);
    validarAbaRecebeuDadosSync_(tempBridgeSheet, data);
    logSyncExcelToBridge_('Gravacao em aba temporaria concluida', {
      aba: tempBridgeSheet.getName(),
      linhas: tempBridgeSheet.getLastRow(),
      colunas: tempBridgeSheet.getLastColumn()
    });

    const novaBaseSheet = substituirBasePorAbaTemporariaSync_(
      bridgeSs,
      '_TEMP_BASE_SYNC',
      'Base',
      '_BACKUP_BASE_SYNC'
    );
    validarAbaRecebeuDadosSync_(novaBaseSheet, data);

    logSyncExcelToBridge_('Substituicao da Base concluida', {
      origem: nomeArquivoOrigem,
      linhas: novaBaseSheet.getLastRow(),
      colunas: novaBaseSheet.getLastColumn()
    });
    
  } catch (e) {
    console.error("Erro na sincronizacao: " + e.message);
    Logger.log("Erro na sincronizacao: " + e.message);
    throw e;
  } finally {
    if (tempFileId) {
      try {
        Drive.Files.remove(tempFileId);
        logSyncExcelToBridge_('Arquivo temporario removido', { id: tempFileId });
      } catch (removeError) {
        console.error("Erro ao remover arquivo temporario: " + removeError.message);
        Logger.log("Erro ao remover arquivo temporario: " + removeError.message);
      }
    }
  }
}

function diagnosticarBaseEspelhoExcelSemGravar() {
  const excelId = '1HOWv62ayFFoIsWOdjKmO5MzsKqd6H-BH';
  let tempFileId = null;

  try {
    Logger.log('DIAG: inicio leitura BASE ESPELHO do Excel sem gravar.');

    const excelFile = DriveApp.getFileById(excelId);
    Logger.log('DIAG: arquivo encontrado: ' + excelFile.getName());
    Logger.log('DIAG: ultima atualizacao Drive: ' + excelFile.getLastUpdated());

    const blob = excelFile.getBlob();
    const resource = {
      name: 'TempDiagBaseEspelho',
      mimeType: MimeType.GOOGLE_SHEETS
    };

    const tempFile = Drive.Files.create(resource, blob);
    tempFileId = tempFile.id;
    Logger.log('DIAG: arquivo temporario criado: ' + tempFileId);

    const tempSs = SpreadsheetApp.openById(tempFileId);
    const sourceSheet = tempSs.getSheetByName('BASE ESPELHO');

    if (!sourceSheet) {
      throw new Error('DIAG: aba BASE ESPELHO nao encontrada no arquivo convertido.');
    }

    const data = sourceSheet.getDataRange().getDisplayValues();

    Logger.log('DIAG: linhas carregadas: ' + data.length);
    Logger.log('DIAG: colunas carregadas: ' + (data[0] ? data[0].length : 0));

    const resumo = diagnosticarMetricaBaseArray_(data, 'mai/26');

    Logger.log('DIAG RESULTADO BASE ESPELHO CONVERTIDA: ' + JSON.stringify(resumo, null, 2));

    return resumo;

  } catch (e) {
    Logger.log('DIAG ERRO: ' + e.message);
    throw e;
  } finally {
    if (tempFileId) {
      try {
        Drive.Files.remove(tempFileId);
        Logger.log('DIAG: arquivo temporario removido: ' + tempFileId);
      } catch (removeError) {
        Logger.log('DIAG: erro ao remover temporario: ' + removeError.message);
      }
    }
  }
}

function diagnosticarMetricaBaseArray_(data, mesRef) {
  const resultado = {
    mes: mesRef,
    totalLinhas: data.length,
    totalOperadorMes: 0,
    totalCadastradasDR121: 0,
    totalAprovadasCZ103: 0,
    linhasSemSiteOuProduto: 0,
    porSiteProduto: {},
    exemplosAprovadas: [],
    exemplosSemSiteOuProduto: []
  };

  data.slice(1).forEach(row => {
    const perfil = String(row[91] || '').trim().toUpperCase();
    const mes = String(row[140] || '').trim().toLowerCase();

    if (perfil !== 'OPERADOR') return;
    if (mes !== String(mesRef || '').toLowerCase()) return;

    resultado.totalOperadorMes++;

    const site = String(row[81] || '').trim();
    const produto = String(row[106] || '').trim();
    const chave = `${site || '(sem site)'} | ${produto || '(sem produto)'}`;

    const cadastradas = parseNumeroDiagnosticoSync_(row[121]);
    const aprovadas = parseNumeroDiagnosticoSync_(row[103]);

    resultado.totalCadastradasDR121 += cadastradas;
    resultado.totalAprovadasCZ103 += aprovadas;

    if (!resultado.porSiteProduto[chave]) {
      resultado.porSiteProduto[chave] = {
        site,
        produto,
        linhas: 0,
        cadastradas: 0,
        aprovadas: 0
      };
    }

    resultado.porSiteProduto[chave].linhas++;
    resultado.porSiteProduto[chave].cadastradas += cadastradas;
    resultado.porSiteProduto[chave].aprovadas += aprovadas;

    if (resultado.exemplosAprovadas.length < 20) {
      resultado.exemplosAprovadas.push({
        site,
        produto,
        operador: row[7],
        perfil: row[91],
        mes: row[140],
        brutasDR121: row[121],
        aprovadasCZ103: row[103]
      });
    }

    if (!site || !produto) {
      resultado.linhasSemSiteOuProduto++;
      if (resultado.exemplosSemSiteOuProduto.length < 20) {
        resultado.exemplosSemSiteOuProduto.push({
          site,
          produto,
          operador: row[7],
          perfil: row[91],
          mes: row[140],
          brutasDR121: row[121],
          aprovadasCZ103: row[103],
          supervisor: row[9]
        });
      }
    }
  });

  return resultado;
}

function diagnosticarBaseBridgeGoogleSheets() {
  const bridgeId = '1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg';
  const mesRef = 'mai/26';
  const colunasCriticas = {
    site: 81,
    perfil: 91,
    data: 92,
    tempoFalado: 93,
    vendasAprovadas: 103,
    produto: 106,
    totalLogadoIndicadores: 108,
    almoco: 115,
    vendasCadastradas: 121,
    tempoTrabalhado: 122,
    diferencaHoras: 124,
    mes: 140
  };
  const indicesPercentuais = [125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136];
  const indicesTempos = [87, 88, 93, 108, 115, 122, 124];
  const todosIndices = [...new Set([
    ...Object.values(colunasCriticas),
    ...indicesPercentuais,
    ...indicesTempos
  ])].sort((a, b) => a - b);

  const ss = SpreadsheetApp.openById(bridgeId);
  const baseSheet = localizarAba(ss, 'Base');
  if (!baseSheet) throw new Error('DIAG BRIDGE: aba Base nao encontrada.');

  const range = baseSheet.getDataRange();
  const valores = range.getValues();
  const exibidos = range.getDisplayValues();

  const linhasFiltradas = [];
  exibidos.slice(1).forEach((rowDisplay, idx) => {
    const rowValores = valores[idx + 1] || [];
    const perfil = String(rowDisplay[91] || '').trim().toUpperCase();
    const mes = String(rowDisplay[140] || '').trim().toLowerCase();

    if (perfil !== 'OPERADOR') return;
    if (mes !== mesRef) return;

    linhasFiltradas.push({
      linhaPlanilha: idx + 2,
      valores: rowValores,
      exibidos: rowDisplay
    });
  });

  const diagnosticoColunas = {};
  todosIndices.forEach(idx => {
    const exemplos = linhasFiltradas.slice(0, 10).map(item => ({
      linha: item.linhaPlanilha,
      valor: item.valores[idx],
      display: item.exibidos[idx],
      tipoValor: typeof item.valores[idx]
    }));

    diagnosticoColunas[idx] = {
      indiceJS: idx,
      colunaPlanilha: idx + 1,
      exemplos,
      somaDisplay: linhasFiltradas.reduce((soma, item) => soma + parseNumeroDiagnosticoSync_(item.exibidos[idx]), 0),
      somaValues: linhasFiltradas.reduce((soma, item) => soma + parseNumeroDiagnosticoSync_(item.valores[idx]), 0)
    };
  });

  const exemplosPercentuais = linhasFiltradas.slice(0, 10).map(item => {
    const exemplo = { linha: item.linhaPlanilha };
    indicesPercentuais.forEach(idx => {
      exemplo[idx] = {
        valor: item.valores[idx],
        display: item.exibidos[idx],
        tipoValor: typeof item.valores[idx]
      };
    });
    return exemplo;
  });

  const exemplosTempos = linhasFiltradas.slice(0, 10).map(item => {
    const exemplo = { linha: item.linhaPlanilha };
    indicesTempos.forEach(idx => {
      exemplo[idx] = {
        valor: item.valores[idx],
        display: item.exibidos[idx],
        tipoValor: typeof item.valores[idx]
      };
    });
    return exemplo;
  });

  const linhasComTempoExibidoZero = linhasFiltradas
    .filter(item => indicesTempos.some(idx => {
      const display = String(item.exibidos[idx] || '').trim().toLowerCase();
      return display === '0' || display === '0s' || display === '00:00:00';
    }))
    .slice(0, 20)
    .map(item => ({
      linha: item.linhaPlanilha,
      operador: item.exibidos[7],
      site: item.exibidos[81],
      produto: item.exibidos[106],
      tempos: indicesTempos.reduce((acc, idx) => {
        acc[idx] = {
          valor: item.valores[idx],
          display: item.exibidos[idx],
          tipoValor: typeof item.valores[idx]
        };
        return acc;
      }, {})
    }));

  const linhasValorNumeroDisplayEstranho = linhasFiltradas
    .filter(item => todosIndices.some(idx => typeof item.valores[idx] === 'number' && String(item.exibidos[idx] || '').trim() && parseNumeroDiagnosticoSync_(item.exibidos[idx]) !== item.valores[idx]))
    .slice(0, 20)
    .map(item => ({
      linha: item.linhaPlanilha,
      operador: item.exibidos[7],
      site: item.exibidos[81],
      produto: item.exibidos[106],
      diferencas: todosIndices.reduce((acc, idx) => {
        if (typeof item.valores[idx] === 'number' && String(item.exibidos[idx] || '').trim() && parseNumeroDiagnosticoSync_(item.exibidos[idx]) !== item.valores[idx]) {
          acc[idx] = {
            valor: item.valores[idx],
            display: item.exibidos[idx],
            tipoValor: typeof item.valores[idx]
          };
        }
        return acc;
      }, {})
    }));

  const resultado = {
    planilhaId: bridgeId,
    aba: baseSheet.getName(),
    totalLinhas: valores.length,
    totalColunas: valores[0] ? valores[0].length : 0,
    mes: mesRef,
    totalOperadorMai26: linhasFiltradas.length,
    totais: {
      cadastradasDisplay121: linhasFiltradas.reduce((soma, item) => soma + parseNumeroDiagnosticoSync_(item.exibidos[121]), 0),
      aprovadasDisplay103: linhasFiltradas.reduce((soma, item) => soma + parseNumeroDiagnosticoSync_(item.exibidos[103]), 0),
      cadastradasValues121: linhasFiltradas.reduce((soma, item) => soma + parseNumeroDiagnosticoSync_(item.valores[121]), 0),
      aprovadasValues103: linhasFiltradas.reduce((soma, item) => soma + parseNumeroDiagnosticoSync_(item.valores[103]), 0)
    },
    colunasCriticas,
    diagnosticoColunas,
    exemplosPercentuais,
    exemplosTempos,
    linhasComTempoExibidoZero,
    linhasValorNumeroDisplayEstranho
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function corrigirTemposBaseBridgeAtual() {
  const bridgeId = '1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg';
  const nomeBackup = '_BACKUP_ANTES_CORRECAO_TEMPOS';
  const indicesTempos = [86, 87, 88, 93, 108, 115, 122];

  const ss = SpreadsheetApp.openById(bridgeId);
  const baseSheet = localizarAba(ss, 'Base');
  if (!baseSheet) throw new Error('CORRECAO TEMPOS: aba Base nao encontrada.');

  const rangeBase = baseSheet.getDataRange();
  const dadosBase = rangeBase.getValues();
  const totalLinhas = dadosBase.length;
  const totalColunas = dadosBase[0] ? dadosBase[0].length : 0;

  try {
    const backupSheet = obterOuCriarAbaSync_(ss, nomeBackup);
    gravarDadosEmAbaSync_(backupSheet, dadosBase);
  } catch (erroBackup) {
    Logger.log('CORRECAO TEMPOS: backup falhou; Base nao foi alterada. ' + erroBackup.message);
    throw new Error('CORRECAO TEMPOS: backup falhou; Base nao foi alterada. ' + erroBackup.message);
  }

  const resumo = {
    planilhaId: bridgeId,
    aba: baseSheet.getName(),
    backup: nomeBackup,
    totalLinhas,
    totalColunas,
    celulasAvaliadas: 0,
    colunas: {}
  };

  indicesTempos.forEach(indiceJs => {
    const colunaPlanilha = indiceJs + 1;
    const quantidadeLinhasDados = Math.max(totalLinhas - 1, 0);
    const infoColuna = {
      indiceJS: indiceJs,
      colunaPlanilha,
      avaliadas: quantidadeLinhasDados,
      corrigidas: 0,
      exemplos: []
    };

    resumo.celulasAvaliadas += quantidadeLinhasDados;

    if (quantidadeLinhasDados === 0) {
      resumo.colunas[indiceJs] = infoColuna;
      return;
    }

    const valoresColuna = baseSheet.getRange(2, colunaPlanilha, quantidadeLinhasDados, 1).getValues();
    const corrigidos = valoresColuna.map((linha, idx) => {
      const antes = linha[0];
      const depois = normalizarTempoBridge_(antes);

      if (depois !== antes) {
        infoColuna.corrigidas++;
        if (infoColuna.exemplos.length < 10) {
          infoColuna.exemplos.push({
            linha: idx + 2,
            antes,
            depois
          });
        }
      }

      return [depois];
    });

    baseSheet.getRange(2, colunaPlanilha, quantidadeLinhasDados, 1)
      .setValues(corrigidos)
      .setNumberFormat('[h]:mm:ss');

    resumo.colunas[indiceJs] = infoColuna;
  });

  Logger.log('CORRECAO TEMPOS BASE BRIDGE: ' + JSON.stringify(resumo, null, 2));
  console.log('CORRECAO TEMPOS BASE BRIDGE: ' + JSON.stringify(resumo));
  return resumo;
}

function normalizarTempoBridge_(valor) {
  if (valor === null || valor === undefined || valor === '') return valor;

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    const segundos =
      valor.getUTCHours() * 3600 +
      valor.getUTCMinutes() * 60 +
      valor.getUTCSeconds() +
      valor.getUTCMilliseconds() / 1000;

    return segundos / 86400;
  }

  if (typeof valor === 'number') {
    if (valor === 0) return 0;
    if (Math.abs(valor) > 1) return valor / 1000000000;
    return valor;
  }

  let texto = String(valor).trim();
  if (!texto) return valor;

  texto = texto.replace(/\s/g, '');

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');

  if (temVirgula && temPonto) {
    const ultimaVirgula = texto.lastIndexOf(',');
    const ultimoPonto = texto.lastIndexOf('.');

    if (ultimaVirgula > ultimoPonto) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(/,/g, '');
    }
  } else if (temVirgula) {
    texto = texto.replace(',', '.');
  }

  const n = Number(texto);
  if (!Number.isFinite(n)) return valor;

  if (n === 0) return 0;
  if (Math.abs(n) > 1) return n / 1000000000;
  return n;
}

function parseNumeroDiagnosticoSync_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return valor;

  let texto = String(valor).trim();
  if (!texto) return 0;

  texto = texto
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/%/g, '');

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');

  if (temVirgula && temPonto) {
    const ultimaVirgula = texto.lastIndexOf(',');
    const ultimoPonto = texto.lastIndexOf('.');

    if (ultimaVirgula > ultimoPonto) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(/,/g, '');
    }
  } else if (temVirgula) {
    texto = texto.replace(',', '.');
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}
