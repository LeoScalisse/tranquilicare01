# Movimento e profundidade no TranquiliCare

## Skills instaladas no projeto

Dez skills oficiais em `.agents/skills`, com revisões fixadas:

| Origem | Revisão | Skills |
| --- | --- | --- |
| [GSAP](https://github.com/greensock/gsap-skills) | `aed9cfd3277740755f6bfc1155c7aa645403b760` | gsap-core, gsap-timeline, gsap-scrolltrigger, gsap-plugins, gsap-utils, gsap-react, gsap-performance, gsap-frameworks |
| [Design DNA](https://github.com/zanwei/design-dna) | `593e39bc9e3652734653bd75544a333d7d43615e` | design-dna |
| [LottieFiles](https://github.com/lottiefiles/motion-design-skill) | `f9a8a041b85185ee4881b3471d3415e939aac772` | motion-design |

Os repositórios [Three.js](https://github.com/mrdoob/three.js), [Vanta](https://github.com/tengbao/vanta) e [React Bits](https://github.com/DavidHDev/react-bits) não continham `SKILL.md` nas revisões verificadas. Os guias `threejs-tranquilicare`, `vanta-tranquilicare` e `react-bits-tranquilicare` são adaptações locais, explicitamente identificadas como tal. Não são skills oficiais desses autores.

## DNA preservado e aplicado

O sistema existente é a referência: azul `#38b6ff`, amarelo `#ffde59`, tinta azul profunda, superfícies claras azuladas, tipografia e componentes do projeto. A personalidade continua acolhedora, confiável e esperançosa. Espaço e contraste separam descoberta, leitura e ação; pessoas e causas reais permanecem protagonistas.

Os efeitos acrescentam profundidade sem mudar a navegação: coração azul em volume, aro amarelo, ondas suaves, bordas iluminadas e inclinação de até 2,5 graus nos cards. Não há números ou perfis fictícios adicionados à aplicação.

## Aplicação das referências

- **Three.js:** cena isolada carregada por importação dinâmica; uma câmera, um renderer e descarte explícito dos recursos. Versão exata registrada no package-lock.json.
- **Vanta:** perfil ondulado adaptado de Waves para a mesma cena, sem instalar um segundo runtime ou uma versão antiga de Three.js. MIT preservada em `vendor/vanta-LICENSE.md`.
- **React Bits:** padrão TiltedCard de motion values e springs adaptado aos cards existentes, com movimentos menores, foco estável e suporte a toque. Termos preservados em `vendor/react-bits-LICENSE.md`.
- **GSAP:** entrada coordenada de títulos, texto e ações; curvas power3.out; callbacks e recursos revertidos ao desmontar. A cena termina sua entrada em 2,4 segundos e passa a renderizar sob demanda.
- **LottieFiles motion-design:** intenção calma, movimento primário e secundário, respostas curtas, simplificação no celular e alternativa sem movimento espacial. Esta skill não exige um arquivo Lottie; não foi adicionado um loop decorativo.
- **Design DNA:** separação entre tokens existentes, personalidade da marca e efeitos, preservando a identidade em vez de importar a aparência das demos.

## Limites e recuperação

Sem WebGL, sem observers, com economia de dados ou movimento reduzido, a imagem original da marca permanece. Não há mensagem de erro para um efeito decorativo. O conteúdo e os botões não dependem do canvas. A preferência de movimento reduzido desmonta a cena durante o uso. A resolução do canvas é limitada a 1,5 vezes a resolução CSS.

Animação da esfera para quando o movimento termina e fora da área visível; o toque permite rolagem vertical. Navegação por teclado permanece nos botões existentes. Histórias aproveitam a largura disponível no celular.

O build separa o 3D em um arquivo carregado sob demanda de aproximadamente 144 kB com gzip. É um custo adicional para quem visualiza a cena; a alternativa estática evita esse download quando movimento reduzido ou economia de dados está ativo.

## Verificação de UX

Estado e linguagem: conteúdo e dados reais mantidos. Controle: movimento decorativo finito, navegação manual, foco e ações preservados. Consistência: mesmos tokens e componentes. Prevenção e recuperação: alternativa estática, sem dependência do 3D para usar a interface. Reconhecimento: rótulos visíveis e hierarquia preservada. Eficiência: mouse, teclado e toque. Minimalismo: nenhuma nova camada de navegação. Ajuda: nenhum conceito novo exigido do usuário.
