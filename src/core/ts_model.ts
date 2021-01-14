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



export const updateModel = async (modelSource: ModelSource, save: boolean) => {
    let fileName = modelSource.fileName
    let path = "./generated/default.ts";
    let source = fileMaps[fileName];
    if (!source) {
        path = fs.getCurrentDirectory() + `/src/generated/${fileName}.ts`;

        source = project.createSourceFile(path, "", { overwrite: true });
        if (!source) {
            w("source file doesn't exist");
            return
        }

        fileMaps[fileName] = source;

    }
    
    let codeChanged = false;
    let text = "";
    modelSource.code.forEach(c=>{
        text+= c.text;
        if(c.changed) codeChanged = true;
    });
    
    if(codeChanged){
        source.removeText();
        source.insertText(0, text);

        source.save();
    }



    


}

export const getCompletions = async (fileName: string, pos: number) => {
    l(fileName);
    let path = fs.getCurrentDirectory() + `/src/generated/${fileName}.ts`;
    let source = fileMaps[fileName];
    if(!source) return;

    let acs = await languageservice.compilerObject.getCompletionsAtPosition(source.getFilePath(), pos, {});

    return acs;
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
