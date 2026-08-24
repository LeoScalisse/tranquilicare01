# Auditoria de segurança - 22 de agosto de 2026

## Situação da execução

- Ferramenta: Strix 1.5.3, com as skills oficiais do repositório `usestrix/strix`.
- Modo: `standard`, `scope-mode full`, source-only.
- Alvo: cópia temporária isolada de todo o repositório (308 arquivos), sem `.env`, dependências instaladas, build ou metadados Git.
- Serviços reais: Supabase, Stripe e ambientes publicados foram explicitamente excluídos do escopo.
- Cobertura observada: frontend, autenticação, privilégios, pagamentos, webhooks, uploads, RLS, Storage, dependências e segredos.
- Agentes observados: 9 agentes de descoberta, além de validadores específicos para confirmação de pagamento e mídia de histórias.

A execução foi interrompida a pedido da responsável pelo projeto. Antes disso, alguns agentes sofreram erros de streaming e de pipe do Docker no Windows, e o OneDrive bloqueou uma gravação atômica de estado. Por isso, esta auditoria não deve ser apresentada como um pentest completo ou certificado. Os dois achados abaixo, porém, chegaram à etapa de validação local com evidência reproduzível.

## Achados validados

### 1. Confirmação de doação sem verificação de proprietário

**Severidade sugerida:** média  
**Categoria:** IDOR/BOLA e exposição de informações  
**Arquivo principal:** `supabase/functions/_shared/payments/http/confirm-payment-handler.ts`

O endpoint aceita `actionId`/`sessionId`, consulta pagamentos usando o cliente com service role e pode devolver dados da doação sem validar se a pessoa que chamou o endpoint é a dona da doação.

A validação local confirmou que o mesmo conteúdo era retornado:

- sem autenticação;
- com um bearer token de outro usuário;
- desde que o chamador conhecesse o `provider_action_id` da vítima.

Os dados expostos incluem ID da doação, organização, valor, data e identificador da ação de pagamento. O identificador externo possui boa entropia, o que reduz a possibilidade de adivinhação, mas ele aparece na URL de sucesso e pode vazar por histórico, logs, compartilhamento ou telemetria.

**Correção recomendada:**

1. Para doações autenticadas, exigir JWT válido e comparar `donor_id` com `auth.uid()` antes de retornar detalhes.
2. Para doações anônimas, usar um token de confirmação separado, de uso limitado, armazenado como hash, ou retornar apenas um estado mínimo sem metadados da doação.
3. Não tratar `provider_action_id` como autorização suficiente.
4. Aplicar a mesma proteção ao endpoint legado de confirmação.
5. Adicionar testes para dono correto, usuário diferente, chamada anônima, token inválido e repetição.

### 2. Mídia de história não publicada pode ficar pública

**Severidade sugerida:** média  
**Categoria:** exposição de informações e controle de acesso  
**Arquivo principal:** `supabase/migrations/20260822011941_domain_data_architecture.sql`

As histórias em rascunho ficam protegidas pela RLS, e a associação em `story_media` também não foi exposta diretamente. Entretanto:

- `media_assets.visibility` usa `public` como padrão;
- registros públicos de `media_assets` podem ser lidos anonimamente;
- o bucket `stories-public` é público;
- `bucket` e `storage_key` permitem localizar o objeto.

Assim, uma mídia vinculada a uma história ainda não publicada pode ter metadados e bytes acessíveis antes da publicação.

**Correção recomendada:**

1. Alterar o padrão de novas mídias de história para privado.
2. Armazenar uploads de rascunho em bucket privado e servir por URL assinada aos membros autorizados.
3. Tornar a mídia pública apenas em uma operação atômica de publicação da história.
4. Restringir a leitura pública de `media_assets` a ativos vinculados a histórias publicadas ou a usos explicitamente públicos, como avatar e capa.
5. Adicionar testes pgTAP para rascunho, agendamento, publicação, arquivamento e usuário de outra organização.

## Dependências vulneráveis

O `npm audit` encontrou 8 ocorrências: 1 crítica, 2 altas e 5 moderadas.

- `vitest`: vulnerabilidade crítica em versões anteriores a 3.2.6 quando o servidor de UI está exposto.
- `vite`: vulnerabilidades de path traversal e bypass de `server.fs.deny`, especialmente relevantes no servidor de desenvolvimento no Windows.
- `react-router-dom` / `react-router`: open redirect, possibilidade de XSS e problemas de desserialização em versões afetadas. Essas dependências entram no bundle de produção.
- `nanoid`: dependência transitiva com risco de loop indefinido em geradores personalizados.

**Correção recomendada:** atualizar as dependências para versões corrigidas e suportadas, adaptar eventuais mudanças de API e repetir TypeScript, lint, 61 testes, build e `npm audit`. Não usar `npm audit fix --force` sem revisar os saltos de versão principal.

## Hardening recomendado

1. Sanitizar o parâmetro `redirect` usado após autenticação, aceitando somente caminhos internos conhecidos.
2. Garantir no banco que `story_media.media_asset_id` pertence à mesma organização da história.
3. Garantir que avatar, capa da organização e capa de campanha apontem para mídia da própria organização e finalidade correta.
4. Validar no backend que `campaignId` pertence à organização escolhida antes de criar a doação.
5. Tornar atômica a retomada de eventos de webhook marcados como `failed`, evitando dois processadores simultâneos.
6. Criar testes de Storage para prefixos de outra organização, chaves malformadas, overwrite e rename.
7. Manter rate limiting e proteção contra abuso nos endpoints públicos de criação/consulta de pagamentos.
8. Executar periodicamente scan Strix full fora de pastas sincronizadas pelo OneDrive.

## Pontos positivos observados

- Nenhum segredo real foi encontrado por `gitleaks`, pela busca local ou pelos padrões revisados.
- O único alerta do `trufflehog` apareceu em um JSON de Lottie e foi classificado como provável ruído de asset, não segredo confirmado.
- Não foi confirmada escalada de privilégio em `account_type` ou bypass direto de JWT.
- Não foi confirmado bypass genérico de RLS entre organizações.
- A service role permanece restrita às Edge Functions de backend.
- Tabelas de domínio relevantes possuem RLS habilitada.
- O bucket de documentos de verificação é privado.
- O scan local de configuração do Trivy não encontrou misconfigurações confirmadas.

## Gate antes de commit e push

O commit e o push devem permanecer bloqueados até:

1. corrigir os dois achados validados;
2. atualizar as dependências vulneráveis;
3. adicionar os testes de regressão correspondentes;
4. executar TypeScript, ESLint, testes, build, `npm audit` e `supabase db lint`;
5. repetir o Strix em diretório local fora do OneDrive e confirmar `run.json.status = completed`;
6. revisar manualmente cada PoC e o SARIF final.

## Padrão para mudanças futuras

Antes de cada push:

1. executar checks locais e `npm audit`;
2. executar Strix `quick` com escopo do diff;
3. bloquear o push em vulnerabilidade validada ou scan incompleto;
4. usar Strix `standard --scope-mode full` antes de releases ou mudanças em autenticação, pagamentos, RLS, Storage e uploads;
5. manter os relatórios fora do commit quando contiverem detalhes exploráveis ou dados sensíveis.
