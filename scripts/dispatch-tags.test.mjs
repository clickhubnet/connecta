import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const records=new Map();
let allowed=true, user={id:"employee-a",role:"EMPLOYEE"}, notifications=0, links=0;
const tx={
  chatConversation:{findFirst:async()=>allowed?{id:"c"}:null},
  appSetting:{
    findUnique:async({where})=>records.get(where.key),
    upsert:async({where,create,update})=>{records.set(where.key,records.has(where.key)?{...records.get(where.key),...update}:create);},
    delete:async({where})=>records.delete(where.key),
    findMany:async()=>[...records.values()],
  },
  $executeRaw:async()=>{links++;return 1;},
};
const mocks={
  "@/lib/prisma":{prisma:{...tx,$transaction:async fn=>fn(tx)}},
  "@/lib/auth-context":{requireCurrentUser:async()=>user},
  "@/lib/api-errors":{authErrorResponse:()=>null},
  "@/modules/envio-em-massa/conversation-access":{dispatchConversationScope:()=>({})},
  "@/server/realtime/conversation-events":{publishConversationEvent:async()=>{notifications++;}},
};
const ctx=vm.createContext({exports:{},URL,Request,require:name=>mocks[name]??require(name)});
vm.runInContext(ts.transpileModule(readFileSync("src/app/api/envio-em-massa/etiquetas/route.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const id="00000000-0000-4000-8000-000000000001";
const conversationId="00000000-0000-4000-8000-000000000002";
async function post(action,extra={}){return ctx.exports.POST(new Request("http://local",{method:"POST",body:JSON.stringify({id,conversationId,action,label:"Interessado",color:"#dc2626",...extra})}));}
assert.equal((await post("save")).status,200);
assert.equal(records.size,1);
assert.equal((await post("save",{label:"Venda",color:"#00aa00"})).status,200);
assert.equal([...records.values()][0].value.label,"Venda");
assert.equal((await post("link")).status,200);
assert.equal((await post("unlink")).status,200);
assert.equal(records.size,1,"Unlink keeps catalog");
user={id:"employee-b",role:"EMPLOYEE"};
assert.equal((await post("save")).status,403);
assert.equal((await post("delete")).status,403);
allowed=false;
assert.equal((await post("link")).status,404);
assert.equal(links,2,"Unauthorized conversation cannot be changed");
allowed=true;user={id:"admin",role:"ADMIN"};
assert.equal((await post("delete")).status,200);
assert.equal(records.size,0);
assert.equal((await post("link")).status,404);
assert.equal((await post("save",{color:"url(evil)"})).status,400);
assert.equal(notifications,5);
console.log("PASS tags create/edit/color, link/unlink, delete, ownership, conversation access and realtime notifications");
