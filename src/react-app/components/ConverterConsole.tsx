import type React from "react";

import { useConverterConsole } from "../lib/use-converter-console";
import { ConverterForm } from "./ConverterForm";
import { PashiShell } from "./PashiShell";
import { ResultActions } from "./ResultActions";

interface ConverterConsoleProps {
	modeTabs: React.ReactNode;
}

export function ConverterConsole({ modeTabs }: ConverterConsoleProps) {
	const consoleState = useConverterConsole();
	const {
		activeTool,
		activeToolId,
		clearResult,
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
		selectedFile,
		setOutputFormat,
		setInput,
		setSelectedFile,
		tools,
	} = consoleState;
	const actions = result && activeTool ? (
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
			emptyResultMessage="Pick a converter, paste source text, convert."
			generatedAtLabel="Converted"
			intro="Generate and convert everyday formats."
			isInfoLoading={isInfoLoading}
			isLoading={isLoading}
			modeTabs={modeTabs}
			notification={notification}
			onImageError={handleImageError}
			onImageLoad={handleImageLoad}
			result={result}
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
