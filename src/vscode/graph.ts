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



    // 1. add all model names
    let q = "";
    for(let m of source.models){
        let modelname = m.name.value;
        if(m.changed && modelname){
            q+= `MERGE (${modelname}:model { name: "${modelname}", file: "${filename}"})\n`;
        }
    }
    // query
    if(q.length){
        let res = await graph.query(q).catch(l);
        if(res){
            printStats(res);
        }
    }



    // 2. try adding each model
    for(let m of source.models){
        if(m.changed || m.hasError){
            // if it has error with dependency, then even if it's not changed 
            // maybe the dependency has been solved

            let modelname = m.name.value;
            let modeltype = m.type.value;
            
            // sanity check
            if(!modelname) {
                m.hasError = true;
                m.name.error = "Model name is required";
                m.name.suggestion = "e.g => model Student {\n name string\nroll number \n}"
                continue;
            }
            if(!modeltype){
                m.hasError = true;
                m.type.error = "Model type is required";
                m.type.suggestion = "e.g => model Student {\n name string\nroll number \n}"
                continue;
            }


            


            let q = "";
            for(let f of m.fields){
                let type = f.type.value;
                if(!type) continue;
                q+= `MATCH (${type}:model {name: "${type}"})\n`;
            }
            
            q+= `MERGE (${modelname}:model { name: "${modelname}", file: "${filename}"})\n`;
            
            for(let f of m.fields){
                let type = f.type.value;
                let name = f.name.value;
                if(!type || !name) continue;
                q+= `MERGE (${type})-[:FIELD {name: "${name}"}]->(${modelname})\n`;
            }

            q+= `RETURN "OK"\n`;


            
            // Query
            if(q.length){
                let res = await graph.query(q).catch(l);
                if(res){
                    printStats(res);
    
                    let vs = res.next()?.getString('"OK"');
                    if(vs === "OK"){
                        m.hasError = false;
                    }
                    else{
                        m.hasError = true;
                        l("FAILED => ", q);
                    }
                }
            }



            if(m.hasError){
                // fields error
                for(let f of m.fields){
                    if(!f.name.value) {
                        f.hasError = true;
                        f.type.error = `no name found`;
                        f.type.suggestion = `e.g. name string`;
                        continue;
                    }
                    if(!f.type.value) {
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
            if(!m.hasError){
                // Delete removed 
                // MATCH (f:model)-[r:FIELD]->(m:model{name: "Student"}) WHERE not (r.name IN ["fieldname"])
                // return r
    
                let fieldNames = JSON.stringify(m.fields.map(f=>f.name.value)); // current field names
    
                let dq = "";
                dq+= `MATCH (f:model)-[r:FIELD]->(m:model{name: "${modelname}", file: "${filename}"}) `
                dq+= `WHERE NOT (r.name IN ${fieldNames}) \n`;
                dq+= `DELETE r\n`;
    
    
                let res = await graph.query(dq).catch(l);
                if(res){
                    printStats(res);
                }
            }

        }
    }



    // 3. remove orphan for this file
    let modelNames = JSON.stringify(source.models.map(m=>m.name.value));
    let dq = `
        MATCH (m:model {file: "${filename}"})
        WHERE NOT (m.name IN ${modelNames})
        DELETE m
        RETURN m
    `;
    let res = await graph.query(dq).catch(l);
    if(res){
        printStats(res);
        
        // find the related model who depends on this
        // show error in them
    }


}


init();