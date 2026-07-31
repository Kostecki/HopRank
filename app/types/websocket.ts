export type KickVotePublicState = {
	voteId: string;
	targetUserId: number;
	initiatorUserId: number;
	yesCount: number;
	noCount: number;
	totalEligible: number;
	threshold: number;
};

export type SocketEventMap = {
	// Session-scoped events
	"session:users-changed": undefined;
	"session:beer-changed": undefined;
	"session:vote": undefined;
	"session:started": undefined;
	"session:kick-vote-started": KickVotePublicState;
	"session:kick-vote-updated": KickVotePublicState;
	"session:kick-vote-resolved": {
		voteId: string;
		targetUserId: number;
		kicked: boolean;
		/** True when a new vote superseded this one, rather than it reaching a real outcome. */
		replaced?: boolean;
	};

	// Global events
	"sessions:created": { sessionId: number };
	"sessions:deleted": { sessionId: number };
	"sessions:users-changed": { sessionId: number };
	"sessions:beer-changed": { sessionId: number };
};

export type SocketEvent = keyof SocketEventMap;

// Session-specific events (start with "session:")
export type SessionEvent = Extract<SocketEvent, `session:${string}`>;

// Global events (everything else)
export type GlobalEvent = Exclude<SocketEvent, SessionEvent>;
