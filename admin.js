
  const API = 'https://barbeariacaio.onrender.com';

  // Estado
  let database = {
    admin: { id: 1, username: '', password: '', email: '' },
    horarios: { segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [], domingo: [] },
    agendamentos: []
  };
  let bootDone = false;
  let sessionId = null; // Para gerenciar a sessão
  
  // Estado de paginação
  let currentPage = 1;
  let totalPages = 1;
  let totalItems = 0;
  let itemsPerPage = 5;
  let currentFilters = {
    data: null,
    status: null,
    sortBy: 'created_at',
    sortOrder: 'desc'
  };
  
  // Funções para gerenciar cookies
  function setCookie(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  // Credenciais armazenadas para uso nas operações
  let storedCredentials = {
    username: '',
    password: ''
  };

  // Helpers de fetch com session ID
  async function apiGet(path) {
    const headers = {};
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    
    const r = await fetch(`${API}${path}`, { headers });
    if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
    return r.json();
  }
  
  async function apiPut(path, data) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    
    const r = await fetch(`${API}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(`PUT ${path} -> ${r.status}`);
    return r.json();
  }
  
  async function apiPatch(path, data) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    
    const r = await fetch(`${API}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(`PATCH ${path} -> ${r.status}`);
    return r.json();
  }
  
  async function apiPost(path, data) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!r.ok) {
        const errorBody = await r.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorBody.message || `POST ${path} -> ${r.status}`);
    }
    return r.json();
  }
  
  async function apiDelete(path) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    
    const r = await fetch(`${API}${path}`, {
      method: 'DELETE',
      headers
    });
    if (!r.ok) throw new Error(`DELETE ${path} -> ${r.status}`);
    return r.json();
  }

  // Funções específicas para agendamentos
  async function carregarAgendamentosPaginados(page = 1, filters = {}) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sortBy: currentFilters.sortBy,
        sortOrder: currentFilters.sortOrder
      });

      // Adicionar filtros se existirem
      if (filters.data) {
        params.append('data', filters.data);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }

      const url = `/agendamentos/paginated?${params.toString()}`;
      console.log('📋 Carregando agendamentos paginados:', url);
      
      const response = await apiGet(url);
      console.log('📋 Resposta da API paginada:', response);
      
      // Atualizar estado de paginação
      currentPage = response.pagination.currentPage;
      totalPages = response.pagination.totalPages;
      totalItems = response.pagination.totalItems;
      
      // Atualizar filtros atuais
      currentFilters.data = response.filters.data;
      currentFilters.status = response.filters.status;
      
      // Armazenar agendamentos no database para manter compatibilidade
      database.agendamentos = response.data;
      
      return response;
    } catch (err) {
      console.error('Erro ao carregar agendamentos paginados:', err);
      throw err;
    }
  }

  async function carregarAgendamentos() {
    try {
      const agendamentos = await apiGet('/agendamentos');
      console.log('📋 Agendamentos carregados da API:', agendamentos);
      console.log('📋 Primeiro agendamento (estrutura):', agendamentos[0]);
      console.log('📋 Tipos de ID dos agendamentos:', agendamentos.map(ag => ({ id: ag.id, tipo: typeof ag.id })));
      
      database.agendamentos = agendamentos;
      return agendamentos;
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      return [];
    }
  }

  async function atualizarAgendamento(id, dadosAtualizados) {
    try {
      console.log('🔄 Atualizando agendamento:', { id, dadosAtualizados });
      console.log('🔄 URL da requisição:', `${API}/agendamentos/${id}`);
      
      const agendamentoAtualizado = await apiPatch(`/agendamentos/${id}`, dadosAtualizados);
      console.log('✅ Agendamento atualizado com sucesso:', agendamentoAtualizado);
      
      return agendamentoAtualizado;
    } catch (err) {
      console.error('❌ Erro ao atualizar agendamento:', err);
      throw err;
    }
  }

  async function excluirAgendamento(id) {
    try {
      await apiDelete(`/agendamentos/${id}`);
      return true;
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err);
      throw err;
    }
  }

  async function limparAgendamentosPassados() {
    try {
      const response = await apiDelete('/agendamentos/cleanup/past');
      console.log('✅ Limpeza de agendamentos passados:', response);
      return response;
    } catch (err) {
      console.error('Erro ao limpar agendamentos passados:', err);
      throw err;
    }
  }

  // Inicialização
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Carrega credenciais dos cookies se existirem
      const savedUsername = getCookie('adminUsername');
      const savedPassword = getCookie('adminPassword');
      if (savedUsername && savedPassword) {
        storedCredentials.username = savedUsername;
        storedCredentials.password = savedPassword;
      }

      // Verifica se há sessão salva
      const savedSessionId = sessionStorage.getItem('adminSessionId');
      if (savedSessionId) {
        sessionId = savedSessionId;
        
        // Verifica se a sessão ainda é válida
        try {
          const verify = await apiGet('/auth/verify');
          if (verify.valid) {
            database.admin = verify.admin;
            sessionStorage.setItem('adminLoggedIn', 'true');
          } else {
            // Sessão inválida, limpa
            sessionId = null;
            sessionStorage.removeItem('adminSessionId');
            sessionStorage.removeItem('adminLoggedIn');
          }
        } catch (err) {
          // Erro na verificação, limpa a sessão
          sessionId = null;
          sessionStorage.removeItem('adminSessionId');
          sessionStorage.removeItem('adminLoggedIn');
        }
      }

      // Carrega horários (não precisa de autenticação)
      try {
        const horarios = await apiGet('/horarios');
        database.horarios = horarios;
      } catch (err) {
        console.warn('Erro ao carregar horários:', err);
      }

      renderGrid();
      marcarCheckboxes();
      
      // Se já estava logado e sessão é válida, vai para o dashboard
      if (sessionStorage.getItem('adminLoggedIn') && sessionId) {
        showDashboard();
        // Carrega agendamentos se já está logado
        carregarEMostrarAgendamentos();
        carregarConfirmacoesPendentes();
      }

      bootDone = true;
    } catch (err) {
      console.error(err);
      const el = document.getElementById('apiError');
      el.textContent = 'Could not connect to the API (https://barbeariacaio.onrender.com). Check your connection and try again.';
      el.classList.remove('hidden');
    } finally {
      // SEMPRE habilita o botão de login, mesmo se houver erro na API
      document.getElementById('loginBtn').disabled = false;
      
      // Backup adicional: força habilitação após 2 segundos como failsafe
      setTimeout(() => {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn && loginBtn.disabled) {
          console.log('🔧 Forçando habilitação do botão de login...');
          loginBtn.disabled = false;
        }
      }, 2000);
    }
  });

  // DOM
  const loginScreen = document.getElementById('loginScreen');
  const adminDashboard = document.getElementById('adminDashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Remove a verificação de bootDone que pode estar causando problemas
    // if (!bootDone) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    const loginBtn = document.getElementById('loginBtn');
    
    // Força habilitar o botão caso esteja desabilitado por algum motivo
    if (loginBtn.disabled && (username && password)) {
      loginBtn.disabled = false;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
      // Tenta fazer login via API
      const loginData = await apiPost('/auth/login', { username, password });
      
      // Salva o sessionId
      sessionId = loginData.sessionId;
      sessionStorage.setItem('adminSessionId', sessionId);
      
      // Salva as credenciais em cookies para uso posterior
      setCookie('adminUsername', username, 7);
      setCookie('adminPassword', password, 7);
      
      // Atualiza as credenciais armazenadas
      storedCredentials.username = username;
      storedCredentials.password = password;
      
      // Dados do admin vêm na resposta do login
      database.admin = loginData.admin;
      
      // Carrega os horários mais recentes
      try {
        const horarios = await apiGet('/horarios');
        database.horarios = horarios;
        marcarCheckboxes(); // atualiza os checkboxes com os dados mais recentes
      } catch (err) {
        console.warn('Erro ao recarregar horários:', err);
      }

      sessionStorage.setItem('adminLoggedIn', 'true');
      document.getElementById('adminName').textContent = loginData.admin.username || 'Admin';
      loginError.classList.add('hidden');
      showDashboard();
      
      // Carrega agendamentos após login bem-sucedido
      carregarEMostrarAgendamentos();
      carregarConfirmacoesPendentes();
    } catch (err) {
      console.error('Erro no login:', err);
      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    try {
      // Tenta fazer logout via API (limpa a sessão no servidor)
      if (sessionId) {
        await apiPost('/auth/logout', {});
      }
    } catch (err) {
      console.warn('Erro ao fazer logout no servidor:', err);
    } finally {
      // Sempre limpa o estado local
      sessionId = null;
      sessionStorage.removeItem('adminLoggedIn');
      sessionStorage.removeItem('adminSessionId');
      
      // Limpa os cookies das credenciais
      deleteCookie('adminUsername');
      deleteCookie('adminPassword');
      
      // Limpa as credenciais armazenadas
      storedCredentials.username = '';
      storedCredentials.password = '';
      
      window.location.href = 'admin.html'; // Recarrega a página de admin para a tela de login
    }
  });

  // Event listeners para habilitar o botão quando os campos forem preenchidos
  function checkLoginFields() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    // Habilita o botão se ambos os campos estão preenchidos
    if (username && password) {
      loginBtn.disabled = false;
    }
  }

  // Monitora mudanças nos campos de login
  document.getElementById('username')?.addEventListener('input', checkLoginFields);
  document.getElementById('password')?.addEventListener('input', checkLoginFields);

  function showDashboard() {
    loginScreen.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
  }

  // Abas
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const mobileTabSelect = document.getElementById('mobileTabSelect');
  
  // Função para mostrar tab
  function showTab(tabName) {
    tabBtns.forEach(b => { 
      b.classList.remove('active', 'border-gold', 'text-white'); 
      b.classList.add('text-gray-400', 'border-transparent'); 
    });
    
    // Ativar o botão da tab correspondente
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active', 'border-gold', 'text-white'); 
      activeBtn.classList.remove('text-gray-400', 'border-transparent');
    }
    
    tabContents.forEach(c => c.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');

    // Ao abrir a aba de confirmações, recarrega a lista de pendentes
    if (tabName === 'confirmacoes') {
      carregarConfirmacoesPendentes();
    }
  }
  
  // Event listeners para desktop tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      showTab(tab);
      // Sincronizar o select mobile
      if (mobileTabSelect) {
        mobileTabSelect.value = tab;
      }
    });
  });
  
  // Event listener para mobile select
  if (mobileTabSelect) {
    mobileTabSelect.addEventListener('change', (e) => {
      showTab(e.target.value);
    });
  }

  // ---- Horários (UI dinâmica)
  const dias = [
    { key: 'segunda', label: 'Monday', abbr: 'seg' },
    { key: 'terca', label: 'Tuesday', abbr: 'ter' },
    { key: 'quarta', label: 'Wednesday', abbr: 'qua' },
    { key: 'quinta', label: 'Thursday', abbr: 'qui' },
    { key: 'sexta', label: 'Friday', abbr: 'sex' },
    { key: 'sabado', label: 'Saturday', abbr: 'sab' },
    { key: 'domingo', label: 'Sunday', abbr: 'dom' }
  ];

  function gerarHalfHours(inicio = '08:00', fim = '22:00') {
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    const start = hIni * 60 + mIni;
    const end = hFim * 60 + mFim;
    const out = [];
    for (let t = start; t <= end; t += 30) {
      const h = Math.floor(t / 60).toString().padStart(2, '0');
      const m = (t % 60).toString().padStart(2, '0');
      out.push(`${h}:${m}`);
    }
    return out;
  }
  const slots = gerarHalfHours('08:00', '22:00'); // grade completa; o que ficar marcado vem do backend

  let gridRendered = false;
  function renderGrid() {
    if (gridRendered) return;
    const grid = document.getElementById('diasGrid');
    grid.innerHTML = dias.map(d => {
      const chips = slots.map(s => `
        <label class="cursor-pointer">
          <input type="checkbox" id="${d.abbr}-${s}" class="horario-checkbox peer sr-only" data-dia="${d.key}" data-horario="${s}">
          <span class="block text-center text-xs sm:text-sm rounded-lg py-1.5 px-1 border border-gray-600 bg-gray-800 text-gray-300 select-none transition-all hover:border-gold/60 hover:text-white peer-checked:bg-gold peer-checked:text-black peer-checked:font-semibold peer-checked:border-gold peer-checked:shadow peer-checked:shadow-gold/30 peer-checked:hover:bg-darkgold">
            ${s}
          </span>
        </label>
      `).join('');
      return `
        <div class="bg-gray-700/60 rounded-xl p-4 border border-gray-600/60 hover:border-gray-500 transition-colors">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-base text-gold">${d.label}</h3>
              <span class="day-count text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-600" data-count-for="${d.key}">0</span>
            </div>
            <div class="flex gap-1">
              <button class="select-day-btn w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-green-600 text-green-400 hover:text-white rounded-md text-xs transition-colors"
                      data-dia="${d.key}" data-action="select" title="Open all">✓</button>
              <button class="deselect-day-btn w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-red-600 text-red-400 hover:text-white rounded-md text-xs transition-colors"
                      data-dia="${d.key}" data-action="deselect" title="Close all">✗</button>
            </div>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">${chips}</div>
        </div>
      `;
    }).join('');
    gridRendered = true;

    // Botões "abrir/fechar todos" de cada dia
    document.querySelectorAll('.select-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dia = btn.dataset.dia;
        document.querySelectorAll(`.horario-checkbox[data-dia="${dia}"]`).forEach(cb => cb.checked = true);
        atualizarContagens();
      });
    });

    document.querySelectorAll('.deselect-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dia = btn.dataset.dia;
        document.querySelectorAll(`.horario-checkbox[data-dia="${dia}"]`).forEach(cb => cb.checked = false);
        atualizarContagens();
      });
    });

    // Atualiza as contagens ao (des)marcar qualquer horário
    grid.addEventListener('change', (e) => {
      if (e.target.classList.contains('horario-checkbox')) atualizarContagens();
    });
  }

  // Atualiza o badge de cada dia ("X open" / "Closed") e o total da semana
  function atualizarContagens() {
    let total = 0;
    dias.forEach(d => {
      const n = document.querySelectorAll(`.horario-checkbox[data-dia="${d.key}"]:checked`).length;
      total += n;
      const badge = document.querySelector(`[data-count-for="${d.key}"]`);
      if (!badge) return;
      if (n > 0) {
        badge.textContent = `${n} open`;
        badge.className = 'day-count text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40';
      } else {
        badge.textContent = 'Closed';
        badge.className = 'day-count text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/50';
      }
    });
    const totalEl = document.getElementById('totalSlotsCount');
    if (totalEl) totalEl.textContent = total;
  }

  function marcarCheckboxes() {
    if (!database.horarios) return;

    Object.keys(database.horarios).forEach(dia => {
      const marcados = new Set(database.horarios[dia] || []);
      document.querySelectorAll(`.horario-checkbox[data-dia="${dia}"]`).forEach(cb => {
        cb.checked = marcados.has(cb.dataset.horario);
      });
    });

    atualizarContagens();
  }

  // Selecionar/Desmarcar todos
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.horario-checkbox').forEach(cb => cb.checked = true);
    atualizarContagens();
  });
  document.getElementById('deselectAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.horario-checkbox').forEach(cb => cb.checked = false);
    atualizarContagens();
  });

  // Salvar horários -> PATCH /horarios
  document.getElementById('saveHorariosBtn').addEventListener('click', async () => {
    const novo = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [], domingo: [] };
    Object.keys(novo).forEach(dia => {
      document.querySelectorAll(`[data-dia="${dia}"]:checked`).forEach(cb => {
        novo[dia].push(cb.dataset.horario);
      });
    });

    const btn = document.getElementById('saveHorariosBtn');
    const saveMsg = document.getElementById('saveMsg');
    btn.disabled = true;

    try {
      const atualizado = await apiPatch('/horarios', novo);
      database.horarios = atualizado; // mantém em memória
      saveMsg.textContent = '✅ Hours saved successfully!';
      saveMsg.className = 'mt-4 p-3 rounded-lg bg-green-900/50 border border-green-500 text-green-200';
    } catch (err) {
      console.error('Erro ao salvar horários:', err);
      saveMsg.textContent = 'Failed to save hours. Check the server or your credentials.';
      saveMsg.className = 'mt-4 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200';
    } finally {
      saveMsg.classList.remove('hidden');
      btn.disabled = false;
      setTimeout(() => saveMsg.classList.add('hidden'), 4000);
    }
  });

  // Alterar senha -> PATCH /admin/1
  document.getElementById('senhaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmar = document.getElementById('confirmarSenha').value;
    const msg = document.getElementById('senhaMessage');

    function show(type, text) {
      msg.textContent = text;
      msg.className = 'mt-4 p-3 rounded-lg ' + (type === 'error'
        ? 'bg-red-900/50 border border-red-500 text-red-200'
        : 'bg-green-900/50 border border-green-500 text-green-200');
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 5000);
    }

    if (!sessionId) {
      return show('error', 'Sessão expirada. Faça login novamente.');
    }

    if (novaSenha !== confirmar) return show('error', 'As senhas não coincidem!');
    if (novaSenha.length < 6) return show('error', 'A nova senha deve ter pelo menos 6 caracteres!');

    try {
      // First verify if the current password is correct by attempting login
      const testLogin = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: database.admin.username, password: senhaAtual })
      });
      
      if (!testLogin.ok) {
      return show('error', 'Current password is incorrect!');
      }

      const updated = await apiPatch('/admin/1', { password: novaSenha });
      database.admin = { ...database.admin, ...updated };
      
      // Atualiza as credenciais armazenadas com a nova senha
      storedCredentials.password = novaSenha;
      
      // Atualiza o cookie com a nova senha
      setCookie('adminPassword', novaSenha, 7);
      
      (document.getElementById('senhaForm')).reset();
      show('success', 'Password changed successfully!');
    } catch (err) {
      console.error(err);
      show('error', 'Failed to update password. Please check the server.');
    }
  });

  // Mostrar/ocultar senha (3 campos + login)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-password');
    if (!btn) return;
    const id = btn.dataset.target;
    const input = document.getElementById(id);
    const tipo = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', tipo);
  });

  // ---- GESTÃO DE AGENDAMENTOS ----

  function formatarData(dataStr) {
    if (!dataStr) return 'N/A';
    // Adiciona T00:00:00 para evitar problemas de fuso horário
    return new Date(`${dataStr}T00:00:00`).toLocaleDateString('pt-BR');
  }

  function formatarStatus(status) {
    const statusMap = {
      'pendente': { text: 'Pending', class: 'bg-yellow-900/50 border-yellow-500 text-yellow-200' },
      'confirmado': { text: 'Confirmed', class: 'bg-green-900/50 border-green-500 text-green-200' },
      'cancelado': { text: 'Canceled', class: 'bg-red-900/50 border-red-500 text-red-200' },
      'finalizado': { text: 'Finished', class: 'bg-blue-900/50 border-blue-500 text-blue-200' }
    };
    return statusMap[status] || { text: status, class: 'bg-gray-900/50 border-gray-500 text-gray-200' };
  }

  function criarCardAgendamento(agendamento) {
    const statusInfo = formatarStatus(agendamento.status);
    const agId = String(agendamento.id); // Converter para string sempre
    
    return `
      <div class="bg-gray-700 rounded-lg p-4 border border-gray-600" data-agendamento-id="${agId}">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-semibold text-lg text-white">${agendamento.nome}</h3>
            <p class="text-gray-300 text-sm">${agendamento.telefone}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-xs border ${statusInfo.class}">
            ${statusInfo.text}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
            <span class="text-gray-400">Service:</span>
            <p class="text-white font-medium">${agendamento.servico}</p>
            </div>
            <div>
            <span class="text-gray-400">Date:</span>
            <p class="text-white font-medium">${formatarData(agendamento.data)}</p>
            </div>
            <div>
            <span class="text-gray-400">Time:</span>
            <p class="text-white font-medium">${agendamento.horario}</p>
            </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="editar-agendamento-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  data-agendamento-id="${agId}">
            ✏️ Edit
          </button>
          
          <select class="status-select px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" 
                  data-agendamento-id="${agId}">
            <option value="pendente" ${agendamento.status === 'pendente' ? 'selected' : ''}>Pending</option>
            <option value="confirmado" ${agendamento.status === 'confirmado' ? 'selected' : ''}>Confirmed</option>
            <option value="cancelado" ${agendamento.status === 'cancelado' ? 'selected' : ''}>Canceled</option>
            <option value="finalizado" ${agendamento.status === 'finalizado' ? 'selected' : ''}>Finished</option>
          </select>
          
          <button class="salvar-status-btn bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  data-agendamento-id="${agId}">
            💾 Save Status
          </button>
          
          <button class="excluir-agendamento-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  data-agendamento-id="${agId}">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }

  async function carregarEMostrarAgendamentos(page = 1, resetFilters = false) {
    const lista = document.getElementById('agendamentosLista');
    const paginationContainer = document.getElementById('paginationContainer');
    
    lista.innerHTML = '<div class="text-center py-8 text-gray-400">Loading appointments...</div>';
    paginationContainer.classList.add('hidden');

    try {
      // Se resetFilters for true, limpa os filtros
      if (resetFilters) {
        currentFilters.data = null;
        currentFilters.status = null;
        document.getElementById('filtroData').value = '';
        document.getElementById('filtroStatus').value = '';
      }

      // Obter filtros atuais dos campos de input
      const filtros = {
        data: document.getElementById('filtroData').value || null,
        status: document.getElementById('filtroStatus').value || null
      };

      const response = await carregarAgendamentosPaginados(page, filtros);
      
      mostrarAgendamentos(response.data);
      atualizarPaginacao(response.pagination);
      
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      lista.innerHTML = '<div class="text-center py-8 text-red-400">Error loading appointments</div>';
    }
  }

  function mostrarAgendamentos(agendamentos) {
    const lista = document.getElementById('agendamentosLista');
    
    if (!agendamentos || agendamentos.length === 0) {
      lista.innerHTML = '<div class="text-center py-8 text-gray-400">No appointments found</div>';
      return;
    }

    lista.innerHTML = agendamentos.map(agendamento => criarCardAgendamento(agendamento)).join('');
  }

  function atualizarPaginacao(pagination) {
    const container = document.getElementById('paginationContainer');
    const info = document.getElementById('paginationInfo');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const firstBtn = document.getElementById('firstPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    const pageNumbers = document.getElementById('pageNumbers');

    if (pagination.totalItems === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');

    // Atualizar informações
    const start = ((pagination.currentPage - 1) * pagination.itemsPerPage) + 1;
    const end = Math.min(start + pagination.itemsPerPage - 1, pagination.totalItems);
    info.textContent = `${start}-${end} of ${pagination.totalItems}`;
    
    // Mostrar informação da página atual
    pageInfo.textContent = `(Page ${pagination.currentPage} of ${pagination.totalPages})`;

    // Atualizar botões de navegação
    const isFirstPage = pagination.currentPage === 1;
    const isLastPage = pagination.currentPage === pagination.totalPages;
    
    prevBtn.disabled = !pagination.hasPrevPage;
    nextBtn.disabled = !pagination.hasNextPage;
    firstBtn.disabled = isFirstPage;
    lastBtn.disabled = isLastPage;

    // Gerar números das páginas com lógica melhorada
    pageNumbers.innerHTML = '';
    const maxVisiblePages = 5;
    
    if (pagination.totalPages <= maxVisiblePages) {
      // Se tem 5 páginas ou menos, mostra todas
      for (let i = 1; i <= pagination.totalPages; i++) {
        criarBotaoPagina(i, pagination.currentPage === i);
      }
    } else {
      // Lógica para mais de 5 páginas
      let startPage, endPage;
      
      if (pagination.currentPage <= 3) {
        // Início: mostra [1] [2] [3] [4] [5] ... [last]
        startPage = 1;
        endPage = 5;
      } else if (pagination.currentPage >= pagination.totalPages - 2) {
        // Final: mostra [1] ... [n-4] [n-3] [n-2] [n-1] [n]
        startPage = pagination.totalPages - 4;
        endPage = pagination.totalPages;
      } else {
        // Meio: mostra [1] ... [current-1] [current] [current+1] ... [last]
        startPage = pagination.currentPage - 1;
        endPage = pagination.currentPage + 1;
      }
      
      // Primeira página (se não estiver no início)
      if (startPage > 1) {
        criarBotaoPagina(1, false);
        if (startPage > 2) {
          criarReticencias();
        }
      }
      
      // Páginas do meio
      for (let i = startPage; i <= endPage; i++) {
        criarBotaoPagina(i, pagination.currentPage === i);
      }
      
      // Última página (se não estiver no final)
      if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
          criarReticencias();
        }
        criarBotaoPagina(pagination.totalPages, false);
      }
    }
    
    function criarBotaoPagina(pageNum, isActive) {
      const button = document.createElement('button');
      button.textContent = pageNum;
      button.className = `px-3 py-1 rounded transition-colors ${isActive 
        ? 'bg-gold text-black font-semibold' 
        : 'bg-gray-600 hover:bg-gray-500 text-white'}`;
      
      if (!isActive) {
        button.addEventListener('click', () => carregarEMostrarAgendamentos(pageNum));
      }
      
      pageNumbers.appendChild(button);
    }
    
    function criarReticencias() {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'px-2 py-1 text-gray-400';
      pageNumbers.appendChild(dots);
    }
  }

  // ---- Delegação de eventos para a lista de agendamentos ----
  function handleAgendamentosClick(e) {
    // Editar
    const editBtn = e.target.closest('.editar-agendamento-btn');
    if (editBtn) {
      const agendamentoId = String(editBtn.dataset.agendamentoId); 
      const agendamento = database.agendamentos.find(ag => String(ag.id) === agendamentoId);
      if (agendamento) {
        abrirModalEdicao(agendamento);
      } else {
        console.error('❌ Agendamento não encontrado com ID:', agendamentoId);
      }
      return;
    }

    // Salvar status
    const saveBtn = e.target.closest('.salvar-status-btn');
    if (saveBtn) {
      const agendamentoId = saveBtn.dataset.agendamentoId;
      const select = document.querySelector(`select.status-select[data-agendamento-id="${agendamentoId}"]`);
      const novoStatus = select ? select.value : null;
      if (!novoStatus) return;

      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '⏳ Saving...';

      atualizarAgendamento(agendamentoId, { status: novoStatus })
        .then(() => {
          mostrarMensagem('Status updated successfully!', 'success');
          carregarEMostrarAgendamentos(currentPage);
        })
        .catch(err => {
          mostrarMensagem('Error updating status: ' + err.message, 'error');
        })
        .finally(() => {
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        });
      return;
    }

    // Excluir
    const delBtn = e.target.closest('.excluir-agendamento-btn');
    if (delBtn) {
      const agendamentoId = delBtn.dataset.agendamentoId;
      if (!confirm('Are you sure you want to delete this appointment?')) return;

      delBtn.disabled = true;
      const originalText = delBtn.textContent;
      delBtn.textContent = '⏳ Deleting...';

      excluirAgendamento(agendamentoId)
        .then(() => {
          mostrarMensagem('Appointment deleted successfully!', 'success');
          carregarEMostrarAgendamentos(currentPage);
        })
        .catch(err => {
          mostrarMensagem('Error deleting appointment: ' + err.message, 'error');
        })
        .finally(() => {
          delBtn.disabled = false;
          delBtn.textContent = originalText;
        });
    }
  }

  document.getElementById('agendamentosLista')?.addEventListener('click', handleAgendamentosClick);

  // ---- TELA SEPARADA DE CONFIRMAÇÕES (somente pendentes) ----

  function criarCardConfirmacao(agendamento) {
    const agId = String(agendamento.id);
    return `
      <div class="bg-gray-700 rounded-lg p-4 border border-yellow-600/60" data-agendamento-id="${agId}">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-semibold text-lg text-white">${agendamento.nome}</h3>
            <p class="text-gray-300 text-sm">${agendamento.telefone}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-xs border bg-yellow-900/50 border-yellow-500 text-yellow-200">Pending</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <span class="text-gray-400">Service:</span>
            <p class="text-white font-medium">${agendamento.servico}</p>
          </div>
          <div>
            <span class="text-gray-400">Date:</span>
            <p class="text-white font-medium">${formatarData(agendamento.data)}</p>
          </div>
          <div>
            <span class="text-gray-400">Time:</span>
            <p class="text-white font-medium">${agendamento.horario}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="confirmar-pendente-btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                  data-agendamento-id="${agId}">
            ✅ Confirm
          </button>
          <button class="recusar-pendente-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
                  data-agendamento-id="${agId}">
            ❌ Reject
          </button>
        </div>
      </div>
    `;
  }

  function atualizarBadgePendentes(qtd) {
    const badge = document.getElementById('pendingCountBadge');
    const titleCount = document.getElementById('confTitleCount');
    if (badge) {
      badge.textContent = qtd;
      badge.classList.toggle('hidden', qtd <= 0);
    }
    if (titleCount) {
      titleCount.textContent = qtd > 0 ? `(${qtd})` : '';
    }
  }

  async function carregarConfirmacoesPendentes() {
    const lista = document.getElementById('confirmacoesLista');
    if (!lista) return;

    lista.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';

    try {
      const todos = await apiGet('/agendamentos');
      const pendentes = (todos || [])
        .filter(ag => ag.status === 'pendente')
        .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));

      atualizarBadgePendentes(pendentes.length);

      if (pendentes.length === 0) {
        lista.innerHTML = '<div class="text-center py-8 text-gray-400">No appointments waiting for confirmation 🎉</div>';
        return;
      }

      lista.innerHTML = pendentes.map(criarCardConfirmacao).join('');
    } catch (err) {
      console.error('Erro ao carregar confirmações pendentes:', err);
      lista.innerHTML = '<div class="text-center py-8 text-red-400">Error loading pending appointments</div>';
    }
  }

  function mostrarMensagemConfirmacoes(texto, tipo) {
    const msg = document.getElementById('confirmacoesMsg');
    if (!msg) return;
    msg.textContent = texto;

    let classes = 'mt-4 p-3 rounded-lg ';
    if (tipo === 'error') classes += 'bg-red-900/50 border border-red-500 text-red-200';
    else if (tipo === 'success') classes += 'bg-green-900/50 border border-green-500 text-green-200';
    else classes += 'bg-blue-900/50 border border-blue-500 text-blue-200';

    msg.className = classes;
    setTimeout(() => msg.classList.add('hidden'), 4000);
  }

  async function handleConfirmacoesClick(e) {
    const confirmBtn = e.target.closest('.confirmar-pendente-btn');
    const rejectBtn = e.target.closest('.recusar-pendente-btn');
    const btn = confirmBtn || rejectBtn;
    if (!btn) return;

    const agendamentoId = btn.dataset.agendamentoId;
    const novoStatus = confirmBtn ? 'confirmado' : 'cancelado';

    if (rejectBtn && !confirm('Reject this booking? The time slot will stay open for other clients.')) return;

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Saving...';

    try {
      await atualizarAgendamento(agendamentoId, { status: novoStatus });
      mostrarMensagemConfirmacoes(
        confirmBtn
          ? '✅ Appointment confirmed! The time slot is now filled.'
          : 'Booking rejected. The slot stays open.',
        'success'
      );
      carregarConfirmacoesPendentes();
    } catch (err) {
      mostrarMensagemConfirmacoes('Error: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  document.getElementById('confirmacoesLista')?.addEventListener('click', handleConfirmacoesClick);
  document.getElementById('recarregarConfirmacoes')?.addEventListener('click', carregarConfirmacoesPendentes);

  // Funções do Modal de Edição
  async function abrirModalEdicao(agendamento) {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    
    // Salvar o ID do agendamento no modal para uso posterior
    modal.dataset.agendamentoId = agendamento.id;
    
    document.getElementById('editAgendamentoId').value = agendamento.id;
    document.getElementById('editNome').value = agendamento.nome || '';
    document.getElementById('editTelefone').value = agendamento.telefone || '';
    document.getElementById('editData').value = agendamento.data || '';
    document.getElementById('editStatus').value = agendamento.status || 'pendente';
    
    // ADMIN: Não definir data mínima - permitir edição para qualquer data (passado/futuro)
    const editDataInput = document.getElementById('editData');
    if (editDataInput) {
        editDataInput.removeAttribute('min'); // Remove qualquer restrição de data mínima
    }
    
    // Limpar todas as seleções de serviços primeiro
    document.querySelectorAll('input[name="editServicos"]').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Marcar os serviços selecionados
    if (agendamento.servico) {
      const servicosSelecionados = agendamento.servico.split(', ').map(s => s.trim());
      servicosSelecionados.forEach(servico => {
        const checkbox = document.querySelector(`input[name="editServicos"][value="${servico}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    // Carregar horários disponíveis para a data do agendamento
    if (agendamento.data) {
        await carregarHorariosParaEdicao(agendamento.data, agendamento.id);
        // Selecionar o horário atual após carregar as opções
        setTimeout(() => {
            document.getElementById('editHorario').value = agendamento.horario || '';
        }, 100);
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function fecharModalEdicao() {
    document.getElementById('editModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('editForm').reset();
    
    // Limpar também os checkboxes de serviços
    document.querySelectorAll('input[name="editServicos"]').forEach(checkbox => {
      checkbox.checked = false;
    });
  }

  // Event listeners do modal
  document.getElementById('closeEditModal')?.addEventListener('click', fecharModalEdicao);
  document.getElementById('cancelEditBtn')?.addEventListener('click', fecharModalEdicao);
  
  // Formatação de telefone no modal
  document.getElementById('editTelefone')?.addEventListener('input', (e) => {
    e.target.value = formatBRPhone(e.target.value);
  });
  
  // Event listener para mudança de data no modal de edição
  document.getElementById('editData')?.addEventListener('change', async function () {
      console.log('📅 Data selecionada no modal de edição:', this.value);
      // Pegar o ID do agendamento atual
      const modal = document.getElementById('editModal');
      const agendamentoId = modal.dataset.agendamentoId;
      
      if (this.value && agendamentoId) {
          await carregarHorariosParaEdicao(this.value, agendamentoId);
      }
  });
  
  // Fechar modal clicando fora
  document.getElementById('editModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'editModal') {
      fecharModalEdicao();
    }
  });

  // Fechar modal com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('editModal').classList.contains('hidden')) {
      fecharModalEdicao();
    }
  });

  // Submit do formulário de edição
  document.getElementById('editForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const agendamentoId = document.getElementById('editAgendamentoId').value;
    
    // Coletar serviços selecionados (múltipla escolha)
    const servicosEls = document.querySelectorAll('input[name="editServicos"]:checked');
    const servicosSelecionados = Array.from(servicosEls).map(el => el.value);
    
    if (servicosSelecionados.length === 0) {
      mostrarMensagem('Error: Select at least one service', 'error');
      return;
    }
    
    const dadosAtualizados = {
      nome: document.getElementById('editNome').value.trim(),
      telefone: document.getElementById('editTelefone').value.trim(),
      servico: servicosSelecionados.join(', '), // Juntar com vírgula
      data: document.getElementById('editData').value,
      horario: document.getElementById('editHorario').value,
      status: document.getElementById('editStatus').value
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Saving...';

    try {
      await atualizarAgendamento(agendamentoId, dadosAtualizados);
      
      mostrarMensagem('Appointment updated successfully!', 'success');
      fecharModalEdicao();
      carregarEMostrarAgendamentos(currentPage); // Recarrega a lista
    } catch (err) {
      console.error('Erro detalhado ao atualizar:', err);
      mostrarMensagem('Error updating appointment: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  function mostrarMensagem(texto, tipo) {
    const msg = document.getElementById('agendamentosMsg');
    msg.textContent = texto;
    
    let classes = 'mt-4 p-3 rounded-lg ';
    switch(tipo) {
      case 'error':
        classes += 'bg-red-900/50 border border-red-500 text-red-200';
        break;
      case 'success':
        classes += 'bg-green-900/50 border border-green-500 text-green-200';
        break;
      case 'info':
        classes += 'bg-blue-900/50 border border-blue-500 text-blue-200';
        break;
      default:
        classes += 'bg-green-900/50 border border-green-500 text-green-200';
    }
    
    msg.className = classes;
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 5000);
  }

  function filtrarAgendamentos() {
    // Aplicar filtros resetando para a primeira página
    carregarEMostrarAgendamentos(1);
  }

  // Event listeners para agendamentos
  document.getElementById('recarregarAgendamentos')?.addEventListener('click', () => {
    carregarEMostrarAgendamentos(currentPage);
  });

  document.getElementById('limparAgendamentosPassados')?.addEventListener('click', async () => {
    const confirmacao = confirm(
      'Are you sure you want to remove ALL past appointments?\n\n' +
      'This action cannot be undone!'
    );
    
    if (!confirmacao) return;

    const btn = document.getElementById('limparAgendamentosPassados');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Cleaning...';

    try {
      const resultado = await limparAgendamentosPassados();
      
      if (resultado.removidos === 0) {
        mostrarMensagem(resultado.message, 'info');
      } else {
        mostrarMensagem(
          `✅ ${resultado.removidos} past appointment(s) removed successfully!`, 
          'success'
        );
        
        // Recarregar a lista de agendamentos após limpeza
        carregarEMostrarAgendamentos(1); // Volta para primeira página
      }
      
      console.log('📊 Detalhes da limpeza:', resultado);
      
    } catch (err) {
      console.error('Erro ao limpar agendamentos passados:', err);
      mostrarMensagem('Error cleaning past appointments: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
  
  document.getElementById('filtroData')?.addEventListener('change', filtrarAgendamentos);
  document.getElementById('filtroStatus')?.addEventListener('change', filtrarAgendamentos);
  
  document.getElementById('limparFiltros')?.addEventListener('click', () => {
    carregarEMostrarAgendamentos(1, true); // true = resetFilters
  });

  // Event listeners para paginação
  document.getElementById('prevPageBtn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      carregarEMostrarAgendamentos(currentPage - 1);
    }
  });

  document.getElementById('nextPageBtn')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      carregarEMostrarAgendamentos(currentPage + 1);
    }
  });

  document.getElementById('firstPageBtn')?.addEventListener('click', () => {
    if (currentPage !== 1) {
      carregarEMostrarAgendamentos(1);
    }
  });

  document.getElementById('lastPageBtn')?.addEventListener('click', () => {
    if (currentPage !== totalPages) {
      carregarEMostrarAgendamentos(totalPages);
    }
  });

  // ---- NOVO: MODAL DE NOVO AGENDAMENTO ----
  
  function abrirModalNovoAgendamento() {
      document.getElementById('novoAgendamentoModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      
      // Limpar formulário
      document.getElementById('novoAgendamentoForm').reset();
      
      // ADMIN: Não definir data mínima - permitir agendamentos no passado
      const dataInput = document.getElementById('novoData');
      if (dataInput) {
          dataInput.removeAttribute('min'); // Remove qualquer restrição de data mínima
      }
      
      // Limpar o select de horários
      const horarioSelect = document.getElementById('novoHorario');
      horarioSelect.innerHTML = '<option value="">Select a date first</option>';
      
      // ADMIN: Permitir agendamentos em qualquer data (passado/futuro) - sem data mínima
      console.log('👨‍💼 Modo Admin: Permitindo seleção de qualquer data');
      
      // Selecionar "confirmado" por padrão
      document.getElementById('novoStatus').value = 'confirmado';
  }

  function fecharModalNovoAgendamento() {
      document.getElementById('novoAgendamentoModal').classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
  }

  // Event listeners do modal de novo agendamento
  document.getElementById('novoAgendamentoBtn')?.addEventListener('click', abrirModalNovoAgendamento);
  document.getElementById('closeNovoAgendamentoModal')?.addEventListener('click', fecharModalNovoAgendamento);
  document.getElementById('cancelNovoAgendamentoBtn')?.addEventListener('click', fecharModalNovoAgendamento);

  document.getElementById('novoAgendamentoModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
          fecharModalNovoAgendamento();
      }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('novoAgendamentoModal').classList.contains('hidden')) {
      fecharModalNovoAgendamento();
    }
  });

  // Submissão do formulário de novo agendamento
  document.getElementById('novoAgendamentoForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const servicosEls = Array.from(document.querySelectorAll('input[name="novoServicos"]:checked'));
      const servicosErro = document.getElementById('novoServicosErro');

      if (servicosEls.length === 0) {
          servicosErro.classList.remove('hidden');
          return;
      } else {
          servicosErro.classList.add('hidden');
      }

      const dadosAgendamento = {
          nome: document.getElementById('novoNome').value.trim(),
          telefone: document.getElementById('novoTelefone').value.trim(),
          servico: servicosEls.map(el => el.value).join(', '),
          data: document.getElementById('novoData').value,
          horario: document.getElementById('novoHorario').value,
          status: document.getElementById('novoStatus').value
      };

      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Creating...';
      
      try {
          await apiPost('/agendamentos', dadosAgendamento);
          
          mostrarMensagem('Appointment created successfully!', 'success');
          fecharModalNovoAgendamento();
          carregarEMostrarAgendamentos(1, true); // Recarrega a lista na página 1 e limpa filtros
      } catch (error) {
          console.error('Error creating appointment:', error);
          mostrarMensagem(`Error: ${error.message}`, 'error');
      } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
      }
  });

  // Máscara e validação para telefone (igual ao index.html)
  const novoTelefoneInput = document.getElementById('novoTelefone');
  
  function formatBRPhone(value) {
      const d = value.replace(/\D/g, '').slice(0, 11);
      const len = d.length;

      if (!len) return '';

      if (len <= 2) {
          return `(${d}`;
      } else if (len <= 6) {
          return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      } else if (len <= 10) {
          return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      } else {
          return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
      }
  }

  novoTelefoneInput?.addEventListener('input', (e) => {
      e.target.value = formatBRPhone(e.target.value);
  });
  
  novoTelefoneInput?.addEventListener('blur', (e) => {
      const ok = /^\(\d{2}\) \d{4,5}-\d{4}$/.test(e.target.value);
      e.target.setCustomValidity(ok || e.target.value === '' ? '' : 'Enter a valid phone: (11) 91234-5678');
  });

  // Função para calcular tempo total dos serviços (igual ao index.html)
  function minutosParaTexto(minutos) {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    if (minutosRestantes === 0) return `${horas}h`;
    return `${horas}h ${minutosRestantes}min`;
  }

  function atualizarTempoTotal() {
    const checkboxes = document.querySelectorAll('input[name="novoServicos"]:checked');
    let total = 0;
    checkboxes.forEach(cb => {
      const minutos = parseInt(cb.getAttribute('data-minutos'));
      if (!isNaN(minutos)) total += minutos;
    });

    const alvo = document.getElementById('novoTempoTotal');
    if (alvo) alvo.textContent = minutosParaTexto(total);
  }

  // Event listeners para atualizar tempo total quando serviços mudam
  document.querySelectorAll('input[name="novoServicos"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      atualizarTempoTotal();
      // Recarregar horários disponíveis considerando os serviços selecionados
      const dataInput = document.getElementById('novoData');
      if (dataInput && dataInput.value) {
        dataInput.dispatchEvent(new Event('change'));
      }
    });
  });

  // Event listeners para modal de edição - recarregar horários quando serviços mudam
  document.addEventListener('change', function(e) {
    if (e.target.name === 'editServicos') {
      const dataInput = document.getElementById('editData');
      if (dataInput && dataInput.value) {
        dataInput.dispatchEvent(new Event('change'));
      }
    }
  });

  // Sistema de horários disponíveis (baseado no index.html e adaptado para admin)
  const diasSemanaMap = {
      'Segunda-feira': 'segunda',
      'Terça-feira': 'terca',
      'Quarta-feira': 'quarta',
      'Quinta-feira': 'quinta',
      'Sexta-feira': 'sexta',
      'Sábado': 'sabado',
      'Domingo': 'domingo'
  };

  // Função para calcular horários ocupados considerando duração dos serviços
  function calcularHorariosOcupados(agendamentos) {
      const horariosOcupados = new Set();
      
      // Mapeamento de serviços para minutos
      const duracaoServicos = {
          'Corte Masculino': 30,
          'Barba & Bigode': 30,
          'Skincare': 30,
          'Queratina': 60
      };
      
      agendamentos.forEach(agendamento => {
          const horarioInicio = agendamento.horario;
          let duracaoTotal = 0;
          
          // Calcular duração total dos serviços do agendamento
          if (agendamento.servico) {
              const servicos = agendamento.servico.split(', ').map(s => s.trim());
              servicos.forEach(servico => {
                  duracaoTotal += duracaoServicos[servico] || 0;
              });
          }
          
          // Converter horário para minutos desde meia-noite
          const [horaInicio, minutoInicio] = horarioInicio.split(':').map(Number);
          const minutosInicio = horaInicio * 60 + minutoInicio;
          
          // Calcular horários ocupados em intervalos de 30 minutos
          const intervalos = Math.ceil(duracaoTotal / 30);
          
          for (let i = 0; i < intervalos; i++) {
              const minutosSlot = minutosInicio + (i * 30);
              const horaSlot = Math.floor(minutosSlot / 60);
              const minutoSlot = minutosSlot % 60;
              
              // Verificar se não ultrapassa 24h
              if (horaSlot < 24) {
                  const horarioFormatado = `${horaSlot.toString().padStart(2, '0')}:${minutoSlot.toString().padStart(2, '0')}`;
                  horariosOcupados.add(horarioFormatado);
                  console.log(`🚫 Horário ocupado: ${horarioFormatado} (serviço: ${agendamento.servico}, duração: ${duracaoTotal}min)`);
              }
          }
      });
      
      return horariosOcupados;
  }

  // Nova função para verificar se há tempo suficiente para os serviços selecionados
  function verificarTempoSuficiente(horarioInicio, servicosSelecionados, horariosDisponiveis, horariosOcupados) {
      if (!servicosSelecionados || servicosSelecionados.length === 0) {
          return true; // Se não há serviços selecionados, não precisa verificar
      }
      
      // Mapeamento de serviços para minutos
      const duracaoServicos = {
          'Corte Masculino': 30,
          'Barba & Bigode': 30,
          'Skincare': 30,
          'Queratina': 60
      };
      
      // Calcular duração total dos serviços selecionados
      let duracaoTotal = 0;
      servicosSelecionados.forEach(servico => {
          duracaoTotal += duracaoServicos[servico] || 0;
      });
      
      // Converter horário para minutos
      const [hora, minuto] = horarioInicio.split(':').map(Number);
      const minutosInicio = hora * 60 + minuto;
      
      // Verificar se há tempo suficiente considerando intervalos de 30 minutos
      const intervalosNecessarios = Math.ceil(duracaoTotal / 30);
      
      for (let i = 0; i < intervalosNecessarios; i++) {
          const minutosSlot = minutosInicio + (i * 30);
          const horaSlot = Math.floor(minutosSlot / 60);
          const minutoSlot = minutosSlot % 60;
          
          if (horaSlot >= 24) {
              return false; // Ultrapassa o dia
          }
          
          const horarioFormatado = `${horaSlot.toString().padStart(2, '0')}:${minutoSlot.toString().padStart(2, '0')}`;
          
          // Se o horário necessário não está disponível ou está ocupado
          if (!horariosDisponiveis.includes(horarioFormatado) || horariosOcupados.has(horarioFormatado)) {
              return false;
          }
      }
      
      return true;
  }

  async function carregarHorariosAgendadosParaData(data) {
      try {
          // Carrega TODOS os agendamentos e filtra localmente
          const todosAgendamentos = await apiGet('/agendamentos');
          // Filtra apenas os agendamentos confirmados para a data específica
          const agendamentosConfirmados = todosAgendamentos.filter(ag => 
              ag.data === data && ag.status === 'confirmado'
          );
          console.log(`📅 Agendamentos confirmados para ${data}:`, agendamentosConfirmados);
          return agendamentosConfirmados;
      } catch (error) {
          console.warn('⚠️ Error loading scheduled appointments:', error);
          return [];
      }
  }

  // Função específica para modal de edição - ignora o agendamento atual
  async function carregarHorariosAgendadosParaDataExcluindoAtual(data, idAtual) {
      try {
          const todosAgendamentos = await apiGet('/agendamentos');
          // Filtra agendamentos confirmados para a data, mas exclui o agendamento atual
          const agendamentosConfirmados = todosAgendamentos.filter(ag => 
              ag.data === data && 
              ag.status === 'confirmado' && 
              String(ag.id) !== String(idAtual)
          );
          console.log(`📅 Agendamentos confirmados para ${data} (excluindo ID ${idAtual}):`, agendamentosConfirmados);
          return agendamentosConfirmados;
      } catch (error) {
          console.warn('⚠️ Error loading scheduled appointments:', error);
          return [];
      }
  }

  // Função para carregar horários disponíveis no modal de edição
  async function carregarHorariosParaEdicao(dataSelecionada, agendamentoAtualId) {
      const horarioSelect = document.getElementById('editHorario');
      
      if (!dataSelecionada) {
          horarioSelect.innerHTML = '<option value="">Select a date first</option>';
          return;
      }

      // Verificar se há serviços selecionados
      const servicosSelecionados = Array.from(document.querySelectorAll('#editServicosGroup input[name="editServicos"]:checked'))
          .map(input => input.value);
      
      if (servicosSelecionados.length === 0) {
          horarioSelect.innerHTML = '<option value="">Select services first</option>';
          return;
      }

      // Descobrir o dia da semana
      const data = new Date(`${dataSelecionada}T00:00:00`);
      const nomeDia = data.toLocaleDateString('pt-BR', { weekday: 'long' });
      const nomeDiaFormatado = nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1);
      const diaChave = diasSemanaMap[nomeDiaFormatado];
      
      console.log('📅 Carregando horários para edição:', { dataSelecionada, diaChave, agendamentoAtualId });

      const horariosDisponiveis = database.horarios;
      const agendamentosConfirmados = await carregarHorariosAgendadosParaDataExcluindoAtual(dataSelecionada, agendamentoAtualId);
      const horariosOcupados = calcularHorariosOcupados(agendamentosConfirmados);

      // Verificar se é hoje para filtrar horários que já passaram
      const hoje = new Date();
      // Usar horário local brasileiro para evitar problemas de timezone
      const dataAtual = hoje.getFullYear() + '-' + 
                       String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(hoje.getDate()).padStart(2, '0');
      const horaAtual = String(hoje.getHours()).padStart(2, '0') + ':' + 
                       String(hoje.getMinutes()).padStart(2, '0');
      const isHoje = dataSelecionada === dataAtual;

      horarioSelect.innerHTML = '<option value="">Select a time</option>';

      if (diaChave && Array.isArray(horariosDisponiveis[diaChave])) {
          const horariosDoDia = horariosDisponiveis[diaChave];
          if (horariosDoDia.length === 0) {
              horarioSelect.innerHTML = '<option value="">Closed on this day</option>';
          } else {
              let horariosValidos = 0;
              
              horariosDoDia.forEach(h => {
                  // ADMIN: Comentada validação de horário passado - permitir agendamentos em qualquer horário
                  // if (isHoje && h <= horaAtual) {
                  //     console.log('⏰ Horário', h, 'já passou (atual:', horaAtual, ') - DATA:', dataSelecionada, 'vs', dataAtual);
                  //     return;
                  // }

                  console.log('✅ Horário válido (ADMIN):', h, '- Data:', dataSelecionada, '- É hoje?', isHoje);

                  const opt = document.createElement('option');
                  opt.value = h;
                  
                  // Verificar se está ocupado
                  if (horariosOcupados.has(h)) {
                      opt.textContent = `${h} (Occupied)`;
                      opt.style.color = '#999';
                  } else {
                      // Verificar se há tempo suficiente para os serviços selecionados
                      const servicosSelecionados = Array.from(document.querySelectorAll('#editServicosGroup input[name="editServicos"]:checked'))
                          .map(input => input.value);
                      
                      if (servicosSelecionados.length > 0 && !verificarTempoSuficiente(h, servicosSelecionados, horariosDoDia, horariosOcupados)) {
                          opt.textContent = `${h} (Insufficient time)`;
                          opt.style.color = '#ff6b6b';
                          opt.style.color = '#ff6b6b'; // Vermelho para tempo insuficiente
                      } else {
                          opt.textContent = h;
                      }
                  }
                  horarioSelect.appendChild(opt);
                  horariosValidos++;
              });

              if (horariosValidos === 0) {
                  if (isHoje) {
                      horarioSelect.innerHTML = '<option value="">All times for today have passed</option>';
                  } else {
                      horarioSelect.innerHTML = '<option value="">No schedules available for this day</option>';
                  }
              }
          }
      } else {
          horarioSelect.innerHTML = '<option value="">No schedules available</option>';
      }
  }

  // Event listener para mudança de data no modal de novo agendamento
  document.getElementById('novoData')?.addEventListener('change', async function () {
      console.log('📅 Data selecionada no modal admin:', this.value);
      const dataSelecionada = this.value;
      const horarioSelect = document.getElementById('novoHorario');

      if (!dataSelecionada) {
          horarioSelect.innerHTML = '<option value="">Select a date first</option>';
          return;
      }

      // Verificar se há serviços selecionados
      const servicosSelecionados = Array.from(document.querySelectorAll('#novoServicosGroup input[name="novoServicos"]:checked'))
          .map(input => input.value);
      
      if (servicosSelecionados.length === 0) {
          horarioSelect.innerHTML = '<option value="">Select services first</option>';
          return;
      }

      // Descobrir o dia da semana
      const data = new Date(`${dataSelecionada}T00:00:00`);
      const nomeDia = data.toLocaleDateString('pt-BR', { weekday: 'long' });
      const nomeDiaFormatado = nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1);
      console.log('📆 Dia da semana detectado:', nomeDiaFormatado);
      
      const diaChave = diasSemanaMap[nomeDiaFormatado];
      console.log('🔑 Chave do dia:', diaChave);

      const horariosDisponiveis = database.horarios; // Usa os horários já carregados
      console.log('⏰ Horários disponíveis para', diaChave, ':', horariosDisponiveis[diaChave]);
      
      const agendamentosConfirmados = await carregarHorariosAgendadosParaData(dataSelecionada);
      const horariosOcupados = calcularHorariosOcupados(agendamentosConfirmados);
      console.log('🚫 Horários ocupados (considerando duração dos serviços):', Array.from(horariosOcupados));

      // ADMIN: Permitir agendamentos no passado - não filtrar horários que já passaram
      console.log('👨‍💼 Modo Admin: Permitindo agendamentos em qualquer horário (passado/futuro)');

      horarioSelect.innerHTML = '<option value="">Select a time</option>';

      if (diaChave && Array.isArray(horariosDisponiveis[diaChave])) {
          const horariosDoDia = horariosDisponiveis[diaChave];
          if (horariosDoDia.length === 0) {
              horarioSelect.innerHTML = '<option value="">Closed on this day</option>';
          } else {
              let horariosValidos = 0;
              
              horariosDoDia.forEach(h => {
                  // ADMIN: Não verificar se horário já passou - permitir agendamentos no passado
                  const opt = document.createElement('option');
                  opt.value = h;
                  
                  // Verificar se está ocupado
                  if (horariosOcupados.has(h)) {
                      opt.textContent = `${h} (Occupied)`;
                      opt.style.color = '#999';
                  } else {
                      // Verificar se há tempo suficiente para os serviços selecionados
                      const servicosSelecionados = Array.from(document.querySelectorAll('#novoServicosGroup input[name="novoServicos"]:checked'))
                          .map(input => input.value);
                      
                      if (servicosSelecionados.length > 0 && !verificarTempoSuficiente(h, servicosSelecionados, horariosDoDia, horariosOcupados)) {
                          opt.textContent = `${h} (Insufficient time)`;
                          opt.style.color = '#ff6b6b';
                      } else {
                          opt.textContent = h;
                      }
                  }
                  horarioSelect.appendChild(opt);
                  horariosValidos++;
              });

              // Se nenhum horário válido restou
              if (horariosValidos === 0) {
                  horarioSelect.innerHTML = '<option value="">No schedules available for this day</option>';
              }
          }
      } else {
          horarioSelect.innerHTML = '<option value="">No schedules available</option>';
      }
  });
  
  // ---- BOTÃO FLUTUANTE - VOLTAR AO TOPO ----
  const backToTopBtn = document.getElementById('backToTopBtn');
  
  function toggleBackToTopButton() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Mostrar o botão em qualquer aba quando o usuário scroll mais de 300px
    if (scrollTop > 300) {
      backToTopBtn.classList.remove('opacity-0', 'invisible');
      backToTopBtn.classList.add('opacity-100', 'visible');
    } else {
      backToTopBtn.classList.add('opacity-0', 'invisible');
      backToTopBtn.classList.remove('opacity-100', 'visible');
    }
  }
  
  window.addEventListener('scroll', toggleBackToTopButton);
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(toggleBackToTopButton, 100);
    });
  });
  
  // Também aplicar para mudanças no select mobile
  if (mobileTabSelect) {
    mobileTabSelect.addEventListener('change', () => {
      setTimeout(toggleBackToTopButton, 100);
    });
  }
  
  backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  
  toggleBackToTopButton();
  
  // Inicializar o select mobile com a tab ativa padrão
  if (mobileTabSelect) {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      mobileTabSelect.value = activeTab.dataset.tab;
    }
  }
