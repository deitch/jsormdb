
var JSORM={version:1.1};Array.prototype.isArray=true;Array.prototype.pushAll=function(a){a=[].concat(a);Array.prototype.push.apply(this,a);};Array.prototype.insert=function(i,elm){Array.prototype.splice.apply(this,[].concat(i,0,elm));};Array.prototype.clear=function(){Array.prototype.splice.apply(this,[0]);};Array.prototype.replace=function(elm){this.clear();this.pushAll(elm);};Array.prototype.hasher=function(){var i,len,h={};for(i=0,len=this.length;i<len;i++){h[this[i]]=i;}
return(h);};Array.prototype.indexOf=function(elm){var i,len,found=false;for(i=0,len=this.length;i<len;i++){if(this[i]===elm){found=true;break;}}
return(found?i:-1);};Array.prototype.remove=function(elm){var i=this.indexOf(elm);if(i>=0){this.splice(i,1);}};JSORM.clear=function(o){var i;for(i in o){if(o.hasOwnProperty(i)&&typeof(i)!=="function"){delete o[i];}}};JSORM.apply=function(target,source,fields){source=source&&typeof(source)==="object"?source:{};fields=fields&&typeof(fields)==="object"?fields:source;target=target||{};for(var prp in fields){if(source.hasOwnProperty(prp)){target[prp]=source[prp];}}
return(target);};JSORM.common=function(a,b,keys){var i,c={};if(a&&typeof(a)==="object"&&b&&typeof(b)==="object"){for(i in a){if(typeof(a[i])!=="function"&&typeof(b[i])===typeof(a[i])&&(keys||a[i]===b[i])){c[i]=a[i];}}}
return(c);};JSORM.first=function(){var ret=null,i,len;for(i=0,len=arguments.length;i<len;i++){if(arguments[i]!==undefined){ret=arguments[i];break;}}
return(ret);};JSORM.compare=function(a,b){var ident=false,i,len,compare=JSORM.compare;if(a===b){return(true);}
else if(a.isArray&&b.isArray){len=a.length;if(len!=b.length){return(false);}
for(i=0;i<len;i++){if(!compare(a[i],b[i])){return(false);}}
return(true);}else if(typeof(a)=="object"&&typeof(b)=="object"){for(i in a){if(!compare(a[i],b[i])){return(false);}}
for(i in b){if(!compare(a[i],b[i])){return(false);}}
return(true);}else{return(false);}}
JSORM.clone=function(){var c=function(obj,deep){var newObj,prp,rec,type;if(typeof(obj)==="object"&&obj!==null){newObj=new obj.constructor();for(prp in obj){if(obj.hasOwnProperty(prp)&&(type=typeof(rec=obj[prp]))!=="function"){if(type==="object"&&deep){newObj[prp]=c(rec);}else{newObj[prp]=rec;}}}}else{newObj=obj;}
return(newObj);}
return(c);}();JSORM.iclone=function(obj,deep){var newObj,child,o,prp,rec,type,stack=[],newP=[],children;stack.push({o:obj,p:null});newP.push(new obj.constructor());while(stack.length>0){obj=stack[stack.length-1];if(!obj.hasOwnProperty("c")){children=[];o=obj.o;for(prp in o){if(o.hasOwnProperty(prp)&&(type=typeof(rec=o[prp]))!=="function"){if(type==="object"&&deep){children.push({o:rec,p:prp});}else{newP[newP.length-1][prp]=rec;}}}
obj.c=children;}
if(obj.c.length>0){child=obj.c.shift();stack.push(child);newP.push(new child.o.constructor());}else{stack.pop();newObj=newP.pop();if(stack.length>0){newP[newP.length-1][obj.p]=newObj;}}}
return(newObj);};JSORM.zeropad=function(n,l){var ret=n+'';var d=l-ret.length;if(d>0){for(var i=0;i<d;i++){ret='0'+ret;}}
return(ret);};JSORM.fork=function(){var fork,window=this,t;if(window&&window.setTimeout&&typeof(window.setTimeout)==="function"){fork=function(f){window.setTimeout(f,1);};}else if(java&&java.lang&&java.lang.Thread&&typeof(java.lang.Thread)==="function"){fork=function(f){t=new java.lang.Thread(new java.lang.Runnable({run:function(){f();}})).start();};}else{fork=null;}
return(fork?function(conf){var f=conf.fn,scope=conf.scope,arg=[].concat(conf.arg);fork(function(){f.apply(scope,arg);});}:fork);}();JSORM.ajax=function(arg){var url=arg.url,callback=arg.callback,scope=arg.scope,options=arg.options,xmlHttp;var method=arg.method||"GET",params=arg.params,pstr=null,i;try{xmlHttp=new window.XMLHttpRequest();}catch(e0){try{xmlHttp=new window.ActiveXObject("Msxml2.XMLHTTP");}catch(e1){try{xmlHttp=new window.ActiveXObject("Microsoft.XMLHTTP");}catch(e2){JSORM.fork({fn:callback,scope:scope,arg:[url,xmlHttp,false,options,"Your environment does not support AJAX!"]});}}}
var h=xmlHttp;xmlHttp.onreadystatechange=function(){var success;if(h.readyState==4){success=h.status==200||(document.location.protocol=='file:');callback.apply(scope,[url,h,success,options]);}};try{xmlHttp.open(method,url,true);if(params){if(typeof(params)==="string"){pstr=params;}else if(typeof(params)==="object"){pstr=[];for(i in params){if(params.hasOwnProperty(i)){pstr.push(i+"="+arg.params[i]);}}
pstr=pstr.join("&");}else{pstr=null;}}
xmlHttp.send(pstr);}catch(e3){options=options||{};options.e=e3;JSORM.fork({fn:callback,scope:scope,arg:[url,xmlHttp,false,options]});}};JSORM.extend=function(parent,constr,stat){var ret,proto;if(!parent){parent={};}else if(typeof parent=='object'){proto=parent;}else{proto=parent.prototype;}
ret=function(){var F=function(){};F.prototype=proto;var that=new F();that.superclass=proto;that.myclass=ret;if(constr!==null&&typeof(constr)=='function'){constr.apply(that,arguments);}
return(that);};if(stat){JSORM.apply(ret,stat);}
return ret;};JSORM.eventualize=function(that){var registry={};that.fire=function(event,params){var array,func,handler,i,len,pass=true,ret,p;var type=typeof(event)=='string'?event:event.type;if(registry.hasOwnProperty(type)){array=registry[type];for(i=0,len=array.length;i<len;i++){handler=array[i];func=handler.method;p=JSORM.apply({},handler.parameters);JSORM.apply(p,params);p.launcher=this;ret=func.apply(handler.scope,[p]);if(ret===false){pass=false;}}}
return(pass);};that.on=function(type,method,parameters,scope){var handler={method:method,parameters:parameters,scope:scope};if(registry.hasOwnProperty(type)&&method&&typeof(method)==="function"){registry[type].push(handler);}
return(this);};that.off=function(type,method,parameters){var array,i;if(registry.hasOwnProperty(type)){array=registry[type];for(i=0;i<array.length;i++){if(array[i].method===method&&array[i].parameters===parameters){registry.splice(i,1);break;}}}
return(this);};that.events=function(){for(var i=0;i<arguments.length;i++){registry[arguments[i]]=[];}};that.nonevents=function(){for(var i=0;i<arguments.length;i++){delete registry[arguments[i]];}};return(that);};JSORM=JSORM||{};JSORM.db={index:{},parser:{},channel:{}};JSORM.db.channel.http=JSORM.extend({},function(config){config=config||{};var ajax=JSORM.ajax,fork=JSORM.fork,that=this;var loadUrl=config.loadUrl||config.url,updateUrl=config.updateUrl||config.url;JSORM.eventualize(this);this.events('beforeupdate','update','updateexception','beforeload','load','loadexception');var processResponse=function(eSuccess,eFailure,filename,xhr,success,o){var e,a,s,ct,ct2,res;if(success){e=eSuccess;a=o.options;s=true;ct=xhr.getResponseHeader("Content-type");ct2=xhr.getResponseHeader("Content-Type");res=ct==="text/xml"||ct2==="text/xml"?xhr.responseXML:xhr.responseText;}else{e=eFailure;a=xhr;s=false;}
that.fire(e,o);o.callback.call(o.scope,{options:o.arg,success:s,response:res});};var updateResponse=function(filename,xhr,success,o){processResponse("update","updateexception",filename,xhr,success,o);};var loadResponse=function(filename,xhr,success,o){processResponse("load","loadexception",filename,xhr,success,o);};var message=function(beforeevent,arg,callback,method,url){var params=arg.params,cb=arg.callback,scope=arg.scope,options=arg.options;if(that.fire("beforeevent",params)!==false){var o={params:params||{},options:{callback:cb,scope:scope,arg:options},callback:callback,method:method,scope:this,url:url};ajax(o);}else{fork({fn:cb,scope:scope||that,arg:[{options:options,success:false}]});}};JSORM.apply(this,{update:function(arg){message("beforeupdate",arg,updateResponse,"POST",updateUrl);},load:function(arg){message("beforeload",arg,loadResponse,"GET",loadUrl);}});});JSORM.db.parser.json=JSORM.extend({},function(config){config=config||{};var id=config.id,root=config.root,lastMeta={},lastRoot={};JSORM.apply(this,{read:function(json){var data=null,p;p=JSON.parse(json);if(p&&typeof(p)==="object"){data={};if(p.isArray){data.records=p;data.id=id;}else{root=p.meta&&p.meta.root?p.meta.root:root;data.records=p[root];data.id=p.meta&&p.meta.id?p.meta.id:id;lastMeta=p.meta;lastRoot=root;}}
return(data);},write:function(records){var obj={};obj[lastRoot]=records;if(lastMeta){obj.meta=lastMeta;}
var j=JSON.stringify(obj);if(!j){throw{message:"JsonParser.write: unable to encode records into Json"};}
return(j);}});});JSORM.db.parser.object=JSORM.extend({},function(){var clone=JSORM.clone;JSORM.apply(this,{read:function(data){data=[].concat(clone(data,true));return{records:data};},write:function(records){return(clone(records,true));}});});JSORM.db.db=JSORM.extend({},function(config){config=config||{};var clone=JSORM.clone,common=JSORM.common,apply=JSORM.apply,fork=JSORM.fork,first=JSORM.first;var journal=[],channel=config.channel||null,idField,myclass=this.myclass;var updateMode=config.updateMode||myclass.updates.nothing,writeMode=config.writeMode||myclass.modes.nothing;var store=JSORM.db.engine.hash(JSORM.db.index.hash());var defaultWriteMode=myclass.modes.nothing,defaultUpdateMode=myclass.updates.nothing;var parser=config.parser||JSORM.db.parser.json();var updateParams=config.updateParams||{},loadParams=config.loadParams||{};JSORM.eventualize(this);this.events('load','loadexception','add','datachanged','clear','update','beforewrite','write','writeexception','commit','commitexception');var findInternal=function(args){var ret=null,i,len,query,idx,data;idx=store.query(args.where);if(idx){if(args.index){ret=idx;}
else{ret=[];for(i=0,len=idx.length;i<len;i++){data=store.get(idx[i]);ret.push(apply({},clone(data),args.fields));}}}
return(ret);};var clearInternal=function(log){if(log){journal.push({type:myclass.types.clear,data:store.get()});}
store.clear();};var loadData=function(data){var r=data.records;clearInternal(false);idField=data.id||"id";store.addIndex(idField);store.insert(r);journal.clear();};var loadCallback=function(args){var options=args.options||{},r=[],parsed,processed=false;var e,sfcb,cb=args.callback,scope=args.scope||this;if(args.success&&(parsed=parser.read(args.response))){loadData(parsed);r=parsed.records;processed=true;sfcb=options.success;e="load";}else{sfcb=options.failure;e="loadexception";}
this.fire(e,{records:r,options:options});if(sfcb&&typeof(sfcb)==="function"){sfcb.call(scope,r,options,processed);}
if(cb&&typeof(cb)==="function"){cb.call(scope,r,options,processed);}};var removeAt=function(index){var i,len,removed=[],entry;index=[].concat(index);for(i=0,len=index.length;i<len;i++){entry=store.remove(index[i]);removed.push(entry);}
return(removed);};var write=function(mode){var data,tmp,i,len,j,lenj,recs={},entry,den,curId,condensed,orig;if(mode===myclass.modes.replace){data=store.get();}else{data=[];condensed=mode===myclass.modes.condensed;for(i=0,len=journal.length;i<len;i++){entry=journal[i];if(entry!==null){switch(entry.type){case myclass.types.change:orig=entry.data.original;for(j=0,lenj=orig.length;j<lenj;j++){curId=orig[j].id;if(condensed&&recs[curId]){apply(recs[curId].data,entry.data.changed);}else{den={type:entry.type,data:clone(entry.data.changed)};den.data[idField]=curId;recs[curId]=den;data.push(den);}}
break;case myclass.types.add:tmp=store.get(entry.data);for(j=0,lenj=tmp.length;j<lenj;j++){den={type:entry.type,data:tmp[j]};recs[tmp[j][idField]]=den;data.push(den);}
break;case myclass.types.clear:data.push({type:entry.type});break;case myclass.types.remove:tmp=[];den={};for(j=0,lenj=entry.data.length;j<lenj;j++){curId=entry.data[j][idField];tmp.push(curId);if(condensed&&recs[curId]){recs[curId].data.remove(curId);if(recs[curId].type===myclass.types.change){recs[curId]=den;}}else{recs[curId]=den;}}
den.type=entry.type;den.data=tmp;data.push(den);break;default:break;}}}}
return(data);};var writeCallback=function(args){var i,len,response=args.response,o=args.options||{},update;var r=[],e,sfcb,cb=o.callback,scope=o.scope||this,options=o.options;var newRec,where,index;if(args.success){if(this.fire('write',{options:o,data:response})!==false){update=first(o.update,updateMode,defaultUpdateMode);switch(update){case myclass.updates.nothing:break;case myclass.updates.replace:r=parser.read(response);loadData(r);break;case myclass.updates.update:r=parser.read(response);where={field:idField,compare:'equals'};for(i=0,len=r.records.length;i<len;i++){newRec=r.records[i];where.value=newRec[idField];index=findInternal({where:where,index:true});if(index&&index.length>0){store.update(index,newRec);}else{store.insert(newRec);}}
break;}
journal.clear();sfcb=o.success;e="commit";}else{sfcb=o.failure;e="commitexception";}}else{sfcb=o.failure;e="writeexception";}
this.fire(e,{options:o,data:response});if(sfcb&&typeof(sfcb)==="function"){sfcb.call(scope,this,options,response);}
if(cb&&typeof(cb)==="function"){cb.call(scope,this,options,response);}};apply(this,{insert:function(data){var index;if(data){if(typeof(data)==="string"){data=parser.read(data);if(data&&typeof(data)==="object"){data=data.records;}}
index=store.insert(data);journal.push({type:myclass.types.add,data:index});this.fire("add",{records:data});}},find:function(params){params=params||{};var data=findInternal({where:params.where,fields:params.fields,from:params.from,index:false});return(data);},update:function(params){var index,oldData,det=[],i,len,args=params||{},id,idconf;index=findInternal({where:args.where,index:true,from:args.from});oldData=store.update(index,args.data);idconf={};idconf[idField]=true;id=store.get(index,idconf);for(i=0,len=index.length;i<len;i++){det.push({index:index[i],data:oldData[i],id:id[i][idField]});}
journal.push({type:myclass.types.change,data:{changed:args.data,original:det}});this.fire("update",{records:store.get(index)});},load:function(args){args=args||{};var params,tp={callback:args.callback,success:args.success,failure:args.failure,scope:args.scope,options:args.options};if(args.data){tp.success=true;tp.response=args.data;fork({fn:loadCallback,arg:[tp],scope:this});}else if(channel){params=apply({},loadParams);apply(params,args.params);channel.load({params:params,scope:this,callback:loadCallback,options:tp});}else{tp.success=false;fork({fn:loadCallback,arg:[tp],scope:this});}
return(this);},remove:function(params){var args=params||{};var index=findInternal({where:args.where,from:args.from,index:true});var removed=removeAt(index);journal.push({type:myclass.types.remove,data:removed});this.fire("remove",{records:removed});},clear:function(){clearInternal();this.fire("clear");},getModifiedCount:function(){return(journal.length);},isDirty:function(){return(journal.length>0);},commit:function(options){options=options||{};var params,records,mode;mode=first(options.mode,writeMode,defaultWriteMode);if(!channel||(mode===myclass.modes.nothing)){journal.clear();this.fire("commit",{options:options});}else{if(this.fire("beforewrite",{options:options})!==false){records=write(mode);params=apply({},updateParams);apply(params,options.params);apply(params,{data:parser.write(records),mode:mode});channel.update({params:params,callback:writeCallback,scope:this,options:options});}}},reject:function(count){var start=0,index,data,type,i,j,len,lenj,orig;if(!count||count>journal.length){count=journal.length;start=0;}else{start=journal.length-count;}
var m=journal.splice(start,count).reverse();for(i=0,len=m.length;i<len;i++){index=m[i].index;data=m[i].data;type=m[i].type;switch(type){case myclass.types.change:orig=data.original;for(j=0,lenj=orig.length;j<lenj;j++){store.update(orig[j].index,orig[j].data);}
break;case myclass.types.add:removeAt(data);break;case myclass.types.remove:store.insert(data);break;case myclass.types.clear:store.insert(data);break;default:}}}});store.addIndex(config.index);if(config.data){this.load({data:config.data});}},{modes:{nothing:0,replace:1,update:2,condensed:3},updates:{nothing:0,update:1,replace:2},types:{change:0,add:1,remove:2,clear:3,load:4},joins:{or:0,and:1}});JSORM.db.engine=function(){var apply=JSORM.apply;var compares={equals:function(name,val){return(function(entry){return(entry[name]===val);});},"in":function(name,val){var h,ret;if(val.isArray){h=val.hasher();ret=function(entry){return(h.hasOwnProperty(entry[name]));};}
else{ret=null;}
return(ret);},gt:function(name,val){return(typeof(val)==="number"?function(entry){return(entry[name]>val);}:null);},ge:function(name,val){return(typeof(val)==="number"?function(entry){return(entry[name]>=val);}:null);},lt:function(name,val){return(typeof(val)==="number"?function(entry){return(entry[name]<val);}:null);},le:function(name,val){return(typeof(val)==="number"?function(entry){return(entry[name]<=val);}:null);},starts:function(name,val){return(typeof(val)==="string"?function(entry){return(entry[name].indexOf(val)===0);}:null);},ends:function(name,val){return(typeof(val)==="string"?function(entry){var a=entry[name];return(a.length-a.indexOf(val)-val.length===0);}:null);},contains:function(name,val){return(typeof(val)==="string"?function(entry){return(entry[name].indexOf(val)>=0);}:null);},isnull:function(name,val){return(function(entry){return(entry[name]===null);});},notnull:function(name,val){return(function(entry){return(entry[name]!==null);});}};var constructQuery=function(where){var valid=false,q,q2,subquery,len,i,list;if(where.hasOwnProperty('field')){if(where.field&&typeof(where.field)==="string"&&where.hasOwnProperty('compare')&&compares.hasOwnProperty(where.compare)&&where.hasOwnProperty("value")&&(subquery=compares[where.compare](where.field,where.value))){q=subquery;valid=true;}}else if(where.hasOwnProperty('join')){if((where.join==="and"||where.join==="or")&&where.hasOwnProperty("terms")&&where.terms.isArray&&where.terms.length>0){list=[];for(i=0,len=where.terms.length;i<len;i++){if((q2=constructQuery(where.terms[i]))){list.push(q2);}
else{return(null);}}
q=function(subs,isand){return(function(record){var i,len,match;for(i=0,len=subs.length;i<len;i++){match=subs[i](record);if(isand!==match){break;}}
return(match);});}(list,where.join==="and");valid=true;}}else{q=null;}
return(valid?q:function(){return(null);});};return{constructQuery:function(where){return(where&&typeof(where)==="object"?constructQuery(where):function(){return(true);});}};}();JSORM.db.engine.array=JSORM.extend(JSORM.db.engine,function(){this.type="array";var data=[];var apply=JSORM.apply;apply(this,{length:function(){return(data.length);},insert:function(records){var i,len,locs=[],index=data.length;data.insert(index,records);for(i=0,len=records.length;i<len;i++){locs.push(index+i);}},remove:function(index){var entry=data.splice(index,1);return(entry);},clear:function(){data.clear();},get:function(idx,fields){var ret,i,len;if(idx===null||typeof(idx)==="undefined"){ret=data;}else if(idx&&idx.isArray){ret=[];for(i=0,len=idx.length;i<len;i++){ret.push(apply({},data[idx[i]],fields));}}else{ret=apply({},data[idx],fields);}
return(ret);},update:function(idx,newData){var r,i,len,oldData=[],changes;for(i=0,len=idx.length;i<len;i++){r=data[idx[i]];if(r){changes={};apply(changes,r,newData);apply(r,newData);oldData[i]=changes;}}
return(oldData);},addIndex:function(fields){},removeIndex:function(fields){},query:function(where,limit){var i,len,match=[],idx,fn;fn=this.constructQuery(where);if(limit){for(i=0,len=limit.length;i<len;i++){idx=limit[i];if(fn(data[idx])){match.push(idx);}}}else{for(i=0,len=data.length;i<len;i++){if(fn(data[i])){match.push(i);}}}}});});JSORM.db.engine.hash=JSORM.extend(JSORM.db.engine,function(index){this.type="hash";var data={},length=0,max=0,unused=[];var apply=JSORM.apply;index=index||JSORM.db.index.hash();apply(this,{length:function(){return(length);},insert:function(records){var i,len,idx,locs=[];for(i=0,len=records.length;i<len;i++){if(typeof(idx=unused.shift())==="undefined"){idx=max++;}
data[idx]=records[i];locs.push(idx);length++;}
index.add(locs,records);return(locs);},remove:function(idx){var entry=data[idx];delete data[idx];index.remove(idx,entry);length--;if(idx+1===max){max--;}else{unused.push(idx);}
return(entry);},clear:function(){JSORM.clear(data);index.clear();unused.clear();length=0;max=0;},get:function(idx,fields){var ret,i,len;if(idx===null||typeof(idx)==="undefined"){ret=[];for(i in data){if(i&&typeof(i)!=="function"&&typeof(data[i])==="object"){ret.push(data[i]);}};}else if(idx&&idx.isArray){ret=[];for(i=0,len=idx.length;i<len;i++){ret.push(apply({},data[idx[i]],fields));}}else{ret=apply({},data[idx],fields);}
return(ret);},update:function(idx,newdata){var r,i,len,oldData=[],changes;idx=[].concat(idx);for(i=0,len=idx.length;i<len;i++){r=data[idx[i]];if(r){changes={};apply(changes,r,newdata);apply(r,newdata);oldData[i]=changes;index.update(changes,newdata,idx[i]);}}
return(oldData);},addIndex:function(fields){index.fields(fields);},removeIndex:function(fields){index.unfields(fields);},query:function(where,limit){var i,len,subm,match=[],idx,fn;if((subm=index.find(where))!==null){match=subm;}else{fn=this.constructQuery(where);if(limit){for(i=0,len=limit.length;i<len;i++){idx=limit[i];if(fn(data[idx])){match.push(idx);}}}else{for(i in data){if(i&&typeof(data[i])==="object"&&fn(data[i])){match.push(i);}}}}
return(match);}});});JSORM.db.index.hash=JSORM.extend({},function(f){this.type="hash";var fields=0,data={};JSORM.apply(this,{fields:function(f){var i,len;if(f){f=[].concat(f);for(i=0,len=f.length;i<len;i++){if(typeof(f[i])==="string"&&!data.hasOwnProperty(f[i])){data[f[i]]={};fields++;}}}},unfields:function(f){var i,len;if(f){f=[].concat(f);for(i=0,len=f.length;i<len;i++){if(typeof(f[i])==="string"&&data.hasOwnProperty(f[i])){delete data[f[i]];fields--;}}}},add:function(index,records){var i,j,len,ci,dj,rij;if(fields>0){records=[].concat(records);index=[].concat(index);for(i=0,len=records.length;i<len;i++){ci=index[i];for(j in data){if(data.hasOwnProperty(j)&&records[i].hasOwnProperty(j)){dj=data[j];rij=records[i][j];dj[rij]=dj[rij]||[];dj[rij].push(ci);}}}}},remove:function(index,record){var j;for(j in data){if(data.hasOwnProperty(j)&&record.hasOwnProperty(j)){data[j][record[j]].remove(index);}}},clear:function(){var i;for(i in data){if(data.hasOwnProperty(i)){JSORM.clear(data[i]);}}},find:function(query){var ret=null,field;if(query&&query.field&&query.compare&&(field=data[query.field])&&query.compare==="equals"){ret=field[query.value];}
return(ret);},update:function(old,newdata,index){var i,field;for(i in newdata){if(newdata.hasOwnProperty(i)&&data.hasOwnProperty(i)&&(field=data[i])&&old[i]!=newdata[i]){field[old[i]].remove(index);field[newdata[i]].push(index);}}}});this.fields(f);});if(!this.JSON){JSON={};}
(function(){function f(n){return n<10?'0'+n:n;}
if(typeof Date.prototype.toJSON!=='function'){Date.prototype.toJSON=function(key){return this.getUTCFullYear()+'-'+
f(this.getUTCMonth()+1)+'-'+
f(this.getUTCDate())+'T'+
f(this.getUTCHours())+':'+
f(this.getUTCMinutes())+':'+
f(this.getUTCSeconds())+'Z';};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf();};}
var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==='string'?c:'\\u'+('0000'+a.charCodeAt(0).toString(16)).slice(-4);})+'"':'"'+string+'"';}
function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==='object'&&typeof value.toJSON==='function'){value=value.toJSON(key);}
if(typeof rep==='function'){value=rep.call(holder,key,value);}
switch(typeof value){case'string':return quote(value);case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==='[object Array]'){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||'null';}
v=partial.length===0?'[]':gap?'[\n'+gap+
partial.join(',\n'+gap)+'\n'+
mind+']':'['+partial.join(',')+']';gap=mind;return v;}
if(rep&&typeof rep==='object'){length=rep.length;for(i=0;i<length;i+=1){k=rep[i];if(typeof k==='string'){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}else{for(k in value){if(Object.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}
v=partial.length===0?'{}':gap?'{\n'+gap+partial.join(',\n'+gap)+'\n'+
mind+'}':'{'+partial.join(',')+'}';gap=mind;return v;}}
if(typeof JSON.stringify!=='function'){JSON.stringify=function(value,replacer,space){var i;gap='';indent='';if(typeof space==='number'){for(i=0;i<space;i+=1){indent+=' ';}}else if(typeof space==='string'){indent=space;}
rep=replacer;if(replacer&&typeof replacer!=='function'&&(typeof replacer!=='object'||typeof replacer.length!=='number')){throw new Error('JSON.stringify');}
return str('',{'':value});};}
if(typeof JSON.parse!=='function'){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==='object'){for(k in value){if(Object.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v;}else{delete value[k];}}}}
return reviver.call(holder,key,value);}
cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return'\\u'+
('0000'+a.charCodeAt(0).toString(16)).slice(-4);});}
if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof reviver==='function'?walk({'':j},''):j;}
throw new SyntaxError('JSON.parse');};}})();