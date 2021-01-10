export const hack = ()=>{

    //@ts-ignore
    process.ActualExit = process.exit;
    //@ts-ignore
    process.ActualKill = process.kill;
    //@ts-ignore
    process.kill = (pid: number, signal?: string | number | undefined) => {
        let fromVSLSP = new Error().stack?.search("vscode-languageserver");
        if(fromVSLSP && fromVSLSP > 0){
            console.log("vs code lang server trying to kill us");
        }
        else {
            // @ts-ignore
            process.ActualKill(code);
        }
    }


    // vscode language server calls process.exit whenever a client 
    //@ts-ignore
    process.exit = (code?: number|undefined)=>{
        let fromVSLSP = new Error().stack?.search("vscode-languageserver");
        if(fromVSLSP && fromVSLSP > 0){
            console.log("vs code lsp trying to exit");
        }
        else {
            // @ts-ignore
            process.ActualExit(code);
        }
    }
}