export type DecideExampleQuestion =
	| { prompt: string; type: "yesno" }
	| { options: string[]; prompt: string; type: "choice" }
	| { levels: string[]; prompt: string; type: "score" };

export interface DecideExample {
	id: string;
	label: string;
	questions: DecideExampleQuestion[];
	subject: string;
}

export const DECIDE_EXAMPLES: readonly DecideExample[] = [
	{
		id: "spam",
		label: "Is this spam?",
		questions: [
			{ prompt: "Is this message spam?", type: "yesno" },
			{
				options: ["Spam", "Marketing", "Personal"],
				prompt: "What kind of message is it?",
				type: "choice",
			},
		],
		subject:
			"Congratulations! Your number was picked in our monthly draw. Reply with your bank details within 24 hours to claim your £500 voucher, or the prize goes to the next winner.",
	},
	{
		id: "phishing",
		label: "Phishing check",
		questions: [
			{
				prompt: "Does this message try to get the reader to share a password or payment details?",
				type: "yesno",
			},
			{
				prompt: "Does it pretend to come from a company or person it is not really from?",
				type: "yesno",
			},
		],
		subject:
			"Dear customer, we noticed unusual activity on your account. To avoid suspension, confirm your identity today at secure-login-update.example by entering your card number and online banking password.",
	},
	{
		id: "routing",
		label: "Route a support ticket",
		questions: [
			{
				options: ["Billing", "Technical support", "Account access", "Sales"],
				prompt: "Which team should handle this ticket?",
				type: "choice",
			},
		],
		subject:
			"Hi, I was charged twice for my annual plan this morning. Could you refund the second payment? My invoice number is 20418.",
	},
	{
		id: "urgency",
		label: "Tone and urgency",
		questions: [
			{
				levels: ["Can wait", "This week", "Today", "Right now"],
				prompt: "How urgently does this need a reply?",
				type: "score",
			},
			{
				levels: ["Hostile", "Curt", "Neutral", "Friendly", "Warm"],
				prompt: "How would you describe the tone?",
				type: "score",
			},
		],
		subject:
			"The site has been down for an hour and our customers cannot check out. I have emailed twice already. Please call me back as soon as you see this.",
	},
	{
		id: "review",
		label: "Review triage",
		questions: [
			{ prompt: "Does the reviewer mention a safety problem?", type: "yesno" },
			{
				options: ["Product quality", "Delivery", "Price", "Customer service"],
				prompt: "What is the review mostly about?",
				type: "choice",
			},
			{
				levels: ["Furious", "Unhappy", "Mixed", "Happy", "Delighted"],
				prompt: "How happy is the reviewer?",
				type: "score",
			},
		],
		subject:
			"The kettle looks lovely and boils quickly, but the handle gets far too hot to hold and I burnt my fingers on the second day. Delivery was quick, at least.",
	},
];
