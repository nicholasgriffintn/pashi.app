import { DECIDE_IMAGE_TYPES, DECIDE_LIMITS } from "../../shared/decide";
import type { DecideImage } from "../lib/decide-form";

interface DecideSubjectFieldsProps {
	image: DecideImage | null;
	imageError: string | null;
	isReadingImage: boolean;
	onImageChange: (image: DecideImage | null) => void;
	onPickImage: (file: File) => void;
	onSubjectChange: (subject: string) => void;
	subject: string;
}

export function DecideSubjectFields({
	image,
	imageError,
	isReadingImage,
	onImageChange,
	onPickImage,
	onSubjectChange,
	subject,
}: DecideSubjectFieldsProps) {
	return (
		<fieldset className="decide-subject">
			<legend>What should be judged?</legend>
			<label htmlFor="decide-subject">Text</label>
			<textarea
				id="decide-subject"
				maxLength={DECIDE_LIMITS.subjectLength}
				onChange={(event) => onSubjectChange(event.target.value)}
				rows={5}
				value={subject}
			/>
			<p className="decide-hint">
				{subject.trim().length} of {DECIDE_LIMITS.subjectLength} characters. The text is judged as
				data: instructions inside it are ignored.
			</p>
			<div className="decide-image">
				{image ? (
					<>
						<img alt="" src={image.dataUrl} />
						<span>{image.name}</span>
						<button className="decide-quiet" onClick={() => onImageChange(null)} type="button">
							Remove image
						</button>
					</>
				) : (
					<label className="decide-quiet">
						{isReadingImage ? "Shrinking image" : "Add an image (optional)"}
						<input
							accept={DECIDE_IMAGE_TYPES.join(",")}
							disabled={isReadingImage}
							onChange={(event) => {
								const file = event.target.files?.[0];

								event.target.value = "";

								if (file) {
									onPickImage(file);
								}
							}}
							type="file"
						/>
					</label>
				)}
			</div>
			{imageError ? (
				<p className="ask-error" role="alert">
					{imageError}
				</p>
			) : null}
		</fieldset>
	);
}
