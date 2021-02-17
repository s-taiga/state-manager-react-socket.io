export const STATE_TYPES = {
    possess: "所有",
    state: "状態"
} as const;

export type StateTypes = keyof typeof STATE_TYPES;

export interface ResourceState {
    id: number;
    name: string;
    color: string;
    type: StateTypes;
    user?: string;
}

export interface Resource {
    id: number;
    name: string;
    state: ResourceState;
}

export type Resources = Array<Resource>;