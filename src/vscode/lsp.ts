import * as net from 'net';
import { 
    createConnection,
    SocketMessageReader,
    SocketMessageWriter 
} from "vscode-languageserver/node";

import {
    // createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
    InitializeResult,
} from 'vscode-languageserver';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import {v4 as uuid} from "uuid";



import {hack} from "../hack";
import { parse } from "./parser";
import {updateModel} from "./graph";

import type {ModelSource} from "./parser";



hack(); // @required


const l = console.log;











const acceptClient = (socket: net.Socket)=>{
    


    // Create a simple text document manager. The text document manager
    // supports full document sync only
    let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
    let rootPath: string = "";
    
    let hasConfigurationCapability: boolean = false;
    let hasWorkspaceFolderCapability: boolean = false;
    let hasDiagnosticRelatedInformationCapability: boolean = false;


    let reader = new SocketMessageReader(socket, 'utf-8');
    let writer = new SocketMessageWriter(socket, 'utf-8');
    let connection = createConnection(reader, writer);


    connection.onInitialize((params: InitializeParams) => {
        l("INIT..");

        let folders = params.workspaceFolders;
        // [{
        //     uri: 'file:///Users/ashish/now/THEINTERFACE/TIFLANG/lsp/testdoc',
        //     name: 'testdoc'
        // }]
        if(folders?.length){
            rootPath = folders[0].uri;
        }

		let capabilities = params.capabilities;

		// Does the client support the `workspace/configuration` request?
		// If not, we will fall back using global settings
		hasConfigurationCapability = !!(
			capabilities.workspace && !!capabilities.workspace.configuration
		);
		hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);
		hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);

		const result: InitializeResult = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
				// Tell the client that the server supports code completion
				completionProvider: {
					resolveProvider: true
				}
			}
		};
		if (hasWorkspaceFolderCapability) {
			result.capabilities.workspace = {
				workspaceFolders: {
					supported: true
				}
			};
		}
		return result;
	});

	connection.onInitialized(() => {
		if (hasConfigurationCapability) {
			// Register for all configuration changes.
			connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}
		if (hasWorkspaceFolderCapability) {
			connection.workspace.onDidChangeWorkspaceFolders(_event => {
				connection.console.log('Workspace folder change event received.');
			});
		}
    });


	// The content of a text document has changed. This event is emitted
	// when the text document first opened or when its content has changed.
	documents.onDidChangeContent(change => {
		validateTextDocument(change.document).catch(e=>console.warn("VALIDATION FAILED"));
    });
    


    const sendDiagnostics = (textDocument: TextDocument, source: ModelSource) => {
        let diagnostics: Diagnostic[] = [];
        for(let m of source.models){
            if(!m.hasError) continue;

            // field errors
            for(let f of m.ast.fields){
                if(!f.hasError) continue;

                // name errors

                // type errors
                if(f.type.error){
                    let diagnostic: Diagnostic = {
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: textDocument.positionAt(m.from + f.type.from),
                            end: textDocument.positionAt(m.from + f.type.to)
                        },
                        message: f.type.error,
                        source: ""
                    };
                    
                    if (hasDiagnosticRelatedInformationCapability) {
                        diagnostic.relatedInformation = [
                            {
                                location: {
                                    uri: textDocument.uri,
                                    range: Object.assign({}, diagnostic.range)
                                },
                                message: f.type.error
                            },
                            {
                                location: {
                                    uri: textDocument.uri,
                                    range: Object.assign({}, diagnostic.range)
                                },
                                message: f.type.suggestion || ""
                            }
                        ];
                    }
                    diagnostics.push(diagnostic);
                }


            }
        }

        
        // Send the computed diagnostics to VSCode.
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }

    

	async function validateTextDocument(textDocument: TextDocument): Promise<void> {
        let text = textDocument.getText();
        let path = textDocument.uri.replace(rootPath, "").replace("/", "");
        // /a/b.ail => a/b.ail
        let source = parse(text, path);
        
        await updateModel(source);

        sendDiagnostics(textDocument, source);
        l("=====>")
    }
    


	connection.onDidChangeWatchedFiles(_change => {
		// Monitored files have change in VSCode
		connection.console.log('We received an file change event');
	});

	// This handler provides the initial list of the completion items.
	connection.onCompletion(
		(pos: TextDocumentPositionParams): CompletionItem[] => {
			// The pass parameter contains the position of the text document in
			// which code complete got requested. For the example we ignore this
            // info and always provide the same completion items.
            
			return [
				{
					label: 'Student',
					kind: CompletionItemKind.Variable,
					data: 1
				},
				{
					label: 'JavaScript',
					kind: CompletionItemKind.Text,
					data: 2
				}
			];
		}
	);

	// This handler resolves additional information for the item selected in
	// the completion list.
	connection.onCompletionResolve(
		(item: CompletionItem): CompletionItem => {
			if (item.data === 1) {
				item.detail = 'TypeScript details';
				item.documentation = 'TypeScript documentation';
			} else if (item.data === 2) {
				item.detail = 'JavaScript details';
				item.documentation = 'JavaScript documentation';
			}
			return item;
		}
	);

	

	// Make the text document manager listen on the connection
	// for open, change and close text document events
	documents.listen(connection);

	// Listen on the connection
    connection.listen();
}




let generateAddress = (socket: net.Socket): string =>{
    return "tcp:" + socket.remoteAddress + ":" + socket.remotePort;
}
const TCP_SERVER = net.createServer(function (socket) {
    l("NEW LSP CLIENT: ", generateAddress(socket));


    // socket.on("data", function (data) {});

    socket.on("error", function (error) {
        l("LSP TCP SOCKET ERROR", generateAddress(socket));
    });
    socket.on("close", function () {
        l("LSP TCP SOCKET CLOSED", generateAddress(socket));
    });
});

TCP_SERVER.on("connection", acceptClient);

TCP_SERVER.on("listening", function(){
    l("LSP TCP SERVER LISTENING ON:", TCP_SERVER.address());
});
TCP_SERVER.on("close", function(){
    setTimeout(() => {
        l("LSP TCP SERVER STARTING AGAIN");
        LSP_SERVER_LISTEN();
    }, 5 * 1000);
});

/**
 * VSCode Language Server Init
 * 
 * Bind to port 5007 or env.LSP_TCP_PORT
 */
let LSP_SERVER_LISTEN = function(){
    const port = parseInt(process.env.LSP_TCP_PORT || "5007");
    const host = "0.0.0.0";
    
    TCP_SERVER.listen(port, host);
    l(`LSP TCP SERVER STARTED @${host}:${port}`);
}


export default LSP_SERVER_LISTEN;