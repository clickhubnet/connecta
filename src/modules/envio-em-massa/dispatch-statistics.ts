import { prisma } from "@/lib/prisma";
export type DispatchStatistics={total:number;accepted:number;failed:number;uncertain:number;legacyAccepted:number};
export async function getDispatchStatistics(from:Date|undefined,to:Date|undefined,user?:{id:string;role:string}):Promise<DispatchStatistics>{
  const dates={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
  const batches=await prisma.appSetting.findMany({where:{key:{startsWith:"private:dispatch-result:"},createdAt:dates},select:{value:true}});
  // Count historical accepted sends separately; their failures were browser-only.
  const messages=await prisma.chatMessage.findMany({where:{createdAt:dates,direction:"outbound",rawPayload:{path:["kind"],equals:"mass-dispatch"},conversation:{deletedAt:null,...(user?.role==="EMPLOYEE"?{ownerUserId:user.id}:{})}},select:{rawPayload:true}});
  const historical=messages.filter(row=>!(row.rawPayload as {batchId?:string}|null)?.batchId).length;
  const result:DispatchStatistics={total:historical,accepted:historical,failed:0,uncertain:0,legacyAccepted:historical};
  for(const row of batches){
    const batch=row.value as {userId?:string;total:number;accepted:number;failed:number;uncertain:number};
    if(user?.role==="EMPLOYEE"&&batch.userId!==user.id)continue;
    for(const key of ["total","accepted","failed","uncertain"] as const)result[key]+=Number(batch[key])||0;
  }
  return result;
}
