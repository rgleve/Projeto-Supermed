// Teste de sincronização via VS Code e clasp
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Portal Supermed')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

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

function obterDadosExcel() {
  const idPlanilhaPonte = '1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg';
  try {
    const ss = SpreadsheetApp.openById(idPlanilhaPonte);
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
