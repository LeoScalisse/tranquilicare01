# Regras permanentes do TranquiliCare

Antes de alterar qualquer experiência de usuário, leia e aplique `docs/UX_HEURISTICS.md`. As 10 heurísticas de Nielsen e a checklist final são critérios obrigatórios para toda mudança de interface, inclusive correções pequenas.

Preserve a linguagem visual descrita em `.impeccable.md`, reutilize componentes existentes e dê prioridade especial à prevenção, explicação e recuperação de erros. Não confirme sucesso antes de a operação real ser confirmada pelo backend.

Todo campo textual novo deve reutilizar SmoothInput ou SmoothTextarea, diretamente ou pelos componentes Input e Textarea. Controles especializados como arquivo, checkbox, data e a roda de valor preservam seus componentes próprios.

Toda exclusão iniciada pelo usuário deve oferecer recuperação antes da mutação definitiva usando TimedUndoAction: exiba a contagem regressiva, permita cancelar e só confirme sucesso depois da resposta real do backend.