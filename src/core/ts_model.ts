import { Project, ts,  SourceFile, StructureKind } from "ts-morph";

import { Sequelize, DataTypes } from "sequelize";


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

const sequelize = new Sequelize('postgres://postgres:hiuDPEwsEQfGKnmeSHcuJQ==@localhost:5432/appdb', {
    define: {
        freezeTableName: true
    }
});

// @warn The language server has to be in same path as the client
// @warn because of the root path here is on client
const getOrCreateSource = (rootPath: string, fileName:string)=>{
    let source = fileMaps[fileName];
    if(!source){
        // let path = fs.getCurrentDirectory() + `/src/generated/${fileName}.ts`;
        let path = rootPath + `/generated/${fileName}.ts`;
        source = project.createSourceFile(path, "", { overwrite: true });
        fileMaps[fileName] = source;
    }
    return source;
}

const getCodeFileName = (fileName: string, codeName: string) => fileName + ".code." + codeName;

export const updateDocument = async (modelSource: ModelSource, rootPath: string) => {
    let fileName = modelSource.fileName

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



    if(fileChanged) source.save();

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

export const init = async () => {

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return;
    }


    const Student = sequelize.define('Student', {
        // Model attributes are defined here
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        roll: {
            type: DataTypes.INTEGER
            // allowNull defaults to true
        }
    }, {
        // Other model options go here
    });

    let res = await Student.sync();
    l(res);
}



// init();



export const testLs = ()=>{
    // let text = `let abc: number = "32".`;
    // let source = project.createSourceFile("./test.ts", text);

    // // let d = languageservice.compilerObject.getDefinitionAtPosition(source.getFilePath(), 6);
    // let d = languageservice.compilerObject.getCompletionsAtPosition(source.getFilePath(), text.length, {});
    // l(d);
}
