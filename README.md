# Sistema de Administração - Barbearia VIP
### 2. Gerenciar horários
- Na aba "Gerenciar Horários", você pode:
  - Marcar/desmarcar horários disponíveis para cada dia da semana
  - Usar "Selecionar Todos" para marcar todos os horários
  - Usar "Desmarcar Todos" para limpar todos os horários
  - Clicar em "Salvar Alterações" para confirmar as mudanças

### 3. Alterar senha
- Na aba "Alterar Senha", você pode:
  - Digitar a senha atual
  - Definir uma nova senha (mínimo 6 caracteres)
  - Confirmar a nova senha

### 4. Como os horários funcionam no site principal
- Quando um cliente seleciona uma data no modal de agendamento, o sistema:
  - Detecta automaticamente o dia da semana
  - Carrega apenas os horários que foram marcados no painel administrativo
  - Se nenhum horário estiver disponível, mostra "Fechado neste dia"

### 5. Configuração padrão
O sistema vem com horários pré-configurados:
- **Segunda a Sexta:** 08:00 às 22:00 (com pausa para almoço 12:00-14:00)
- **Sábado:** 08:00 às 22:00 (com pausa para almoço 12:00-14:00)
- **Domingo:** Fechado

### 6. Backend e Banco de Dados
- ✅ **Backend integrado:** Sistema agora usa API no Render (https://barbeariacaio.onrender.com)
- ✅ **Banco PostgreSQL:** Dados salvos no Supabase (persistente e confiável)
- ✅ **Autenticação:** Sistema de login com sessões seguras
- ✅ **Sincronização:** Mudanças são salvas em tempo real no banco de dados

### 7. Integração
- O site principal (`index.html`) automaticamente carrega os horários da API
- As mudanças no painel admin são refletidas imediatamente no site
- Sistema funciona online com backup local (localStorage)

## Credenciais de acesso
- **Usuário:** admin
- **Senha:** 1234567
- **Email:** admin@barbeariavip.com

## WhatsApp configurado
- **Número:** +55 45 9 9132-1488
- Todas as mensagens de agendamento são enviadas para este número

## Estrutura de arquivos
- `index.html` - Site principal da barbearia
- `admin.html` - Painel administrativo (conectado à API)
- `db.json` - Base de dados antiga (não usado mais, apenas referência)
- `/fotos/` - Pasta com imagens do carrossel

## Scripts disponíveis
```bash
npm run dev    # Inicia servidor local na porta 5173
npm start      # Alias para npm run dev
```

## Backend
- **URL da API:** https://barbeariacaio.onrender.com
- **Documentação:** GET /test para verificar status
- **Tecnologias:** Node.js, Express, Supabase PostgreSQL
