import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url), ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({ operation = 'publish', failSubmit = false } = {}) {
  const states=[],effects=[],memos=[],refs=[],queue=[],requests=[],done=[];
  let stateIndex=0,effectIndex=0,memoIndex=0,refIndex=0;
  const same=(a,b)=>a && b && a.length===b.length && a.every((value,index)=>value===b[index]);
  const hooks={
    useRef(initial) {const i=refIndex++;return refs[i] ||= {current:initial};},
    useState(initial) {const i=stateIndex++; if (!(i in states)) states[i]=typeof initial==='function'?initial():initial; return [states[i], next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},
    useMemo(fn,deps) {const i=memoIndex++; if(!same(memos[i]?.deps,deps)) memos[i]={deps,value:fn()}; return memos[i].value;},
    useEffect(fn,deps) {const i=effectIndex++; if(!same(effects[i]?.deps,deps)) {effects[i]?.cleanup?.();effects[i]={deps};queue.push(()=>{effects[i].cleanup=fn();});}}
  };
  const modules=new Map();
  function load(relative) {
    if(modules.has(relative)) return modules.get(relative).exports;
    const module={exports:{}};modules.set(relative,module);
    runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/${relative}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{
      module,exports:module.exports,URLSearchParams,
      require(specifier) {
        if(specifier==='react') return hooks;
        if(specifier.startsWith('@/') && specifier.endsWith('.json')) return JSON.parse(readFileSync(new URL(`../src/${specifier.slice(2)}`,import.meta.url),'utf8'));
        if(specifier.startsWith('@/')) {const path=specifier.slice(2);return load(`${path}${existsSync(new URL(`../src/${path}.ts`,import.meta.url))?'.ts':'.tsx'}`);}
        return require(specifier);
      }
    });return module.exports;
  }
  const check={ snapshot:'confirmed-snapshot',wallpaper_ids:['new-static'],device_status:'unpublished',groups:[{category:'phone',media_type:'static',wallpaper_ids:['new-static'],primary_ids:[],published_primary_ids:[],requires_primary:operation==='publish'}],issues:operation==='publish'?[{code:'primary_required',message:'Choose primary'}]:[],other_media_visibility:{static:0,dynamic:2},requires_visibility_acknowledgement:operation==='publish' };
  const props={device:{id:'device',device_name:'Device'},media:'static',initialIds:operation==='publish'?['new-static']:undefined,operation,
    async request(path,method='GET',body) {requests.push({path,method,body});if(path.startsWith('wallpapers?')) return {data:[{id:'new-static',name:'New static',media_type:'static',category:'phone',status:'draft',deletion_state:'none'},{id:'old-draft',name:'Old draft',media_type:'static',category:'phone',status:'draft',deletion_state:'none'}],total:2};if(path.startsWith('device-check?'))return {data:check};if(failSubmit)throw new Error('snapshot changed');return {data:{}};},
    onClose(){},onDone(ids){done.push(...ids);}
  };
  const render=()=>{stateIndex=effectIndex=memoIndex=refIndex=0;return load('app/manager/AdminCollectionActionPanel.tsx').default(props);};
  const flush=async()=>{queue.splice(0).forEach(fn=>fn());await tick();};
  return {render,flush,requests,done};
}
function nodes(node){if(Array.isArray(node))return node.flatMap(nodes);if(!node || typeof node!=='object')return [];return [node,...nodes(node.props?.children)];}
function label(node){if(Array.isArray(node))return node.map(label).join('');if(typeof node==='number')return String(node);return typeof node==='string'?node:label(node?.props?.children||[]);}
function button(tree,text){return nodes(tree).find(node=>node.type==='button' && label(node)===text);}
test('scoped publication requires chosen primary and explicit visibility acknowledgement, excluding old drafts',async()=>{
  const app=fixture();app.render();await app.flush();let tree=app.render();
  assert.doesNotMatch(label(tree),/Old draft/);
  assert.equal(button(tree,'发布选中素材').props.disabled,true);
  nodes(tree).find(node=>node.type==='select').props.onChange({target:{value:'new-static'}});
  tree=app.render();assert.equal(button(tree,'发布选中素材').props.disabled,true);
  const ack=nodes(tree).find(node=>node.type==='label' && label(node).includes('我已确认'));
  nodes(ack).find(node=>node.type==='input').props.onChange({target:{checked:true}});
  tree=app.render();assert.equal(button(tree,'发布选中素材').props.disabled,false);
  button(tree,'发布选中素材').props.onClick();await tick();
  const sent=app.requests.find(request=>request.path==='collections/publish').body;
  assert.deepEqual(Array.from(sent.wallpaper_ids),['new-static']);assert.deepEqual(Array.from(sent.primary_ids),['new-static']);
  assert.equal(sent.snapshot,'confirmed-snapshot');assert.equal(sent.make_device_visible,true);assert.equal(sent.acknowledge_other_media_visibility,true);
  assert.deepEqual(app.done,['new-static']);
});
test('unpublish checks the current media and sends only its checked snapshot',async()=>{
  const app=fixture({operation:'unpublish'});app.render();await app.flush();const tree=app.render();
  const query=new URLSearchParams(app.requests.find(request=>request.path.startsWith('device-check?')).path.split('?')[1]);
  assert.equal(query.get('media'),'static');assert.equal(query.get('operation'),'unpublish');
  button(tree,'下架此合集').props.onClick();await tick();
  const sent=app.requests.find(request=>request.path==='collections/unpublish').body;
  assert.equal(sent.media_type,'static');assert.equal(sent.snapshot,'confirmed-snapshot');assert.equal(sent.wallpaper_ids,undefined);
});
test('a stale snapshot disables submission until a fresh check is requested',async()=>{
  const app=fixture({operation:'unpublish',failSubmit:true});app.render();await app.flush();let tree=app.render();
  button(tree,'下架此合集').props.onClick();await tick();tree=app.render();
  assert.match(label(tree),/snapshot changed/);assert.equal(button(tree,'下架此合集').props.disabled,true);assert.equal(app.done.length,0);
  button(tree,'更新检查').props.onClick();app.render();await app.flush();tree=app.render();assert.equal(button(tree,'下架此合集').props.disabled,false);
});
test('rapid repeated confirmation submits the checked action and onDone only once',async()=>{
  const app=fixture({operation:'unpublish'});app.render();await app.flush();const tree=app.render();
  const confirm=button(tree,'下架此合集');confirm.props.onClick();confirm.props.onClick();await tick();
  assert.equal(app.requests.filter(request=>request.path==='collections/unpublish').length,1);
  assert.deepEqual(app.done,['new-static']);
});
