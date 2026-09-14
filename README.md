# ConnectaCorp CRM

CRM comercial da Connecta Telecom feito com Next.js, Prisma, Supabase, WhatsApp/Z-API, WhatsApp Cloud API da Meta e OpenAI.

## Desenvolvimento

```bash
npm ci
npm run dev
```

## Banco

```bash
npx prisma migrate deploy
npm run seed
```

## Deploy na Vercel

Importe o repositorio no painel da Vercel e configure as variaveis de ambiente abaixo antes do primeiro deploy:

```env
DATABASE_URL=""
DIRECT_URL=""
JWT_SECRET=""
JWT_EXPIRES_IN_SECONDS="604800"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
OPENAI_TRANSCRIBE_MODEL="gpt-4o-mini-transcribe"

ZAPI_BASE_URL="https://api.z-api.io"
ZAPI_INSTANCE_ID=""
ZAPI_TOKEN=""
ZAPI_CLIENT_TOKEN=""
ZAPI_WHATSAPP_NUMBER=""

META_WHATSAPP_ACCESS_TOKEN=""
META_WHATSAPP_PHONE_NUMBER_ID=""
META_WHATSAPP_BUSINESS_ACCOUNT_ID=""
META_GRAPH_API_VERSION=""

APP_NAME="CONNECTA TELECOM CRM"
APP_VERSION="1.0.0"
APP_LICENSE="MIT"
APP_DEVELOPER="CONNECTA TELECOM"
```

O comando de build na Vercel e `npm run build`, que tambem executa `prisma generate`.
