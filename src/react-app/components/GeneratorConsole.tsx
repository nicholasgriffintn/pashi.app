import { useGeneratorConsole } from "../lib/use-generator-console";
import { GeneratorForm } from "./GeneratorForm";
import { PashiLogoButton } from "./PashiLogoButton";
import { ResultActions } from "./ResultActions";
import { ResultStage } from "./ResultStage";

function ScreenReaderStatus({ message }: { message: string }) {
	return (
		<p className="sr-only" role="status">
			{message}
		</p>
	);
}

export function GeneratorConsole() {
	const consoleState = useGeneratorConsole();
	const {
		activeTool,
		activeToolId,
		clearResult,
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
		resultMode,
		setResultMode,
		setInput,
		tools,
	} = consoleState;
	const resultFields = resultMode === "ai" ? { ...fieldValues, mode: "ai" } : fieldValues;

	return (
		<main className="shell">
			<section className="hero" aria-labelledby="pashi-title">
				<div className="copy">
					<PashiLogoButton
						className="mobile-logo-button"
						imageClassName="mobile-logo"
						isLoading={isInfoLoading}
					/>
					<h1 id="pashi-title">Pashi</h1>
					<p className="intro">Tiny generators for quick output.</p>

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
				</div>

				<div className="showcase">
					<PashiLogoButton
						className="mascot-button"
						imageClassName="mascot"
						isLoading={isInfoLoading}
					/>
					{isInfoLoading ? (
						<ScreenReaderStatus message="Loading generators" />
					) : null}
					<ResultStage
						actions={
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
							) : undefined
						}
						isLoading={isLoading}
						onImageError={handleImageError}
						onImageLoad={handleImageLoad}
						result={result}
					/>
				</div>
			</section>
			{notification ? (
				<div className="pashi-toast" role="status">
					{notification}
				</div>
			) : null}
		</main>
	);
}
