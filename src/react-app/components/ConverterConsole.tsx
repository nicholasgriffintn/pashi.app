import type React from "react";

import { useConverterConsole } from "../lib/use-converter-console";
import type { ToolConsoleRoute } from "../lib/use-generator-console";
import { ConverterForm } from "./ConverterForm";
import { PashiShell } from "./PashiShell";
import { ResultActions } from "./ResultActions";

interface ConverterConsoleProps extends ToolConsoleRoute {
	controls: React.ReactNode;
}

export function ConverterConsole({ controls, navigateToTool, routeToolId }: ConverterConsoleProps) {
	const consoleState = useConverterConsole({ navigateToTool, routeToolId });
	const {
		activeTool,
		activeToolId,
		clearResult,
		clearResultHistory,
		convertActiveTool,
		error,
		converterFields,
		handleSubmit,
		handleToolChange,
		handleImageError,
		handleImageLoad,
		input,
		isInfoLoading,
		isLoading,
		notification,
		notify,
		outputFormat,
		setConverterField,
		result,
		restoreResult,
		resultHistory,
		selectedFile,
		setOutputFormat,
		setInput,
		setSelectedFile,
		tools,
	} = consoleState;
	const actions =
		result && activeTool ? (
			<ResultActions
				exportFormats={[]}
				fields={{}}
				input={input}
				onClear={clearResult}
				onNotify={notify}
				onRegenerate={() => {
					void convertActiveTool();
				}}
				result={result}
				tool={activeTool}
			/>
		) : undefined;

	return (
		<PashiShell
			actions={actions}
			controls={controls}
			emptyResultMessage="Pick a converter, paste source text, convert."
			generatedAtLabel="Converted"
			intro="Generate and convert everyday formats."
			isInfoLoading={isInfoLoading}
			isLoading={isLoading}
			notification={notification}
			onClearResultHistory={clearResultHistory}
			onImageError={handleImageError}
			onImageLoad={handleImageLoad}
			onRestoreResult={restoreResult}
			result={result}
			resultHistory={resultHistory}
			statusMessage="Loading converters"
		>
			{!activeTool ? (
				<div aria-busy="true" className="generator generator-loading">
					<label>Converter</label>
					<p className="tool-description">
						{isInfoLoading ? `Loading ${activeToolId || "converters"}` : "No converters available"}
					</p>
				</div>
			) : (
				<ConverterForm
					activeTool={activeTool}
					error={error}
					input={input}
					converterFields={converterFields}
					isLoading={isLoading}
					onConverterFieldChange={setConverterField}
					onInputChange={setInput}
					onOutputFormatChange={setOutputFormat}
					onSubmit={handleSubmit}
					onToolChange={handleToolChange}
					onFileChange={setSelectedFile}
					outputFormat={outputFormat}
					selectedFile={selectedFile}
					tools={tools}
				/>
			)}
		</PashiShell>
	);
}
