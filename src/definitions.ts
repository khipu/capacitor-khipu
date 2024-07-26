export interface KhipuPlugin {
  startOperation(options: StartOperationOptions): Promise<KhipuResult>;
}

export interface StartOperationOptions {
  operationId: string;
  options: KhipuOptions;
}

export interface KhipuOptions {
  locale: string | undefined;
  title: string | undefined;
  titleImageUrl: string | undefined;
  skipExitPage: boolean | undefined;
  theme: 'light' | 'dark' | 'system' | undefined;
  colors: KhipuColors | undefined;
  showFooter: boolean | undefined;
}

export interface KhipuColors {
  lightBackground: string | undefined;
  lightOnBackground:string | undefined;
  lightPrimary:string | undefined;
  lightOnPrimary:string | undefined;
  lightTopBarContainer:string | undefined;
  lightOnTopBarContainer:string | undefined;
  darkBackground:string | undefined;
  darkOnBackground:string | undefined;
  darkPrimary:string | undefined;
  darkOnPrimary:string | undefined;
  darkTopBarContainer:string | undefined;
  darkOnTopBarContainer:string | undefined;
}

export interface KhipuResult {
  operationId: string;
  exitTitle: string;
  exitMessage: string;
  exitUrl: string;
  result: 'OK' | 'ERROR' | 'WARNING' | 'CONTINUE';
  failureReason: string | undefined;
  continueUrl: string | undefined;
  events: KhipuEvent[];
}

export interface KhipuEvent {
  name: string;
  timestamp: string;
  type: string;
}
