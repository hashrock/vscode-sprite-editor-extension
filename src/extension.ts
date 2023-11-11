import * as vscode from 'vscode';
import { BinaryEditorProvider } from './BinaryEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	if (+vscode.version.match(/1\.(\d+)/)![1] >= 45) {
		context.subscriptions.push(BinaryEditorProvider.register(context, { viewType: "hashrock.spriteEditor", extension: "png" }));
	}
}
