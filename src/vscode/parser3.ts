import {string, regexp, whitespace, spaces1, space, anyChar} from "parjs";
import {between, later, many, manySepBy, map, or, then, thenq} from "parjs/combinators";
import md5 from "md5"

let L:(s:string)=>any = (s:string)=>{};

export const setL = (_l:(s:string)=>any)=>{
	L = _l;
}
const l = console.log;




let snnl = regexp(/[ \t\f]+/);
let _snnl = regexp(/[ \t\f]*/);
let name = regexp(/[a-zA-Z_][a-zA-Z_0-9]*/).pipe(map((v, s)=>{
    s.c+= v[0].length;
    l(v[0], s);
    return v[0];
}));
let sname = regexp(/[a-z][a-z]*/).pipe(map(v=>v[0]));


let st = name
    .pipe(manySepBy(snnl))
    .pipe(map(st=>{
        let name = st.length>0?st[0]:""
        let type = st.length>1?st[1]:""
        return {
            name,
            type,
            constraints: st.filter((v, i) => i>1)
                        .map(v => {return {name: v, type: v}})
        }
    }))
    

let body = st.pipe(between(_snnl))
    .pipe(
        manySepBy(/\n+/),
        between("{", "}")
    ).pipe(
        // between(_snnl)
        between(whitespace())
    )
    .pipe(map(n => n.filter(v=>v.name))) // otherwise [] 

let block_header = sname.pipe(
    thenq(snnl),
    then(name)
)
.pipe(map(n=>{
    return {
        type: n[0],  // model
        name: n[1]   // Student
    }
}))


let block = block_header.pipe(
    // thenq(_snnl),
    then(body),
    between(whitespace())
)
.pipe(map(n=>{
    return {
        ...n[0],
        fields: n[1]
    }
}))


interface Constraint {
    name: string,
    type: string
}
interface Field {
    name: string,
    type: string,
    constraints: Constraint[]
}
interface Ast {
    name: string,
    type: string,
    fields: Field[]
}
export interface Model {
    hash: string,
    text: string,
    start: number,
    end: number,
    ast: Ast,
    changed: boolean
}

export interface ModelSource{
    uriName: string,
    models: Model[]
}

let sources: {[uriName:string]: ModelSource} = {}





export const parse = (text: string, uri: string) => {
    let _arr = uri.split("/");
    let uriName = _arr[_arr.length-1];
    let source = sources[uriName];
    if(!source){
        source = {
            uriName: uriName,
            models: []
        }
        sources[uriName] = source; // save
    };
    
    let prevHashes = source.models.map(m=>m.hash);
    let currHashes: string[] = [];

    let pattern = /(model\s+[^\{]+\{[^\}]*\})/g;
    let m;
    while (m = pattern.exec(text)){
        let s = m[0];
        let hash = md5(s);
        currHashes.push(hash);
        
        // l("p", prevHashes)
        // l("c", currHashes)

        if(!prevHashes.includes(hash)){
            let ast = block.parse(s, {c:0});
          
            if(ast.isOk && ast.value){
                source.models.push({
                    hash: hash,
                    text:s,
                    start: m.index, 
                    end: m.index + s.length,
                    ast: ast.value,
                    changed: true,
                });
            }
            else{
                l("PARSING ERROR", ast.toString());
            }
        }
    }

    // l(source.models.map(m=>{return{c: m.changed, n: m.ast.name}})); // @2see which models have changed

    source.models = source.models.filter(m=>currHashes.includes(m.hash));

	return source;
}