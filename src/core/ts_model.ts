import { Project, ts, SourceFile, StructureKind} from "ts-morph";

import type {ModelSource} from "../vscode/parser";

import {init as typeormInit} from "../../generated/src/index";
import {EntitySchema} from "typeorm";

import {writeFileSync} from "fs"

const l = console.log;
const w = console.warn;
const project = new Project({
    compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
    }
});
const fs = project.getFileSystem();

interface FileMaps{
    [fileName:string]: SourceFile,
}
const fileMaps:FileMaps = {};



export const updateModel = async (modelSource: ModelSource, save: boolean) => {
    let fileName = modelSource.fileName
    let path = "./generated/test.ts";
    let source = fileMaps[fileName];
    if(!source){
        path = fs.getCurrentDirectory()+`/generated/src/entity/${fileName}.ts`;
        // let _s = project.getSourceFile(path);
        // if(_s){
        //     source = _s;
        // }
        // else{
        //     source = project.createSourceFile(path, "", {overwrite: true});
        // }
        
        source = project.createSourceFile(path, "", {overwrite: true});
        if(!source) {
            w("source file doesn't exist");
            return 
        }

        fileMaps[fileName] = source;


        // imports 
        // import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";
        source.addImportDeclaration(
            {
                defaultImport: "{EntitySchema}",
                moduleSpecifier: "typeorm"
            }
        );
    }


    
    let isChanged = false;

    let schemaText = `import {Entity, PrimaryGeneratedColumn, Column, EntitySchema} from "typeorm";\n\n`;
    for(let m of modelSource.models){
        let a = m.ast;
        if(m.changed){
            let name = a.name.value.trim();
            let o:EntitySchema<{name: string}> = {
                name: name,
                columns: {
                    id: {
                        primary: true,
                        type: "uuid",
                        generated: true
                    }
                },
                relations
            }

            for(let f of m.ast.fields){
                let fname = f.name.value;
                let ftype = f.type.value;
                
                let sqltype = ftype;
                if(ftype=="string") sqltype = "text";
                else if(ftype=="number") sqltype = "int";

                o.columns[fname] = {
                    type: sqltype
                }
            }
            schemaText+= `export const ${name} = new EntitySchema(${JSON.stringify(o, null, 4)}); \n\n`;

            // let c = source.getClass(name);
            // if(c){
            //     c.remove();
            // }
            // source.addClass({
            //     decorators: [{name: "Entity()"}],
            //     name: name,
            //     properties: a.fields.map((f)=>{
            //         let decorators = [{name: "Column()"}];
            //         if(!["string", "number", "boolean"].includes(f.type.value)){
            //             decorators.push({name: `OneToOne(()=>${f.type.value})`});
            //         }
            //         return {
            //             decorators: decorators,
            //             name: f.name.value,
            //             type: f.type.value,
            //         }
            //     })
            // }).setIsExported(true);




            isChanged = true; // for ts update
        }
    }

    // remove deleted
    let names = modelSource.models.map(m=>m.ast.name.value);
    source.getClasses().forEach(c=>{
        let name = c.getName();
        if(name){
            if(!names.includes(name)){
                c.remove();
                isChanged = true;
            }
        }
    });


    if(save && isChanged){
        l("saving =>", fileName);
        // source.save();


        l(source.getFilePath());
        writeFileSync(path, schemaText);

    }




    



    // send diagonastics
    // const diagnostics = source.getPreEmitDiagnostics();
    // console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));

    // let dia = languageService.getSuggestionDiagnostics(source);

    // return diagnostics;
}

export const deleteUnused = async (modelNames: string[], save: boolean) => {

}

export const init = async () => {
    typeormInit();
}



init();
