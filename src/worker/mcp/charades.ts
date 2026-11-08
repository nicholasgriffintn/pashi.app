export interface CharadesDeck {
	cards: readonly string[];
	id: string;
	name: string;
}

export const CHARADES_RULES =
	"Act out the card on camera. Sound effects are allowed, but speaking words is cheating, and the audience is listening too.";
export const CHARADES_CLIP_SECONDS = 6;
export const CHARADES_COUNTDOWN_SECONDS = 3;

export const CHARADES_DECKS: readonly CharadesDeck[] = [
	{
		cards: [
			"Brushing your teeth",
			"Making a cup of tea",
			"Riding a bicycle",
			"Typing on a keyboard",
			"Reading a newspaper",
			"Taking a selfie",
			"Washing up",
			"Putting on a coat",
			"Hailing a taxi",
			"Walking a dog",
			"Ironing a shirt",
			"Opening a stuck jar",
			"Yawning and stretching",
			"Juggling",
			"Eating spaghetti",
			"Waiting for a bus in the rain",
		],
		id: "everyday",
		name: "Everyday actions",
	},
	{
		cards: [
			"Elephant",
			"Monkey",
			"Penguin",
			"Kangaroo",
			"Chicken",
			"Snake",
			"Cat",
			"Crab",
			"Gorilla",
			"Owl",
			"Fish",
			"Frog",
			"Horse",
			"Parrot",
			"Butterfly",
			"T. rex",
		],
		id: "animals",
		name: "Animals",
	},
	{
		cards: [
			"Swimming",
			"Tennis",
			"Boxing",
			"Bowling",
			"Golf",
			"Archery",
			"Weightlifting",
			"Surfing",
			"Skiing",
			"Basketball",
			"Rowing",
			"Fencing",
			"Cricket batting",
			"Ice skating",
			"Darts",
			"Football penalty",
		],
		id: "sports",
		name: "Sports",
	},
	{
		cards: [
			"Chef",
			"Firefighter",
			"Orchestra conductor",
			"Dentist",
			"Photographer",
			"Pilot",
			"DJ",
			"Painter",
			"Magician",
			"Lifeguard",
			"Traffic warden",
			"Window cleaner",
			"Hairdresser",
			"Mime artist",
			"Astronaut",
			"Barista",
		],
		id: "jobs",
		name: "Jobs",
	},
];

export function setUpCharades(argumentsValue: Record<string, unknown>) {
	const deckId = typeof argumentsValue.deck === "string" ? argumentsValue.deck : "";
	const deck = deckId ? CHARADES_DECKS.find((entry) => entry.id === deckId) : undefined;

	if (deckId && !deck) {
		throw new Error(
			`Unknown deck. Choose one of ${CHARADES_DECKS.map((entry) => entry.id).join(", ")}.`,
		);
	}

	return {
		clipSeconds: CHARADES_CLIP_SECONDS,
		decks: CHARADES_DECKS.map((entry) => ({
			cards: entry.cards.length,
			id: entry.id,
			name: entry.name,
		})),
		game: "charades",
		rules: CHARADES_RULES,
		selectedDeck: deck?.id ?? null,
	};
}
