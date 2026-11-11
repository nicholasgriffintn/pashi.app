import { isMcpConverter } from "../services/converters/availability";
import { listConverterTools } from "../services/converters/catalogue";
import { listGeneratorTools } from "../services/generators/catalogue";
import { listMcpAppToolNames, listMcpTools, type McpCaller } from "./tools";

export function buildMcpInstructions(caller: McpCaller) {
	const generators = listGeneratorTools().length;
	const converters = listConverterTools().filter(isMcpConverter).length;
	const apps = listMcpAppToolNames();
	const callable = new Set(listMcpTools(caller).map((tool) => tool.name));
	const open = apps.filter((name) => callable.has(name));

	return [
		`Pashi is a toolkit of ${generators} generators and ${converters} text converters, with ${apps.length} apps.`,
		caller.owner === undefined ? "The toolkit works without an account." : "",
		"Call pashi_list_tools first to list or search for a tool id.",
		"Call pashi_describe_tool with that id to learn the input and fields it accepts.",
		"Then run it with pashi_generate for a generator or pashi_convert for a text converter.",
		caller.ai === undefined ? "AI mode on a generator needs a Polychat link." : "",
		"The apps are games and studios that open interactive views for the user rather than returning data.",
		open.length > 0 ? `Open one with ${open.join(", ")}, and only when the user asks for it.` : "",
		open.length < apps.length
			? `${open.length > 0 ? "The rest" : "They"} need a Polychat link or a Pashi API key and cannot be opened on this connection.`
			: "",
	]
		.filter(Boolean)
		.join(" ");
}
