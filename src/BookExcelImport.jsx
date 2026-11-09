import { useEffect, useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet, X, LoaderCircle, CheckCircle2 } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import "./bookImport.css";

const KIND_LABEL={category:"Thể loại",author:"Tác giả",publisher:"Nhà xuất bản"};
const CATALOG_KEY={category:"categories",author:"authors",publisher:"publishers"};
export default function BookExcelImport({token,onClose,onComplete}) {
  const {t,money}=useLanguage();
  const [mode,setMode]=useState("books"),[file,setFile]=useState(null);
  const [batch,setBatch]=useState(null),[selections,setSelections]=useState({});
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [history,setHistory]=useState([]),[page,setPage]=useState(1),[errorsOnly,setErrorsOnly]=useState(false);
  const pending=useRef(false), fileInput=useRef(null);
  const preview=batch?.preview, completed=batch?.status==="completed";
  const changeLabels={price:"Giá bán",publication_year:"Năm xuất bản",cover_url:"URL ảnh bìa"};
  const formatChange=(field,value)=>value===null||value===undefined||value===""?"—":field==="price"?money(value):String(value);
  const refs=preview?.references||[];
  const needsReview=refs.filter(ref=>ref.status!=="matched"||ref.selected?.is_new||Object.hasOwn(selections,ref.key));
  const rows=(completed?batch.result.rows:preview?.rows||[]).filter(row=>!errorsOnly||row.errors?.length);
  const pages=Math.max(1,Math.ceil(rows.length/50));
  const visible=rows.slice((page-1)*50,page*50);
  const loadHistory=()=>api("/admin/book-imports",{token}).then(result=>setHistory(result.data));
  useEffect(()=>{let active=true;api("/admin/book-imports",{token}).then(result=>{if(active)setHistory(result.data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[token]);
  async function run(action){
    if(pending.current)return;
    pending.current=true;setBusy(true);setError("");
    try{await action();}catch(e){setError(e.message);}
    finally{pending.current=false;setBusy(false);}
  }
  function showBatch(data){
    setBatch(data);setSelections(data.selections||{});setDirty(false);setPage(1);setErrorsOnly(false);
  }
  async function upload(){
    await run(async()=>{
      if(!file)throw Error(t("Hãy chọn file Excel"));
      if(!/\.xlsx$/i.test(file.name))throw Error(t("Chỉ nhận file .xlsx"));
      if(file.size>5*1024*1024)throw Error(t("File tối đa 5 MB"));
      const form=new FormData();form.append("mode",mode);form.append("file",file);
      const result=await api("/admin/book-imports/preview",{method:"POST",token,body:form});
      showBatch(result.data);await loadHistory();
    });
  }
  async function download(path,name){
    await run(async()=>{
      const blob=await api(path,{token,responseType:"blob"});
      const url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  function choose(ref,value){
    const choice=value==="new"?{name:ref.input}:value?{id:Number(value)}:null;
    setSelections(current=>({...current,[ref.key]:choice}));setDirty(true);
  }
  async function review(){
    await run(async()=>{
      const result=await api("/admin/book-imports/"+batch.id+"/review",{
        method:"POST",token,body:JSON.stringify({selections}),
      });
      showBatch(result.data);
    });
  }
  async function commit(){
    await run(async()=>{
      try{
        const result=await api("/admin/book-imports/"+batch.id+"/commit",{
          method:"POST",token,body:JSON.stringify({preview_hash:preview.hash}),
        });
        showBatch(result.data);await loadHistory();await onComplete();
      }catch(e){setDirty(true);throw e;}
    });
  }
  return <div className="admin-page-panel">
    <section className="book-import admin-page-card">
      <header className="book-import-heading">
        <div><FileSpreadsheet size={25}/><div><h2>{t("Nhập sách bằng Excel")}</h2>
          <p>{t("Tải mẫu → Điền dữ liệu → Kiểm tra → Xác nhận nhập")}</p></div></div>
        <button type="button" className="icon" disabled={busy} onClick={onClose} aria-label={t("Đóng")}><X/></button>
      </header>
      <div className="book-import-controls">
        <label className="field">{t("Loại nhập")}
          <select value={mode} disabled={busy} onChange={event=>{setMode(event.target.value);setFile(null);setBatch(null);if(fileInput.current)fileInput.current.value="";setError("");}}>
            <option value="books">{t("Thêm đầu sách / cập nhật sách trùng")}</option>
            <option value="stock">{t("Cộng kho theo mã sách")}</option>
          </select>
        </label>
        <button className="secondary" type="button" disabled={busy} onClick={()=>download("/admin/book-imports/template?mode="+mode,mode==="stock"?"mau-nhap-kho.xlsx":"mau-them-sach.xlsx")}><Download size={16}/>{t("Tải file mẫu")}</button>
        <label className="field">{t("File Excel (.xlsx)")}
          <input ref={fileInput} type="file" accept=".xlsx" disabled={busy} onChange={event=>{setFile(event.target.files?.[0]||null);setBatch(null);setError("");}}/>
        </label>
        <button type="button" className="primary" disabled={busy||!file} onClick={upload}><Upload size={16}/>{t("Kiểm tra file")}</button>
      </div>
      <p className="book-import-help">{t("Tối đa 500 dòng, 5 MB. Số lượng là số cần cộng thêm. Nhiều tác giả/NXB ngăn cách bằng dấu ;. Không nhận công thức.")}</p>
      <p className="book-import-help">{t("Sách trùng tên, tác giả, NXB và thể loại sẽ được cộng kho và cập nhật giá, năm xuất bản, ảnh bìa nếu thay đổi. Năm/ảnh để trống giữ giá trị hiện có.")}</p>
      {busy&&<p className="book-import-busy" role="status"><LoaderCircle size={16} className="spin"/>{t("Đang xử lý, vui lòng chờ…")}</p>}
      {error&&<p className="error" role="alert">{t(error)}</p>}
      {preview&&<>
        <div className="book-import-batch"><b>{batch.file_name}</b><small>{t("Mã lần nhập")}: {batch.id}</small></div>
        {completed?<div className="book-import-success" role="status"><CheckCircle2 size={20}/><span>{t("Đã hoàn tất nhập Excel")}: {batch.result.created} {t("sách mới")}, {batch.result.stock_added} {t("sách cộng kho")}, {batch.result.quantity} {t("cuốn")}. {t("Cập nhật thông tin")}: {batch.result.updated||0}.
          {" "}{t("Gửi lại cùng file sẽ trả kết quả này, không cộng kho lần nữa.")}</span></div>:
          <div className="book-import-summary">
            <span><b>{preview.summary.total}</b>{t("Dòng dữ liệu")}</span>
            <span><b>{preview.summary.created}</b>{t("Sách mới")}</span>
            <span><b>{preview.summary.stock_added}</b>{t("Sách cộng kho")}<small>{t("Cập nhật thông tin")}: {preview.summary.updated||0}</small></span>
            <span className={preview.summary.errors?"has-errors":""}><b>{preview.summary.errors}</b>{t("Dòng cần xử lý")}</span>
          </div>}
        {!completed&&needsReview.length>0&&<section className="book-import-references">
          <h3>{t("Xử lý danh mục chưa khớp")}</h3>
          <p>{t("Chọn bản ghi có sẵn hoặc xác nhận tạo mới cho từng tên. Sau đó bấm Kiểm tra lại.")}</p>
          {needsReview.map(ref=>{
            const choice=Object.hasOwn(selections,ref.key)?selections[ref.key]:ref.selected;
            const selected=choice?.id?String(choice.id):choice?.name?"new":"";
            return <div className="book-import-reference" key={ref.key}>
              <div><small>{t(KIND_LABEL[ref.kind])}</small><b>{ref.input}</b></div>
              <label className="field"><span className="sr-only">{t("Cách xử lý")}: {ref.input}</span>
                <select disabled={busy} value={selected} onChange={event=>choose(ref,event.target.value)}>
                  <option value="">{t("Chọn cách xử lý")}</option>
                  <option value="new">{t("Tạo mới")}: {ref.input}</option>
                  {(preview.catalog[CATALOG_KEY[ref.kind]]||[]).map(item=><option key={item.id} value={String(item.id)}>{item.name} (#{item.id})</option>)}
                </select>
              </label>
              {selected==="new"&&<label className="field">{t("Tên sẽ tạo")}
                <input maxLength={255} disabled={busy} value={choice?.name||""} onChange={event=>{setSelections(current=>({...current,[ref.key]:{name:event.target.value}}));setDirty(true);}}/>
              </label>}
            </div>;
          })}
        </section>}
        <div className="book-import-table-heading">
          <h3>{completed?t("Kết quả nhập"):t("Xem trước dữ liệu")}</h3>
          {!completed&&<label><input type="checkbox" checked={errorsOnly} onChange={event=>{setErrorsOnly(event.target.checked);setPage(1);}}/>{t("Chỉ hiện dòng lỗi")}</label>}
        </div>
        <div className="tablewrap"><table>
          <thead><tr><th>{t("Dòng")}</th><th>{t("Sách")}</th><th>{t("Xử lý")}</th><th>{t("Số lượng nhập")}</th><th>{t("Tồn kho trước → sau")}</th><th>{t("Thay đổi thông tin")}</th><th>{t("Ghi chú / lỗi")}</th></tr></thead>
          <tbody>{visible.map(row=><tr key={row.line}>
            <td>{row.line}</td>
            <td><b>{row.title||"—"}</b>{row.book_id&&<small>BK-{String(row.book_id).padStart(4,"0")}</small>}
              {row.kept_price!==undefined&&!row.changes?.some(change=>change.field==="price")&&<small>{t("Giữ giá")}: {money(row.kept_price)}</small>}</td>
            <td>{row.errors?.length?t("Cần xử lý"):t(row.action==="created"?"Tạo sách":row.action==="stock_updated"?"Cộng kho & cập nhật":"Cộng kho")}</td>
            <td>+{row.quantity??"—"}</td>
            <td>{row.current_stock??row.stock_before??0} → {row.stock_after??"—"}</td>
            <td className="book-import-changes">{row.changes?.length?row.changes.map(change=><p key={change.field}><b>{t(changeLabels[change.field]||change.field)}</b><span>{formatChange(change.field,change.before)} → {formatChange(change.field,change.after)}</span></p>):"—"}</td>
            <td>{row.errors?.map((message,index)=><p className="error" key={index}>{message}</p>)}
              {row.hidden&&<p>{t("Sách đang ẩn; nhập kho không đổi trạng thái.")}</p>}
              {!row.errors?.length&&(row.note||row.data?.note||"—")}</td>
          </tr>)}
          {!visible.length&&<tr><td colSpan={7}>{t("Không có dòng phù hợp.")}</td></tr>}</tbody>
        </table></div>
        <div className="book-import-pagination">
          <span>{rows.length} {t("dòng")}</span>
          <button type="button" className="secondary" disabled={page<=1} onClick={()=>setPage(current=>current-1)}>←</button>
          <span>{page}/{pages}</span>
          <button type="button" className="secondary" disabled={page>=pages} onClick={()=>setPage(current=>current+1)}>→</button>
        </div>
        {!completed&&<footer className="book-import-actions">
          <button type="button" className="secondary" disabled={busy||!preview.summary.errors} onClick={()=>download("/admin/book-imports/"+batch.id+"/errors","loi-nhap-excel.xlsx")}><Download size={15}/>{t("Tải file báo lỗi")}</button>
          <button type="button" className="secondary" disabled={busy} onClick={review}>{t("Kiểm tra lại")}</button>
          <button type="button" className="primary" disabled={busy||dirty||preview.summary.errors>0} onClick={commit}>{t("Xác nhận nhập toàn bộ")}</button>
          {dirty&&<p>{t("Dữ liệu đã thay đổi. Bấm Kiểm tra lại trước khi xác nhận.")}</p>}
        </footer>}
      </>}
      <section className="book-import-history">
        <h3>{t("Các lần nhập gần đây")}</h3>
        {!history.length&&<p>{t("Chưa có lần nhập nào.")}</p>}
        {history.map(item=><button type="button" key={item.id} disabled={busy} onClick={()=>run(async()=>{showBatch((await api("/admin/book-imports/"+item.id,{token})).data);})}>
          <span>{item.file_name}<small>{item.created_at} · {t(item.mode==="stock"?"Cộng kho theo mã sách":"Thêm đầu sách / cập nhật sách trùng")}</small></span>
          <b>{t(item.status==="completed"?"Đã nhập":"Bản xem trước")}</b>
        </button>)}
      </section>
    </section>
  </div>;
}
