import type React from "react";

import { useGeneratorConsole, type ToolConsoleRoute } from "../lib/use-generator-console";
import { GeneratorForm } from "./GeneratorForm";
import { PashiShell } from "./PashiShell";
import { QuickPicks } from "./QuickPicks";
import { ResultActions } from "./ResultActions";
import { ToolPicker } from "./ToolPicker";
import { ToolSkeleton } from "./ToolSkeleton";

const QUICK_PICK_IDS = ["uuid", "password", "qr", "colour", "dice", "lorem", "jwt-token"];

interface GeneratorConsoleProps extends ToolConsoleRoute {
	controls: React.ReactNode;
}

export function GeneratorConsole({ controls, navigateToTool, routeToolId }: GeneratorConsoleProps) {
	const consoleState = useGeneratorConsole({ navigateToTool, routeToolId });
	const {
		activeTool,
		applyExample,
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
		requestFields,
		result,
		resultHistory,
		resultMode,
		restoreResult,
		setResultMode,
		setInput,
		tools,
	} = consoleState;
	const resultFields = resultMode === "ai" ? { ...requestFields, mode: "ai" } : requestFields;
	const actions =
		result && activeTool ? (
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
			controls={controls}
			emptyResultMessage="Pick a generator, paste something, generate."
			generatedAtLabel="Generated"
			intro="Generate and convert everyday formats."
			isInfoLoading={isInfoLoading}
			isLoading={isLoading}
			keyRequiredFor={resultMode === "ai" ? { requires: "polychat", what: "AI mode" } : undefined}
			notification={notification}
			onClearResultHistory={clearResultHistory}
			onImageError={handleImageError}
			onImageLoad={handleImageLoad}
			onRestoreResult={restoreResult}
			result={result}
			resultHistory={resultHistory}
			statusMessage="Loading generators"
		>
			{!activeTool && isInfoLoading ? (
				<ToolSkeleton label="Generator" />
			) : !activeTool ? (
				<div className="generator generator-empty">
					<div className="generator-content">
						<label>Generator</label>
						<ToolPicker
							label="generators"
							onChange={handleToolChange}
							placeholder={{
								category: "Start here",
								label: tools.length > 0 ? "Choose a generator" : "No generators available",
							}}
							recentKey="pashi:recent-generator-tools"
							tools={tools}
						/>
						<QuickPicks onPick={handleToolChange} preferredIds={QUICK_PICK_IDS} tools={tools} />
					</div>
				</div>
			) : (
				<GeneratorForm
					activeTool={activeTool}
					error={error}
					fieldValues={fieldValues}
					generationMode={resultMode}
					input={input}
					isLoading={isLoading}
					onApplyExample={applyExample}
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
