export interface KhipuPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
