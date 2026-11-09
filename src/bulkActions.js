export const MAX_BULK_ITEMS=100;
export function parseBulkNames(text) {
  const seen=new Set(),items=[],errors=[];
  String(text).split(/\r?\n/).forEach((line,index)=>{
    const name=line.normalize("NFC").trim();
    if(!name)return;
    if(name.length>255){errors.push({line:index+1,message:"Tên tối đa 255 ký tự"});return;}
    const key=name.toLocaleLowerCase("vi-VN");
    if(seen.has(key))return;
    seen.add(key);items.push({id:index+1,name,line:index+1});
  });
  if(items.length>MAX_BULK_ITEMS)errors.push({message:"Tối đa 100 mục mỗi lần"});
  return {items,errors};
}
// Sequential requests preserve each endpoint's existing transaction and business checks.
// There are no automatic retries for writes or calls to the shipping carrier.
export async function runBulkActions(items,run,{shouldStop=()=>false,onProgress=()=>{}}={}) {
  const unique=[...new Map(items.map(item=>[String(item.id),item])).values()];
  if(!unique.length||unique.length>MAX_BULK_ITEMS)throw Error("Chọn từ 1 đến 100 mục");
  const results=[];let stopped=false;
  for(const item of unique){
    if(stopped||shouldStop()){
      stopped=true;results.push({id:item.id,label:item.title||item.order_code||item.name||String(item.id),status:"not_run",message:"Chưa thực hiện"});
      continue;
    }
    try{
      const result=await run(item);
      results.push({id:item.id,label:item.title||item.order_code||item.name||String(item.id),
        status:result?.skipped?"skipped":"success",message:result?.message||"Thành công"});
    }catch(error){
      results.push({id:item.id,label:item.title||item.order_code||item.name||String(item.id),status:"failed",message:error.message||"Không xử lý được mục này"});
      if(error.status===401||error.status===403)stopped=true;
    }
    onProgress(results.length,unique.length);
  }
  return results;
}
