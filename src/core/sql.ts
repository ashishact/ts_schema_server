import {writeFileSync} from "fs"
import "reflect-metadata";
import { createConnection } from "typeorm";
import type {Connection} from "typeorm"

import {getGeneratedPath} from "./common"
import {getModels} from "./graph";
import type {ModelI} from "./graph";
import type {Model} from "../vscode/parser";


const l = console.log;

const FUNDAMENTAL_TYPE = ["string", "boolean", "number"];

const getTypeOrmSource = (model: ModelI): string=>{
    let hasPrimary = false;
    let refTypes: string[] = [];
    model.fields.forEach(f=>{
        if(!FUNDAMENTAL_TYPE.includes(f.type)){
            refTypes.push(f.type);
        }
    })

    let className = model.name;
    let s = "";
    s+= `import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from "typeorm"; \n`;
    
    for(let r of refTypes){
        s+= `import {${r}} from "./${r}" \n`;
    }
    s+= "\n\n";


    s+= `@Entity() \n`;
    s+= `export class ${className} { \n`;

    if(!hasPrimary){
        s+= `    @PrimaryGeneratedColumn() \n`
        s+= `    id: number; \n\n`
    }

    for(let f of model.fields){
        if(refTypes.includes(f.type)){
            // @todo: check other relationship
            s+= `    @OneToOne(() => ${f.type})\n    @JoinColumn() \n`
        }
        else{
            s+= `    @Column() \n`;
        }
        s+= `    ${f.name}: ${f.type} \n\n`
    }

    s+= `}`

    return s;
}
export const generateTypeOrmEntity = async (models: ModelI[]) => {
    
    models.forEach(m=>{
        if(!m.name || !m.uri) return;

        let className = m.name;
        let filePath = getGeneratedPath(`typeorm/src/entity/${className}.ts`);
        let source = getTypeOrmSource(m);
        writeFileSync(filePath, source);
    })
}

let connection: Connection|null = null;
const initConnection = async (sync: boolean = false)=>{
    await createConnection({
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "hiuDPEwsEQfGKnmeSHcuJQ==",
        database: "appdb",
        synchronize: sync,
        logging: false,
        entities: [
            "src/.generated/typeorm/src/entity/**/*.ts"
        ],
    }).then(async (_connection) => {
        connection = _connection;
        l("Postgres connection success");
    }).catch(error => l(error));
}

export const initModels = async (sync: boolean) => {
    let models = await getModels();
    // models.forEach(m=>{
    //     l(m.name, m.uri);
    //     m.fields.forEach(f=>l(f.name));
    // });

    await generateTypeOrmEntity(models).catch(l);
    await initConnection(sync).catch(l);
}


export const findOrCreate = async (model: Model, data: any): Promise<[string|null, any|null]> => {
    let modelname = model.name.value;
    if(!modelname) return ["not a valid model", null]
    if(!connection) await initConnection(true);

    if(!connection) {
        return ["Connection failed", null]
    }

    let repo = connection.getRepository(model.name.value);

    if(!repo) return ["No such model: " + modelname, null];

    let obj: any;
    if(data){
        obj = await repo.findOne(data).catch(l);
    }
    else{
        obj = await repo.find({
            where: data,
            take: 10
        }).catch(l);
    }

    
    if(obj) return [null, obj];
    
    // Create
    l("Not found creating...");
    obj = repo.create(data);
    if(Array.isArray(obj)){
        let res = await repo.save(obj).catch(l);    
        if(res) return [null, obj];
    }
    else{
        let res = await repo.save([obj]).catch(l);    
        if(res) return [null, obj];
    }
    
    return ["Failed to find or create", null];
}



// In the beginig

initModels(true);