import { Project, ts,  SourceFile, StructureKind } from "ts-morph";

import type { ModelSource } from "../vscode/parser";


const l = console.log;
const w = console.warn;


const project = new Project();
const fs = project.getFileSystem();
const languageservice = project.getLanguageService();


interface FileMaps {
    [fileName: string]: SourceFile|null,
}
const fileMaps: FileMaps = {};



// @warn The language server has to be in same path as the client
// @warn because of the root path here is on client
const getOrCreateSource = (rootPath: string, fileName:string)=>{
    let source = fileMaps[fileName];
    if(!source){
        let path = fs.getCurrentDirectory() + `/src/.generated/${fileName}.ts`;
        // let path = rootPath + `/generated/${fileName}.ts`;
        source = project.createSourceFile(path, "", { overwrite: true });
        fileMaps[fileName] = source;
    }
    return source;
}

const getCodeFileName = (fileName: string, codeName: string) => fileName + ".code." + codeName;


export const updateDocument = async (modelSource: ModelSource, rootPath: string) => {
    let fileName = modelSource.fileName;

    // modelSource.code.forEach(c=>{
    //     if(c.changed){
    //         let codeFileName = getCodeFileName(fileName , c.name.value);
    //         let source = getOrCreateSource(codeFileName);
    //         source.removeText();
    //         source.insertText(0, c.text);
    //         source.save();
    //     }
    // });

    let source = getOrCreateSource(rootPath, fileName);
    let fileChanged = false;
    modelSource.models.forEach(m=>{
        if(m.changed){
            let modelname = m.name.value;
            let i = source.getInterface(modelname);
            if(i) i.remove();
            source.addInterface({
                name: modelname,
                properties: m.fields.map(f=>{
                    return {
                        name: f.name.value,
                        type: f.type.value
                    }
                })
            });


            fileChanged = true;
        }
    });


    // remove deleted
    let modelnames = modelSource.models.map(m=>m.name.value);
    source.getInterfaces().forEach(i=>{
        if(!modelnames.includes(i.getName())){
            fileChanged = true;
            i.remove();
        }
    })

    if(fileChanged) source.save();




    // get Error
    let ds = source.getPreEmitDiagnostics();
    for(let d of ds){
        let s = d.getStart();
        if(s){
            let n = source.getDescendantAtPos(s);
            if(n){
                let p = n.getParent();
                if(p){
                    if(p.getKind() === ts.SyntaxKind.TypeReference){
                        let t = n.getText();
                        let i = n.getFirstAncestorByKind(ts.SyntaxKind.InterfaceDeclaration);
                        if(i){
                            let modelname = i.getName();
                            let m = modelSource.models.find((m)=>m.name.value===modelname);
                            if(m){
                                m.hasError = true;
                                let f = m.fields.find(f=>f.type.value === t);
                                if(f){
                                    f.hasError = true;
                                    // TypeReference
                                    f.type.error = d.getMessageText().toString() || (t + " is not defined"); 
                                }
                            }
                        }
                        // l(n.getKindName(), n.getKind(), n.getChildCount(), n.getText(), n.getStart());
                    }
                }
            }

        }
    }




}

export const getCompletions = async (modelSource: ModelSource, offset: number) => {
    let fileName = modelSource.fileName;
    
    let code = modelSource.code.find(c => c.from <= offset && offset <= c.to);
    if(!code) return;


    let codeFileName = getCodeFileName(fileName , code.name.value);

    let source = fileMaps[codeFileName];
    if(!source) return;

    let completions = await languageservice.compilerObject.getCompletionsAtPosition(source.getFilePath(), offset - code.from, {});


    return completions;
}

export const deleteUnused = async (modelNames: string[], save: boolean) => {

}





// init();



// export const testLs = ()=>{
//     // let text = `let abc: number = "32".`;
//     // let source = project.createSourceFile("./test.ts", text);

//     // // let d = languageservice.compilerObject.getDefinitionAtPosition(source.getFilePath(), 6);
//     // let d = languageservice.compilerObject.getCompletionsAtPosition(source.getFilePath(), text.length, {});
//     // l(d);
// }
