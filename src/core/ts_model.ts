import { Project, ts,  SourceFile, StructureKind } from "ts-morph";
import type { ModelSource } from "../vscode/parser";
import {generateUri} from "./common";
import {updateModel} from "./graph"


const l = console.log;
const w = console.warn;


const project = new Project();
const fs = project.getFileSystem();
const languageservice = project.getLanguageService();


interface FileMaps {
    [fileName: string]: SourceFile|null,
}
const fileMaps: FileMaps = {};



const createfilePath = (uri: string) => fs.getCurrentDirectory() + `/src/.generated/${uri}`;

const getOrCreateSource = (uri:string)=>{
    let source = fileMaps[uri];
    if(!source){
        let path = createfilePath(uri);
        source = project.createSourceFile(path, "", { overwrite: true });
        fileMaps[uri] = source;
    }
    return source;
}



export const updateDocument = async (ailSource: ModelSource, rootPath: string) => {
    let fileName = ailSource.fileName;

    // modelSource.code.forEach(c=>{
    //     if(c.changed){
    //         let codeFileName = getCodeFileName(fileName , c.name.value);
    //         let source = getOrCreateSource(codeFileName);
    //         source.removeText();
    //         source.insertText(0, c.text);
    //         source.save();
    //     }
    // });



    // INTERFACE FOR AUTO COMPLETE IN EDITOR
    let interfaceSource = getOrCreateSource(generateUri(fileName, "interfaces"));
    let fileChanged = false;
    ailSource.models.forEach(m=>{
        if(m.changed){
            let modelname = m.name.value;

            // Interface
            let i = interfaceSource.getInterface(modelname);
            if(i) i.remove();
            interfaceSource.addInterface({
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
    let modelnames = ailSource.models.map(m=>m.name.value);
    interfaceSource.getInterfaces().forEach(i=>{
        if(!modelnames.includes(i.getName())){
            fileChanged = true;
            i.remove();
        }
    });
    if(fileChanged) interfaceSource.save();



    // ERROR FOR EDITOR
    let ds = interfaceSource.getPreEmitDiagnostics();
    for(let d of ds){
        let s = d.getStart();
        if(s){
            let n = interfaceSource.getDescendantAtPos(s);
            if(n){
                let p = n.getParent();
                if(p){
                    if(p.getKind() === ts.SyntaxKind.TypeReference){
                        let t = n.getText();
                        let i = n.getFirstAncestorByKind(ts.SyntaxKind.InterfaceDeclaration);
                        if(i){
                            let modelname = i.getName();
                            let m = ailSource.models.find((m)=>m.name.value===modelname);
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



    // GRAPH MODELS FOR PERSISTENCE AND GENERATING SQL
    await updateModel(ailSource).catch(l);

}

export const getCompletions = async (modelSource: ModelSource, offset: number) => {
    let fileName = modelSource.fileName;
    
    let code = modelSource.code.find(c => c.from <= offset && offset <= c.to);
    if(!code) return;

    let uri = generateUri(fileName, "code", code.name.value);
    let source = getOrCreateSource(uri);

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
