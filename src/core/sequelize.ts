import { Sequelize, ModelCtor, Model as SQLModel, DataTypes, ModelValidateOptions } from "sequelize";
import type {Model, ModelSource} from "../vscode/parser";
import {getModel} from "../vscode/parser";

const l = console.log;
const w = console.warn;


// @todo: password?
let sequelize = new Sequelize('postgres://postgres:hiuDPEwsEQfGKnmeSHcuJQ==@localhost:5432/appdb', {
    define: {
        freezeTableName: true
    }
});

let getDataType = (type: string) => {
    if(type === "string") return {ref: false, type: DataTypes.STRING}
    else if(type === "number") return {ref: false, type: DataTypes.FLOAT}
    else if(type === "integer") return {ref: false, type:  DataTypes.INTEGER}

    let refModel = getModel(type);
    if(refModel){
        return {ref: true, model: refModel}
    }

    return null;
}

let getValidation = (type: string):ModelValidateOptions => {
    if(type === "string") return {isAlphanumeric: true}
    else if(type === "number") return {isDecimal: true}
    else if(type === "integer") return {isInt: true}
    else return {};
}

export const updateTable = async (model: Model, sync?: boolean, alter?: boolean)=>{
    let fields:{[name: string]: {type: DataTypes.DataType, allowNull: boolean, validate: ModelValidateOptions, references?: {}}} = {};


    model.fields.forEach(f=>{
        let dt = getDataType(f.type.value); 
        if(dt){
            if(dt.type){
                fields[f.name.value] = {
                    type: dt.type,
                    allowNull: false,
                    validate: getValidation(f.type.value)
                }
            }
            else if(dt.model){
                fields[f.name.value] = {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    validate: {}
                }
            }
        }
    })
    const Table = sequelize.define(model.name.value, fields, {});
    // Table.hasOne()

    if(sync){
        let res = await Table.sync({alter: alter});
    }

    return Table;
}

export const enum RESPONSE_TYPE{
    NONE,
    DATA,
    MESSAGES,
    ERRORS
}
export type QueryRes = {type: RESPONSE_TYPE.NONE} | {type: RESPONSE_TYPE.DATA, data: object[], action: "CREATED"|"FOUND"} | {type: RESPONSE_TYPE.ERRORS, errors: string[]} | {type: RESPONSE_TYPE.MESSAGES, messages: string[]}

export const queryModel = async (model: Model, object: any): Promise<QueryRes> =>{
    let sqlm = sequelize.models[model.name.value];
    if(!sqlm){
        await updateTable(model);
        sqlm = sequelize.models[model.name.value];
    }

    if(sqlm){
        let errors:string[] = [];
        let isNonRecovrableError = false;
        let SequelizeDatabaseError = false;
        
        if(true){

            let where:any = null
            if(object && Object.keys(object).length) where = object;

            let res = await sqlm.findAll({where: where,  limit: 10}).catch(e=>{
                if(e && e.name === "SequelizeDatabaseError"){
                    SequelizeDatabaseError = true;
                }
                errors.push(e.name);
            });
            
            if(!res) {
                if(SequelizeDatabaseError){
                    // create table
                    let res = await updateTable(model, true).catch(e=>{
                        if(e){
                            l("create table error", e.name);
                        }
                    }); 

                    l("create table");
                    l(res);
                }
            }
            else if(res.length === 0){
                // no data create
                if(object && Object.keys(object).length){
                    let res = await sqlm.findOrCreate({where: object}).catch(l);
                    
                    // if(!res) await updateTable(model, true, true).catch(l); // alter table
                }
            }
            else if(res.length === 1){
                return {type: RESPONSE_TYPE.DATA,  action: res[1]? "CREATED" : "FOUND", data: [res[0].toJSON()]};
            }
            else{
                return {type: RESPONSE_TYPE.DATA, action: "FOUND", data: res.map(r=>r.toJSON())};
            }


            // return {type: RESPONSE_TYPE.ERRORS, errors};

            
        }
    }

    return {type: RESPONSE_TYPE.NONE}
}

export const init = async () => {

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return;
    }  
}


// init();