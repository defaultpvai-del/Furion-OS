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
    fillPdfFromBudget: window.fillPdfFromBudget,
    collectItems: window.collectItems
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
      if (card.dataset.pricingMode === 'linear') {
        const heightInput = card.querySelector('.alt');
        const heightUnit = card.querySelector('.unit-alt');
        if (heightInput) heightInput.value = '1';
        if (heightUnit) heightUnit.value = 'm';
      }
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

  function configureAreaPricing(card, mode) {
    if (!card || !areaCategories.has(card.dataset.category)) return;
    const select = card.querySelector('.pricing-mode');
    const heightField = card.querySelector('.alt')?.closest('.measure-field');
    const heightInput = card.querySelector('.alt');
    const heightUnit = card.querySelector('.unit-alt');
    const widthInput = card.querySelector('.larg');
    const widthLabel = card.querySelector('.linear-length-label');
    const areaInfo = card.querySelector('.measure-info');
    const linear = mode === 'linear';
    if (select) select.value = linear ? 'linear' : 'area';
    card.dataset.pricingMode = linear ? 'linear' : 'area';
    if (heightField) heightField.hidden = linear;
    if (heightInput && linear) {
      heightInput.value = '1';
      if (heightUnit) heightUnit.value = 'm';
    }
    if (widthInput) widthInput.placeholder = linear ? 'Comprimento' : 'Largura';
    if (widthLabel) widthLabel.textContent = linear ? 'Comprimento do material' : 'Largura';
    if (areaInfo) {
      if (linear) {
        areaInfo.textContent = 'Cálculo por metro linear: comprimento × preço por metro × quantidade.';
      } else {
        areaInfo.innerHTML = 'Área calculada: <span class="area-preview">1,000 m²</span>. Cada dimensão pode usar uma unidade diferente.';
      }
    }
    const costLabel = card.querySelector('.m2-cost-field label');
    if (costLabel) costLabel.textContent = linear ? 'Custo terceirizado por metro linear (R$)' : 'Custo terceirizado por m² (R$)';
    const hint = card.querySelector('.m2-cost-field .field-hint');
    if (hint) hint.textContent = linear
      ? 'Informe quanto você paga por 1 metro linear deste material. O valor vale somente para este item.'
      : 'Valor editável somente neste item do orçamento. Não altera o preço do catálogo.';
  }

  window.addRow = function (category, data) {
    const result = original.addRow(category, data);
    const cards = document.querySelectorAll('.item-card');
    const card = cards[cards.length - 1];
    if (card && areaCategories.has(card.dataset.category) && !card.querySelector('.p-m2')) {
      const qtyField = card.querySelector('.qty')?.closest('.field-box');
      const modeField = document.createElement('div');
      modeField.className = 'field-box pricing-mode-field';
      modeField.innerHTML = '<label>Como você compra este material?</label><select class="modern-select pricing-mode"><option value="area">Por metro quadrado (m²)</option><option value="linear">Por metro linear (m)</option></select>';
      if (qtyField) qtyField.before(modeField);
      const measureGrid = card.querySelector('.larg')?.closest('.grid-2');
      if (measureGrid) {
        const first = card.querySelector('.larg')?.closest('.measure-field');
        if (first && !first.querySelector('.linear-length-label')) {
          const label = document.createElement('label');
          label.className = 'linear-length-label';
          label.textContent = 'Largura';
          first.insertBefore(label, first.firstChild);
        }
      }
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
      card.querySelector('.pricing-mode').addEventListener('change', function () {
        configureAreaPricing(card, this.value);
        calc();
        scheduleAutosave();
      });
      const costLabel = card.querySelector('.item-finance > div:first-child');
      if (costLabel && costLabel.firstChild) costLabel.firstChild.textContent = 'Custo do material';
      configureAreaPricing(card, data?.pricingMode || 'area');
      calc();
    }
    return result;
  };

  window.collectItems = function () {
    const items = original.collectItems();
    return items.map((item, index) => {
      const card = document.querySelectorAll('.item-card')[index];
      if (card && areaCategories.has(card.dataset.category)) {
        item.pricingMode = card.dataset.pricingMode || 'area';
      }
      return item;
    });
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
    const reviewRows = document.querySelectorAll('#reviewItems .review-item');
    (budget?.items || []).forEach((item, index) => {
      if (item.pricingMode === 'linear' && reviewRows[index]) {
        const meta = reviewRows[index].querySelector('.review-item-meta');
        if (meta) meta.innerHTML = escapeHtml(item.width || 0) + ' ' + escapeHtml(item.widthUnit || 'm') +
          ' de comprimento · preço por metro linear<br>Quantidade: ' + escapeHtml(item.qty || 1);
      }
    });
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

  function proposalHtml(budget) {
    const client = budget?.client || {};
    const items = Array.isArray(budget?.items) ? budget.items : [];
    const extras = Array.isArray(budget?.extraCosts) ? budget.extraCosts : [];
    const cfg = typeof appConfig !== 'undefined' ? appConfig : {};
    const safe = value => escapeHtml(value == null ? '' : String(value));
    const rows = items.map(item =>
      '<tr><td><strong>' + safe(item.material || 'Item') + '</strong><br><small>' + safe(item.category || '') + '</small></td>' +
      '<td>' + safe(item.pricingMode === 'linear' ? ((item.width || 0) + ' ' + (item.widthUnit || 'm') + ' de comprimento · metro linear') : itemDetailText(item)) + '</td><td class="center">' + safe(item.qty || 1) +
      '</td><td class="right">' + money(item.sale) + '</td></tr>'
    ).join('');
    const extraRows = [
      ...(num(budget?.logistics) > 0 ? [{description:'Deslocamento e logística',value:budget.logistics}] : []),
      ...(num(budget?.labor) > 0 ? [{description:'Mão de obra',value:budget.labor}] : []),
      ...extras
    ].map(item => '<tr><td>' + safe(item.description || 'Custo adicional') +
      '</td><td></td><td class="center">1</td><td class="right">' + money(item.value) + '</td></tr>').join('');
    const subtotal = num(budget?.totals?.subtotal);
    const discount = num(budget?.totals?.discount);
    const final = num(budget?.totals?.final);
    const extra = [cfg.companyDoc, cfg.companyPhone, cfg.companyAddress].filter(Boolean).join(' · ');
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Proposta ' + safe(budget?.number || '') + ' · ' + safe(client.name || 'Cliente') + '</title>' +
      '<style>' +
      '*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#171717;margin:0;background:#f1f3f5;font-size:12px}' +
      '.toolbar{position:sticky;top:0;background:#101820;color:#fff;padding:12px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;z-index:5}' +
      '.toolbar button{border:0;border-radius:8px;padding:12px 16px;font-weight:700;background:#00aeef;color:#071018}' +
      '.sheet{max-width:850px;margin:20px auto;background:#fff;padding:36px;min-height:100vh;box-shadow:0 2px 16px #0002}' +
      '.head{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:20px}' +
      '.brand{font-size:28px;font-weight:900;letter-spacing:1px}.muted{color:#555;font-size:10px;line-height:1.6}' +
      '.meta{margin:14px 0 18px;line-height:1.8}.meta strong{display:inline-block;min-width:90px}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th{font-size:9px;text-transform:uppercase;text-align:left;background:#f2f4f6}' +
      'th,td{padding:9px 7px;border-bottom:1px solid #ddd;vertical-align:top}small{color:#666}.center{text-align:center}.right{text-align:right;white-space:nowrap}' +
      '.totals{margin:18px 0 0 auto;max-width:340px}.totals div{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd}.grand{font-size:20px;font-weight:900;border-top:2px solid #111!important;margin-top:6px;padding-top:12px!important}' +
      '.conditions{margin-top:24px;line-height:1.8}.foot{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#555}' +
      '@page{size:A4;margin:14mm}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;padding:0;max-width:none;min-height:0;box-shadow:none}tr{break-inside:avoid}thead{display:table-header-group}}' +
      '@media(max-width:600px){.sheet{margin:0;padding:18px}.head{align-items:flex-start}.brand{font-size:22px}table{font-size:10px}th,td{padding:7px 4px}}' +
      '</style></head><body><div class="toolbar"><button onclick="window.print()">SALVAR / IMPRIMIR PDF</button><button onclick="window.close()">FECHAR</button></div>' +
      '<main class="sheet"><header class="head"><div><div class="brand">' + safe(cfg.companyName || 'FURION') +
      '</div><div class="muted">' + safe(extra) + '</div></div><div style="text-align:right"><strong>PROPOSTA COMERCIAL</strong><div class="muted">' +
      safe(budget?.number || '') + '<br>' + new Date().toLocaleDateString('pt-BR') + '</div></div></header>' +
      '<section class="meta"><strong>Cliente:</strong> ' + safe(client.name || 'Não informado') + '<br><strong>Documento:</strong> ' +
      safe(client.doc || 'Não informado') + '<br><strong>Telefone:</strong> ' + safe(client.phone || 'Não informado') +
      '<br><strong>Endereço:</strong> ' + safe(client.address || 'Não informado') + '</section>' +
      '<table><thead><tr><th>Descrição</th><th>Medidas / detalhes</th><th class="center">Qtd.</th><th class="right">Total</th></tr></thead>' +
      '<tbody>' + rows + extraRows + '</tbody></table>' +
      '<section class="totals"><div><span>Subtotal</span><strong>' + money(subtotal) + '</strong></div>' +
      (discount > 0 ? '<div><span>Desconto</span><strong>- ' + money(discount) + '</strong></div>' : '') +
      '<div class="grand"><span>TOTAL</span><span>' + money(final) + '</span></div></section>' +
      '<section class="conditions"><strong>Condições comerciais</strong><br>Validade: ' + safe(budget?.proposal?.validityDays || cfg.defaultValidity || 15) +
      ' dias<br>Pagamento: ' + safe(budget?.proposal?.payment || cfg.defaultPayment || 'A combinar') +
      '<br>Prazo de execução: ' + safe(budget?.proposal?.execution || cfg.defaultExecution || 'A combinar') +
      '<br>Observações: ' + safe(budget?.proposal?.notes || 'Nenhuma') + '</section>' +
      '<footer class="foot">Documento gerado pelo Furion OS. Orçamento: ' + safe(budget?.status || 'Rascunho') + '</footer></main></body></html>';
  }

  function openProposalWindow() {
    const popup = window.open('', '_blank');
    if (!popup) {
      alert('O navegador bloqueou a janela da proposta. Permita pop-ups para este site e tente novamente.');
      return null;
    }
    popup.document.open();
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Preparando proposta...</title></head><body style="font-family:Arial;padding:24px">Preparando sua proposta...</body></html>');
    popup.document.close();
    return popup;
  }

  function showProposal(popup, budget) {
    if (!popup || popup.closed) {
      alert('A janela da proposta foi fechada antes de terminar.');
      return;
    }
    popup.document.open();
    popup.document.write(proposalHtml(budget));
    popup.document.close();
    const toolbar = popup.document.querySelector('.toolbar');
    for (const format of ['PDF','PNG','JPEG']) {
      const button = popup.document.createElement('button');
      button.textContent = 'BAIXAR '+format;
      toolbar.appendChild(button);
      button.onclick = async () => {
        button.disabled = true;
        try {
          const load = url => new Promise((resolve,reject)=>{
            const script=popup.document.createElement('script');
            script.src=url; script.onload=resolve; script.onerror=reject;
            popup.document.head.appendChild(script);
          });
          if(!popup.html2canvas) await load('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
          const sheet=popup.document.querySelector('.sheet');
          const canvas=await popup.html2canvas(sheet,{scale:2,backgroundColor:'#ffffff',windowWidth:Math.max(850,sheet.scrollWidth)});
          const name='Furion-Proposta-'+String(budget.number||'orcamento').replace(/[^a-zA-Z0-9_-]/g,'_');
          if(format==='PDF'){
            if(!popup.jspdf) await load('https://cdn.jsdelivr.net/npm/jspdf@3.0.3/dist/jspdf.umd.min.js');
            const pdf=new popup.jspdf.jsPDF('p','mm','a4');
            const width=190, pageHeight=277, sliceHeight=Math.floor(canvas.width*pageHeight/width);
            for(let y=0;y<canvas.height;y+=sliceHeight){
              const part=popup.document.createElement('canvas');
              part.width=canvas.width;part.height=Math.min(sliceHeight,canvas.height-y);
              part.getContext('2d').drawImage(canvas,0,y,part.width,part.height,0,0,part.width,part.height);
              if(y)pdf.addPage();
              pdf.addImage(part.toDataURL('image/jpeg',0.95),'JPEG',10,10,width,part.height*width/part.width);
            }
            pdf.save(name+'.pdf');
          }else{
            const link=popup.document.createElement('a');
            link.download=name+(format==='PNG'?'.png':'.jpg');
            link.href=canvas.toDataURL(format==='PNG'?'image/png':'image/jpeg',0.95);
            link.click();
          }
        }catch(e){popup.alert('Falha ao exportar. Tente novamente ou use Imprimir PDF.');}
        finally{button.disabled=false;}
      };
    }
    popup.focus();
  }

  window.gerarPDF = async function () {
    if (!canEditBudgets()) return alert('Seu perfil é somente de consulta.');
    const popup = openProposalWindow();
    if (!popup) return;
    try {
      const saved = await saveBudget(false);
      if (!saved) {
        popup.close();
        return;
      }
      const current = collectBudget();
      current.id = saved.id;
      current.number = saved.number || current.number;
      current.status = saved.status || current.status;
      current.ownerName = saved.ownerName || current.ownerName;
      showProposal(popup, current);
    } catch (error) {
      console.error('PDF proposal:', error);
      popup.close();
      alert('Não foi possível preparar a proposta: ' + (error?.message || error));
    }
  };

  window.gerarPDFFromSaved = function (id) {
    const popup = openProposalWindow();
    if (!popup) return;
    const budget = (window.onlineBudgets || onlineBudgets).find(item => item.id === id);
    if (!budget) {
      popup.close();
      return alert('Orçamento não encontrado. Atualize a lista e tente novamente.');
    }
    showProposal(popup, budget);
  };

  window.fillPdfFromBudget = function (budget) {
    original.fillPdfFromBudget(budget);
  };

  function initialize() {
    injectStyles();
    buildWizardLayout();
    updateStepView();
    calc();
  }

  initialize();
})();