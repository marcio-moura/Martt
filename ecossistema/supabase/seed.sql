-- Gerado por scripts/gerar-seed-sql.ts a partir de src/lib/seed.ts. Não edite à mão.
-- Dados de exemplo (fictícios). Rode depois de supabase/migrations/0001_esquema.sql.
begin;
insert into papeis (id, nome, sigla, cor, cor_escura, ordem, missao, entrega, recebe_de, passa_para, metrica) values
  ('dir', 'Direção', 'DIR', '#5E8C77', '#8FB5A3', 0, 'Definir como o cliente é percebido e garantir que tudo o que sai entregue isso.', 'Estratégia por cliente, pauta da semana, revisão final.', 'Objetivo do cliente e a análise do ciclo anterior.', 'Pauta aprovada, briefings e feedbacks para o time.', 'Conteúdos aprovados na primeira revisão.'),
  ('soc', 'Social media', 'SOC', '#5F7FA6', '#8FA9CC', 1, 'Transformar a pauta em conteúdo organizado e publicado.', 'Calendário editorial, roteiros, legendas, agendamento e respostas.', 'Pauta da Direção e cortes da decupagem.', 'Roteiro ao videomaker, briefing ao designer, posts finais à Direção.', 'Posts publicados no prazo.'),
  ('vid', 'Videomaker', 'VID', '#A47C2A', '#D2A94F', 2, 'Captar e editar o material que sustenta o conteúdo.', 'Gravação, edição e decupagem com cortes extras.', 'Roteiro, local e horário da gravação.', 'Vídeos editados na pasta do cliente e cortes extras à Social.', 'Entregas no prazo e material reaproveitado por gravação.'),
  ('des', 'Designer', 'DES', '#94699A', '#BE93C4', 3, 'Dar forma visual consistente à marca de cada cliente.', 'Artes de feed, capas de Reels, stories e criativos de anúncio.', 'Briefing da Social e do Tráfego.', 'Arquivos finais nomeados na pasta do cliente.', 'Artes aprovadas sem retrabalho.'),
  ('tra', 'Gestor de tráfego', 'TRA', '#B0675A', '#D58C7F', 4, 'Colocar o conteúdo certo diante de quem pode comprar.', 'Campanhas, verba, testes de criativo e relatórios.', 'Objetivo da Direção e peças da Social e do Designer.', 'Relatório semanal e recomendações à Direção.', 'Custo por resultado e relatório no prazo.');

insert into pessoas (id, nome, email, papel_id, nivel, ativo) values
  ('00000000-0000-4000-8000-100000000001', 'Marcio', null, 'dir', 'direcao', true);

insert into clientes (segmento, perfil_canais, responsavel, objetivo_mes, publico, posicionamento, frequencia, gravacao, formatos, aprovador, prazo_resposta, pasta, quadro, canal, indicador, fonte_metrica, id, nome, ativo) values
  ('Clínica odontológica', '@clientea · Instagram', 'Direção', '20 pedidos de avaliação', 'Moradores do bairro, 30 a 55 anos', 'Cuidado próximo, linguagem simples', '4 posts, 3 Reels, 10 stories', 'Domingo, na clínica', 'Reels, carrossel, stories', 'Dra. Ana (exemplo)', 'Até 24 horas úteis', 'Drive / Cliente A', 'Quadro / Cliente A', 'Grupo Cliente A', 'Mensagens recebidas', 'Insights do Instagram, toda sexta', '00000000-0000-4000-8000-a00000000001', 'Cliente A', true),
  ('Exemplo de conta com tráfego pago', '', 'Direção', '', '', '', '', '', '', '', '', '', '', '', '', '', '00000000-0000-4000-8000-b00000000001', 'Cliente B', true),
  ('Exemplo de conta com gravação mensal', '', 'Direção', '', '', '', '', '', '', '', '', '', '', '', '', '', '00000000-0000-4000-8000-c00000000001', 'Cliente C', true);

insert into etapas (id, ordem, nome, descricao, responsaveis, quando, pronto_quando) values
  (1, 1, 'Ideação', 'Transformar conhecimento, experiências, dúvidas e oportunidades em ideias.', '{"dir","soc"}', 'Segunda', 'Ideias da semana no quadro, ligadas ao objetivo do cliente.'),
  (2, 2, 'Roteirização', 'Transformar a ideia em roteiro e direcionamento simples para gravação.', '{"soc"}', 'Segunda e terça', 'Roteiro simples aprovado pela Direção.'),
  (3, 3, 'Gravação', 'O cliente transmite o que sabe e vive, sem precisar parar para criar conteúdo.', '{"vid","dir"}', 'Domingo', 'Material bruto salvo e com backup na pasta do cliente.'),
  (4, 4, 'Edição', 'Transformar a gravação em conteúdo claro e adequado ao digital.', '{"vid","des"}', 'Quarta', 'Vídeo e arte finais na pasta, nomeados no padrão.'),
  (5, 5, 'Decupagem', 'Identificar cortes, frases e novos assuntos para aproveitar ao máximo o material.', '{"vid","soc"}', 'Quinta', 'Cortes extras e novas ideias listados para o próximo ciclo.'),
  (6, 6, 'Publicação', 'Conteúdo organizado e publicado no canal e no formato certos.', '{"soc","tra"}', 'Sexta', 'No ar, com o link registrado no card.'),
  (7, 7, 'Análise', 'Observar respostas e resultados para gerar novos insights.', '{"tra","dir"}', 'Sexta e todo mês', 'Números lidos e um aprendizado levado à próxima ideação.');

insert into modelo_dias (dia, nome, sigla, funcao) values
  (1, 'Segunda', 'Seg', 'Planejamento e demandas'),
  (2, 'Terça', 'Ter', 'Pré-produção'),
  (3, 'Quarta', 'Qua', 'Produção'),
  (4, 'Quinta', 'Qui', 'Revisão e aprovação'),
  (5, 'Sexta', 'Sex', 'Publicação e fechamento'),
  (6, 'Sábado', 'Sáb', 'Livre e plantão'),
  (7, 'Domingo', 'Dom', 'Gravação');

insert into modelo_demandas (id, dia, horario, titulo, local, tipo, etapa_id, papeis, clientes, ordem) values
  ('00000000-0000-4000-8000-200000000001', 1, '08:30', 'Reunião de alinhamento semanal', 'Escritório ou chamada', 'tarefa', null, '{"dir","soc","vid","des","tra"}', '{}', 0),
  ('00000000-0000-4000-8000-200000000002', 1, '09:30', 'Distribuir as demandas da semana no quadro', '', 'tarefa', 1, '{"dir"}', '{}', 1),
  ('00000000-0000-4000-8000-200000000003', 1, '10:30', 'Roteirizar os conteúdos da semana', '', 'tarefa', 2, '{"soc"}', '{"00000000-0000-4000-8000-a00000000001","00000000-0000-4000-8000-b00000000001"}', 2),
  ('00000000-0000-4000-8000-200000000004', 1, '14:00', 'Briefing de artes e criativos', '', 'tarefa', 2, '{"soc","des"}', '{"00000000-0000-4000-8000-a00000000001"}', 3),
  ('00000000-0000-4000-8000-200000000005', 1, '15:00', 'Ler métricas da semana anterior e ajustar campanhas', '', 'tarefa', 7, '{"tra"}', '{"00000000-0000-4000-8000-b00000000001"}', 4),
  ('00000000-0000-4000-8000-200000000006', 2, '09:00', 'Aprovar os roteiros da semana', '', 'tarefa', 2, '{"dir"}', '{}', 0),
  ('00000000-0000-4000-8000-200000000007', 2, '10:00', 'Checklist de equipamento e roteiro de gravação', '', 'tarefa', 3, '{"vid"}', '{}', 1),
  ('00000000-0000-4000-8000-200000000008', 2, '10:30', 'Confirmar a gravação de domingo com os clientes', '', 'tarefa', 3, '{"soc"}', '{"00000000-0000-4000-8000-a00000000001","00000000-0000-4000-8000-c00000000001"}', 2),
  ('00000000-0000-4000-8000-200000000009', 2, '14:00', 'Produzir as artes de feed', '', 'tarefa', 4, '{"des"}', '{"00000000-0000-4000-8000-a00000000001"}', 3),
  ('00000000-0000-4000-8000-200000000010', 2, '16:00', 'Criar os criativos de anúncio', '', 'tarefa', 4, '{"des","tra"}', '{"00000000-0000-4000-8000-b00000000001"}', 4),
  ('00000000-0000-4000-8000-200000000011', 3, '09:00', 'Editar os vídeos da última gravação', '', 'tarefa', 4, '{"vid"}', '{"00000000-0000-4000-8000-a00000000001"}', 0),
  ('00000000-0000-4000-8000-200000000012', 3, '11:00', 'Check-in rápido de 15 minutos', 'Chamada', 'tarefa', null, '{"dir","soc","vid","des","tra"}', '{}', 1),
  ('00000000-0000-4000-8000-200000000013', 3, '14:00', 'Artes de stories e capas de Reels', '', 'tarefa', 4, '{"des"}', '{}', 2),
  ('00000000-0000-4000-8000-200000000014', 3, '15:30', 'Escrever legendas e agendar os posts', '', 'tarefa', 6, '{"soc"}', '{}', 3),
  ('00000000-0000-4000-8000-200000000015', 3, '16:30', 'Subir os criativos novos nas campanhas', '', 'tarefa', 6, '{"tra"}', '{"00000000-0000-4000-8000-b00000000001"}', 4),
  ('00000000-0000-4000-8000-200000000016', 4, '09:00', 'Revisão de direção: vídeos, artes e legendas', '', 'tarefa', 4, '{"dir"}', '{}', 0),
  ('00000000-0000-4000-8000-200000000017', 4, '11:00', 'Enviar o material para aprovação do cliente', '', 'tarefa', null, '{"soc"}', '{"00000000-0000-4000-8000-a00000000001","00000000-0000-4000-8000-b00000000001"}', 1),
  ('00000000-0000-4000-8000-200000000018', 4, '14:00', 'Aplicar os ajustes pedidos', '', 'tarefa', 4, '{"vid","des"}', '{}', 2),
  ('00000000-0000-4000-8000-200000000019', 4, '16:00', 'Decupagem: separar cortes extras para a próxima semana', '', 'tarefa', 5, '{"vid","soc"}', '{}', 3),
  ('00000000-0000-4000-8000-200000000020', 5, '09:00', 'Publicar e conferir os agendamentos', '', 'tarefa', 6, '{"soc"}', '{}', 0),
  ('00000000-0000-4000-8000-200000000021', 5, '11:00', 'Relatório semanal de tráfego', '', 'tarefa', 7, '{"tra"}', '{"00000000-0000-4000-8000-b00000000001"}', 1),
  ('00000000-0000-4000-8000-200000000022', 5, '14:00', 'Organizar arquivos e pastas dos clientes', '', 'tarefa', null, '{"soc","vid","des"}', '{}', 2),
  ('00000000-0000-4000-8000-200000000023', 5, '16:00', 'Reunião de fechamento', 'Chamada', 'tarefa', null, '{"dir","soc","vid","des","tra"}', '{}', 3),
  ('00000000-0000-4000-8000-200000000024', 5, '16:45', 'Planejar a próxima semana e preparar os briefings', '', 'tarefa', 1, '{"dir"}', '{}', 4),
  ('00000000-0000-4000-8000-200000000025', 6, '10:00', 'Plantão: conferir se as publicações agendadas foram ao ar', 'Rodízio entre o time', 'tarefa', 6, '{"soc"}', '{}', 0),
  ('00000000-0000-4000-8000-200000000026', 7, '07:30', 'Conferir equipamento e sair', '', 'tarefa', 3, '{"vid"}', '{}', 0),
  ('00000000-0000-4000-8000-200000000027', 7, '08:30', 'Chegada, alinhamento com o cliente e ordem de cenas', 'Local X (exemplo)', 'tarefa', 3, '{"dir","vid"}', '{"00000000-0000-4000-8000-a00000000001"}', 1),
  ('00000000-0000-4000-8000-200000000028', 7, '09:00', 'Gravação', 'Local X (exemplo)', 'tarefa', 3, '{"dir","vid"}', '{"00000000-0000-4000-8000-a00000000001"}', 2),
  ('00000000-0000-4000-8000-200000000029', 7, '11:30', 'Gravação', 'Local Y (exemplo)', 'tarefa', 3, '{"dir","vid"}', '{"00000000-0000-4000-8000-c00000000001"}', 3),
  ('00000000-0000-4000-8000-200000000030', 7, '13:00', 'Backup do material bruto na pasta do cliente', '', 'tarefa', 3, '{"vid"}', '{}', 4);

insert into rituais (id, nome, quando, duracao, participantes, saida, ordem) values
  ('00000000-0000-4000-8000-300000000001', 'Alinhamento semanal', 'Segunda, 08:30', '45 min', 'Todos', 'Resultados da semana, demandas e prazos. Sai com o quadro atualizado.', 0),
  ('00000000-0000-4000-8000-300000000002', 'Check-in', 'Quarta, 11:00', '15 min', 'Todos', 'Só bloqueios. Quem precisa de mais tempo marca à parte.', 1),
  ('00000000-0000-4000-8000-300000000003', 'Revisão de direção', 'Quinta, 09:00', '2 h', 'Direção e autores', 'Cada peça é aprovada ou devolvida com uma nota objetiva.', 2),
  ('00000000-0000-4000-8000-300000000004', 'Fechamento', 'Sexta, 16:00', '30 min', 'Todos', 'O que saiu, o que ficou e o que entra na próxima semana.', 3),
  ('00000000-0000-4000-8000-300000000005', 'Estratégia por cliente', 'Uma vez por mês', '', 'Direção', 'Objetivo do mês seguinte e ajustes na ficha do cliente.', 4),
  ('00000000-0000-4000-8000-300000000006', 'Relatório ao cliente', 'Primeira semana do mês', '', 'Tráfego, Social e Direção', 'Resultados do mês e próximos passos, em uma página. Sempre com enquadramento positivo, sem sugerir queda ou baixo desempenho.', 5);

insert into regras (id, grupo, texto, detalhe, ordem) values
  ('00000000-0000-4000-8000-400000000001', 'comunicacao', 'Um canal por cliente e um canal geral do time', '', 0),
  ('00000000-0000-4000-8000-400000000002', 'comunicacao', 'Pedido novo só vale depois de virar card no quadro', '', 1),
  ('00000000-0000-4000-8000-400000000003', 'comunicacao', 'Resposta interna em até 4 horas úteis', '', 2),
  ('00000000-0000-4000-8000-400000000004', 'comunicacao', 'Urgência de verdade vai por ligação', '', 3),
  ('00000000-0000-4000-8000-400000000005', 'comunicacao', 'Quem aprova no cliente é sempre uma pessoa só', '', 4),
  ('00000000-0000-4000-8000-400000000006', 'padroes', 'Nome do arquivo: AAAA-MM-DD_cliente_formato_vN', '2026-10-12_clientea_reel_v2', 0),
  ('00000000-0000-4000-8000-400000000007', 'padroes', 'Pasta do cliente', 'Cliente / AAAA-MM / Bruto, Editado, Artes, Aprovado', 1),
  ('00000000-0000-4000-8000-400000000008', 'primeira_semana', 'Dia 1: ler o Método Martt e o ecossistema inteiro. Entrar nos canais do time.', '', 0),
  ('00000000-0000-4000-8000-400000000009', 'primeira_semana', 'Dia 2: ler a ficha dos clientes que vai atender.', '', 1),
  ('00000000-0000-4000-8000-400000000010', 'primeira_semana', 'Dia 3: acompanhar uma demanda do início ao fim ao lado da Direção.', '', 2),
  ('00000000-0000-4000-8000-400000000011', 'primeira_semana', 'Dia 4: executar uma demanda pequena, com revisão.', '', 3),
  ('00000000-0000-4000-8000-400000000012', 'primeira_semana', 'Dia 5: participar do fechamento e sugerir um ajuste na estrutura.', '', 4),
  ('00000000-0000-4000-8000-400000000013', 'metodo', 'Nada vai ao cliente sem passar pela revisão da Direção.', '', 0),
  ('00000000-0000-4000-8000-400000000014', 'metodo', 'Toda demanda vira card antes de ser executada.', '', 1),
  ('00000000-0000-4000-8000-400000000015', 'cliente', 'Conhece o próprio negócio', '', 0),
  ('00000000-0000-4000-8000-400000000016', 'cliente', 'Transmite o que sabe e vive', '', 1),
  ('00000000-0000-4000-8000-400000000017', 'cliente', 'Participa das gravações e das aprovações', '', 2),
  ('00000000-0000-4000-8000-400000000018', 'martt', 'Pensa e estrutura', '', 0),
  ('00000000-0000-4000-8000-400000000019', 'martt', 'Direciona e produz', '', 1),
  ('00000000-0000-4000-8000-400000000020', 'martt', 'Organiza e acompanha', '', 2);

commit;
