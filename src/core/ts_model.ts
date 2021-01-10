import { Project, ts, SourceFile} from "ts-morph";

import type {ModelSource} from "../vscode/parser3";

const l = console.log;
const w = console.warn;
const project = new Project();
const fs = project.getFileSystem();

const languageService = project.getLanguageService();

interface FileMaps{
    [uriName:string]: SourceFile,
}
const fileMaps:FileMaps = {};

export const updateModel = async (modelSource: ModelSource, save: boolean) => {
    let uriName = modelSource.uriName
    let source = fileMaps[uriName];
    if(!source){
        let path = fs.getCurrentDirectory()+`/.morph/${uriName}.ts`;
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

        fileMaps[uriName] = source;
    }

    let isChanged = false;

    for(let m of modelSource.models){
        let a = m.ast;
        if(m.changed){
            let i = source.getInterface(a.name);
            if(i){
                i.remove();
            }
            source.addInterface({
                name: a.name,
                properties: a.fields.map(f=>{
                    return {
                        name: f.name,
                        type: f.type,
                    }
                })
            });
            
            m.changed = false; // internal
            isChanged = true; // for ts update
        }
    }

    // remove deleted
    let names = modelSource.models.map(m=>m.ast.name);
    source.getInterfaces().forEach(i=>{
        if(!names.includes(i.getName())){
            i.remove();
            isChanged = true;
        }
    });


    if(save && isChanged){
        l("saving =>", uriName);
        source.save();
    }


    // send diagonastics
    const diagnostics = source.getPreEmitDiagnostics();
    // console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));

    return diagnostics;
}

export const deleteUnused = async (modelNames: string[], save: boolean) => {

}


