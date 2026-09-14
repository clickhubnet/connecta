import assert from "node:assert/strict";
import test from "node:test";
import { parseContacts } from "../src/modules/envio-em-massa/schemas/mass-message.schema.ts";
import { MassMessageService } from "../src/modules/envio-em-massa/services/mass-message.service.ts";
import { MetaApiError } from "@/services/meta/meta.service";
import { buildTemplate, unsupportedTemplateReason } from "../src/services/meta/template.ts";

const textTemplate = {
  id: "123",
  name: "welcome_campaign",
  language: "pt_BR",
  status: "APPROVED",
  category: "MARKETING",
  components: [
    { type: "HEADER", format: "TEXT", text: "Ola {{1}}" },
    { type: "BODY", text: "Plano {{1}} por {{2}}" },
  ],
};

test("normaliza e deduplica contatos brasileiros", () => {
  assert.deepEqual(parseContacts("+55 (11) 99999-9999\n11999999999;5511999999999"), ["5511999999999"]);
});

test("rejeita listas acima do limite da etapa", () => {
  const contacts = Array.from({ length: 101 }, (_, index) => `55119999${String(index).padStart(4, "0")}`).join("\n");
  assert.throws(() => parseContacts(contacts), /no máximo 100 contatos/);
});

test("monta payload de template com variaveis posicionais", () => {
  assert.equal(unsupportedTemplateReason(textTemplate), null);
  assert.deepEqual(
    buildTemplate(textTemplate, {
      headerValues: ["Paulo"],
      bodyValues: ["600 Mega", "R$ 99,90"],
      mediaUrl: "",
    }),
    {
      name: "welcome_campaign",
      language: { code: "pt_BR" },
      components: [
        { type: "header", parameters: [{ type: "text", text: "Paulo" }] },
        {
          type: "body",
          parameters: [
            { type: "text", text: "600 Mega" },
            { type: "text", text: "R$ 99,90" },
          ],
        },
      ],
    },
  );
});

test("exige url https publica para template com midia", () => {
  const mediaTemplate = {
    id: "456",
    name: "image_campaign",
    language: "pt_BR",
    status: "APPROVED",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE" },
      { type: "BODY", text: "Confira nossa oferta" },
    ],
  };
  assert.throws(
    () => buildTemplate(mediaTemplate, { headerValues: [], bodyValues: [], mediaUrl: "http://example.com/a.jpg" }),
    /URL HTTPS pública/,
  );
});

test("processa lote e classifica aceite, falha e status incerto", async () => {
  const fakeMeta = {
    async listTemplates() {
      return [textTemplate];
    },
    async sendTemplate(phone) {
      if (phone.endsWith("0001")) return "wamid.1";
      if (phone.endsWith("0002")) throw new Error("Contato inválido.");
      throw new MetaApiError("Sem confirmação da Meta.", true);
    },
  };
  const service = new MassMessageService(fakeMeta);
  const result = await service.send({
    contactsText: "551199990001\n551199990002\n551199990003",
    templateId: "123",
    headerValues: ["Cliente"],
    bodyValues: ["600 Mega", "R$ 99,90"],
    mediaUrl: "",
    consentConfirmed: true,
  });

  assert.equal(result.total, 3);
  assert.equal(result.accepted, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.uncertain, 1);
  assert.deepEqual(result.contacts.map((contact) => contact.status), ["accepted", "failed", "uncertain"]);
});
