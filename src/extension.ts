import * as vscode from 'vscode';

import {BinaryEditorProvider} from "@hashrock/vscode-easy-custom-editor/dist/BinaryEditorProvider"

export function activate(context: vscode.ExtensionContext) {
	if (+vscode.version.match(/1\.(\d+)/)![1] >= 45) {
		context.subscriptions.push(BinaryEditorProvider.register(context, { viewType: "catCustoms.pawDraw", extension: "pawdraw" }));
	}
}
