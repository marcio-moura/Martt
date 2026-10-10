# Ecossistema Martt

App web, pensado primeiro para o celular, que concentra a operação da Martt Co.: a semana, o time, o Método Martt, as fichas de cliente e os rituais.

**Stack:** Vite + React + TypeScript no navegador, e Supabase para o banco Postgres, o login, o tempo real e as regras de acesso (RLS). Não há servidor próprio: o build é um site estático (Vercel, Netlify ou Cloudflare Pages), e as permissões ficam no banco.

## Rodar localmente

```bash
cd ecossistema
npm install
npm run dev
```

Sem `.env.local`, o app abre em **modo demonstração**. Os dados de exemplo ficam no navegador, sem login, e abas abertas lado a lado se atualizam juntas. O botão "Restaurar exemplo" volta ao estado inicial.

## Ligar ao Supabase (uso com o time)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode `supabase/migrations/0001_esquema.sql` e depois `supabase/seed.sql`.
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (em Project Settings > API).
4. `npm run dev` para testar.
5. **Publicação:** o `vercel.json` da raiz já publica o site em `/` e o app em `/ecossistema/` no mesmo projeto da Vercel. Basta cadastrar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Settings > Environment Variables do projeto e fazer um novo deploy. Sem as variáveis, o app publicado abre em modo demonstração.

### Primeiro usuário

Abra o app e use **Criar conta** com o seu e-mail. **A primeira conta criada vira a Direção** e assume a pessoa "Marcio" do seed. Faça isso logo depois de publicar. Se o Supabase pedir confirmação de e-mail, clique no link recebido e depois entre.

### Adicionar alguém do time

1. Na aba **Time**, em *Pessoas*, toque em **Adicionar pessoa** e informe nome, e-mail, papel e nível.
2. A pessoa cria a conta com **o mesmo e-mail** e já entra com o acesso definido.

Quem cria conta com um e-mail que não foi cadastrado vê "Acesso ainda não liberado" e não lê nenhum dado. Se quiser fechar de vez o cadastro aberto, desative *Allow new users to sign up* no Supabase e convide as pessoas por Authentication > Users.

### Níveis de acesso

| Nível | Pode |
|---|---|
| Direção | Tudo: demandas, clientes, pessoas, papéis, rituais, modelo de semana, gerar a semana |
| Time | Ver tudo; criar demandas; editar, mover, excluir e concluir as demandas que criou ou em que é responsável (pela pessoa ou pelo papel) |
| Leitura | Só ver |

Quem garante essas regras é o banco (RLS), e não só a interface.

## Regra do "concluído"

Cada demanda tem um **tipo**:

- **Tarefa** (reunião, checklist, organização): marcar o check encerra a tarefa.
- **Conteúdo** (uma peça que segue o Método): passa pelos estados *A fazer → Em produção → Em revisão → Com o cliente → Aprovado → Publicado*. Ela só conta como concluída quando está **Publicada**. Marcar o check publica; desmarcar volta para *Aprovado*; mudar o estado para qualquer outro desmarca.

A regra está no trigger `demandas_antes_de_gravar` e se repete em `src/lib/backend.ts`.

## Trocar os dados de exemplo pelos reais

- **Pelo app (o caminho normal):** como Direção, edite os clientes (Clientes > Editar ficha, ou Novo cliente), os papéis e as pessoas (Time), as etapas (Método), os rituais e as regras (Rituais) e o modelo de semana (Semana > *Editar modelo de semana*). Os clientes de exemplo podem ser arquivados ou excluídos.
- **Antes de subir o banco:** edite `src/lib/seed.ts` e rode `npm run seed:sql` para gerar de novo o `supabase/seed.sql`. Esse arquivo é a única fonte do seed, e o modo demonstração também lê dele.

Não coloque dados reais de clientes em `seed.ts`, porque esse arquivo vai para o repositório.

## Como a tela Semana funciona

- Abre no dia de hoje, marcado com um traço verde. As setas mudam de semana e **Hoje** volta para a atual.
- O filtro por papel considera os responsáveis pelo papel e as pessoas daquele papel. **Minhas** mostra o que é seu.
- **Copiar para o grupo** gera o texto da ordem do dia para o WhatsApp. Se a área de transferência falhar, o texto aparece selecionado logo abaixo.
- **Gerar a partir do modelo** (Direção) mostra a semana-padrão, deixa ajustar horário e título, tirar itens e escolher a semana, e cria tudo de uma vez.
- Para mover uma demanda, abra-a e escolha outro dia ou outro horário.

## Estrutura

```
supabase/migrations/0001_esquema.sql   tabelas, regras de acesso, triggers, funções
supabase/seed.sql                      gerado a partir de src/lib/seed.ts
src/lib/                               tipos, seed, camada de dados (Supabase e demo), datas
src/screens/                           Semana, Time, Método, Clientes, Rituais e formulários
src/styles.css                         visual da marca (tokens claro/escuro)
```

## Preparado para a fase 2

- **Kanban por estado:** a tabela `demanda_historico` já registra cada mudança de estado, com a pessoa e a hora.
- **Notificações e Google Agenda:** as demandas têm data, horário, local e responsáveis em colunas próprias, prontas para uma Edge Function ou um cron do Supabase.
- **Relatório mensal:** a tabela `demanda_clientes` liga cada demanda aos seus clientes.
- **Anexos e links:** basta criar uma tabela `demanda_links (demanda_id, url, rotulo)` com as mesmas políticas de `demanda_clientes`.
