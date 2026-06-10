import type React from "react";

import { useGeneratorConsole } from "../lib/use-generator-console";
import { GeneratorForm } from "./GeneratorForm";
import { PashiShell } from "./PashiShell";
import { ResultActions } from "./ResultActions";

interface GeneratorConsoleProps {
	modeTabs: React.ReactNode;
}

export function GeneratorConsole({ modeTabs }: GeneratorConsoleProps) {
	const consoleState = useGeneratorConsole();
	const {
		activeTool,
		activeToolId,
		clearResult,
		clearResultHistory,
		error,
		exportFormats,
		fieldValues,
		generateActiveTool,
		handleFieldChange,
		handleImageError,
		handleImageLoad,
		handleSubmit,
		handleToolChange,
		input,
		isInfoLoading,
		isLoading,
		notification,
		notify,
		result,
		resultHistory,
		resultMode,
		restoreResult,
		setResultMode,
		setInput,
		tools,
	} = consoleState;
	const resultFields = resultMode === "ai" ? { ...fieldValues, mode: "ai" } : fieldValues;
	const actions = result && activeTool ? (
		<ResultActions
			exportFormats={exportFormats}
			fields={resultFields}
			input={input}
			onClear={clearResult}
			onNotify={notify}
			onRegenerate={() => {
				void generateActiveTool();
			}}
			result={result}
			tool={activeTool}
		/>
	) : undefined;

	return (
		<PashiShell
			actions={actions}
			emptyResultMessage="Pick a generator, paste something, generate."
			generatedAtLabel="Generated"
			intro="Generate and convert everyday formats."
			isInfoLoading={isInfoLoading}
			isLoading={isLoading}
			modeTabs={modeTabs}
			notification={notification}
			onClearResultHistory={clearResultHistory}
			onImageError={handleImageError}
			onImageLoad={handleImageLoad}
			onRestoreResult={restoreResult}
			result={result}
			resultHistory={resultHistory}
			statusMessage="Loading generators"
		>
			{!activeTool ? (
				<div aria-busy="true" className="generator generator-loading">
					<label>Generator</label>
					<p className="tool-description">
						{isInfoLoading ? `Loading ${activeToolId || "generators"}` : "No generators available"}
					</p>
				</div>
			) : (
				<GeneratorForm
					activeTool={activeTool}
					error={error}
					fieldValues={fieldValues}
					generationMode={resultMode}
					input={input}
					isLoading={isLoading}
					onFieldChange={handleFieldChange}
					onGenerationModeChange={setResultMode}
					onInputChange={setInput}
					onSubmit={handleSubmit}
					onToolChange={handleToolChange}
					tools={tools}
				/>
			)}
		</PashiShell>
	);
}
