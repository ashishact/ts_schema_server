export const generateUri = (fileName: string, type: "model"|"code"|"repl"|"interfaces", objname?: string, ext?: string) => {
    if(objname) return `${type}.${fileName}.${objname}.${ext||"ts"}`;
    else return `${type}.${fileName}.${ext||"ts"}`;
}


export const getGeneratedPath = (fileNameWithExt: string): string=>{
    let rootPath = process.cwd();
    let filePath = rootPath + "/src/.generated/" + fileNameWithExt;
    return filePath;
}