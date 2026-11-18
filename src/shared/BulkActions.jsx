import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import { MAX_BULK_ITEMS, parseBulkNames, runBulkActions } from "./bulkActions.js";
import "./bulkActions.css";

export function useBulkSelection(rows,scope="") {
  const [state,setState]=useState({scope,ids:[]});
  const ids=new Set(state.scope===scope?state.ids.map(String):[]);
  const items=rows;
  const pageItems=items.slice(0,MAX_BULK_ITEMS);
  const selectedRows=items.filter(row=>ids.has(String(row.id))).slice(0,MAX_BULK_ITEMS);
  const has=id=>selectedRows.some(row=>String(row.id)===String(id));
  const keep=values=>setState({scope,ids:values.map(String).slice(0,MAX_BULK_ITEMS)});
  return {items,selectedRows,has,keep,canSelect:id=>has(id)||selectedRows.length<MAX_BULK_ITEMS,
    all:pageItems.length>0&&pageItems.every(row=>ids.has(String(row.id))),
    some:selectedRows.length>0&&!pageItems.every(row=>ids.has(String(row.id))),
    toggle:id=>keep(has(id)?selectedRows.filter(row=>String(row.id)!==String(id)).map(row=>row.id):[...selectedRows.map(row=>row.id),id]),
    toggleAll:()=>keep(pageItems.length&&pageItems.every(row=>ids.has(String(row.id)))?[]:pageItems.map(row=>row.id)),
    clear:()=>keep([]),
  };
}
export function BulkCheckbox({checked,indeterminate=false,...props}) {
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.indeterminate=indeterminate;},[indeterminate]);
  return <input ref={ref} type="checkbox" className="bulk-checkbox" checked={checked} {...props}/>;
}
export function BulkPanel({selection,actions,disabled=false,onBusyChange,onComplete,scope="",showSelectAll=true,minSelected=2}) {
  const {t}=useLanguage();
  const [actionId,setActionId]=useState(""),[argument,setArgument]=useState("");
  const [running,setRunning]=useState(false),[total,setTotal]=useState(0);
  const [results,setResults]=useState([]),[progress,setProgress]=useState(0),[error,setError]=useState("");
  const pending=useRef(false),mounted=useRef(true),scopeRef=useRef(scope);
  const action=actions.find(item=>item.id===actionId);
  const inputId=useId();
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;onBusyChange?.(false);};},[]);
  useEffect(()=>{
    if(scopeRef.current!==scope){setResults([]);setError("");setActionId("");setArgument("");scopeRef.current=scope;}
  },[scope]);
  async function apply(){
    if(pending.current||disabled||!action||selection.selectedRows.length<minSelected||(action.input&&!argument))return;
    const snapshot={action,argument,rows:[...selection.selectedRows]};
    const startedScope=scopeRef.current;
    pending.current=true;setRunning(true);setTotal(snapshot.rows.length);
    onBusyChange?.(true);setResults([]);setProgress(0);setError("");
    try{
      const completed=await runBulkActions(snapshot.rows,async row=>{
        const reason=snapshot.action.check?.(row,snapshot.argument);
        if(reason)return {skipped:true,message:reason};
        return snapshot.action.run(row,snapshot.argument);
      },{shouldStop:()=>!mounted.current||scopeRef.current!==startedScope,onProgress:count=>{if(mounted.current)setProgress(count);}});
      if(mounted.current){
        setResults(completed);selection.keep(completed.filter(row=>row.status!=="success").map(row=>row.id));
        setActionId("");setArgument("");await onComplete?.(completed);
      }
    }catch(error){if(mounted.current)setError(error.message);}
    finally{pending.current=false;if(mounted.current){setRunning(false);onBusyChange?.(false);}}
  }
  const busy=disabled||running;
  const showActions=selection.selectedRows.length>=minSelected||running;
  const issues=results.filter(row=>row.status!=="success");
  return <>
    {showSelectAll&&selection.items.length>0&&<label className="bulk-select-all bulk-selection-only">
      <BulkCheckbox checked={selection.all} indeterminate={selection.some} disabled={busy} onChange={selection.toggleAll}/>{t("Chọn trang hiện tại")}
    </label>}
    {showActions&&<section className="bulk-panel" aria-label={t("Thao tác hàng loạt")}>
      <div className="bulk-tools">
        <b>{t("Đã chọn {count}",{count:selection.selectedRows.length})}</b>
        <select aria-label={t("Thao tác hàng loạt")} disabled={busy} value={actionId}
          onChange={event=>{setActionId(event.target.value);setArgument("");}}>
          <option value="">{t("Chọn thao tác")}</option>
          {actions.map(item=><option value={item.id} key={item.id}>{t(item.label)}</option>)}
        </select>
        {action?.input&&<label htmlFor={inputId} className="bulk-argument">{t(action.input.label)}
          <select id={inputId} disabled={busy} value={argument} onChange={event=>setArgument(event.target.value)}>
            <option value="">{t("Vui lòng chọn")}</option>
            {action.input.options.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>}
        <button type="button" className={action?.danger?"secondary danger":"primary"}
          disabled={busy||!action||(action.input&&!argument)} onClick={apply}>{t("Xác nhận")}</button>
        {running&&<span className="bulk-progress" role="status"><LoaderCircle size={15} className="spin"/>{progress}/{total}</span>}
      </div>
    </section>}
    {error&&<p className="error" role="alert">{t(error)}</p>}
    {results.length>0&&<div className="bulk-feedback" aria-live="polite">
      <span>{t("Kết quả")}: {results.filter(row=>row.status==="success").length} {t("thành công")}, {results.filter(row=>row.status==="failed").length} {t("lỗi")}, {results.filter(row=>["skipped","not_run"].includes(row.status)).length} {t("bỏ qua / chưa chạy")}</span>
      {issues.length>0&&<details className="bulk-results"><summary>{t("Xem chi tiết kết quả")}</summary>
        <ul>{issues.map(row=><li key={row.id} className={"bulk-result-"+row.status}><span>{row.label}</span><small>{t(row.message)}</small></li>)}</ul>
      </details>}
    </div>}
  </>;
}

export function BulkCreateNames({kind,token,onComplete,onCancel,onBusyChange}) {
  const {t}=useLanguage();
  const [text,setText]=useState(""),[items,setItems]=useState([]),[errors,setErrors]=useState([]),[busy,setBusy]=useState(false);
  const selection=useBulkSelection(items,text);
  function preview(){
    const result=parseBulkNames(text);setErrors(result.errors);
    if(result.errors.length)return;
    setItems(result.items);selection.keep(result.items.map(row=>row.id));
  }
  const paths={category:"/admin/categories",author:"/admin/authors",publisher:"/admin/publishers"};
  const actions=[{id:"create",label:"Thêm các tên đã chọn",run:async row=>{
    if(kind==="category"){
      const response=await api("/admin/categories/resolve",{method:"POST",token,body:JSON.stringify({names:[row.name]})});
      if(response.data[0].status==="matched")return {skipped:true,message:"Tên này đã có trong danh mục"};
      if(response.data[0].status==="ambiguous")throw Error("Tên này khớp nhiều thể loại. Hãy kiểm tra danh mục.");
    }
    await api(paths[kind],{method:"POST",token,body:JSON.stringify({name:row.name})});
  }}];
  return <section className="bulk-create">
    <header><h3>{t("Thêm nhiều tên")}</h3><button type="button" className="secondary" disabled={busy} onClick={onCancel}>{t("Đóng")}</button></header>
    <label>{t("Mỗi dòng một tên, tối đa 100 tên. Tên trùng trong danh sách chỉ xử lý một lần.")}
      <textarea rows={6} maxLength={26000} disabled={busy} value={text} onChange={event=>{setText(event.target.value);setItems([]);setErrors([]);}}/>
    </label>
    <button type="button" className="secondary" disabled={busy||!text.trim()} onClick={preview}>{t("Kiểm tra danh sách")}</button>
    {errors.map((error,index)=><p key={index} className="error">{error.line?error.line+": ":""}{t(error.message)}</p>)}
    {items.length>0&&<><div className="bulk-name-preview">{items.map(row=><label key={row.id}><BulkCheckbox disabled={busy} checked={selection.has(row.id)} onChange={()=>selection.toggle(row.id)}/>{row.name}</label>)}</div>
      <BulkPanel selection={selection} actions={actions} minSelected={1} onBusyChange={value=>{setBusy(value);onBusyChange?.(value);}} scope={text} onComplete={onComplete}/></>}
  </section>;
}
