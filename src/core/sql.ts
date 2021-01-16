import { Sequelize, ModelCtor, Model as SQLModel, DataTypes } from "sequelize";
import type {Model} from "../vscode/parser";

const l = console.log;
const w = console.warn;


let sequelize = new Sequelize('postgres://postgres:hiuDPEwsEQfGKnmeSHcuJQ==@localhost:5432/appdb', {
    define: {
        freezeTableName: true
    }
});

export const updateTable = async (model: Model, sync?: boolean, alter?: boolean)=>{
    let fields:{[name: string]: {type: DataTypes.DataType, allowNull: boolean}} = {};
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

    model.fields.forEach(f=>{
        fields[f.name.value] = {
            type: getDataType(f.type.value),
            allowNull: false
        }
    })
    const Table = sequelize.define(model.name.value, fields, {});

    if(sync){
        let res = await Table.sync({alter: alter});
    }

    return Table;
}

export const queryModel = async (model: Model, object: any): Promise<{action: string, data: object[]|null}> =>{
    let sqlm = sequelize.models[model.name.value];
    if(!sqlm){
        await updateTable(model);
        sqlm = sequelize.models[model.name.value];
    }


    if(sqlm){
        if(object && Object.keys(object).length){
            let res = await sqlm.findOrCreate({where: object}).catch(l);
            
            if(!res) await updateTable(model, true).catch(l); // create table
            
            res = await sqlm.findOrCreate({where: object}).catch(l);  
            
            if(!res) await updateTable(model, true, true).catch(l); // alter table


            if(res){
                return {action: res[1]? "CREATED" : "FOUND", data: [res[0].toJSON()]};
            }
        }
        else{
            let res = await sqlm.findAll({limit: 10}).catch(l);

            if(!res) await updateTable(model, true).catch(l); // create table

            res = await sqlm.findAll({limit: 10}).catch(l);

            if(!res) await updateTable(model, true, true).catch(l); // alter table

            if(res){
                return {action: "FOUND", data: res.map(r=>r.toJSON())};
            }
        }
    }

    return {action: "NONE", data: null}
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