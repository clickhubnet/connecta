import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const file = process.argv.find((arg) => arg.endsWith('.csv')) ?? 'leads.csv';
const apply = process.argv.includes('--apply');
const db = new PrismaClient();
const normalize = (value) => (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const stages = {
  NEW: ['Novo', 'NEW'], QUALIFIED: ['Qualificado', 'QUALIFIED'], LOST: ['Perdido', 'LOST'],
  CLOSED: ['Fechado', 'WON'], NO_COVERAGE: ['Sem cobertura', 'LOST'], N2: ['N2', 'QUALIFIED'],
  SCHEDULED: ['Agendado', 'QUALIFIED'], APROVADOS_SUBIR: ['Aprovados para subir', 'QUALIFIED'],
  WAITING_CUSTOMER: ['Aguardando cliente', 'CONTACTED'], NO_RETURN: ['Sem retorno', 'CONTACTED'],
};
try {
  const target = new URL(process.env.DATABASE_URL);
  if (!`${target.username} ${target.hostname}`.includes('xpmiugfmtgahbilgtdow')) throw Error('Banco de destino diferente do esperado.');
  const rows = JSON.parse(execFileSync('python3', ['-c', 'import csv,json,sys\nwith open(sys.argv[1],encoding="utf-8-sig",newline="") as f: print(json.dumps(list(csv.DictReader(f))))', file], {maxBuffer: 10 * 1024 * 1024}).toString());
  const [existing, users, plans] = await Promise.all([
    db.lead.findMany({select:{id:true, phone:true}}),
    db.user.findMany({where:{deletedAt:null,status:'ACTIVE'},select:{id:true,name:true}}),
    db.plan.findMany({where:{deletedAt:null},select:{id:true,name:true}}),
  ]);
  const ids = new Set(existing.map((item) => item.id));
  const seen = new Set();
  const prepared = [];
  let skipped = 0;
  let unassigned = 0;
  for (const [index, row] of rows.entries()) {
    const id = row.ID.trim();
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw Error(`ID inválido na linha ${index + 2}`);
    if (seen.has(id)) throw Error(`ID repetido na linha ${index + 2}`);
    seen.add(id);
    if (ids.has(id)) { skipped++; continue; }
    const mapping = stages[row.Status];
    if (!mapping) throw Error(`Status não mapeado na linha ${index + 2}`);
    let phone = row.WhatsApp.replace(/\D/g, '');
    if ([10,11].includes(phone.length)) phone = `55${phone}`;
    if (![12,13].includes(phone.length)) throw Error(`Telefone inválido na linha ${index + 2}`);
    const createdAt = new Date(row['Criado em']);
    if (!Number.isFinite(createdAt.getTime())) throw Error(`Data inválida na linha ${index + 2}`);
    const price = row.Valor.trim() ? Number(row.Valor.replace(',', '.')) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) throw Error(`Valor inválido na linha ${index + 2}`);
    const matches = users.filter((user) => normalize(user.name) === normalize(row.Atendente));
    const owner = matches.length === 1 ? matches[0] : null;
    if (row.Atendente && !owner) unassigned++;
    const matchingPlans = plans.filter((plan) => normalize(plan.name) === normalize(row.Plano));
    prepared.push({
      id, name:row.Nome.trim(), phone, email:row.Email.trim() || null, cpfCnpj:row['CPF/CNPJ'] || null,
      cep:row.CEP || null, address:row.Rua || null, streetNumber:row['Número'] || null,
      neighborhood:row.Bairro || null, city:row.Cidade || null, state:row.UF || null,
      planName:row.Plano || null, planId:matchingPlans.length === 1 ? matchingPlans[0].id : null,
      planValue:price, expectedValue:price, status:mapping[1], assignedUserId:owner?.id ?? null,
      createdAt, source:'importacao_csv', notes:`Importado de leads.csv. Status original: ${row.Status}.${row.Atendente ? ` Atendente original: ${row.Atendente}.` : ''}`,
      stageName:mapping[0],
    });
  }
  console.log(JSON.stringify({mode:apply?'import':'preview',rows:rows.length,ready:prepared.length,alreadyImported:skipped,unmatchedOwners:unassigned}));
  if (apply) {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(9182026)`;
      const stageIds = new Map();
      for (const stageName of new Set(prepared.map((row) => row.stageName))) {
        const row = prepared.find((item) => item.stageName === stageName);
        let stage = await tx.leadKanbanStage.findFirst({where:{name:stageName,deletedAt:null,active:true}});
        if (!stage) {
          const last = await tx.leadKanbanStage.aggregate({_max:{order:true}});
          stage = await tx.leadKanbanStage.create({data:{name:stageName,status:row.status,order:(last._max.order ?? 0)+10}});
        }
        stageIds.set(stageName,stage.id);
      }
      for(let offset=0;offset<prepared.length;offset+=100) {
        await tx.lead.createMany({data:prepared.slice(offset,offset+100).map(({stageName,...row})=>({...row,kanbanStageId:stageIds.get(stageName)}))});
      }
    }, {timeout:120000});
    const imported = await db.lead.count({where:{id:{in:rows.map((row)=>row.ID.trim())}}});
    console.log(JSON.stringify({verified:imported,expected:rows.length}));
    if (imported !== rows.length) throw Error('Contagem final divergente');
  }
} catch (error) {
  console.error(error instanceof Error && !error.message.includes('prisma') ? error.message : 'Falha na importação. Verifique conexão e dados.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
