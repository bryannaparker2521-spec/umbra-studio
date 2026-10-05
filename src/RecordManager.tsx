import { useState } from 'react';
export type ManagedItem = {id:string;type:string;title:string;archived?:boolean};
export function SelectionToolbar({count,total,onAll,onClear,children}:{count:number;total:number;onAll:()=>void;onClear:()=>void;children:React.ReactNode}){
  return <div className="selection-toolbar"><strong>{count} selected / {total}</strong><button type="button" onClick={onAll} disabled={!total}>Select All</button><button type="button" onClick={onClear} disabled={!count}>Clear Selection</button>{children}</div>;
}
export default function RecordManager({items,canDelete,onOpen,onAction,archive=true,expanded=false}:{items:ManagedItem[];canDelete:boolean;onOpen?:(item:ManagedItem)=>void;onAction:(action:'archive'|'restore'|'delete',items:ManagedItem[])=>Promise<void>;archive?:boolean;expanded?:boolean}){
  const [selected,setSelected]=useState<Set<string>>(new Set()),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const key=(item:ManagedItem)=>`${item.type}:${item.id}`;
  const chosen=items.filter(item=>selected.has(key(item)));
  async function act(action:'archive'|'restore'|'delete',target=chosen){
    if(!target.length||busy)return;
    setBusy(true);setError('');
    try{await onAction(action,target);setSelected(new Set());}catch(f){setError(f instanceof Error?f.message:'Action failed.');}finally{setBusy(false);}
  }
  return <details className="record-manager" open={expanded||undefined}><summary>Manage Records · select, {archive?'archive, restore, ':''}delete</summary>
    <SelectionToolbar count={chosen.length} total={items.length} onAll={()=>setSelected(new Set(items.map(key)))} onClear={()=>setSelected(new Set())}>
      {archive&&<><button disabled={!chosen.length||busy} onClick={()=>void act(chosen.every(x=>x.archived)?'restore':'archive')}>{chosen.length&&chosen.every(x=>x.archived)?'Restore Selected':'Archive Selected'}</button></>}
      {canDelete&&<button className="danger-action" disabled={!chosen.length||busy} onClick={()=>void act('delete')}>Delete Selected</button>}
    </SelectionToolbar>{error&&<p role="alert">{error}</p>}
    {items.map(item=><div className="managed-record-row" key={key(item)}><label><input type="checkbox" checked={selected.has(key(item))} onChange={()=>setSelected(current=>{const next=new Set(current);next.has(key(item))?next.delete(key(item)):next.add(key(item));return next;})}/>{item.title}<small>{item.type.replace(/_/g,' ')}{item.archived?' · Archived':''}</small></label>{onOpen&&<button disabled={busy} onClick={()=>onOpen(item)}>Open</button>}{archive&&<button disabled={busy} onClick={()=>void act(item.archived?'restore':'archive',[item])}>{item.archived?'Restore':'Archive'}</button>}{canDelete&&<button disabled={busy} className="danger-action" onClick={()=>void act('delete',[item])}>Delete</button>}</div>)}
    {!items.length&&<p>No records in this view.</p>}
  </details>;
}
