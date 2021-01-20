
import {Tree, TreeCursor} from "lezer"
import {parser} from "../lezer/block.js"
import * as TERM from "../lezer/block.terms.js"
import md5 from "md5"
import { bool } from "aws-sdk/clients/signer";

const l = console.log;

interface aststring {
    value: string,
    from: number,
    to: number,
    hash?: string,
    error?: string,
    warn?: string
    suggestion?: string
}

interface Constraint {
    name: aststring,
    type: aststring,
    hasError?: boolean
}
interface Field {
    name: aststring,
    type: aststring,
    constraints: Constraint[],
    hasError?: boolean
}

export interface Model {
    name: aststring,
    type: aststring,
    hash: string,
    text: string,
    from: number,
    to: number,
    fields: Field[],
    changed: boolean,
    hasValidAst?: boolean,
    hasError?: boolean,
    tree:Tree,
}

interface Code{
    name: aststring,
    hash: string,
    text: string,
    from: number,
    to: number,
    changed: boolean,
    hasError?: boolean
}


interface Repl{
    name: aststring,
    hash: string,
    text: string,
    from: number,
    to: number,
    changed: boolean,
    hasError?: boolean
}


export interface ModelSource {
    fileName: string,
    models: Model[],
    code: Code[]
    repl: Repl[]
}

let sources: {[uriName:string]: ModelSource} = {}

export const getSource = (fileName: string) => sources[fileName];
export const getModel = (name: string) => {
    for(let s of Object.values(sources)){
        let m = s.models.find(m=>m.name.value === name);
        if(m) return m;
    }
    return null;
}

export const parse = (text: string, path: string) => {


    let fileName = "";
    if(path.startsWith("file")){
        let _arr = path.split("/");
        fileName = _arr[_arr.length-1];
    }
    else{
        fileName = path.replace(/\//g, ".");
    }
    
    
    let source = sources[fileName];
    if(!source){
        source = {
            fileName: fileName,
            models: [],
            code: [],
            repl: []
        }
        sources[fileName] = source; // save
    };
    
    let prevHashes = source.models.map(m=>m.hash);
    let currHashes: string[] = [];

    let pattern = /(model\s+[^\{]+\{[^\}]*\})/g;
    let m: RegExpExecArray | null;
    while (m = pattern.exec(text)){
        let s = m[0];
        let hash = md5(s);
        currHashes.push(hash);
        
        // l("p", prevHashes)
        // l("c", currHashes)

        if(!prevHashes.includes(hash)){
            let t:Tree = parser.parse(s);


            let defaultobj = {value: "", from: 0, to: 0};
            let model:Model = {
                name: defaultobj,
                type: defaultobj,
                hash: hash,
                text:s,
                from: m.index, 
                to: m.index + s.length,
                fields: [],
                changed: true,
                tree: t
            }

            let field: Field = {
                name: defaultobj,
                type: defaultobj,
                constraints: []
            }


            let c = t.cursor();
            do {
                // console.log(`Node ${c.name} from ${c.from} to ${c.to}`);
                let n = c.node;

                if(n.type.id === TERM.BlockType){
                    model.type = {
                        value: s.substring(c.from, c.to).trim(),
                        from: c.from,
                        to: c.to
                    }
                }
                else if(n.type.id === TERM.BlockName){
                    model.name = {
                        value: s.substring(c.from, c.to).trim(),
                        from: c.from,
                        to: c.to
                    }
                }
                else if(n.type.id === TERM.Field){
                    // push because it's a container
                    model.fields.push({
                        name: defaultobj,
                        type: defaultobj,
                        constraints: []
                    });
                }
                else if(n.type.id === TERM.FieldName){
                    let f = model.fields;
                    if(f.length){
                        f[f.length-1].name = {
                            value: s.substring(c.from, c.to).trim(),
                            from: c.from,
                            to: c.to
                        }
                    }
                }
                else if(n.type.id === TERM.FieldType){
                    let fs = model.fields;
                    if(fs.length){
                        let last_f = fs[fs.length-1];
                        last_f.type = {
                            value: s.substring(c.from, c.to).trim(),
                            from: c.from,
                            to: c.to
                        }
                    }
                }
                else if(n.type.id === TERM.Constraint){
                    let fs = model.fields;
                    if(fs.length){
                        let last_f = fs[fs.length-1];
                        let cs = last_f.constraints;
                        cs.push({
                            name: {
                                value: s.substring(c.from, c.to).trim(),
                                from: c.from,
                                to: c.to
                            },
                            type: {
                                value: s.substring(c.from, c.to).trim(),
                                from: c.from,
                                to: c.to
                            }
                        });
                        
                    }
                }
                

            } while (c.next())


            source.models.push(model);

        }
        else{
            // model hasn't change
            // but it's offset in the file might have changed
            source.models.find((model)=>{
                if(model.hash === hash){
                    model.from = m?.index||0;
                    model.to = (m?.index||0) + s.length
                    return true;
                }
                return false;
            });
            
        }

    }

    // l(source.models.map(m=>{return{c: m.changed, n: m.ast.name}})); // @2see which models have changed

    // l(source.models[0].ast.fields);
    source.models = source.models.filter(m=>currHashes.includes(m.hash));


    // code
    prevHashes = source.code.map(c=>c.hash);
    currHashes = [];
    pattern = /[\n^]ts\s+([a-z]+)\s*\{/g;
    while (m = pattern.exec(text)){
        let s = "";
        let c = '{';
        let curlies = [c];
        let bi = m.index + m[0].length;
        for(let i = bi; i < text.length; i++){
            c = text[i];
            if(c === '{'){
                curlies.push(c);
            }
            else if(c === '}'){
                curlies.pop();
                if(curlies.length === 0){
                    s = text.substring(bi, i);
                    break;
                }
            }
        }
        let hash = md5(s);
        currHashes.push(hash);
        let name: aststring = {
            from: m.index,
            to: m.index + m[1].length,
            value: m[1]
        }
        
        if(!prevHashes.includes(hash)){
            source.code.push({
                name: name,
                from: bi,
                to: bi + s.length,
                text: s,
                hash: hash,
                changed: true
            })
        }
        else{
            // code hasn't change
            // but it's offset in the file might have changed
            source.code.find((code)=>{
                if(code.hash === hash){
                    code.from = bi;
                    code.to = bi + s.length
                    return true;
                }
                return false;
            });   
        }
    }
    source.code = source.code.filter(c=>currHashes.includes(c.hash));



    // repl
    prevHashes = source.repl.map(r=>r.hash);
    currHashes = [];
    pattern = /[\n^]repl\s+([a-z]+)\s*\{/g;
    while (m = pattern.exec(text)){
        let s = "";
        let c = '{';
        let curlies = [c];
        let bi = m.index + m[0].length;
        for(let i = bi; i < text.length; i++){
            c = text[i];
            if(c === '{'){
                curlies.push(c);
            }
            else if(c === '}'){
                curlies.pop();
                if(curlies.length === 0){
                    s = text.substring(bi, i);
                    break;
                }
            }
        }
        let hash = md5(s);
        currHashes.push(hash);
        let name: aststring = {
            from: m.index,
            to: m.index + m[1].length,
            value: m[1]
        }
        
        if(!prevHashes.includes(hash)){
            source.repl.push({
                name: name,
                from: bi,
                to: bi + s.length,
                text: s,
                hash: hash,
                changed: true
            })
        }
        else{
            // repl hasn't change
            // but it's offset in the file might have changed
            source.repl.find((r)=>{
                if(r.hash === hash){
                    r.from = bi;
                    r.to = bi + s.length
                    return true;
                }
                return false;
            });   
        }
    }
    source.repl = source.repl.filter(r=>currHashes.includes(r.hash));



	return source;
}