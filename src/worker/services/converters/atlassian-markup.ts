const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const JIRA_HEADING_PATTERN = /^h([1-6])\.\s+(.+)$/;
const MARKDOWN_ORDERED_PATTERN = /^(\s*)\d+\.\s+(.+)$/;
const MARKDOWN_UNORDERED_PATTERN = /^(\s*)[-*+]\s+(.+)$/;
const JIRA_ORDERED_PATTERN = /^(#+)\s+(.+)$/;
const JIRA_UNORDERED_PATTERN = /^(\*+)\s+(.+)$/;
const JIRA_QUOTE_PATTERN = /^bq\.\s?(.*)$/;
const JIRA_CODE_BLOCK_PATTERN = /^\{code(?::language=([^}]+))?\}$/;

function nestingPrefix(indent: string, marker: string) {
	return marker.repeat(Math.max(1, Math.floor(indent.length / 2) + 1));
}

function createPlaceholderStore() {
	const values: string[] = [];

	return {
		restore(value: string) {
			return values.reduce(
				(current, item, index) => current.replaceAll(`@@PASHIINLINE${index}@@`, item),
				value,
			);
		},
		stash(value: string) {
			const index = values.push(value) - 1;
			return `@@PASHIINLINE${index}@@`;
		},
	};
}

function replaceInlineMarkdown(value: string) {
	const placeholders = createPlaceholderStore();
	const replaced = value
		.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_match, alt: string, url: string) => placeholders.stash(`!${url}|alt=${alt}!`))
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, text: string, url: string) => placeholders.stash(`[${text}|${url}]`))
		.replace(/`([^`]+)`/g, (_match, text: string) => placeholders.stash(`{{${text}}}`))
		.replace(/\*\*([^*\n]+)\*\*/g, (_match, text: string) => placeholders.stash(`*${text}*`))
		.replace(/__([^_\n]+)__/g, (_match, text: string) => placeholders.stash(`*${text}*`))
		.replace(/~~([^~\n]+)~~/g, (_match, text: string) => placeholders.stash(`-${text}-`))
		.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "_$1_")
		.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "_$1_");

	return placeholders.restore(replaced);
}

function replaceInlineJira(value: string) {
	const placeholders = createPlaceholderStore();
	const replaced = value
		.replace(/!([^!\n|]+)(?:\|alt=([^!\n]+))?!/g, (_match, url: string, alt: string | undefined) => placeholders.stash(`![${alt ?? ""}](${url})`))
		.replace(/\[([^\]\n|]+)\|([^\]\n]+)\]/g, (_match, text: string, url: string) => placeholders.stash(`[${text}](${url})`))
		.replace(/\{\{([^{}\n]+)\}\}/g, (_match, text: string) => placeholders.stash(`\`${text}\``))
		.replace(/\*([^*\n]+)\*/g, (_match, text: string) => placeholders.stash(`**${text}**`))
		.replace(/-([^-]+)-/g, (_match, text: string) => placeholders.stash(`~~${text}~~`))
		.replace(/_([^_\n]+)_/g, "*$1*");

	return placeholders.restore(replaced);
}

function markdownTableCells(line: string) {
	const trimmed = line.trim();
	if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
		return undefined;
	}

	return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function isMarkdownTableDivider(line: string) {
	const cells = markdownTableCells(line);
	return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function jiraTableCells(line: string) {
	const trimmed = line.trim();
	if (trimmed.startsWith("||") && trimmed.endsWith("||")) {
		return {
			cells: trimmed.slice(2, -2).split("||").map((cell) => cell.trim()),
			header: true,
		};
	}

	if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
		return {
			cells: trimmed.slice(1, -1).split("|").map((cell) => cell.trim()),
			header: false,
		};
	}

	return undefined;
}

function markdownTableToJira(headerLine: string, rowLines: string[]) {
	const header = markdownTableCells(headerLine) ?? [];
	return [
		`|| ${header.map(replaceInlineMarkdown).join(" || ")} ||`,
		...rowLines.map((line) => {
			const cells = markdownTableCells(line) ?? [];
			return `| ${cells.map(replaceInlineMarkdown).join(" | ")} |`;
		}),
	];
}

function jiraTableToMarkdown(tableLines: string[]) {
	const rows = tableLines.flatMap((line) => {
		const table = jiraTableCells(line);
		return table ? [{ ...table, cells: table.cells.map(replaceInlineJira) }] : [];
	});
	const firstRow = rows[0];
	if (!firstRow) {
		return [];
	}

	return [
		`| ${firstRow.cells.join(" | ")} |`,
		`| ${firstRow.cells.map(() => "---").join(" | ")} |`,
		...rows.slice(1).map((row) => `| ${row.cells.join(" | ")} |`),
	];
}

export function markdownToJira(input: string) {
	const lines = input.replaceAll("\r\n", "\n").split("\n");
	const output: string[] = [];
	let inCodeBlock = false;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const codeFence = line.trim().match(/^```([A-Za-z0-9_-]+)?/);
		if (codeFence) {
			output.push(inCodeBlock ? "{code}" : codeFence[1] ? `{code:language=${codeFence[1]}}` : "{code}");
			inCodeBlock = !inCodeBlock;
			continue;
		}

		if (inCodeBlock) {
			output.push(line);
			continue;
		}

		if (markdownTableCells(line) && isMarkdownTableDivider(lines[index + 1] ?? "")) {
			const rowLines: string[] = [];
			index += 2;
			while (index < lines.length && markdownTableCells(lines[index])) {
				rowLines.push(lines[index]);
				index += 1;
			}
			index -= 1;
			output.push(...markdownTableToJira(line, rowLines));
			continue;
		}

		const heading = line.match(MARKDOWN_HEADING_PATTERN);
		if (heading) {
			output.push(`h${heading[1].length}. ${replaceInlineMarkdown(heading[2])}`);
			continue;
		}

		const unordered = line.match(MARKDOWN_UNORDERED_PATTERN);
		if (unordered) {
			output.push(`${nestingPrefix(unordered[1], "*")} ${replaceInlineMarkdown(unordered[2])}`);
			continue;
		}

		const ordered = line.match(MARKDOWN_ORDERED_PATTERN);
		if (ordered) {
			output.push(`${nestingPrefix(ordered[1], "#")} ${replaceInlineMarkdown(ordered[2])}`);
			continue;
		}

		if (line.startsWith("> ")) {
			output.push(`bq. ${replaceInlineMarkdown(line.slice(2))}`);
			continue;
		}

		output.push(replaceInlineMarkdown(line));
	}

	return output.join("\n");
}

export function jiraToMarkdown(input: string) {
	const lines = input.replaceAll("\r\n", "\n").split("\n");
	const output: string[] = [];
	let inCodeBlock = false;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const codeBlock = line.trim().match(JIRA_CODE_BLOCK_PATTERN);
		if (codeBlock) {
			output.push(inCodeBlock ? "```" : `\`\`\`${codeBlock[1] ?? ""}`);
			inCodeBlock = !inCodeBlock;
			continue;
		}

		if (inCodeBlock) {
			output.push(line);
			continue;
		}

		if (jiraTableCells(line)) {
			const tableLines: string[] = [];
			while (index < lines.length && jiraTableCells(lines[index])) {
				tableLines.push(lines[index]);
				index += 1;
			}
			index -= 1;
			output.push(...jiraTableToMarkdown(tableLines));
			continue;
		}

		const heading = line.match(JIRA_HEADING_PATTERN);
		if (heading) {
			output.push(`${"#".repeat(Number(heading[1]))} ${replaceInlineJira(heading[2])}`);
			continue;
		}

		const ordered = line.match(JIRA_ORDERED_PATTERN);
		if (ordered) {
			output.push(`${"  ".repeat(ordered[1].length - 1)}1. ${replaceInlineJira(ordered[2])}`);
			continue;
		}

		const unordered = line.match(JIRA_UNORDERED_PATTERN);
		if (unordered) {
			output.push(`${"  ".repeat(unordered[1].length - 1)}- ${replaceInlineJira(unordered[2])}`);
			continue;
		}

		const quote = line.match(JIRA_QUOTE_PATTERN);
		if (quote) {
			output.push(`> ${replaceInlineJira(quote[1])}`);
			continue;
		}

		output.push(replaceInlineJira(line));
	}

	return output.join("\n");
}
