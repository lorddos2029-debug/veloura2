(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VelouraPhone=api;if(typeof document!=='undefined')api.attach(document)})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function digits(value){let s=String(value||'').replace(/\D/g,'');if((s.length===14||s.length===15)&&s.startsWith('0055'))s=s.slice(4);else if((s.length===12||s.length===13)&&s.startsWith('55'))s=s.slice(2);return s}
 function format(value){const s=digits(value);if(!s)return '';if(s.length>11)return s;if(s.length<=2)return '('+s;const local=s.slice(2),split=local.length>8?5:4;return '('+s.slice(0,2)+') '+local.slice(0,split)+(local.length>split?'-'+local.slice(split):'')}
 function valid(value){return /^[1-9]{2}\d{8,9}$/.test(digits(value))}
 function attach(doc){const field=doc.querySelector('input[name="phone"]');if(!field)return;field.maxLength=25;field.removeAttribute('minlength');field.setAttribute('inputmode','tel');
  function update(){const raw=field.value,position=field.selectionStart,atEnd=position===null||position===raw.length;const total=raw.replace(/\D/g,'').length,normalized=digits(raw);const removed=total-normalized.length;const before=Math.max(0,raw.slice(0,position||0).replace(/\D/g,'').length-removed);field.value=format(raw);field.setCustomValidity(!field.value||valid(field.value)?'':'Informe o telefone com DDD, por exemplo (11) 99999-9999.');if(!atEnd&&typeof field.setSelectionRange==='function'){let count=0,next=0;while(next<field.value.length&&count<before){if(/\d/.test(field.value[next]))count++;next++}field.setSelectionRange(next,next)}}
  for(const event of ['input','change','blur'])field.addEventListener(event,update);field.form?.addEventListener('submit',event=>{update();if(!field.checkValidity()){event.preventDefault();event.stopImmediatePropagation();field.reportValidity()}},true);update()
 }
 return {digits,format,valid,attach};
});
