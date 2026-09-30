# Stack

Decisões técnicas. Termos seguem o [CONTEXT.md](../CONTEXT.md); restrições no [roadmap](roadmap.md).

| Parte | Escolha | Nota |
|---|---|---|
| Base | Do zero, TypeScript | ADR 0004 |
| Voz, Câmera, Transmissão | LiveKit (SFU) | Dev: LiveKit Cloud free. Uso real: self-host na Oracle Always Free |
| Mundo 2D | Phaser + mapas do Tiled | Sprites LPC para Avatar e Peças |
| App web | Vite + React (SPA) no Cloudflare Pages | Free sem trava comercial; sem SSR |
| API | Node, no mesmo servidor do Colyseus | Cadastro, Convite, Mural, Inventário |
| Interface | React | Editor de Avatar, Mural, menus, Grade |
| Tempo real | Colyseus | Cada Lugar é uma room; servidor é autoridade (movimento, Zona, Rádio). Roda na VM da Oracle |
| Login | Better Auth (Discord + Google) | Sem senha nem e-mail na v1; sessões no Neon |
| Banco | Neon (Postgres, free) | 0,5GB, 100 CU-h/mês, dorme após 5 min |
| ORM | Drizzle | Padrão adotado, leve, TypeScript |
| Imagens | Cloudflare R2 (free) | Só a partir da fatia Morar |
| Repositório | Monorepo pnpm: `apps/web`, `apps/server`, `packages/shared` | Tipos do estado compartilhados entre cliente e servidor |

## Regras do banco (por causa do free do Neon)

- Estado em tempo real — posição, quem fala, Indicador de atividade — vive em memória no servidor, nunca no banco.
- XP e Presença são gravados em lote, não a cada ação.
- Imagens (pôsteres, Mural) ficam em storage de arquivos, fora do banco.
- Plano B se estourar: Postgres na mesma VM do LiveKit.

## Regras do LiveKit

- Conectar só quando há conversa possível (alguém no Alcance ou dentro de uma Zona); andar sozinho não abre conexão.
- Trocar de LiveKit Cloud para self-host muda só a URL e as chaves do servidor, não o código.

## Assets

- Sprites LPC são CC-BY-SA / GPL: exigem crédito aos autores e compartilhamento sob mesma licença para as artes derivadas. Manter um arquivo de créditos desde o primeiro sprite.
