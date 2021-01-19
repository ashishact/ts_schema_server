import { Sequelize, ModelCtor, Model as SQLModel, DataTypes, ModelValidateOptions } from "sequelize";
import type {Model} from "../vscode/parser";

const l = console.log;
const w = console.warn;


let sequelize = new Sequelize('postgres://postgres:hiuDPEwsEQfGKnmeSHcuJQ==@localhost:5432/appdb', {
    define: {
        freezeTableName: true
    }
});

export const updateTable = async (model: Model, sync?: boolean, alter?: boolean)=>{
    let fields:{[name: string]: {type: DataTypes.DataType, allowNull: boolean, validate: ModelValidateOptions}} = {};
    // {
    //     name: {
    //         type: DataTypes.STRING,
    //         allowNull: false
    //     }
    // }

    let getDataType = (type: string) => {
        if(type === "string") return DataTypes.STRING
        else if(type === "number") return DataTypes.FLOAT
        else if(type === "integer") return DataTypes.INTEGER
        else return DataTypes.TEXT;
    }

    let getValidation = (type: string):ModelValidateOptions => {
        if(type === "string") return {isAlphanumeric: true}
        else if(type === "number") return {isDecimal: true}
        else if(type === "integer") return {isInt: true}
        else return {};
    }

    model.fields.forEach(f=>{
        fields[f.name.value] = {
            type: getDataType(f.type.value),
            allowNull: false,
            validate: getValidation(f.type.value)
        }
    })
    const Table = sequelize.define(model.name.value, fields, {});

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


init();