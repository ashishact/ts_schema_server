
import {Tree, TreeCursor} from "lezer"
import {parser} from "../lezer/block.js"
import * as TERM from "../lezer/block.terms.js"
import md5 from "md5"

const l = console.log;

interface aststring{
    value: string,
    from: number,
    to: number,
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
interface Ast {
    name: aststring,
    type: aststring,
    fields: Field[],
    hasError?: boolean
    isValid?: boolean
}
export interface Model {
    hash: string,
    text: string,
    from: number,
    to: number,
    ast: Ast,
    changed: boolean,
    hasError?: boolean
}

export interface ModelSource {
    fileName: string,
    models: Model[],
}

let sources: {[uriName:string]: ModelSource} = {}

export const parse = (text: string, path: string) => {


    let fileName = "";
    if(path.startsWith("file")){
        let _arr = path.split("/");
        fileName = _arr[_arr.length-1];
    }
    else{
        fileName = path.replace("/", ".");
    }
    
    
    let source = sources[fileName];
    if(!source){
        source = {
            fileName: fileName,
            models: []
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
            let ast: Ast = {
                name: defaultobj,
                fields: [],
                type: defaultobj
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
                    ast.type = {
                        value: s.substring(c.from, c.to),
                        from: c.from,
                        to: c.to
                    }
                }
                else if(n.type.id === TERM.BlockName){
                    ast.name = {
                        value: s.substring(c.from, c.to),
                        from: c.from,
                        to: c.to
                    }
                }
                else if(n.type.id === TERM.Field){
                    // push because it's a container
                    ast.fields.push({
                        name: defaultobj,
                        type: defaultobj,
                        constraints: []
                    });
                }
                else if(n.type.id === TERM.FieldName){
                    let f = ast.fields;
                    if(f.length){
                        f[f.length-1].name = {
                            value: s.substring(c.from, c.to),
                            from: c.from,
                            to: c.to
                        }
                    }
                }
                else if(n.type.id === TERM.FieldType){
                    let fs = ast.fields;
                    if(fs.length){
                        let last_f = fs[fs.length-1];
                        last_f.type = {
                            value: s.substring(c.from, c.to),
                            from: c.from,
                            to: c.to
                        }
                    }
                }
                else if(n.type.id === TERM.Constraint){
                    let fs = ast.fields;
                    if(fs.length){
                        let last_f = fs[fs.length-1];
                        let cs = last_f.constraints;
                        cs.push({
                            name: {
                                value: s.substring(c.from, c.to),
                                from: c.from,
                                to: c.to
                            },
                            type: {
                                value: s.substring(c.from, c.to),
                                from: c.from,
                                to: c.to
                            }
                        });
                        
                    }
                }
                

            } while (c.next())


            source.models.push({
                hash: hash,
                text:s,
                from: m.index, 
                to: m.index + s.length,
                ast: ast,
                changed: true,
            });

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

	return source;
}