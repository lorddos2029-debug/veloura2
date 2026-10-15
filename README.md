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

Os pedidos ficam em `.runtime/`, incluindo os dados de entrega e o identificador de cobrança. Esse diretório e `.env` são privados e ignorados pelo Git. Use armazenamento persistente protegido para `.runtime` em produção, uma única instância de Node, HTTPS e backups privados. O estado é confirmado por consulta ao provedor; não há webhook implementado.

Em falha de resposta ao criar cobrança, o pedido fica marcado como incerto e novas tentativas com o mesmo evento não criam outra cobrança. Consulte o painel UrusPay antes de tentar novamente. Os tamanhos e a composição precisam de confirmação com o fornecedor.

## Verificação

`npm run check` verifica a sintaxe. A integração foi testada com respostas simuladas, sem gerar cobrança real. A confirmação real depende da disponibilidade e das permissões da conta UrusPay.
