## Entrega completa em um pacote

Vou estruturar o FitPro AI como um app completo (treino + nutrição + antropometria + rede social) com vínculo Personal↔Aluno e encerramento automático de treinos. É um pacote grande — implementação em uma migração de banco + frontend completo.

---

### 1. Banco de dados (uma migração)

**Vínculo profissional**
- `profiles.personal_id` já existe → vou usar como "profissional responsável" (multifunção: treino + dieta)

**Treinos (estilo MFIT, categorias)**
- `workouts` — letra (A/B/C…), título, categoria (`forca`, `hipertrofia`, `cardio`, `funcional`, `mobilidade`), aluno_id, personal_id, ativo
- `exercises` — nome, grupo_muscular, ordem, rest_seconds, nota, vídeo_url
- `exercise_sets` — reps, tipo (normal/drop/falha/rest-pause), carga_alvo
- `workout_sessions` — aluno_id, workout_id, started_at, finished_at, status (`em_andamento`, `concluido`, `encerrado_auto`), volume_total
- `set_logs` — session_id, set_id, carga, reps, nota, done_at

**Dieta (estilo Dietbox)**
- `diet_plans` — aluno_id, personal_id, nome, kcal_alvo, macros (p/c/g), ativo
- `diet_meals` — plan_id, refeição (café/almoço/lanche/jantar/ceia), horário, descrição
- `diet_meal_items` — meal_id, alimento, quantidade, unidade, kcal, p/c/g
- `food_logs` — aluno_id, data, refeição, alimento, qtd, kcal, p/c/g, foto_url (registro livre do aluno)

**Antropometria**
- `assessments` — aluno_id, personal_id, data, peso, altura, %gordura, massa_magra, medidas (jsonb: peito/cintura/quadril/braço/coxa/panturrilha), fotos (jsonb)

**Feed social (por profissional)**
- `posts` — autor_id, personal_id (escopo do feed), texto, foto_url, tipo (`treino`/`dieta`/`evolucao`/`livre`)
- `post_likes` — post_id, user_id
- `post_comments` — post_id, user_id, texto

**Notificações**
- `notifications` — user_id, tipo, título, body, lida, link

**Storage buckets**: `avatars`, `post-media`, `assessment-photos`, `food-photos` (privados, com RLS)

**RLS chave**:
- Aluno vê só seus dados
- Profissional vê tudo dos seus alunos (`personal_id = auth.uid()`)
- Feed: usuário vê posts onde `personal_id` é o seu profissional ou ele mesmo é o profissional

---

### 2. Auto-encerrar treino à meia-noite

- Job `pg_cron` diário 00:05 → marca sessões `em_andamento` com `started_at < hoje` como `encerrado_auto`, salva volume parcial e cria 2 `notifications` (aluno + personal)
- Cron chama rota `/api/public/hooks/auto-close-workouts`

---

### 3. Frontend (novas rotas + abas)

**Bottom nav nova (5 abas)**: Início · Treinos · Dieta · Feed · Perfil

**Início (`/`)** — treino do dia, macros do dia, próximas refeições, mini-card do profissional vinculado, atalho post feed.

**Treinos (`/treinos`)** — abas por categoria (estilo MFIT): Todos / Força / Hipertrofia / Cardio / Funcional / Mobilidade. Lista de treinos ativos do aluno.

**Dieta (`/dieta`)** — 2 abas:
- **Plano**: refeições prescritas pelo profissional com horários e itens
- **Diário** (Dietbox-like): registro livre por refeição, total kcal/macros do dia, foto da refeição, barra de progresso vs. meta

**Avaliações (`/avaliacoes`)** — histórico antropométrico (cards de cada avaliação), gráfico de evolução de peso/%gordura, galeria de fotos antes/depois

**Feed (`/feed`)** — timeline de posts dos alunos do mesmo profissional, curtir, comentar, criar post com foto

**Perfil (`/perfil`)** — card destacado com **nome + foto do profissional vinculado** (personal/nutricionista multifunção), dados do aluno, logout

**Execução de treino** — manter atual + warning "treino encerra à meia-noite se não finalizado"

---

### 4. Detalhes técnicos
- Usar `createServerFn` para escritas (food_logs, posts, likes, etc.) com `requireSupabaseAuth`
- Realtime para feed (curtidas/comentários) e notificações
- Mock data substituído por queries reais via TanStack Query
- Storage com upload de imagem direto do client (avatar/posts/fotos)
- Manter design escuro premium atual (graphite + lime)

---

### Escopo NÃO incluído nesta entrega
- Chat 1-1 personal↔aluno (cabe num próximo pacote)
- Assinaturas/Stripe
- IA generativa de treinos/dietas
- Painel admin de usuários

Posso ir direto à implementação?