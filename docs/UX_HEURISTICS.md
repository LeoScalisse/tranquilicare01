# Checklist de experiência — 10 heurísticas de Nielsen

Toda mudança de interface do TranquiliCare deve considerar os dez pontos abaixo antes de ser concluída. A lista é parte do critério de aceite, não uma revisão opcional.

1. **Visibilidade do estado:** carregando, enviando, sucesso, vazio e indisponibilidade devem ser perceptíveis e anunciados quando necessário.
2. **Correspondência com o mundo real:** usar português claro, verbos de ação e conceitos conhecidos por doadores e ONGs.
3. **Controle e liberdade:** oferecer cancelar, fechar, desfazer ou uma recuperação segura; não prender a pessoa em um fluxo.
4. **Consistência e padrões:** reutilizar componentes, cores, rótulos, ícones e comportamentos existentes.
5. **Prevenção de erros:** validar cedo, limitar escolhas e desabilitar ações impossíveis sem esconder o motivo.
6. **Reconhecimento em vez de memorização:** manter contexto, rótulos visíveis, exemplos e instruções curtas perto da ação.
7. **Flexibilidade e eficiência:** funcionar com teclado, toque e mouse; preservar atalhos e valores úteis quando seguro.
8. **Estética e minimalismo:** mostrar apenas informação relevante, com hierarquia clara e sem animação decorativa excessiva.
9. **Reconhecer, diagnosticar e recuperar de erros:** explicar o que ocorreu em linguagem humana e indicar como corrigir; reverter atualizações otimistas que falharem.
10. **Ajuda e documentação:** fornecer ajuda contextual para decisões incomuns, permissões, pagamentos e integrações externas.

## Verificação mínima por mudança

- Estados `loading`, `empty`, `error`, `success` (sucesso somente quando agrega confirmação real).
- Foco visível, rótulo acessível, navegação por teclado e alvo de toque adequado.
- `prefers-reduced-motion` respeitado; animações usam preferencialmente `transform` e `opacity`.
- Erros preservam os dados preenchidos e apresentam uma próxima ação.
- Layout verificado em celular e desktop, com texto longo e dados ausentes.
- Testes automatizados atualizados e build executado.
