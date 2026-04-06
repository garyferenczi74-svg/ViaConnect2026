'use client';

export type InteractionMode = 'consumer' | 'practitioner' | 'naturopath';

export interface InteractionEngineProps {
  mode: InteractionMode;
  userId: string;
  viewerUserId?: string;
}

export { InteractionEngine } from './InteractionEngine';
