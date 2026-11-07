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
	"sessions:users-changed": { sessionId: number };
	"sessions:beer-changed": { sessionId: number };
};

export type SocketEvent = keyof SocketEventMap;

// Session-specific events (start with "session:")
export type SessionEvent = Extract<SocketEvent, `session:${string}`>;

// Global events (everything else)
export type GlobalEvent = Exclude<SocketEvent, SessionEvent>;

/** What the server sends: every app event, plus the connected-clients count. */
export type ServerToClientEvents = {
	[K in SocketEvent]: (payload: SocketEventMap[K]) => void;
} & {
	"clients-count": (count: number) => void;
};

/** What the client sends: joining and leaving a session's room. */
export type ClientToServerEvents = {
	"join-session": (sessionId: number) => void;
	"leave-session": (sessionId: number) => void;
};

/** An event's payload as emit arguments: none when it has no payload. */
export type EventArgs<K extends SocketEvent> =
	SocketEventMap[K] extends undefined ? [] : [SocketEventMap[K]];
