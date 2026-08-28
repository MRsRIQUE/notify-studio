import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { ensureAndroidChannel } from "./notifications";
import { saleTitle, saleBody, SIMULATION_MARKER } from "../domain/saleCopy";
import type { SaleEvent } from "../domain/types";

// Motor da simulacao "ao vivo".
//
// Por que agendar tudo de uma vez no sistema, em vez de usar setTimeout:
// o usuario vai sair do app para gravar a tela ou transmitir. Com o app em
// segundo plano o Android estrangula (ou mata) timers de JS, e as notificacoes
// simplesmente nao sairiam. Entregando a sequencia inteira ao agendador do SO,
// ele dispara no horario certo independente do estado do app.

export type LiveSessionHandle = {
  /** Ids das notificacoes agendadas, para cancelamento. */
  readonly ids: readonly string[];
  /** Quando a ultima notificacao da sequencia deve sair. */
  readonly endsAt: number;
};

/**
 * Agenda a sequencia de notificacoes a partir dos eventos do projeto.
 *
 * `startDelayMs` da tempo do usuario sair do app e comecar a gravar antes da
 * primeira notificacao aparecer.
 */
export async function startLiveSession(
  events: readonly SaleEvent[],
  startDelayMs: number,
  handle: string,
): Promise<LiveSessionHandle> {
  await ensureAndroidChannel();

  const base = Date.now() + Math.max(0, startDelayMs);
  const ids: string[] = [];
  let ultimo = base;

  for (const event of events) {
    const quando = base + Math.max(0, event.timeMs);
    ultimo = Math.max(ultimo, quando);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: saleTitle(handle),
        body: saleBody(event),
        // setSubText no Android: linha discreta no cabecalho, ao lado do nome
        // do app. Mantem a natureza simulada visivel sem ocupar o titulo.
        subtitle: SIMULATION_MARKER,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: quando,
        channelId: "notify-studio-demo",
      },
    });
    ids.push(id);
  }

  return { ids, endsAt: ultimo };
}

/** Cancela uma sessao em andamento. Seguro chamar com ids ja disparados. */
export async function stopLiveSession(
  handle: LiveSessionHandle | null,
): Promise<void> {
  if (!handle) return;
  await Promise.all(
    handle.ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {
        // Ja disparada ou inexistente: nao ha o que cancelar.
      }),
    ),
  );
}

/** Rede de seguranca: limpa qualquer agendamento residual do app. */
export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
