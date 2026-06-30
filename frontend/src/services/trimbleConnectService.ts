import * as WorkspaceAPI from 'trimble-connect-workspace-api';
import type { TrimbleProject, TrimbleUserSettings } from '@/types';

const CONNECTION_TIMEOUT_MS = 30_000;

export type TrimbleWorkspaceClient = Awaited<ReturnType<typeof WorkspaceAPI.connect>>;

export interface TrimbleConnectContext {
  client: TrimbleWorkspaceClient | null;
  project: TrimbleProject | null;
  userSettings: TrimbleUserSettings | null;
  accessToken: string | null;
  isConnected: boolean;
  isEmbedded: boolean;
  error: string | null;
}

type ContextListener = (context: TrimbleConnectContext) => void;

const MOCK_PROJECT: TrimbleProject = {
  id: 'mock-project-id',
  name: 'Projet local (dev)',
  location: 'europe',
};

const MOCK_USER: TrimbleUserSettings = { language: 'fr' };

class TrimbleConnectService {
  private client: TrimbleWorkspaceClient | null = null;
  private context: TrimbleConnectContext = {
    client: null,
    project: null,
    userSettings: null,
    accessToken: null,
    isConnected: false,
    isEmbedded: false,
    error: null,
  };
  private listeners = new Set<ContextListener>();

  subscribe(listener: ContextListener): () => void {
    this.listeners.add(listener);
    listener(this.context);
    return () => this.listeners.delete(listener);
  }

  getContext(): TrimbleConnectContext {
    return this.context;
  }

  async initialize(): Promise<TrimbleConnectContext> {
    const isEmbedded = window.self !== window.top;

    if (!isEmbedded) {
      this.updateContext({
        client: null,
        project: MOCK_PROJECT,
        userSettings: MOCK_USER,
        accessToken: null,
        isConnected: true,
        isEmbedded: false,
        error: null,
      });
      return this.context;
    }

    try {
      const client = await WorkspaceAPI.connect(
        window.parent,
        this.handleEvent.bind(this),
        CONNECTION_TIMEOUT_MS,
      );

      this.client = client;

      const [project, userSettings] = await Promise.all([
        client.project.getProject(),
        client.user.getUserSettings(),
      ]);

      this.updateContext({
        client,
        project: project as TrimbleProject,
        userSettings: userSettings as TrimbleUserSettings,
        accessToken: null,
        isConnected: true,
        isEmbedded: true,
        error: null,
      });

      client.extension.setStatusMessage('Mezzoteam — connexion établie');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connexion Trimble Connect impossible';
      this.updateContext({
        ...this.context,
        isConnected: false,
        error: message,
      });
    }

    return this.context;
  }

  async requestAccessToken(): Promise<string | null> {
    if (!this.client) return null;

    const token = await this.client.extension.requestPermission('accesstoken');
    if (token === 'pending' || token === 'denied') return null;

    this.updateContext({ ...this.context, accessToken: token });
    return token;
  }

  /**
   * Contexte nécessaire aux appels REST Trimble Connect via le proxy :
   * jeton d'accès (hors mode embarqué : null), région et dossier racine du projet.
   */
  async getRestContext(): Promise<{
    trimbleToken: string | null;
    region: string | null;
    rootId: string | null;
  }> {
    const region = this.context.project?.location ?? null;
    const rootId = this.context.project?.rootId ?? null;

    if (!this.context.isEmbedded || !this.client) {
      return { trimbleToken: null, region, rootId };
    }

    const trimbleToken = this.context.accessToken ?? (await this.requestAccessToken());
    return { trimbleToken, region, rootId };
  }

  async showAlert(message: string): Promise<void> {
    if (!this.client) {
      console.warn('[TrimbleConnect]', message);
      return;
    }
    this.client.extension.setStatusMessage(message);
  }

  private handleEvent(event: string, data: unknown): void {
    switch (event) {
      case 'extension.accessToken':
        this.updateContext({ ...this.context, accessToken: data as string });
        break;
      case 'extension.sessionInvalid':
        this.updateContext({ ...this.context, accessToken: null });
        break;
      default:
        break;
    }
  }

  private updateContext(partial: TrimbleConnectContext): void {
    this.context = partial;
    this.listeners.forEach((listener) => listener(this.context));
  }
}

export const trimbleConnectService = new TrimbleConnectService();
