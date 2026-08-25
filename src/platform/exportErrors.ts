export class ExportCancelledError extends Error {
  constructor() {
    super("Exportacao cancelada.");
    this.name = "ExportCancelledError";
  }
}
