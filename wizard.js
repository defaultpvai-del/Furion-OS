(function () {
  'use strict';
  if (window.__furionWizardLoaded) return;
  window.__furionWizardLoaded = true;

  const areaCategories = new Set([
    'VISUAL (ADESIVOS/LONAS)',
    'CHAPAS E RÍGIDOS',
    'INSUFILM'
  ]);
  const $ = id => document.getElementById(id);
  const original = {
    newBudget: window.newBudget,
    goBudgetFromClient: window.goBudgetFromClient,
    navTo: window.navTo,
    addRow: window.addRow,
    applyPrice: window.applyPrice,
    updateMat: window.updateMat,
    calc: window.calc,
    collectBudget: window.collectBudget,
    budgetToDbPayload: window.budgetToDbPayload,
    dbBudgetToUi: window.dbBudgetToUi,
    applyBudgetToForm: window.applyBudgetToForm,
    renderReview: window.renderReview,
    openReview: window.openReview,
    fillPdfFromBudget: window.fillPdfFromBudget
  };

  let currentStep = 1;
  let pendingCategory = null;

  const progressMarkup = function () {
    return '<div class="wizard-progress" aria-label="Etapas do orçamento">' +
      '<div class="wizard-step" data-step="1"><span>1</span><b>Cliente</b></div>' +
      '<div class="wizard-step" data-step="2"><span>2</span><b>Materiais</b></div>' +
      '<div class="wizard-step" data-step="3"><span>3</span><b>Custos</b></div>' +
      '<div class="wizard-step" data-step="4"><span>4</span><b>Revisão</b></div>' +
      '</div>';
  };

  function injectStyles() {
    if ($('furionWizardStyles')) return;
    const style = document.createElement('style');
    style.id = 'furionWizardStyles';
    style.textContent =
      '.wizard-progress{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:0 0 17px}' +
      '.wizard-step{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:58px;padding:7px 3px;border:1px solid var(--border);border-radius:12px;background:var(--card);color:var(--muted);font-size:8px;text-align:center}' +
      '.wizard-step span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--card2);font-size:9px;font-weight:900}' +
      '.wizard-step b{font-size:8px;font-weight:900}' +
      '.wizard-step.active{border-color:var(--cyan);color:var(--text);background:rgba(0,174,239,.08)}' +
      '.wizard-step.active span{background:var(--cyan);color:#071018}' +
      '.wizard-step.done{border-color:rgba(0,232,131,.55);color:var(--success)}' +
      '.wizard-stage-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0 22px}' +
      '.wizard-stage-actions .btn-primary,.wizard-stage-actions .btn-secondary{min-height:44px}' +
      '.wizard-summary{margin-top:13px}' +
      '.wizard-summary-main{font-size:21px;font-weight:900;color:var(--success);margin-top:4px}' +
      '.wizard-summary-sub{font-size:8px;color:var(--muted);line-height:1.5;margin-top:5px}' +
      '.m2-cost-field{margin-top:9px}' +
      '.m2-cost-field .field-hint{font-size:8px;color:var(--muted);line-height:1.4;margin:5px 2px 0}' +
      '.wizard-extra-row{position:relative;border:1px solid var(--border);border-radius:12px;padding:11px 42px 11px 11px;margin:8px 0;background:var(--card2)}' +
      '.wizard-extra-row .grid-2{gap:7px}' +
      '.wizard-extra-row .modern-input{padding:10px;font-size:11px}' +
      '.wizard-extra-delete{position:absolute;right:8px;top:10px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(255,77,103,.15);color:var(--danger);font-weight:900}' +
      '.wizard-cost-total{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--border);padding-top:11px;margin-top:12px;font-size:9px;font-weight:800}' +
      '.wizard-cost-total strong{font-size:14px;color:var(--success)}' +
      '.wizard-extra-help{font-size:8px;color:var(--muted);line-height:1.5;margin:-3px 0 10px}' +
      '#wizardStage2[hidden],#wizardStage3[hidden]{display:none!important}' +
      '#summaryFooter{display:none!important}' +
      '@media(max-width:370px){.wizard-step{font-size:7px}.wizard-step b{font-size:7px}}';
    document.head.appendChild(style);
  }

  function injectProgress(page) {
    if (!page || page.querySelector('.wizard-progress')) return;
    const title = page.querySelector('.page-title');
    if (!title) return;
    title.insertAdjacentHTML('beforebegin', progressMarkup());
  }

  function buildWizardLayout() {
    const clientPage = $('page-cliente');
    const budgetPage = $('page-orcamento');
    const reviewPage = $('page-resumo');
    if (!clientPage || !budgetPage || !reviewPage || $('wizardStage2')) return;

    injectProgress(clientPage);
    injectProgress(budgetPage);
    injectProgress(reviewPage);

    const panels = Array.from(budgetPage.children).filter(el => el.classList.contains('panel'));
    const identification = panels[0];
    const conditions = panels[1];
    const calculation = panels[2];
    const sectorPanel = panels[3];
    const items = $('itens');
    const addItemButton = items ? items.nextElementSibling : null;
    const subtitle = budgetPage.querySelector('.page-subtitle');
    if (!identification || !conditions || !calculation || !sectorPanel || !items || !subtitle) return;

    const stage2 = document.createElement('div');
    stage2.id = 'wizardStage2';
    const stage3 = document.createElement('div');
    stage3.id = 'wizardStage3';
    subtitle.insertAdjacentElement('afterend', stage2);
    stage2.insertAdjacentElement('afterend', stage3);

    const markupField = calculation.querySelector('#lucro')?.closest('.field-box');
    const markupPanel = document.createElement('div');
    markupPanel.className = 'panel';
    markupPanel.innerHTML = '<span class="panel-label">Margem de lucro dos materiais</span>';
    if (markupField) {
      const label = markupField.querySelector('label');
      if (label) label.textContent = 'Markup aplicado sobre os materiais (%)';
      markupPanel.appendChild(markupField);
    }
    const markupHint = document.createElement('div');
    markupHint.className = 'wizard-extra-help';
    markupHint.textContent = 'A margem é aplicada sobre o custo dos materiais e serviços calculados por item.';
    markupPanel.appendChild(markupHint);

    const calcLabel = calculation.querySelector('.panel-label');
    if (calcLabel) calcLabel.textContent = 'Deslocamento, mão de obra e desconto';
    const discountField = calculation.querySelector('#desc')?.closest('.field-box');
    if (discountField) {
      const label = discountField.querySelector('label');
      if (label) label.textContent = 'Desconto geral (%)';
    }
    const firstGrid = calculation.querySelector('.grid-2');
    if (firstGrid) firstGrid.style.gridTemplateColumns = '1fr';

    stage2.appendChild(identification);
    stage2.appendChild(markupPanel);
    stage2.appendChild(sectorPanel);
    stage2.appendChild(items);
    if (addItemButton && addItemButton.classList.contains('btn-ghost')) stage2.appendChild(addItemButton);

    const materialSummary = document.createElement('div');
    materialSummary.className = 'panel wizard-summary';
    materialSummary.innerHTML =
      '<span class="panel-label">Subtotal dos materiais para o cliente</span>' +
      '<div class="wizard-summary-main" id="wizardMaterialSale">R$ 0,00</div>' +
      '<div class="wizard-summary-sub">Custo dos materiais: <strong id="wizardMaterialCost">R$ 0,00</strong>. O custo por m² pode ser ajustado individualmente em cada item.</div>';
    stage2.appendChild(materialSummary);

    const stage2Actions = document.createElement('div');
    stage2Actions.className = 'wizard-stage-actions';
    stage2Actions.innerHTML =
      '<button class="btn-secondary" type="button" onclick="wizardGoStep(1)">VOLTAR AO CLIENTE</button>' +
      '<button class="btn-primary" type="button" onclick="wizardGoStep(3)">CONTINUAR PARA CUSTOS</button>';
    stage2.appendChild(stage2Actions);

    stage3.appendChild(conditions);
    stage3.appendChild(calculation);

    const extrasPanel = document.createElement('div');
    extrasPanel.className = 'panel';
    extrasPanel.id = 'wizardExtrasPanel';
    extrasPanel.innerHTML =
      '<span class="panel-label">Outros custos adicionais</span>' +
      '<p class="wizard-extra-help">Inclua instalação terceirizada, frete, acabamento, materiais extras ou qualquer outro custo que não esteja nos itens acima.</p>' +
      '<div id="wizardExtraCosts"></div>' +
      '<button class="btn-ghost btn-wide" type="button" onclick="addWizardExtraCost()">+ ADICIONAR CUSTO ADICIONAL</button>' +
      '<div class="wizard-cost-total"><span>Subtotal de custos adicionais e mão de obra</span><strong id="wizardExtraSubtotal">R$ 0,00</strong></div>';
    stage3.appendChild(extrasPanel);

    const stage3Actions = document.createElement('div');
    stage3Actions.className = 'wizard-stage-actions';
    stage3Actions.innerHTML =
      '<button class="btn-secondary" type="button" onclick="wizardGoStep(2)">VOLTAR AOS MATERIAIS</button>' +
      '<button class="btn-primary" type="button" onclick="wizardGoStep(4)">REVISAR ORÇAMENTO</button>';
    stage3.appendChild(stage3Actions);

    const spacer = Array.from(budgetPage.children).find(el => el.getAttribute('style')?.includes('height:155px'));
    if (spacer) spacer.remove();

    const continueButton = clientPage.querySelector('button[onclick="goBudgetFromClient()"]');
    if (continueButton) continueButton.textContent = 'CONTINUAR PARA MATERIAIS';

    const clientTitle = clientPage.querySelector('.page-title');
    if (clientTitle) clientTitle.textContent = 'Dados do cliente';
    const clientSubtitle = clientPage.querySelector('.page-subtitle');
    if (clientSubtitle) clientSubtitle.textContent = 'Etapa 1 de 4 · Selecione um cliente salvo ou cadastre os dados para este orçamento.';

    const reviewTitle = reviewPage.querySelector('.page-title');
    if (reviewTitle) reviewTitle.textContent = 'Revisão final';
    const reviewSubtitle = reviewPage.querySelector('.page-subtitle');
    if (reviewSubtitle) reviewSubtitle.textContent = 'Etapa 4 de 4 · Confira os valores separados antes de salvar ou gerar a proposta.';

    const clientActions = clientPage.querySelector('.btn-row');
    if (clientActions) clientActions.style.gridTemplateColumns = '1fr 1.3fr';

    const budgetTitle = budgetPage.querySelector('.page-title');
    if (budgetTitle) budgetTitle.textContent = 'Materiais e serviços';
    const budgetSubtitle = budgetPage.querySelector('.page-subtitle');
    if (budgetSubtitle) budgetSubtitle.textContent = 'Etapa 2 de 4 · Adicione os itens, informe as medidas e ajuste o custo por m² de cada serviço terceirizado.';

    const reviewActions = reviewPage.querySelector('.review-actions');
    if (reviewActions) reviewActions.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))';

    const footer = $('summaryFooter');
    if (footer) footer.classList.add('hidden');
  }

  function collectExtraCosts() {
    return Array.from(document.querySelectorAll('#wizardExtraCosts .wizard-extra-row'))
      .map(row => ({
        description: row.querySelector('.wizard-extra-desc')?.value.trim() || '',
        value: num(row.querySelector('.wizard-extra-value')?.value)
      }))
      .filter(item => item.description || item.value > 0)
      .map(item => ({
        description: item.description || 'Custo adicional',
        value: item.value
      }));
  }

  function addExtraCostRow(item, silent) {
    const box = $('wizardExtraCosts');
    if (!box) return;
    const row = document.createElement('div');
    row.className = 'wizard-extra-row';
    row.innerHTML =
      '<div class="grid-2">' +
      '<div class="field-box"><label>Descrição do custo</label><input class="modern-input wizard-extra-desc" placeholder="Ex.: instalação terceirizada"></div>' +
      '<div class="field-box"><label>Valor R$</label><input class="modern-input wizard-extra-value" type="number" min="0" step="0.01" placeholder="0,00"></div>' +
      '</div>' +
      '<button class="wizard-extra-delete" type="button" aria-label="Remover custo">×</button>';
    row.querySelector('.wizard-extra-desc').value = item?.description || '';
    row.querySelector('.wizard-extra-value').value = item?.value ?? '';
    row.querySelector('.wizard-extra-delete').addEventListener('click', function () {
      row.remove();
      calc();
      scheduleAutosave();
    });
    row.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', function () {
        calc();
        scheduleAutosave();
      });
    });
    box.appendChild(row);
    if (!silent) {
      calc();
      scheduleAutosave();
    }
  }

  function renderExtraCosts(items) {
    const box = $('wizardExtraCosts');
    if (!box) return;
    box.innerHTML = '';
    (Array.isArray(items) ? items : []).forEach(item => addExtraCostRow(item, true));
    calc();
  }

  function updateStepView() {
    document.querySelectorAll('.wizard-progress').forEach(progress => {
      progress.querySelectorAll('.wizard-step').forEach(node => {
        const n = Number(node.dataset.step);
        node.classList.toggle('active', n === currentStep);
        node.classList.toggle('done', n < currentStep);
      });
    });
    const stage2 = $('wizardStage2');
    const stage3 = $('wizardStage3');
    if (stage2) stage2.hidden = currentStep !== 2;
    if (stage3) stage3.hidden = currentStep !== 3;
    const budgetPage = $('page-orcamento');
    if (budgetPage) {
      const title = budgetPage.querySelector('.page-title');
      const subtitle = budgetPage.querySelector('.page-subtitle');
      if (currentStep === 3) {
        if (title) title.textContent = 'Custos adicionais e mão de obra';
        if (subtitle) subtitle.textContent = 'Etapa 3 de 4 · Informe deslocamento, mão de obra, instalação, frete, desconto e outros custos.';
      } else {
        if (title) title.textContent = 'Materiais e serviços';
        if (subtitle) subtitle.textContent = 'Etapa 2 de 4 · Adicione os itens, informe as medidas e ajuste o custo por m² de cada serviço terceirizado.';
      }
    }
    const footer = $('summaryFooter');
    if (footer) footer.classList.add('hidden');
  }

  function setStep(step) {
    currentStep = step;
    if (step === 1) {
      window.navTo('page-cliente');
    } else if (step === 2 || step === 3) {
      if (!$('inpNome')?.value.trim()) {
        currentStep = 1;
        window.navTo('page-cliente');
        return;
      }
      window.navTo('page-orcamento');
    } else if (step === 4) {
      window.navTo('page-resumo');
    }
    updateStepView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.wizardGoStep = function (step) {
    if (step === 3 || step === 4) {
      const items = collectItems();
      if (!items.length) return alert('Adicione pelo menos um material ou serviço.');
      if (items.some(item => !item.material)) return alert('Selecione o material ou serviço em todos os itens.');
    }
    if (step === 4) {
      window.openReview();
      return;
    }
    setStep(step);
  };
  window.addWizardExtraCost = function () {
    addExtraCostRow({}, false);
  };

  window.calc = function () {
    document.querySelectorAll('.item-card').forEach(card => {
      if (!areaCategories.has(card.dataset.category)) return;
      const priceInput = card.querySelector('.p-m2');
      const baseInput = card.querySelector('.mat-val');
      if (priceInput && baseInput) baseInput.value = priceInput.value;
    });

    const base = original.calc();
    const extras = collectExtraCosts();
    const extrasTotal = extras.reduce((sum, item) => sum + num(item.value), 0);
    const logistics = num($('deslocamento')?.value);
    const labor = num($('mao-obra')?.value);
    const itemCost = num(base?.itemCost);
    const materialSale = Array.from(document.querySelectorAll('.item-card'))
      .reduce((sum, card) => sum + num(card.dataset.sale), 0);
    const totalCost = itemCost + logistics + labor + extrasTotal;
    const subtotal = materialSale + logistics + labor + extrasTotal;
    const discountPct = Math.min(100, Math.max(0, num($('desc')?.value))) / 100;
    const discount = subtotal * discountPct;
    const final = subtotal - discount;
    const profit = final - totalCost;

    lastCalc = { itemCost, totalCost, subtotal, discount, final, profit };
    if ($('labelCost')) $('labelCost').textContent = money(totalCost);
    if ($('labelProfit')) $('labelProfit').textContent = money(profit);
    if ($('labelDiscount')) $('labelDiscount').textContent = money(discount);
    if ($('totalFinal')) $('totalFinal').textContent = money(final);

    const materialCostEl = $('wizardMaterialCost');
    const materialSaleEl = $('wizardMaterialSale');
    if (materialCostEl) materialCostEl.textContent = money(itemCost);
    if (materialSaleEl) materialSaleEl.textContent = money(materialSale);
    const extrasSubtotalEl = $('wizardExtraSubtotal');
    if (extrasSubtotalEl) extrasSubtotalEl.textContent = money(logistics + labor + extrasTotal);
    return lastCalc;
  };

  window.applyPrice = function (sel) {
    const card = sel.closest('.item-card');
    if (!card) return;
    const category = card.dataset.category;
    if (areaCategories.has(category)) {
      const group = card.querySelector('.sel-grp')?.value;
      const item = sel.value;
      const price = masterData?.[category]?.[group]?.[item];
      const base = card.querySelector('.mat-val');
      const editable = card.querySelector('.p-m2');
      if (base) base.value = price === undefined ? 0 : price;
      if (editable) editable.value = price === undefined ? '' : price;
      calc();
      scheduleAutosave();
      return;
    }
    original.applyPrice(sel);
  };

  window.updateMat = function (sel, desired) {
    original.updateMat(sel, desired);
    const card = sel.closest('.item-card');
    if (card && areaCategories.has(card.dataset.category) && !desired && !card.querySelector('.sel-mat')?.value) {
      const base = card.querySelector('.mat-val');
      const editable = card.querySelector('.p-m2');
      if (base) base.value = 0;
      if (editable) editable.value = '';
      calc();
    }
  };

  window.addRow = function (category, data) {
    const result = original.addRow(category, data);
    const cards = document.querySelectorAll('.item-card');
    const card = cards[cards.length - 1];
    if (card && areaCategories.has(card.dataset.category) && !card.querySelector('.p-m2')) {
      const qtyField = card.querySelector('.qty')?.closest('.field-box');
      const field = document.createElement('div');
      field.className = 'field-box m2-cost-field';
      field.innerHTML =
        '<label>Custo terceirizado por m² (R$)</label>' +
        '<input type="number" min="0" step="0.01" class="modern-input p-m2" placeholder="Informe o custo cobrado pelo fornecedor">' +
        '<div class="field-hint">Valor editável somente neste item do orçamento. Não altera o preço do catálogo.</div>';
      const editable = field.querySelector('.p-m2');
      editable.value = card.querySelector('.mat-val')?.value || '';
      editable.addEventListener('input', function () {
        if (card.querySelector('.mat-val')) card.querySelector('.mat-val').value = editable.value;
        calc();
        scheduleAutosave();
      });
      if (qtyField) qtyField.before(field);
      const costLabel = card.querySelector('.item-finance > div:first-child');
      if (costLabel && costLabel.firstChild) costLabel.firstChild.textContent = 'Custo terceirizado';
      calc();
    }
    return result;
  };

  window.collectBudget = function () {
    const budget = original.collectBudget();
    budget.extraCosts = collectExtraCosts();
    return budget;
  };

  window.budgetToDbPayload = function (budget, clientId) {
    const payload = original.budgetToDbPayload(budget, clientId);
    payload.client_snapshot = Object.assign({}, payload.client_snapshot || {}, {
      _extraCosts: Array.isArray(budget.extraCosts) ? budget.extraCosts : []
    });
    return payload;
  };

  window.dbBudgetToUi = function (db) {
    const budget = original.dbBudgetToUi(db);
    budget.extraCosts = Array.isArray(db?.client_snapshot?._extraCosts) ? db.client_snapshot._extraCosts : [];
    return budget;
  };

  window.applyBudgetToForm = function (budget, isAutosave) {
    original.applyBudgetToForm(budget, isAutosave);
    renderExtraCosts(budget?.extraCosts || []);
    setStep(1);
    calc();
  };

  window.newBudget = function (category) {
    pendingCategory = category || null;
    renderExtraCosts([]);
    original.newBudget(null);
    setStep(1);
    calc();
  };

  window.goBudgetFromClient = function () {
    if (!$('inpNome')?.value.trim()) return alert('Selecione ou informe um cliente.');
    currentStep = 2;
    original.goBudgetFromClient();
    if (pendingCategory) {
      activeCat = pendingCategory;
      if ($('novaCategoria')) $('novaCategoria').value = pendingCategory;
      addRow(pendingCategory);
      pendingCategory = null;
    }
    updateBudgetContext();
    setStep(2);
  };

  window.navTo = function (pageId) {
    if (pageId === 'page-cliente') {
      currentStep = 1;
      const result = original.navTo(pageId);
      updateStepView();
      return result;
    }
    if (pageId === 'page-orcamento') {
      if (!$('inpNome')?.value.trim()) {
        currentStep = 1;
        const result = original.navTo('page-cliente');
        updateStepView();
        return result;
      }
      if (currentStep !== 3) currentStep = 2;
      const result = original.navTo(pageId);
      updateStepView();
      return result;
    }
    if (pageId === 'page-resumo') {
      currentStep = 4;
      const result = original.navTo(pageId);
      updateStepView();
      return result;
    }
    const result = original.navTo(pageId);
    updateStepView();
    return result;
  };

  window.openReview = function () {
    if (!$('inpNome')?.value.trim()) {
      setStep(1);
      return alert('Informe o cliente antes de revisar.');
    }
    const items = collectItems();
    if (!items.length) return alert('Adicione pelo menos um material ou serviço.');
    if (items.some(item => !item.material)) return alert('Selecione o material ou serviço em todos os itens.');
    calc();
    window.renderReview(collectBudget(), false);
  };

  window.renderReview = function (budget, readOnly) {
    original.renderReview(budget, readOnly);
    const extras = Array.isArray(budget?.extraCosts) ? budget.extraCosts : [];
    const extrasTotal = extras.reduce((sum, item) => sum + num(item.value), 0);
    const materialSale = (budget?.items || []).reduce((sum, item) => sum + num(item.sale), 0);
    const additionalTotal = num(budget?.logistics) + num(budget?.labor) + extrasTotal;
    const extraLines = extras.map(item =>
      '<div class="finance-line"><span>' + escapeHtml(item.description || 'Custo adicional') + '</span><span>' + money(item.value) + '</span></div>'
    ).join('');
    const finance = $('reviewFinance');
    if (finance) {
      finance.innerHTML =
        '<div class="finance-breakdown">' +
        '<div class="finance-line"><span>Custo dos materiais (interno)</span><span>' + money(budget?.totals?.itemCost) + '</span></div>' +
        '<div class="finance-line"><span>Subtotal de materiais</span><span>' + money(materialSale) + '</span></div>' +
        '<div class="finance-line"><span>Deslocamento</span><span>' + money(budget?.logistics) + '</span></div>' +
        '<div class="finance-line"><span>Mão de obra</span><span>' + money(budget?.labor) + '</span></div>' +
        extraLines +
        '<div class="finance-line"><strong>Subtotal custos adicionais</strong><strong>' + money(additionalTotal) + '</strong></div>' +
        '<div class="finance-line"><strong>Subtotal geral</strong><strong>' + money(budget?.totals?.subtotal) + '</strong></div>' +
        '<div class="finance-line"><span>Desconto</span><span>- ' + money(budget?.totals?.discount) + '</span></div>' +
        '<div class="finance-line profit"><span>Lucro estimado</span><span>' + money(budget?.totals?.profit) + '</span></div>' +
        '<div class="finance-total-row"><label>TOTAL CLIENTE</label><span>' + money(budget?.totals?.final) + '</span></div>' +
        '</div>' +
        '<div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px;font-size:8px;color:var(--muted);line-height:1.65">' +
        '<strong style="color:var(--text)">Condições</strong><br>' +
        'Validade: ' + escapeHtml(budget?.proposal?.validityDays || appConfig.defaultValidity) + ' dias<br>' +
        'Pagamento: ' + escapeHtml(budget?.proposal?.payment || appConfig.defaultPayment) + '<br>' +
        'Prazo: ' + escapeHtml(budget?.proposal?.execution || appConfig.defaultExecution) + '<br>' +
        'Observações: ' + escapeHtml(budget?.proposal?.notes || 'Nenhuma') +
        '</div>';
    }

    const actions = document.querySelector('#page-resumo .review-actions');
    if (actions) {
      actions.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))';
      if (readOnly) {
        actions.innerHTML =
          '<button class="btn-secondary" onclick="navTo(\'page-gestao\')">VOLTAR</button>' +
          '<button class="btn-primary" onclick="gerarPDFFromSaved(\'' + budget.id + '\')">GERAR PROPOSTA</button>';
      } else {
        actions.innerHTML =
          '<button class="btn-secondary" onclick="wizardGoStep(1)">EDITAR CLIENTE</button>' +
          '<button class="btn-secondary" onclick="wizardGoStep(2)">EDITAR MATERIAIS</button>' +
          '<button class="btn-secondary" onclick="wizardGoStep(3)">EDITAR CUSTOS</button>' +
          '<button class="btn-primary" onclick="saveBudget(true)">SALVAR</button>' +
          '<button class="btn-secondary" onclick="markAndSave(\'Enviado\')">MARCAR ENVIADO</button>' +
          '<button class="btn-primary" onclick="gerarPDF()">GERAR PROPOSTA</button>';
      }
    }
    updateStepView();
  };

  window.fillPdfFromBudget = function (budget) {
    original.fillPdfFromBudget(budget);
    const body = $('pdf-body');
    if (body && Array.isArray(budget?.extraCosts)) {
      budget.extraCosts.forEach(item => {
        body.innerHTML += '<tr><td>' + escapeHtml(item.description || 'Custo adicional') + '</td><td></td><td style="text-align:center">1</td><td style="text-align:right">' + money(item.value) + '</td></tr>';
      });
    }
    const discount = num(budget?.totals?.discount);
    if (body && discount > 0) {
      body.innerHTML += '<tr><td>Desconto</td><td></td><td style="text-align:center">1</td><td style="text-align:right">- ' + money(discount) + '</td></tr>';
    }
  };

  function initialize() {
    injectStyles();
    buildWizardLayout();
    updateStepView();
    calc();
  }

  initialize();
})();