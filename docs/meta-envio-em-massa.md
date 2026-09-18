# Envio em massa pela API oficial da Meta

O sistema usa a WhatsApp Cloud API para disparos em massa, atendimento, chatbot e webhooks.

## Variaveis de ambiente

Configure no servidor:

```env
META_WHATSAPP_ACCESS_TOKEN=""
META_WHATSAPP_PHONE_NUMBER_ID=""
META_WHATSAPP_BUSINESS_ACCOUNT_ID=""
META_GRAPH_API_VERSION="vXX.0"
META_WEBHOOK_VERIFY_TOKEN=""
```

- `META_WHATSAPP_ACCESS_TOKEN`: token de producao com acesso ao WhatsApp Business Account.
- `META_WHATSAPP_PHONE_NUMBER_ID`: ID do numero de telefone usado para enviar mensagens.
- `META_WHATSAPP_BUSINESS_ACCOUNT_ID`: ID da WABA, usado para listar templates aprovados.
- `META_GRAPH_API_VERSION`: versao do Graph API usada pelo app, no formato `vXX.0`.
- `META_WEBHOOK_VERIFY_TOKEN`: token livre definido por voce e repetido no painel da Meta para validar o webhook.

O token precisa das permissoes de mensagens e gerenciamento do WhatsApp Business. A propria documentacao da Meta mostra esse fluxo na colecao oficial da WhatsApp Cloud API, incluindo listagem de numeros, templates e envio de template:

- https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api
- https://www.postman.com/meta/whatsapp-business-platform/request/f7o759z/fetch-message-templates
- https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text

## Como o disparo funciona

A tela de envio em massa carrega os templates aprovados na WABA configurada e permite selecionar um template compativel. O operador informa a lista de contatos, preenche as variaveis do cabecalho e do corpo e confirma que os contatos autorizaram mensagens da empresa.

Nesta primeira etapa, o lote e limitado a 100 contatos, com concorrencia de 5 envios por vez e timeout de 10 segundos por chamada. Um envio marcado como `aceito` significa que a Meta recebeu a mensagem para processamento. Entrega, leitura e falhas posteriores dependem dos webhooks, que ficam para a proxima etapa.

## Limites desta etapa

- Apenas templates aprovados aparecem para envio.
- Sao suportadas variaveis numericas posicionais, como `{{1}}` e `{{2}}`.
- Templates com cabecalho de imagem, video ou documento exigem URL publica HTTPS.
- Botao estatico de URL, telefone e resposta rapida pode permanecer no template.
- URL variavel em botao, variaveis nomeadas, carrossel e templates de autenticacao ainda nao sao enviados por este fluxo.
- As variaveis preenchidas valem para todos os contatos do lote.
