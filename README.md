# Veloura

Loja Veloura com a Calça Pool Jeans barrel por R$59,90, galeria, avaliações e checkout com Pix UrusPay.

## Executar

Requer Node.js 18 ou superior, sem dependências para instalar.

1. Copie `.env.example` para `.env`.
2. Defina `URUSPAY_API_KEY` com sua chave UrusPay no `.env` ou no ambiente de hospedagem.
3. Execute `npm start` e acesse http://localhost:3000.

`PORT` permite escolher outra porta. O checkout precisa do servidor Node; hospedagem exclusivamente estática não processa Pix.

## Pagamento

O checkout está em `checkout/index.html`, com CSS e JavaScript incorporados e Tailwind via CDN. O navegador chama `/api/pix/charge` e consulta o endereço local de status retornado a cada 5 segundos. O servidor autentica na UrusPay sem revelar a chave, valida CPF, itens e endereço e calcula preços e frete. Frete grátis: 7–10 dias. Sedex: 3–5 dias, R$13,90. Cartão não está integrado.

UTMs, cookies `_fbp`/`_fbc` e o identificador de evento são enviados à UrusPay. O Pixel de navegador, se configurado, usa o mesmo evento na confirmação de pagamento. Configure Pixel, CAPI e UTMify no painel UrusPay conforme a documentação do provedor.

Os pedidos ficam em `.runtime/`, incluindo os dados de entrega e o identificador de cobrança. Esse diretório e `.env` são privados e ignorados pelo Git. Em servidores Node tradicionais, use armazenamento persistente protegido para `.runtime`, uma única instância e HTTPS. Na Vercel, use Redis conforme as instruções abaixo. O estado é confirmado por consulta ao provedor; não há webhook implementado.

Em falha de resposta ao criar cobrança, o pedido fica marcado como incerto e novas tentativas com o mesmo evento não criam outra cobrança. Consulte o painel UrusPay antes de tentar novamente. Os tamanhos e a composição precisam de confirmação com o fornecedor.

## Verificação

`npm run check` verifica a sintaxe. A integração foi testada com respostas simuladas, sem gerar cobrança real. A confirmação real depende da disponibilidade e das permissões da conta UrusPay.

## Deploy na Vercel

O `vercel.json` define build estático (`node build.cjs`, saída `public`) e a função Node `api/index.js`. A loja e o checkout não dependem da execução da API para abrir. Não use `npm start` como comando de build.

Em Settings → Environment Variables, configure para Production:

- `URUSPAY_API_KEY`: chave UrusPay.
- `UPSTASH_REDIS_REST_URL`: URL REST de uma base Upstash Redis.
- `UPSTASH_REDIS_REST_TOKEN`: token REST com permissão de leitura e escrita.

Uma integração Upstash no Vercel Marketplace pode preencher essas variáveis. Os nomes alternativos `KV_REST_API_URL` e `KV_REST_API_TOKEN` também são aceitos. Redis armazena pedidos e endereços de entrega; mantenha a base privada. Não use um token somente de leitura.

Faça Redeploy após configurar as variáveis. Não configure `STOREFRONT_ROOT` na Vercel.

Na Vercel não há gravação no filesystem: os pedidos ficam no Redis e a criação usa reserva atômica para impedir cobranças simultâneas do mesmo evento. Sem Redis, a API responde com erro amigável de configuração, sem derrubar a página. Localmente, sem Redis, permanece o armazenamento privado em `.runtime`.


## UTMify e Facebook

Variáveis adicionais na Vercel: `UTMIFY_API_TOKEN`, `META_ACCESS_TOKEN` e `META_PIXEL_ID=1197640555599515`. `META_GRAPH_VERSION` é opcional (padrão v25.0). Nunca exponha tokens no HTML.

O Pixel do navegador e o script oficial de UTMs da UTMify estão na loja e no checkout; não são carregados no localhost para evitar poluir relatórios. O script ofuscado fornecido foi substituído pelo carregamento equivalente legível.

Pix gerado envia waiting_payment e Pix confirmado envia paid com o mesmo orderId e createdAt. Valores em centavos incluem o frete. GATEWAY_FEE_CENTS permite definir uma taxa fixa conhecida; por padrão é zero, pois não foi fornecida uma tarifa. A comissão padrão corresponde ao valor bruto.

Meta Purchase só é enviado após pagamento confirmado, com email e telefone normalizados e SHA-256. O event_id é compartilhado com o Pixel do navegador. Redis registra envios e bloqueia concorrência. Erros de rastreamento não bloqueiam pagamentos; novas consultas tentam novamente.

Quando a UrusPay informa rastreamento nativo enviado/configurado, o canal permanece sob responsabilidade dela para evitar duplicação. Confirme no painel que o destino nativo corresponde à conta/pixel desejados ou desative a integração nativa para usar os tokens desta aplicação.

O webhook de pagamento usa identificador aleatório e sempre consulta a UrusPay antes de confirmar: não confia no conteúdo recebido. A entrega do callback depende do provedor. A consulta no navegador continua como alternativa.

UTMify waiting_payment e paid foram aceitos pela API real com isTest:true, sem salvar vendas. Meta Purchase foi testado com respostas simuladas, sem criar conversões fictícias. Execute npm test para validar os payloads e a deduplicação.
