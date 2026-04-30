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
  ]
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
    return sheet;
  }

  const atuais = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  const diferentes = headers.some((header, idx) => String(atuais[idx] || '').trim() !== header);
  if (diferentes) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
  return String(cpf || '').replace(/\D/g, '');
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
  return sheetRowsToObjects_(auth.usuarios).find(row => normalizarCPF(row.cpf) === cpfNormalizado) || null;
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

function loginPortal(cpf, senha) {
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

  return {
    ok: true,
    token: token,
    user: montarPayloadUsuarioSessao_(usuario),
    trocaSenhaObrigatoria: String(usuario.troca_senha_obrigatoria || '').trim().toUpperCase() === 'SIM'
  };
}

function validarSessao(token) {
  if (!token) return { ok: false, message: 'Sessão ausente.' };

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

  return {
    ok: true,
    user: montarPayloadUsuarioSessao_(usuario),
    trocaSenhaObrigatoria: String(usuario.troca_senha_obrigatoria || '').trim().toUpperCase() === 'SIM'
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

  return {
    ok: true,
    user: montarPayloadUsuarioSessao_(usuario),
    trocaSenhaObrigatoria: false
  };
}

function setupAdminInicialPortal() {
  const auth = obterAuthSheets_();
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

  return obterDadosExcelInterno_();
}

function obterDadosExcel() {
  return JSON.stringify([['Erro', 'Use obterDadosExcelAutenticado(token).']]);
}

function syncExcelToBridge() {
  const excelId = '1HOWv62ayFFoIsWOdjKmO5MzsKqd6H-BH';
  const bridgeId = '1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg';
  
  try {
    const excelFile = DriveApp.getFileById(excelId);
    const blob = excelFile.getBlob();
    
    const resource = {
      name: "TempSync",
      mimeType: MimeType.GOOGLE_SHEETS
    };
    
    const tempFile = Drive.Files.create(resource, blob);
    const tempSs = SpreadsheetApp.openById(tempFile.id);
    
    const sourceSheet = tempSs.getSheetByName("BASE ESPELHO");
    
    if (!sourceSheet) throw new Error("Aba BASE ESPELHO nao encontrada no Excel.");
    
    const data = sourceSheet.getDataRange().getValues();
    
    const bridgeSs = SpreadsheetApp.openById(bridgeId);
    const bridgeSheet = bridgeSs.getSheets()[0];
    bridgeSheet.clear();
    bridgeSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    Drive.Files.remove(tempFile.id);
    console.log("Sincronizacao realizada com sucesso!");
    
  } catch (e) {
    console.error("Erro na sincronizacao: " + e.message);
  }
}
