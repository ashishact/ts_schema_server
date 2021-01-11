import {Graph} from "redisgraph.js"
import NodeType from "redisgraph.js/src/node";
import GraphType from "redisgraph.js/src/graph";
import ResultSet from "redisgraph.js/src/resultSet";
import type {ModelSource} from "./parser";


const l = console.log;

let graph: GraphType|null = null;

let init = async () => {
    await new Promise((resolve, reject)=>{
        try {
            graph = new Graph("schema");
            resolve(true);
        } catch (error) {
            reject(error);      
        }
    }).catch(l);
    
    await createPrimitive();
}

export let testGraph = async () => {
    if(!graph) return;

    const res = await graph.query("MATCH (a:person)-[:knows]->(b:person) RETURN a, b");
    
    if(res.size() === 0){
        await graph.query("MATCH (a:person) DELETE a");
        await graph.query("CREATE (:person{name:'roi',age:32})");
        await graph.query("CREATE (:person{name:'amit',age:30})");
        await graph.query("MATCH (a:person), (b:person) WHERE (a.name = 'roi' AND b.name='amit') CREATE (a)-[:knows]->(b)");
    }

	while (res.hasNext()) {
        const record = res.next();
        let a = record.get("a") as NodeType;
        let b = record.get("b") as NodeType;
        l(record)
	}
    
    let t = res.getStatistics().queryExecutionTime();
    console.log("TIME: ", t);

}


const printStats = (res: ResultSet) => {
    let stats = res.getStatistics();
    let execTime = stats.queryExecutionTime();
    let altered = stats.nodesCreated() || stats.nodesDeleted() || stats.labelsAdded()|| stats.relationshipsCreated() || stats.relationshipsDeleted();
    if(execTime > 5 || altered){ // ms || count
        l(stats._raw);
    }
}

const createPrimitive = async () => {
    if(!graph) return;


    let q = "";

    q+= `MERGE (string:model {name: "string"})\n`;
    q+= `MERGE (number:model {name: "number"})\n`;
    q+= `MERGE (bool:model {name: "bool"})\n`;
    q+= `RETURN "OK"\n`;

    let res = await graph.query(q).catch(l);
    if(res){
        printStats(res);
        let vs = res.next()?.getString('"OK"');
        if(vs === "OK"){
            l("PRIMITIVE CREATED");
        }
        else{
            l(q);
            l("PRIMITIVE CREATION FAILED");
        }
    }

}
export const updateModel = async (source: ModelSource) => {
    if(!graph) return;

    let filename = source.fileName;
    for(let m of source.models){
        if(m.changed ){
            let a = m.ast;
            let modelname = a.name.value.trim();
            let modeltype = a.type.value.trim();
            
            // sanity check
            if(!modelname) {
                m.hasError = true;
                a.hasError = true;
                a.name.error = "Model name is required";
                a.name.suggestion = "e.g => model Student {\n name string\nroll number \n}"
                continue;
            }
            if(!modeltype){
                m.hasError = true;
                a.hasError = true;
                a.type.error = "Model type is required";
                a.type.suggestion = "e.g => model Student {\n name string\nroll number \n}"
                continue;
            }


            


            let q = "";
            for(let f of a.fields){
                let type = f.type.value.trim();
                if(!type) continue;
                q+= `MATCH (${type}:model {name: "${type}"})\n`;
            }
            
            q+= `MERGE (${modelname}:model { name: "${modelname}", file: "${filename}"})\n`;
            
            for(let f of a.fields){
                let type = f.type.value.trim();
                let name = f.name.value.trim();
                if(!type || !name) continue;
                q+= `MERGE (${type})-[:FIELD {name: "${name}"}]->(${modelname})\n`;
            }

            q+= `RETURN "OK"\n`;


            let isModelUpdated = false;
            
            // Query
            let res = await graph.query(q).catch(l);
            if(res){
                printStats(res);

                let vs = res.next()?.getString('"OK"');
                if(vs === "OK"){
                    isModelUpdated = true;
                }
                else{
                    l("FAILED => ", q);
                }
            }



            if(!isModelUpdated){
                // l(q);

                // When there are field types that don't exist the above query will fail
                // Then use just create the model without the fields
                l("MODEL MERGE FAILED");
                let mq = `MERGE (${modelname}:model { name: "${modelname}", file: "${filename}"})`;
                res = await graph.query(mq).catch(l);
                // l("ADDED MODEL NAME");


                // let's get the errors
                m.hasError = true;
                a.hasError = true;

                // fields error
                for(let f of a.fields){
                    if(!f.name.value.trim()) {
                        f.hasError = true;
                        f.type.error = `no name found`;
                        f.type.suggestion = `e.g. name string`;
                        continue;
                    }
                    if(!f.type.value.trim()) {
                        f.hasError = true;
                        f.type.error = `no type found`;
                        f.type.suggestion = `e.g. name string`;
                        continue;
                    }

                    // ref is not based on filename
                    let q = `MATCH (${f.type.value}:model {name: "${f.type.value}"})\n RETURN "OK"\n`;
                    let res = await graph.query(q).catch(l);
                    if(res){
                        let vs = res.next()?.getString('"OK"');
                        if(vs !== "OK"){
                            f.hasError = true;
                            f.type.error = `${f.type.value} doesn't exists`;
                            f.type.suggestion = `e.g. model ${f.type.value} {}`;
                        }
                    }
                }
            }
            

            // remove orphan fields
            if(isModelUpdated){
                // Delete removed 
                // MATCH (f:model)-[r:FIELD]->(m:model{name: "Student"}) WHERE not (r.name IN ["fieldname"])
                // return r
    
                let fieldNames = JSON.stringify(m.ast.fields.map(f=>f.name.value)); // current field names
    
                let dq = "";
                dq+= `MATCH (f:model)-[r:FIELD]->(m:model{name: "${modelname}", file: "${filename}"}) `
                dq+= `WHERE NOT (r.name IN ${fieldNames}) \n`;
                dq+= `DELETE r\n`;
    
    
                res = await graph.query(dq).catch(l);
                if(res){
                    printStats(res);
                }
            }

        }
    }

    /*
    // remove orphan model 
    // @todo: remove only from this file
    let modelNames = JSON.stringify(source.models.map(m=>m.ast.name.value));
    let dq = `
        MATCH (m:model {file: "${filename}"})
        WHERE (NOT (()-[:FIELD]->(m) OR ()<-[:FIELD]-(m)))  AND  (NOT m.name IN ${modelNames})
        DELETE m
    `;
    let res = await graph.query(dq).catch(l);
    */

    // remove orphan for this file
    let modelNames = JSON.stringify(source.models.map(m=>m.ast.name.value.trim()));
    let dq = `
        MATCH (m:model {file: "${filename}"})
        WHERE NOT (m.name IN ${modelNames})
        DELETE m
    `;
    let res = await graph.query(dq).catch(l);
    if(res){
        printStats(res);
    }


    



}


init();