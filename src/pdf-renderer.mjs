import {getDocument,GlobalWorkerOptions} from '../vendor/pdfjs/pdf.min.mjs';
GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
export async function renderPDF(dataUrl,pageNumber=1){
 const text=atob(dataUrl.split(',')[1]),data=Uint8Array.from(text,c=>c.charCodeAt(0));
 if(!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-'))throw Error('This file is not a PDF.');
 const task=getDocument({data,isEvalSupported:false,useWasm:false,useSystemFonts:true,disableFontFace:true,enableXfa:false,stopAtErrors:true,maxImageSize:16_000_000,disableAutoFetch:true,disableStream:true,cMapUrl:null,standardFontDataUrl:null,wasmUrl:null});
 task.onPassword=()=>{task.destroy();};
 try{
  const doc=await task.promise;
  if(doc.numPages>1000)throw Error('Use a PDF with at most 1000 pages.');
  if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>doc.numPages)throw Error('Choose an existing PDF page.');
  const page=await doc.getPage(pageNumber),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(4,3000/Math.max(base.width,base.height))});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;
  return {dataUrl:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,page:pageNumber,pageCount:doc.numPages};
 }finally{await task.destroy();}
}
