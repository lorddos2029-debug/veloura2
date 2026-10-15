# Veloura

Loja estática da Veloura com a Calça Pool Jeans barrel cintura média feminina por R$59,90.

## Executar

Requer Node.js 18 ou superior. Não há dependências para instalar.

```sh
npm start
```

Acesse http://localhost:3000. A variável `PORT` permite escolher outra porta.

## Recursos

- Cinco cores, galeria de imagens e ampliação das fotos.
- Seleção de tamanho e sacola persistida no navegador.
- Checkout em três etapas: identificação, entrega e pagamento.
- Frete grátis (7–10 dias) ou Sedex (3–5 dias, R$13,90), com atualização do total.
- Seis avaliações com fotos fornecidas para o projeto.
- Layout responsivo e identidade Veloura.

## Estado da integração

O checkout é uma prévia: nenhum pedido ou cobrança é criado. Dados pessoais permanecem somente na página e não são enviados nem persistidos. Pix, cartão, estoque e logística precisam de integração antes de operar vendas. Os tamanhos 34 a 46 e as medidas devem ser confirmados com o fornecedor.

## Arquivos

- `index.html`: página do produto.
- `veloura/`: estilos, scripts e imagens.
- `checkout/index.html`: checkout.
- `server.cjs`: servidor local sem dependências.

Para hospedagem estática, publique a raiz do projeto e habilite diretórios com `index.html` para `/checkout/`.
