import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const directory=mkdtempSync(join(tmpdir(),"moc-theme-check-"));
const profile=join(directory,"profile");
const executable=process.env.BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser=spawn(executable,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{windowsHide:true,stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
  const portFile=join(profile,"DevToolsActivePort");
  for(let i=0;i<120&&!existsSync(portFile);i++)await sleep(100);
  assert.ok(existsSync(portFile),"Browser debugger did not start");
  const port=readFileSync(portFile,"utf8").split("\n")[0];
  const targets=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();
  socket=new WebSocket(targets.find(target=>target.type==="page").webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;
  const callbacks=new Map(),errors=[];
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++sequence;callbacks.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
  });
  const book={id:1,title:"Khoa học và cuộc sống",price:89000,stock_quantity:15,weight_grams:300,is_active:1,category_id:1,category_name:"Science",author_names:["Minh An"],author_ids:[1],publisher_names:["NXB Trẻ"],publisher_ids:[1],authors:"Minh An",publisher:"NXB Trẻ",cover_url:null};
  socket.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id){const callback=callbacks.get(message.id);if(callback){callbacks.delete(message.id);message.error?callback.reject(Error(message.error.message)):callback.resolve(message.result);}}
    if(message.method==="Runtime.exceptionThrown")errors.push(message.params.exceptionDetails.text);
    if(message.method==="Fetch.requestPaused"){
      const {requestId,request}=message.params;
      let data={data:[]},status=200;
      if(request.url.includes("/auth/me"))data={data:{id:1,role:"admin",full_name:"Quản trị viên thử",is_active:1}};
      else if(request.url.includes("/dashboard")){status=503;data={message:"Preview fixture"};}
      else if(/\/categories(?:\?|$)/.test(request.url))data={data:[{id:1,name:"Science"},{id:2,name:"History"}]};
      else if(/\/books(?:\?|$)/.test(request.url))data={data:[book],meta:{page:1,limit:20,total:1}};
      void call("Fetch.fulfillRequest",{requestId,responseCode:status,responseHeaders:[{name:"Content-Type",value:"application/json"},{name:"Access-Control-Allow-Origin",value:"*"},{name:"Access-Control-Allow-Headers",value:"Authorization, Content-Type"},{name:"Access-Control-Allow-Methods",value:"GET, POST, PATCH, DELETE, OPTIONS"}],body:Buffer.from(JSON.stringify(data)).toString("base64")}).catch(()=>{});
    }
  };
  await call("Runtime.enable");
  await call("Page.enable");
  // Intercept every application API call: no real login, shipment or database mutation is performed.
  await call("Fetch.enable",{patterns:[{urlPattern:"*/api/*",requestStage:"Request"}]});
  const evaluate=async expression=>{
    const response=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(response.exceptionDetails)throw Error(response.exceptionDetails.text);
    return response.result.value;
  };
  const until=async expression=>{
    for(let i=0;i<120;i++){if(await evaluate(expression))return;await sleep(100);}
    throw Error("Timed out: "+expression);
  };
  const capture=async name=>{
    await sleep(250);
    const {data}=await call("Page.captureScreenshot",{format:"png"});
    const path=join(directory,name+".png");writeFileSync(path,Buffer.from(data,"base64"));return path;
  };
  await call("Emulation.setDeviceMetricsOverride",{width:1365,height:900,deviceScaleFactor:1,mobile:false});
  await call("Page.navigate",{url:"http://127.0.0.1:5175/"});
  await until('Boolean(document.querySelector(".preferences-dock"))');
  await evaluate('localStorage.clear();localStorage.setItem("book-theme","dark");localStorage.setItem("book-language","vi");location.reload()');
  await until('document.documentElement.dataset.theme==="dark"&&Boolean(document.querySelector(".preferences-dock"))');
  const storefront=await capture("storefront-dark");
  assert.equal(await evaluate('getComputedStyle(document.body).backgroundColor'),"rgb(23, 20, 30)");
  await evaluate('document.querySelector(".language-switch button[lang=en]").click()');
  await until('document.documentElement.lang==="en"');
  assert.equal(await evaluate('localStorage.getItem("book-language")'),"en");
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('document.documentElement.dataset.theme==="light"');
  assert.equal(await evaluate('localStorage.getItem("book-theme")'),"light");
  await evaluate('document.querySelector(".theme-toggle").click();document.querySelector(".language-switch button[lang=vi]").click()');
  await until('document.documentElement.dataset.theme==="dark"');
  await evaluate('[...document.querySelectorAll("button")].find(button=>button.textContent.trim()==="Đăng nhập")?.click()');
  await until('Boolean(document.querySelector(".login"))');
  const auth=await capture("auth-dark");
  await evaluate('localStorage.setItem("book-admin-token","preview-only-token");location.reload()');
  await until('Boolean(document.querySelector(".sidebar"))');
  await evaluate('[...document.querySelectorAll(".sidebar nav button")].find(button=>button.textContent.includes("Sản phẩm")).click()');
  await until('Boolean(document.querySelector(".tablewrap tbody .book"))');
  const products=await capture("products-dark");
  await evaluate('[...document.querySelectorAll(".sidebar nav button")].find(button=>button.textContent.includes("Thể loại")).click()');
  await until('Boolean(document.querySelector(".category-row"))');
  const categories=await capture("categories-dark");
  const alignment=await evaluate('(()=>{const row=document.querySelector(".category-row");return {checkbox:row.children[0].getBoundingClientRect().left,name:row.children[1].getBoundingClientRect().left};})()');
  assert.ok(alignment.name-alignment.checkbox<50,"Category names must stay next to checkboxes");
  await call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const mobile=await capture("categories-mobile-dark");
  const bounds=await evaluate('(()=>{const r=document.querySelector(".preferences-dock").getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};})()');
  assert.ok(bounds.left>=0&&bounds.right<=bounds.width&&bounds.bottom<=bounds.height);
  assert.equal(await evaluate('document.querySelectorAll(".preferences-dock").length'),1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,screenshots:{storefront,auth,products,categories,mobile},alignment,bounds}));
  void call("Browser.close").catch(()=>{});
  await sleep(300);
}finally{try{socket?.close();}catch{}browser.kill();}
