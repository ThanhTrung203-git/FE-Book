import test from "node:test";
import assert from "node:assert/strict";
import { parseBulkNames, runBulkActions } from "../src/bulkActions.js";

test("catalog name lists preserve Unicode, remove duplicates and validate size/length",()=>{
  const parsed=parseBulkNames(" Nguyễn Nhật Ánh \r\nNXB Trẻ\nnguyễn nhật ánh\n\n");
  assert.deepEqual(parsed.items.map(item=>item.name),["Nguyễn Nhật Ánh","NXB Trẻ"]);
  assert.equal(parsed.errors.length,0);
  assert.ok(parseBulkNames("x".repeat(256)).errors.length);
  assert.ok(parseBulkNames(Array.from({length:101},(_,i)=>"Name "+i).join("\n")).errors.length);
});
test("writes execute once each in order and collect failures without retrying successful items",async()=>{
  const calls=[],progress=[];
  const results=await runBulkActions([{id:1,name:"A"},{id:2,name:"B"},{id:1,name:"A"},{id:3,name:"C"}],async row=>{
    calls.push(row.id);
    if(row.id===2)throw Object.assign(new Error("In use"),{status:409});
    if(row.id===3)return {skipped:true,message:"Already active"};
  },{onProgress:count=>progress.push(count)});
  assert.deepEqual(calls,[1,2,3]);
  assert.deepEqual(progress,[1,2,3]);
  assert.deepEqual(results.map(row=>row.status),["success","failed","skipped"]);
  assert.equal(results[1].message,"In use");
});
test("auth failures stop later requests, while an unrelated validation error only affects its item",async()=>{
  let calls=0;
  const rows=[{id:1},{id:2},{id:3}];
  const results=await runBulkActions(rows,async()=>{
    calls++;throw Object.assign(new Error("Session expired"),{status:401});
  });
  assert.equal(calls,1);
  assert.deepEqual(results.map(row=>row.status),["failed","not_run","not_run"]);
});
test("leaving the page stops unstarted work and does not retry the in-flight item",async()=>{
  let stopped=false,calls=0;
  const results=await runBulkActions([{id:1},{id:2}],async()=>{calls++;stopped=true;},{shouldStop:()=>stopped});
  assert.equal(calls,1);assert.equal(results[1].status,"not_run");
});
test("invalid batch sizes fail before executing a request",async()=>{
  let calls=0;
  for(const rows of [[],Array.from({length:101},(_,id)=>({id}))])
    await assert.rejects(()=>runBulkActions(rows,async()=>{calls++;}));
  assert.equal(calls,0);
});
