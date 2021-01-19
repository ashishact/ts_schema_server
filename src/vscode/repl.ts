import {updateTable, queryModel, RESPONSE_TYPE, QueryRes} from "../core/sql";

import type {ModelSource} from "./parser";

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



                        // No error
                        let res = await queryModel(model, object);
                        if(res){
                            
                            
                            let s = "";
                            if(res.type === RESPONSE_TYPE.NONE){
                                return res;
                            }
                            if(res.type === RESPONSE_TYPE.DATA){
                                if(res.data.length==1){
                                    s = EasyTable.print(res.data[0]);
                                }
                                else if(res.data.length > 1){
                                    let dateprinter = (v: Date, w: number)=> moment(v).format('Do MMM YY, hh:mm:ss');
                                    s = EasyTable.print(res.data, {
                                        createdAt: {printer: dateprinter},
                                        updatedAt: {printer: dateprinter}
                                    });
                                }
                                let arrow = "=".repeat(s.split("\n")[0].length);
                                return {type: RESPONSE_TYPE.MESSAGES, messages: [arrow, s, arrow]}
                            }
                            else if(res.type === RESPONSE_TYPE.MESSAGES){
                                return res;
                            }

                        }
                    }
                }
            }
        }
    }

    return {type: RESPONSE_TYPE.NONE};
}