import {updateTable, queryModel, RESPONSE_TYPE, QueryRes} from "../core/sequelize";

import type {ModelSource} from "./parser";

import {findOrCreate} from "../core/sql";

import EasyTable from "easy-table";
import moment from 'moment';

const l = console.log;

export const dataChanged = async (source: ModelSource)=>{
    for(let code of source.code){
        if(code.changed && code.name.value === "repl"){ // code here used as repl
            let m = source.models.find(m=> m.name.value === "Ashish");
            if(m){
                // await updateTable(m, false);
            }
        }
    }
}

export const submit = async (source: ModelSource, param: any):Promise<QueryRes> => {
    if(param.end && Number.isInteger(param.end)){
        let offset = param.end;
        let repl = source.repl.find(r => r.from <= offset && offset <= r.to);

        if(repl){
            let s: string = param.lineText?.trim();
            if(s){
                let m = s.match(/^[A-Za-z_][A-Za-z0-9]*/);
                if(m){
                    let bi = s.indexOf('(');
                    let ei = s.lastIndexOf(')');
                    let object: any = null;
                    if(bi && ei && ei > bi+1){
                        let sourceString = s.substring(bi+1, ei);
                        try {
                            object = eval(`let a = ${sourceString}; a`);
                        } catch (e) {
                            return {type: RESPONSE_TYPE.ERRORS, errors: [e.toString()]};
                        }
                    }
                    else{
                        // no object
                    }
                    
                    let modelname = m[0];
                    let model = source.models.find(m=> m.name.value === modelname);
                    if(model){
                        
                        // check params
                        let invalid = false;
                        let errors:string[] = [];
                        let objectKeys = object? Object.keys(object):[];
                        let fieldNames = model.fields.map(f=>f.name.value);
                        objectKeys.forEach(k=>{
                            if(!fieldNames.includes(k)){
                                invalid = true;
                                errors.push("field ("+ k + ") doesn't exist in model: " + model?.name.value + " { "+ fieldNames.join(",") +" }");
                            }

                            // @todo: check value type
                        });
                        if(invalid) return {type: RESPONSE_TYPE.ERRORS, errors};

                        // call sql
                        let [e, d] = await findOrCreate(model, object);
                        if(d){
                            let s = "";
                            if(Array.isArray(d)){
                                if(d.length === 1){
                                    s = EasyTable.print(d[0]);
                                }
                                else if(d.length > 1){
                                    let dateprinter = (v: Date, w: number)=> moment(v).format('Do MMM YY, hh:mm:ss');
                                    s = EasyTable.print(d, {
                                        createdAt: {printer: dateprinter},
                                        updatedAt: {printer: dateprinter}
                                    });
                                }
                            }
                            else{
                                s = EasyTable.print(d);
                            }

                            let arrow = "=".repeat(s.split("\n")[0].length);
                            let lines = s.split("\n").filter(l=>l.length);
                            return {type: RESPONSE_TYPE.MESSAGES, messages: [arrow, ...lines, arrow]}
                        }

                        if(e){
                            return {type: RESPONSE_TYPE.MESSAGES, messages: [e]}
                        }
                    }
                }
            }
        }
    }

    return {type: RESPONSE_TYPE.NONE};
}