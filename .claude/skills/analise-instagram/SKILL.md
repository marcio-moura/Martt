---
name: analise-instagram
description: Análise mensal de Instagram no padrão MARTT. Use quando o usuário mandar prints de Insights do Instagram (ou pedir "análise do Instagram", "análise do mês" de um cliente) para extrair os dados, ler o que funcionou e o que travou, montar ajustes e metas do próximo mês e entregar o relatório com a identidade visual MARTT.
---

# Análise mensal de Instagram · padrão MARTT

Entrada: prints dos Insights (ou dados do conector Windsor.ai, quando estiver autorizado).
Saída: um relatório HTML com a identidade MARTT, publicado como Artifact, mais um resumo curto no chat.

Arquivos:
- `analises-instagram/modelo.html`: o modelo visual. Não editar por cliente.
- `analises-instagram/gerar.py`: junta modelo + logo + dados.
- `analises-instagram/clientes/<cliente>/<AAAA-MM>.json`: dados de cada mês. Exemplo completo: `clientes/infinity-celulares/2026-10.json`.
- `marca/`: logo MARTT.

## Passo a passo

1. **Identificar cliente e mês.** Pasta em kebab-case (`infinity-celulares`). O mês do arquivo é o mês em que a análise é feita.
2. **Ler o histórico.** Se existir JSON do mês anterior na pasta do cliente, abra. Compare as metas dele com o resultado atual e diga quais bateram. Isso vira a primeira linha do veredito.
3. **Extrair os dados dos prints.** Use só o que aparece nos prints. Nunca invente número. Se algo não veio, deixe fora e liste em `faltou`.
   - Visão geral: visualizações, seguidores líquidos, interações, contas alcançadas (visualizadores), views e interações por formato, visitas ao perfil, toques no link.
   - Conteúdo: lista ordenada por visualizações, com curtidas, comentários, reposts, envios e respostas.
   - Público: seguidores, novos seguidores, gênero, idade, países e cidades, horários de pico, conteúdos que trouxeram seguidores.
   - Resumo mensal: views do mês fechado e variação, % de não seguidores, quantidade de reels, posts e stories.
4. **Calcular** (mostrar no relatório):
   - Taxa de interação = interações ÷ visualizações (geral e por formato).
   - Frequência = visualizações ÷ contas alcançadas.
   - Visitas ao perfil ÷ contas alcançadas; toques no link ÷ visitas.
   - Saídas ≈ novos seguidores − seguidores líquidos.
   - Participação de cada formato nas visualizações; média por publicação.
5. **Classificar cada KPI** com `status`: `bom`, `atencao` ou `alerta`. Referências para perfis de negócio local:
   - Taxa de interação sobre visualizações: abaixo de 0,5% = alerta; 0,5–1,5% = atenção; acima = bom.
   - Não seguidores: abaixo de 20% = atenção; abaixo de 10% = alerta.
   - Toques no link ÷ visitas: acima de 15% = bom.
   - Saídas acima de 50% dos novos seguidores = atenção.
   - Sempre que houver mês anterior, a tendência pesa mais que a referência.
6. **Ler o mês.** De 3 a 6 itens em `funcionou` e em `travou`. Cada item cita o conteúdo ou o número que o prova.
7. **Montar o plano** (`ajustes`) agrupado por frente (Reels, Stories, Feed e alcance, Conversão, datas sazonais). Cada ação é concreta (quantidade, horário, formato, exemplo de tema) e traz o `porque` ligado a um dado do mês. Verifique as datas comerciais do próximo período (Black Friday, Dia das Mães, Natal etc.).
8. **Metas**: de 4 a 6 números com atual → meta. As metas devem ser possíveis em um mês (+20% a +80%, no geral).
9. **Gerar**: salve o JSON e rode `python3 analises-instagram/gerar.py analises-instagram/clientes/<cliente>/<AAAA-MM>.json`.
10. **Publicar** o `.html` gerado com a ferramenta Artifact. Na primeira publicação use o ícone `chart`. Para atualizar o mesmo relatório, publique de novo pelo mesmo caminho.
11. **Salvar no repositório**: commit do JSON e do HTML na pasta do cliente, para o próximo mês ter histórico.
12. **Responder no chat** em até 8 linhas: o veredito, os 3 ajustes principais, as metas e o link. Diga quais prints faltaram.

## Estrutura do JSON

Campos obrigatórios: `cliente`, `periodo`, `proximo_periodo`, `objetivo`, `veredito`, `kpis`, `funcionou`, `travou`, `ajustes`, `metas`.
Opcionais: `perfil`, `mes`, `segmento`, `gerado_em`, `comparativo` (+ `comparativo_nota`), `funil`, `formatos` (+ `formatos_nota`), `top` (+ `top_nota`), `publico`, `plano_nota`, `faltou`.
Siga exatamente o formato do exemplo da Infinity Celulares.

## Identidade MARTT

Tudo já está no `modelo.html`: capa preta com o logo, verde sálvia `#8FB5A3`, off-white `#F1EDE6`, Plus Jakarta Sans nos títulos e Manrope no texto, rótulos em caixa alta espaçada como o "CONSULTORIA EM MARKETING" do logo. Para mudar o visual, altere só o modelo e regenere os relatórios.

## Tom do texto

Português do Brasil, direto, para o dono do negócio entender sem jargão. Frases curtas. Número sempre com contexto ("21% das visitas", não só "290").
