# Veloura

Loja Veloura com a Calça Pool Jeans barrel por R$69,90, cinco cores, avaliações e checkout Pix UrusPay.

## Vercel

As únicas variáveis necessárias são:

- `URUSPAY_API_KEY`: chave da API Pix.
- `UTMIFY_API_TOKEN`: token UTMify para rastreamento.
- `META_ACCESS_TOKEN`: token Facebook Conversions API.
- `META_PIXEL_ID`: `1197640555599515`.

Apenas URUSPAY_API_KEY é exigida para gerar e consultar Pix; as demais ativam rastreamento. Salve para Production e faça Redeploy. Redis não é obrigatório.

O build é `node build.cjs`, com saída `public`. A função `api/index.js` recebe somente as rotas de API. Loja e checkout são estáticos.

## Pix sem banco

O servidor valida CPF, endereço, itens e valores, incluindo frete grátis ou Sedex R$13,90. O código copia e cola e o QR Code são retornados ao checkout. Um comprovante criptografado com AES-256-GCM permite consultar a cobrança em outra instância da Vercel, sem arquivos ou banco. A chave deriva da credencial UrusPay e nunca vai ao navegador. Não altere essa credencial enquanto houver cobranças pendentes, pois os comprovantes anteriores deixam de ser válidos.

O checkout consulta a UrusPay a cada 5 segundos e confirma apenas pago=true ou status=paid. Em modo sem Redis, a confirmação e o rastreamento direto de pagamento dependem do checkout aberto ou reaberto na mesma sessão. Rastreamento nativo da UrusPay, se configurado, opera independentemente do navegador.

O botão bloqueia cliques durante a geração. Em uma mesma instância, o evento reutiliza a cobrança existente. Sem armazenamento compartilhado, não há garantia global de idempotência entre diferentes instâncias antes de a resposta de criação retornar. Em erro ou timeout ambíguo, confirme a cobrança no painel UrusPay antes de iniciar outra tentativa.

## Redis opcional

Se futuramente desejado, UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN (ou equivalentes KV) habilitam pedidos persistentes, reserva distribuída e webhook. São opcionais e não devem ser preenchidos com chaves de outros serviços. No servidor local, dados são salvos em `.runtime`, privado e ignorado pelo Git.

## Rastreamento

UTMify recebe waiting_payment e paid com mesmo orderId e createdAt. Os preços são em centavos, incluindo frete. GATEWAY_FEE_CENTS é uma taxa fixa opcional; sem tarifa informada, a comissão é bruta.

O Pixel 1197640555599515 e o script oficial UTMify estão na loja e no checkout. Localhost não carrega analytics. A compra só é enviada ao Facebook após confirmação, com mesmo evento_id do navegador e dados normalizados/hash SHA-256. A integração nativa da UrusPay tem prioridade quando o provedor informa envio/configuração, evitando duplicação. Confirme o destino no painel UrusPay.

UTMify foi validada com isTest:true, sem cadastrar vendas fictícias. Meta Purchase e Pix foram testados com respostas simuladas, sem criar cobrança real.

## Local

Node.js 18+. Copie `.env.example` para `.env`, informe as credenciais e execute `npm ci` e depois `npm start`. `npm run check` valida sintaxe e `npm test` executa testes de rastreamento.

Cartão não está integrado. A opção selecionável informa indisponibilidade e orienta o uso do Pix. Tamanhos, medidas e composição devem ser confirmados com o fornecedor.

O QR Code pode ser gerado no servidor a partir do Pix copia e cola já recebido, sem criar nova cobrança. A validação aceita resposta estruturada e confirma o valor pela consulta da UrusPay se ele estiver ausente na criação.


## Kit facial

A rota `/kit/` apresenta o Kit Clareador Facial com protetor solar FPS70 50g, sérum multicorretivo 30ml e sabonete facial 120ml. Opções: 1 Kit R$59,90; 2 Kits R$79,90; 3 Kits R$97,90. A seleção altera foto e preço. O catálogo compartilhado permite calça e kit na mesma sacola; API e rastreamento usam o produto e a variante correspondentes. O desconto Pix de 5% permanece aplicado aos produtos, separado do frete. Os textos se baseiam nos nomes e rótulos fornecidos, sem prometer resultado individual.
