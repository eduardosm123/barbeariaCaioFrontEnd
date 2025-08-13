
    // -----------------------
    // Constantes WhatsApp + helper
    // -----------------------


    const tel = document.getElementById('telefone');

    function formatBRPhone(value) {
      const d = value.replace(/\D/g, '').slice(0, 11); // só números, no máx 11
      const len = d.length;

      if (!len) return '';

      if (len <= 2) {
        return `(${d}`;
      } else if (len <= 6) {
        return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      } else if (len <= 10) {
        return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      } else {
        // 11 dígitos (celular)
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
      }
    }

    tel.addEventListener('input', (e) => {
      const cursorEnd = e.target.selectionEnd;
      const before = e.target.value;
      e.target.value = formatBRPhone(before);
      // comportamento simples: mantém o cursor no fim (ok para a maioria dos casos)
      e.target.setSelectionRange(e.target.value.length, e.target.value.length);
    });

    // mensagem de validação amigável
    tel.addEventListener('blur', (e) => {
      const ok = /^\(\d{2}\) \d{4,5}-\d{4}$/.test(e.target.value);
      e.target.setCustomValidity(ok || e.target.value === '' ? '' : 'Digite um telefone válido: (11) 91234-5678');
    });
    const WA_PHONE = '5545991321488';
    function enviarWhatsApp(mensagem) {
      const msg = encodeURIComponent(mensagem);
      const url1 = `https://wa.me/${WA_PHONE}?text=${msg}`;
      const url2 = `https://api.whatsapp.com/send?phone=${WA_PHONE}&text=${msg}`;
      // usa mesma aba para evitar bloqueio de pop-up
      window.location.href = url1;
      // fallback (desktop / webview)
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.href = url2;
        }
      }, 800);
    }

    // -----------------------
    // Sistema de Horários Dinâmicos (API -> localStorage)
    // -----------------------
    const API_BASE = 'https://barbeariacaio.onrender.com';

    // Mapear nomes dos dias pt-BR -> chaves do backend
    const diasSemana = {
      'Segunda-feira': 'segunda',
      'Terça-feira': 'terca',
      'Quarta-feira': 'quarta',
      'Quinta-feira': 'quinta',
      'Sexta-feira': 'sexta',
      'Sábado': 'sabado',
      'Domingo': 'domingo'
    };

    let horariosCache = null;
    let agendamentosCache = null;

    async function carregarHorariosDisponiveis() {
      if (horariosCache) return horariosCache;

      console.log('🔄 Carregando horários da API...');

      // 1) Tenta API
      try {
        const r = await fetch(`${API_BASE}/horarios`, {
          cache: 'no-store'
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();

        console.log('✅ Horários carregados da API:', data);

        // persiste no localStorage para uso offline
        const db = JSON.parse(localStorage.getItem('barbeariaAdmin') || '{}');
        db.horarios = data;
        localStorage.setItem('barbeariaAdmin', JSON.stringify(db));

        horariosCache = data;
        return data;
      } catch (error) {
        console.warn('⚠️ Erro ao carregar da API:', error);

        // 2) Tenta localStorage como backup
        const saved = localStorage.getItem('barbeariaAdmin');
        if (saved) {
          const db = JSON.parse(saved);
          if (db.horarios) {
            console.log('📦 Usando horários do localStorage:', db.horarios);
            horariosCache = db.horarios;
            return horariosCache;
          }
        }

        // 3) Se não tem nada, retorna estrutura vazia
        console.log('❌ Nenhum horário disponível');
        horariosCache = {
          segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [], domingo: []
        };
        return horariosCache;
      }
    }

    async function carregarAgendamentosPorData(data) {
      console.log('🔄 Carregando agendamentos para data:', data);
      
      try {
        // Carrega TODOS os agendamentos, não apenas por data
        const r = await fetch(`${API_BASE}/agendamentos`, {
          cache: 'no-store'
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const todosAgendamentos = await r.json();
        
        // Filtra apenas os agendamentos confirmados para a data específica
        const agendamentosConfirmados = todosAgendamentos.filter(ag => 
          ag.data === data && ag.status === 'confirmado'
        );
        
        console.log('✅ Agendamentos confirmados para', data, ':', agendamentosConfirmados);
        return agendamentosConfirmados;
      } catch (error) {
        console.warn('⚠️ Erro ao carregar agendamentos:', error);
        return [];
      }
    }

    async function criarAgendamento(dadosAgendamento) {
      console.log('📝 Criando agendamento:', dadosAgendamento);
      
      try {
        const r = await fetch(`${API_BASE}/agendamentos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosAgendamento)
        });
        
        if (!r.ok) {
          const error = await r.json();
          throw new Error(error.message || `HTTP ${r.status}`);
        }
        
        const agendamento = await r.json();
        console.log('✅ Agendamento criado:', agendamento);
        return agendamento;
      } catch (error) {
        console.error('❌ Erro ao criar agendamento:', error);
        throw error;
      }
    }

    // -----------------------
    // Modal de Agendamento
    // -----------------------
    const modal = document.getElementById('agendamentoModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelarBtn = document.getElementById('cancelarBtn');
    const agendamentoForm = document.getElementById('agendamentoForm');
    const dataInput = document.getElementById('data');

    // Definir data mínima como HOJE (hora local)
    const now = new Date();
    const localISODate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    dataInput.min = localISODate;

    function minutosParaTexto(total) {
      total = Number(total) || 0;
      if (total < 60) return `${total} min`;
      const h = Math.floor(total / 60);
      const m = total % 60;
      return m ? `${h}h ${m}min` : `${h}h`;
    }

    function calcularTempoTotalSelecionado() {
      const selecionados = document.querySelectorAll('input[name="servicos"]:checked');
      let total = 0;
      selecionados.forEach(el => total += parseInt(el.dataset.minutos || '0', 10));
      return total;
    }

    function atualizarTempoTotalUI() {
      const total = calcularTempoTotalSelecionado();
      const alvo = document.getElementById('tempoTotal');
      if (alvo) alvo.textContent = minutosParaTexto(total);
    }

    // Função para calcular horários ocupados considerando duração dos serviços
    function calcularHorariosOcupados(agendamentos) {
        const horariosOcupados = new Set();
        
        // Mapeamento de serviços para minutos
        const duracaoServicos = {
            'Corte Masculino': 20,
            'Barba & Bigode': 10,
            'Skincare': 15,
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
            'Corte Masculino': 20,
            'Barba & Bigode': 10,
            'Skincare': 15,
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


    // Atualiza horários sempre que a data muda
    dataInput.addEventListener('change', async function () {
      console.log('📅 Data selecionada:', this.value);
      const dataSelecionada = this.value;
      const horarioSelect = document.getElementById('horario');

      if (!dataSelecionada) {
        horarioSelect.innerHTML = '<option value="">Selecione primeiro o dia</option>';
        return;
      }

      // Verificar se há serviços selecionados
      const servicosSelecionados = Array.from(document.querySelectorAll('input[name="servicos"]:checked'))
          .map(input => input.value);
      
      if (servicosSelecionados.length === 0) {
        horarioSelect.innerHTML = '<option value="">Selecione os serviços primeiro</option>';
        return;
      }

      // Descobrir o dia da semana em pt-BR e mapear
      const data = new Date(`${dataSelecionada}T00:00:00`);
      const nomeDia = data.toLocaleDateString('pt-BR', { weekday: 'long' });
      const nomeDiaFormatado = nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1); // ex: "terça-feira" -> "Terça-feira"
      console.log('📆 Dia da semana detectado:', nomeDiaFormatado);

      const diaChave = diasSemana[nomeDiaFormatado];
      console.log('🔑 Chave do dia:', diaChave);

      const horariosDisponiveis = await carregarHorariosDisponiveis();
      console.log('⏰ Horários disponíveis para', diaChave, ':', horariosDisponiveis[diaChave]);

      // Carregar agendamentos confirmados para esta data
      const agendamentosConfirmados = await carregarAgendamentosPorData(dataSelecionada);
      const horariosOcupados = calcularHorariosOcupados(agendamentosConfirmados);
      console.log('🚫 Horários ocupados (considerando duração dos serviços):', Array.from(horariosOcupados));

      // Verificar se é hoje para filtrar horários que já passaram
      const hoje = new Date();
      const dataAtual = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
      const horaAtual = hoje.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
      const isHoje = dataSelecionada === dataAtual;
      
      console.log('📅 Data atual:', dataAtual, '- Hora atual:', horaAtual);
      console.log('🗓️ É hoje?', isHoje);

      // Limpar e popular o select
      horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';

      if (!horariosDisponiveis) {
        horarioSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
        return;
      }

      if (diaChave && Array.isArray(horariosDisponiveis[diaChave])) {
        const horarios = horariosDisponiveis[diaChave];
        if (horarios.length === 0) {
          horarioSelect.innerHTML = '<option value="">Fechado neste dia</option>';
        } else {
          let horariosValidos = 0;
          
          horarios.forEach(h => {
            // Se é hoje, verificar se o horário já passou
            if (isHoje && h <= horaAtual) {
              console.log('⏰ Horário', h, 'já passou (atual:', horaAtual, ')');
              return; // Pula este horário - não adiciona ao select
            }

            const opt = document.createElement('option');
            opt.value = h;
            
            // Verificar se está ocupado
            if (horariosOcupados.has(h)) {
              opt.textContent = `${h} (Ocupado)`;
              opt.disabled = true;
              opt.style.color = '#999';
            } else {
              // Verificar se há tempo suficiente para os serviços selecionados
              const servicosSelecionados = Array.from(document.querySelectorAll('input[name="servicos"]:checked'))
                  .map(input => input.value);
              
              if (servicosSelecionados.length > 0 && !verificarTempoSuficiente(h, servicosSelecionados, horarios, horariosOcupados)) {
                  opt.textContent = `${h} (Tempo insuficiente)`;
                  opt.disabled = true;
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
            if (isHoje) {
              horarioSelect.innerHTML = '<option value="">Todos os horários de hoje já passaram</option>';
            } else {
              const todosOcupados = horarios.every(h => horariosOcupados.has(h));
              if (todosOcupados) {
                horarioSelect.innerHTML = '<option value="">Todos os horários estão ocupados</option>';
              } else {
                horarioSelect.innerHTML = '<option value="">Não há horários disponíveis para os serviços selecionados</option>';
              }
            }
          }
        }
      } else {
        horarioSelect.innerHTML = '<option value="">Sem horários disponíveis</option>';
      }
    });

    // Abrir modal
    openModalBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      // limpar seleção e atualizar total
      document.querySelectorAll('input[name="servicos"]').forEach(cb => { cb.checked = false; });
      atualizarTempoTotalUI();

      // adicionar listeners (apenas 1x por sessão é suficiente, mas repetir é inofensivo)
      document.querySelectorAll('input[name="servicos"]').forEach(cb => {
        cb.addEventListener('change', () => {
          atualizarTempoTotalUI();
          document.getElementById('servicosErro')?.classList.add('hidden');
          
          // Recarregar horários disponíveis considerando os serviços selecionados
          const dataInput = document.getElementById('data');
          if (dataInput && dataInput.value) {
            dataInput.dispatchEvent(new Event('change'));
          }
        });
      });
    });


    // Fechar modal
    function fecharModal() {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
      agendamentoForm.reset();
      // Limpa horários quando fechar
      const horarioSelect = document.getElementById('horario');
      horarioSelect.innerHTML = '<option value="">Selecione primeiro o dia</option>';
    }
    closeModalBtn.addEventListener('click', fecharModal);
    cancelarBtn.addEventListener('click', fecharModal);

    // Fechar clicando fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) fecharModal();
    });
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) fecharModal();
    });

    // Submeter formulário -> Enviar para backend + WhatsApp
    agendamentoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('nome').value.trim();
      const telefone = document.getElementById('telefone').value.trim();
      const data = document.getElementById('data').value;
      const horario = document.getElementById('horario').value;

      // múltiplos serviços
      const servicosEls = Array.from(document.querySelectorAll('input[name="servicos"]:checked'));
      if (servicosEls.length === 0) {
        document.getElementById('servicosErro')?.classList.remove('hidden');
        return;
      }
      const servicosSelecionados = servicosEls.map(el => el.value);
      const totalMinutos = servicosEls.reduce((acc, el) => acc + parseInt(el.dataset.minutos || '0', 10), 0);

      const submitBtn = document.getElementById('agendarBtn') || e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      try {
        // Dados para o backend
        const dadosAgendamento = {
          nome,
          telefone,
          servico: servicosSelecionados.join(', '),
          data,
          horario
        };

        // Envia para o backend
        const agendamentoCriado = await criarAgendamento(dadosAgendamento);
        console.log('✅ Agendamento salvo no backend:', agendamentoCriado);

        // Persiste para a área admin (localStorage) mantendo compatibilidade
        const dadosCompletos = {
          ...dadosAgendamento,
          servicos: servicosSelecionados,
          totalMinutos,
          id: agendamentoCriado.id,
          status: agendamentoCriado.status || 'pendente'
        };
        
        let database = JSON.parse(localStorage.getItem('barbeariaAdmin')) || {};
        database.agendamentos = database.agendamentos || [];
        database.agendamentos.push({
          ...dadosCompletos,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('barbeariaAdmin', JSON.stringify(database));

        const dataFormatada = new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
        const mensagem =
          `🏪 *AGENDAMENTO - BARBEARIA VIP*\n\n` +
          `👤 *Nome:* ${nome}\n` +
          `📞 *Telefone:* ${telefone}\n` +
          `✂️ *Serviços:* ${servicosSelecionados.join(', ')}\n` +
          `⏳ *Duração total estimada:* ${minutosParaTexto(totalMinutos)}\n` +
          `📅 *Data:* ${dataFormatada}\n` +
          `⏰ *Horário:* ${horario}\n\n` +
          `Olá! Gostaria de agendar este horário. Obrigado!`;

        // Mostra mensagem de sucesso
        alert('✅ Agendamento realizado com sucesso! Você será redirecionado para o WhatsApp.');
        
        enviarWhatsApp(mensagem);
        fecharModal();

      } catch (error) {
        console.error('❌ Erro ao criar agendamento:', error);
        alert(`❌ Erro ao agendar: ${error.message}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });


    // -----------------------
    // Ações WhatsApp em CTAs fora do modal
    // -----------------------
    document.getElementById('waMainCta')?.addEventListener('click', (e) => {
      e.preventDefault();
      enviarWhatsApp('Olá! Gostaria de agendar um horário na Barbearia VIP.');
    });
    document.getElementById('waSecondaryCta')?.addEventListener('click', (e) => {
      e.preventDefault();
      enviarWhatsApp('Olá! Gostaria de agendar um horário na Barbearia VIP.');
    });
    document.getElementById('waInfo')?.addEventListener('click', (e) => {
      e.preventDefault();
      enviarWhatsApp('Olá! Gostaria de mais informações.');
    });
    document.getElementById('waDirections')?.addEventListener('click', (e) => {
      e.preventDefault();
      enviarWhatsApp('Olá! Preciso de direções para a Barbearia VIP.');
    });

    // -----------------------
    // Carousel
    // -----------------------
    const carousel = document.getElementById('carousel');
    const slides = document.querySelectorAll('#carousel .carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoPlayInterval;

    function updateIndicators() {
      indicators.forEach((indicator, i) => {
        indicator.classList.toggle('bg-gold', i === currentSlide);
        indicator.classList.toggle('bg-white/50', i !== currentSlide);
      });
    }

    function showSlide(index) {
      if (totalSlides === 0) return;
      if (index >= totalSlides) currentSlide = 0;
      else if (index < 0) currentSlide = totalSlides - 1;
      else currentSlide = index;

      carousel.style.transform = `translateX(-${currentSlide * 100}%)`;
      updateIndicators();
    }

    function nextSlide() { showSlide(currentSlide + 1); }
    function prevSlide() { showSlide(currentSlide - 1); }

    function startAutoPlay() {
      stopAutoPlay();
      autoPlayInterval = setInterval(nextSlide, 4000);
    }
    function stopAutoPlay() {
      if (autoPlayInterval) clearInterval(autoPlayInterval);
    }

    nextBtn.addEventListener('click', () => { nextSlide(); startAutoPlay(); });
    prevBtn.addEventListener('click', () => { prevSlide(); startAutoPlay(); });

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => { showSlide(index); startAutoPlay(); });
    });

    const carouselWrapper = carousel.parentElement;
    carouselWrapper.addEventListener('mouseenter', stopAutoPlay);
    carouselWrapper.addEventListener('mouseleave', startAutoPlay);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { nextSlide(); startAutoPlay(); }
      if (e.key === 'ArrowLeft') { prevSlide(); startAutoPlay(); }
    });

    showSlide(0);
    startAutoPlay();

    // -----------------------
    // Smooth scrolling (ignora links '#' dos CTAs)
    // -----------------------
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && href.length > 1) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // -----------------------
    // Mobile Menu
    // -----------------------
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });

    document.addEventListener('click', (e) => {
      if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden');
      }
    });

    // Pré-carrega horários na cache (opcional)
    carregarHorariosDisponiveis();

    // ---- BOTÃO FLUTUANTE - VOLTAR AO TOPO ----
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    // Função para mostrar/ocultar o botão baseado no scroll
    function toggleBackToTopButton() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollTop > 300) {
        backToTopBtn.classList.remove('opacity-0', 'invisible');
        backToTopBtn.classList.add('opacity-100', 'visible');
      } else {
        backToTopBtn.classList.add('opacity-0', 'invisible');
        backToTopBtn.classList.remove('opacity-100', 'visible');
      }
    }
    
    // Event listener para o scroll
    window.addEventListener('scroll', toggleBackToTopButton);
    
    // Event listener para o clique no botão
    backToTopBtn?.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
    // Verificação inicial
    toggleBackToTopButton();
