"use client";
import {useEffect,useRef} from "react";
export function useReportRefresh(refresh:()=>Promise<unknown>){
  const latest=useRef(refresh);latest.current=refresh;
  useEffect(()=>{
    let busy=false;
    const run=async()=>{if(document.hidden||busy)return;busy=true;try{await latest.current();}finally{busy=false;}};
    const timer=setInterval(()=>void run(),30000);
    window.addEventListener("focus",run);
    return()=>{clearInterval(timer);window.removeEventListener("focus",run);};
  },[]);
}
